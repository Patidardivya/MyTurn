import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@myturn.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@myturn.com',
      passwordHash,
      role: 'ADMIN'
    }
  });

  const provider = await prisma.user.upsert({
    where: { email: 'provider@myturn.com' },
    update: {},
    create: {
      name: 'HDFC Branch Manager',
      email: 'provider@myturn.com',
      passwordHash,
      role: 'SERVICE_PROVIDER'
    }
  });

  const user = await prisma.user.upsert({
    where: { email: 'user@myturn.com' },
    update: {},
    create: {
      name: 'Regular Customer',
      email: 'user@myturn.com',
      passwordHash,
      role: 'USER'
    }
  });

  // Organization
  let org = await prisma.organization.findFirst({ where: { name: 'HDFC Bank' } });
  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: 'HDFC Bank',
        description: 'Leading private sector bank',
        status: 'APPROVED',
        category: 'Banking'
      }
    });
  }

  // Branch
  let branch = await prisma.branch.findFirst({ where: { name: 'Jaipur Main' } });
  if (!branch) {
    branch = await prisma.branch.create({
      data: {
        name: 'Jaipur Main',
        organizationId: org.id,
        address: 'MG Road, Jaipur',
        city: 'Jaipur'
      }
    });
  }

  // Service
  let service = await prisma.service.findFirst({ where: { name: 'Account Services' } });
  if (!service) {
    service = await prisma.service.create({
      data: {
        name: 'Account Services',
        branchId: branch.id,
        estimatedDuration: 15
      }
    });
  }

  // Queue
  let queue = await prisma.queue.findFirst({ where: { branchId: branch.id } });
  if (!queue) {
    queue = await prisma.queue.create({
      data: {
        branchId: branch.id,
        serviceId: service.id
      }
    });
  }

  // Counter
  let counter = await prisma.counter.findFirst({ where: { name: 'Counter 1' } });
  if (!counter) {
    counter = await prisma.counter.create({
      data: {
        name: 'Counter 1',
        branchId: branch.id,
        status: 'ACTIVE'
      }
    });
  }

  console.log({ admin, provider, user, org, branch, service, queue, counter });
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
