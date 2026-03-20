import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function connectPrisma() {
  try {
    await prisma.$connect();
    // eslint-disable-next-line no-console
    console.log('Prisma: connected to database');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Prisma: failed to connect to database', err);
  }
}

connectPrisma();

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  // eslint-disable-next-line no-console
  console.log('Prisma: disconnected on SIGINT');
  process.exit(0);
});

export default prisma;
