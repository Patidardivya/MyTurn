import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db';
import { z } from 'zod';

const callNextSchema = z.object({
  counterId: z.string()
});

const createQueueSchema = z.object({
  branchId: z.string().uuid(),
  serviceId: z.string().uuid().optional(),
});

export const listQueues = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branchId = typeof req.query.branchId === 'string' ? req.query.branchId : undefined;
    const queues = await prisma.queue.findMany({
      where: { isActive: true, branchId },
      orderBy: { createdAt: 'asc' },
      include: { branch: { select: { id: true, name: true } }, service: { select: { id: true, name: true } } },
    });
    res.json({ success: true, queues });
  } catch (error) {
    next(error);
  }
};

export const createQueue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createQueueSchema.parse(req.body);
    const branch = await prisma.branch.findFirst({ where: { id: data.branchId, isActive: true } });
    if (!branch) return res.status(404).json({ success: false, message: 'Branch not found' });
    if (data.serviceId) {
      const service = await prisma.service.findFirst({ where: { id: data.serviceId, branchId: data.branchId, isActive: true } });
      if (!service) return res.status(404).json({ success: false, message: 'Service not found for this branch' });
    }
    const queue = await prisma.queue.create({ data });
    res.status(201).json({ success: true, queue });
  } catch (error) {
    next(error);
  }
};

export const callNext = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const queueId = req.params.id;
    if (typeof queueId !== 'string') {
      return res.status(400).json({ success: false, message: 'Invalid queue ID' });
    }
    const { counterId } = callNextSchema.parse(req.body);

    const result = await prisma.$transaction(async (tx) => {
      // Find the counter and its branch
      const counter = await tx.counter.findUnique({
        where: { id: counterId },
        include: { branch: true }
      });
      if (!counter) throw new Error('Counter not found');

      // If counter is currently serving someone, mark them as NO_SHOW (fallback)
      if (counter.currentTicketId) {
        const currentTicket = await tx.ticket.findUnique({ where: { id: counter.currentTicketId } });
        if (currentTicket && currentTicket.status === 'SERVING') {
          await tx.ticket.update({
            where: { id: currentTicket.id },
            data: { status: 'NO_SHOW' }
          });
        }
      }

      // We need to fetch the next ticket atomically.
      // Prisma doesn't support SELECT FOR UPDATE SKIP LOCKED directly in its query builder.
      // For this implementation, we will use raw SQL to ensure concurrency protection.
      // We are finding the oldest ticket with the highest priority score.
      const tickets: any[] = await tx.$queryRaw`
        SELECT id FROM "Ticket"
        WHERE "queueId" = ${queueId} AND "status" = 'WAITING'
        ORDER BY "priorityScore" DESC, "createdAt" ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED;
      `;

      if (!tickets || tickets.length === 0) {
        return null; // No tickets waiting
      }

      const nextTicketId = tickets[0].id;

      // Update the ticket to SERVING
      const updatedTicket = await tx.ticket.update({
        where: { id: nextTicketId },
        data: {
          status: 'SERVING',
          counterId: counter.id,
          calledAt: new Date(),
          startedAt: new Date()
        },
        include: { service: true }
      });

      // Update counter
      await tx.counter.update({
        where: { id: counter.id },
        data: { currentTicketId: updatedTicket.id }
      });

      return { ticket: updatedTicket, counter };
    });

    if (!result) {
      return res.status(404).json({ success: false, message: 'No tickets waiting in queue' });
    }

    // Emit events
    const io = (req as any).io;
    const { ticket, counter } = result;
    
    // Notify the specific ticket room
    io.to(`ticket:${ticket.id}`).emit('ticket:called', { 
      ticketId: ticket.id, 
      tokenNumber: ticket.ticketNumber, 
      counterName: counter.name, 
      counterId: counter.id 
    });

    // Notify public display for this branch
    io.to(`branch:${counter.branchId}`).emit('ticket:called', { 
      ticketId: ticket.id, 
      tokenNumber: ticket.ticketNumber, 
      counterName: counter.name, 
      counterId: counter.id 
    });

    // Notify queue update
    io.to(`queue:${queueId}`).emit('queue:updated', { queueId, event: 'ticket:called' });

    res.json({ success: true, ticket });
  } catch (error: any) {
    if (error.message === 'Counter not found') {
      return res.status(404).json({ success: false, message: error.message });
    }
    next(error);
  }
};

export const getQueueLive = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const queueId = req.params.id;
    if (typeof queueId !== 'string') {
      return res.status(400).json({ success: false, message: 'Invalid queue ID' });
    }
    
    const waitingTickets = await prisma.ticket.findMany({
      where: { queueId, status: 'WAITING' },
      orderBy: [
        { priorityScore: 'desc' },
        { createdAt: 'asc' }
      ],
      select: {
        id: true,
        ticketNumber: true,
        priorityType: true,
        createdAt: true,
        service: { select: { name: true } }
      }
    });

    res.json({ success: true, waiting: waitingTickets });
  } catch (error) {
    next(error);
  }
};

export const recallTicket = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ticketId } = req.body;
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { counter: true }
    });

    if (!ticket || ticket.status !== 'SERVING' || !ticket.counter) {
      return res.status(400).json({ success: false, message: 'Ticket is not currently being served' });
    }

    const io = (req as any).io;
    
    io.to(`ticket:${ticket.id}`).emit('ticket:called', { 
      ticketId: ticket.id, 
      tokenNumber: ticket.ticketNumber, 
      counterName: ticket.counter.name, 
      counterId: ticket.counter.id 
    });

    io.to(`branch:${ticket.branchId}`).emit('ticket:called', { 
      ticketId: ticket.id, 
      tokenNumber: ticket.ticketNumber, 
      counterName: ticket.counter.name, 
      counterId: ticket.counter.id 
    });

    res.json({ success: true, message: 'Ticket recalled' });
  } catch (error) {
    next(error);
  }
};

export const skipTicket = async (req: Request, res: Response, next: NextFunction) => {
  res.json({ success: true, message: 'Skip logic implemented here' });
};
