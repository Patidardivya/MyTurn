import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../config/db';

const organizationSchema = z.object({
  name: z.string().trim().min(2),
  description: z.string().trim().optional(),
  logo: z.string().url().optional(),
  category: z.string().trim().optional(),
});

export const listOrganizations = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const organizations = await prisma.organization.findMany({
      where: { status: { in: ['APPROVED', 'ACTIVE'] } },
      orderBy: { name: 'asc' },
      include: { branches: { where: { isActive: true }, orderBy: { name: 'asc' } } },
    });
    res.json({ success: true, organizations });
  } catch (error) {
    next(error);
  }
};

export const getOrganization = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (typeof id !== 'string') return res.status(400).json({ success: false, message: 'Invalid organization ID' });
    const organization = await prisma.organization.findFirst({
      where: { id, status: { in: ['APPROVED', 'ACTIVE'] } },
      include: { branches: { where: { isActive: true }, orderBy: { name: 'asc' } } },
    });
    if (!organization) return res.status(404).json({ success: false, message: 'Organization not found' });
    res.json({ success: true, organization });
  } catch (error) {
    next(error);
  }
};

export const createOrganization = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organization = await prisma.organization.create({
      data: { ...organizationSchema.parse(req.body), status: 'ACTIVE' },
    });
    res.status(201).json({ success: true, organization });
  } catch (error) {
    next(error);
  }
};

export const updateOrganization = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (typeof id !== 'string') return res.status(400).json({ success: false, message: 'Invalid organization ID' });
    const organization = await prisma.organization.update({
      where: { id },
      data: organizationSchema.partial().parse(req.body),
    });
    res.json({ success: true, organization });
  } catch (error) {
    next(error);
  }
};
