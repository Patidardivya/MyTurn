import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db';

export const getMetrics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const totalUsers = await prisma.user.count({ where: { role: 'USER' } });
    const totalProviders = await prisma.user.count({ where: { role: 'SERVICE_PROVIDER' } });
    const totalOrgs = await prisma.organization.count();
    const today = new Date();
    today.setHours(0,0,0,0);

    const todaysTokens = await prisma.ticket.count({
      where: { createdAt: { gte: today } }
    });

    const completedServices = await prisma.ticket.count({
      where: { status: 'COMPLETED' }
    });

    res.json({
      success: true,
      metrics: {
        totalUsers,
        totalProviders,
        totalOrganizations: totalOrgs,
        todaysTokens,
        completedServices,
        averageWait: 14 // Placeholder for complex avg calc
      }
    });
  } catch (error) {
    next(error);
  }
};

export const approveProvider = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (typeof id !== 'string') {
      return res.status(400).json({ success: false, message: 'Invalid organization ID' });
    }
    const org = await prisma.organization.update({
      where: { id },
      data: { status: 'APPROVED' }
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: req.user!.userId,
        action: 'PROVIDER_APPROVED',
        entityType: 'ORGANIZATION',
        entityId: id,
        metadata: JSON.stringify({ name: org.name })
      }
    });

    res.json({ success: true, organization: org });
  } catch (error) {
    next(error);
  }
};

export const getAuditLogs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { actor: { select: { name: true, email: true } } }
    });
    res.json({ success: true, logs });
  } catch (error) {
    next(error);
  }
};
