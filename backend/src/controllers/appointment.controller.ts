import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../config/db';

const appointmentSchema = z.object({
  serviceId: z.string().uuid(),
  scheduledDate: z.coerce.date(),
  scheduledTime: z.string().trim().min(1),
});

export const createAppointment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const data = appointmentSchema.parse(req.body);
    if (data.scheduledDate < new Date()) {
      return res.status(400).json({ success: false, message: 'Appointment date must be in the future' });
    }
    const service = await prisma.service.findFirst({
      where: { id: data.serviceId, isActive: true, appointmentEnabled: true },
      select: { id: true, branchId: true },
    });
    if (!service) return res.status(404).json({ success: false, message: 'Appointment service not found' });
    const appointment = await prisma.appointment.create({
      data: { ...data, userId, branchId: service.branchId },
      include: { service: true, branch: true },
    });
    res.status(201).json({ success: true, appointment });
  } catch (error) {
    next(error);
  }
};

export const listAppointments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const isProvider = req.user!.role === 'SERVICE_PROVIDER' || req.user!.role === 'ADMIN';
    const userId = typeof req.query.userId === 'string' ? req.query.userId : req.user!.userId;
    const appointments = await prisma.appointment.findMany({
      where: isProvider && typeof req.query.branchId === 'string'
        ? { branchId: req.query.branchId }
        : { userId },
      orderBy: [{ scheduledDate: 'asc' }, { scheduledTime: 'asc' }],
      include: { service: true, branch: true, user: { select: { id: true, name: true, email: true } } },
    });
    res.json({ success: true, appointments });
  } catch (error) {
    next(error);
  }
};

export const getAppointment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (typeof id !== 'string') return res.status(400).json({ success: false, message: 'Invalid appointment ID' });
    const appointment = await prisma.appointment.findUnique({ where: { id }, include: { service: true, branch: true } });
    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });
    if (req.user!.role === 'USER' && appointment.userId !== req.user!.userId) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    res.json({ success: true, appointment });
  } catch (error) {
    next(error);
  }
};

export const cancelAppointment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (typeof id !== 'string') return res.status(400).json({ success: false, message: 'Invalid appointment ID' });
    const appointment = await prisma.appointment.findUnique({ where: { id } });
    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });
    if (req.user!.role === 'USER' && appointment.userId !== req.user!.userId) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    if (['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(appointment.status)) {
      return res.status(400).json({ success: false, message: `Cannot cancel appointment in status: ${appointment.status}` });
    }
    const updated = await prisma.appointment.update({ where: { id }, data: { status: 'CANCELLED' } });
    res.json({ success: true, appointment: updated });
  } catch (error) {
    next(error);
  }
};

export const updateAppointmentStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (typeof id !== 'string') return res.status(400).json({ success: false, message: 'Invalid appointment ID' });
    const { status } = z.object({ status: z.enum(['UPCOMING', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED', 'NO_SHOW']) }).parse(req.body);
    const appointment = await prisma.appointment.update({ where: { id }, data: { status } });
    res.json({ success: true, appointment });
  } catch (error) {
    next(error);
  }
};
