import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../config/db';
import { TicketPriority, TicketStatus } from '@prisma/client';

const createTicketSchema = z.object({
  serviceId: z.string(),
  priorityType: z.enum(['NORMAL', 'APPOINTMENT', 'EMERGENCY']).optional().default('NORMAL')
});

export const createTicket = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { serviceId, priorityType } = createTicketSchema.parse(req.body);
    const userId = req.user!.userId;

    // Fetch the service and branch
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      include: { branch: true, queues: true }
    });

    if (!service) return res.status(404).json({ success: false, message: 'Service not found' });

    // Use the first active queue for the service
    const queue = service.queues.find(q => q.isActive) || service.queues[0];
    if (!queue) return res.status(400).json({ success: false, message: 'No active queue for this service' });

    let priorityScore = 0;
    if (priorityType === 'EMERGENCY') priorityScore = 100;
    if (priorityType === 'APPOINTMENT') priorityScore = 50;

    // Generate token number (using a robust atomic-like approach, or fallback to random hash for demo)
    // To be perfectly race-condition free without raw sequences, we can use a random short string
    // e.g., T-XXXX
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    const tokenNumber = `T-${randomPart}`;

    const ticket = await prisma.$transaction(async (tx) => {
      return tx.ticket.create({
        data: {
          ticketNumber: tokenNumber,
          userId,
          queueId: queue.id,
          serviceId: service.id,
          branchId: service.branchId,
          priorityType,
          priorityScore,
          status: 'WAITING',
          estimatedWait: 15, // Simplified ETA for now
        }
      });
    });

    // Emit event
    const io = (req as any).io;
    io.to(`queue:${queue.id}`).emit('queue:updated', { queueId: queue.id, event: 'ticket:created', ticket });
    
    // Also broadcast to public display
    io.to(`branch:${service.branchId}`).emit('queue:updated', { branchId: service.branchId });

    res.status(201).json({ success: true, ticket });
  } catch (error) {
    next(error);
  }
};

export const getTicketStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ticketId = req.params.id;
    if (typeof ticketId !== 'string') {
      return res.status(400).json({ success: false, message: 'Invalid ticket ID' });
    }
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { service: true, counter: true }
    });

    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

    // Calculate position
    const position = await prisma.ticket.count({
      where: {
        queueId: ticket.queueId,
        status: 'WAITING',
        OR: [
          { priorityScore: { gt: ticket.priorityScore } },
          { priorityScore: ticket.priorityScore, createdAt: { lt: ticket.createdAt } }
        ]
      }
    });

    res.json({
      success: true,
      ticket: {
        ...ticket,
        position: ticket.status === 'WAITING' ? position + 1 : null
      }
    });
  } catch (error) {
    next(error);
  }
};

export const cancelTicket = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ticketId = req.params.id;
    if (typeof ticketId !== 'string') {
      return res.status(400).json({ success: false, message: 'Invalid ticket ID' });
    }
    const userId = req.user!.userId;

    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    if (ticket.userId !== userId && req.user!.role === 'USER') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    if (ticket.status !== 'WAITING') {
      return res.status(400).json({ success: false, message: `Cannot cancel ticket in status: ${ticket.status}` });
    }

    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: { status: 'CANCELLED', cancelledAt: new Date() }
    });

    const io = (req as any).io;
    io.to(`queue:${ticket.queueId}`).emit('queue:updated', { queueId: ticket.queueId, event: 'ticket:cancelled' });
    io.to(`branch:${ticket.branchId}`).emit('queue:updated', { branchId: ticket.branchId });

    res.json({ success: true, ticket: updated });
  } catch (error) {
    next(error);
  }
};

export const completeTicket = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ticketId = req.params.id;
    if (typeof ticketId !== 'string') {
      return res.status(400).json({ success: false, message: 'Invalid ticket ID' });
    }
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    if (ticket.status !== 'SERVING') {
      return res.status(400).json({ success: false, message: `Cannot complete ticket in status: ${ticket.status}` });
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Clear counter's current ticket
      if (ticket.counterId) {
        await tx.counter.update({
          where: { id: ticket.counterId },
          data: { currentTicketId: null }
        });
      }
      return tx.ticket.update({
        where: { id: ticketId },
        data: { status: 'COMPLETED', completedAt: new Date() }
      });
    });

    const io = (req as any).io;
    io.to(`ticket:${ticketId}`).emit('ticket:completed', { ticketId });
    io.to(`queue:${ticket.queueId}`).emit('queue:updated', { queueId: ticket.queueId, event: 'ticket:completed' });
    io.to(`branch:${ticket.branchId}`).emit('queue:updated', { branchId: ticket.branchId });

    res.json({ success: true, ticket: updated });
  } catch (error) {
    next(error);
  }
};

export const noShowTicket = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ticketId = req.params.id;
    if (typeof ticketId !== 'string') {
      return res.status(400).json({ success: false, message: 'Invalid ticket ID' });
    }
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    if (ticket.status !== 'SERVING') {
      return res.status(400).json({ success: false, message: `Cannot mark no-show for ticket in status: ${ticket.status}` });
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (ticket.counterId) {
        await tx.counter.update({
          where: { id: ticket.counterId },
          data: { currentTicketId: null }
        });
      }
      return tx.ticket.update({
        where: { id: ticketId },
        data: { status: 'NO_SHOW' }
      });
    });

    const io = (req as any).io;
    io.to(`ticket:${ticketId}`).emit('ticket:no_show', { ticketId });
    io.to(`queue:${ticket.queueId}`).emit('queue:updated', { queueId: ticket.queueId, event: 'ticket:no_show' });
    io.to(`branch:${ticket.branchId}`).emit('queue:updated', { branchId: ticket.branchId });

    res.json({ success: true, ticket: updated });
  } catch (error) {
    next(error);
  }
};

export const transferTicket = async (req: Request, res: Response, next: NextFunction) => {
  // Transfer logic placeholder
  res.json({ success: true, message: 'Transfer implemented here' });
};
