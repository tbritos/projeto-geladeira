import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import type { TenantService } from '../services/tenant.service';

export interface RouteDeps {
  app: FastifyInstance;
  prisma: PrismaClient;
  tenantService: TenantService;
}
