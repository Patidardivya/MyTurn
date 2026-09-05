import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../config/db';

const branchSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().trim().min(2),
  address: z.string().trim().optional(),
  city: z.string().trim().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  openingTime: z.string().trim().optional(),
  closingTime: z.string().trim().optional(),
});

export const listBranches = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = typeof req.query.organizationId === 'string' ? req.query.organizationId : undefined;
    const branches = await prisma.branch.findMany({
      where: { isActive: true, organizationId },
      orderBy: { name: 'asc' },
      include: { organization: true, services: { where: { isActive: true }, orderBy: { name: 'asc' } } },
    });
    res.json({ success: true, branches });
  } catch (error) {
    next(error);
  }
};

export const getBranch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (typeof id !== 'string') return res.status(400).json({ success: false, message: 'Invalid branch ID' });
    const branch = await prisma.branch.findFirst({
      where: { id, isActive: true },
      include: {
        organization: true,
        services: { where: { isActive: true }, orderBy: { name: 'asc' } },
        queues: { where: { isActive: true } },
      },
    });
    if (!branch) return res.status(404).json({ success: false, message: 'Branch not found' });
    res.json({ success: true, branch });
  } catch (error) {
    next(error);
  }
};

export const createBranch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = branchSchema.parse(req.body);
    const organization = await prisma.organization.findUnique({ where: { id: data.organizationId } });
    if (!organization) return res.status(404).json({ success: false, message: 'Organization not found' });
    const branch = await prisma.branch.create({ data });
    res.status(201).json({ success: true, branch });
  } catch (error) {
    next(error);
  }
};

export const updateBranch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (typeof id !== 'string') return res.status(400).json({ success: false, message: 'Invalid branch ID' });
    const { organizationId: _organizationId, ...updates } = branchSchema.partial().parse(req.body);
    const branch = await prisma.branch.update({ where: { id }, data: updates });
    res.json({ success: true, branch });
  } catch (error) {
    next(error);
  }
};
