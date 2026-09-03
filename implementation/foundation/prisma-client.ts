import { PrismaClient } from '@prisma/client';

/**
 * Single shared Prisma client instance for the whole process.
 * Owned by Foundation. No Feature should instantiate its own PrismaClient —
 * all persistence goes through Foundation services (FP-01/FP-02/FP-03),
 * never direct DB access from a Feature.
 */
export const prisma = new PrismaClient();
