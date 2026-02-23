import 'dotenv/config';

import Fastify from 'fastify';
import cors from '@fastify/cors';
import { JWT_SECRET } from './config/env';
import { prisma } from './lib/prisma';
import { registerAuthRoutes } from './modules/auth/auth.routes';
import { registerCoreRoutes } from './modules/core/core.routes';
import { registerPlatformRoutes } from './modules/platform/platform.routes';
import { registerTenantUserRoutes } from './modules/tenant-users/tenant-users.routes';
import { createTenantService } from './services/tenant.service';

export const buildApp = () => {
  const app = Fastify({ logger: true });
  const tenantService = createTenantService(prisma);

  if (!process.env.JWT_SECRET) {
    app.log.warn('JWT_SECRET nao definido. Configure em producao.');
  }

  app.register(cors, { origin: true });

  const deps = { app, prisma, tenantService };
  registerAuthRoutes(deps);
  registerPlatformRoutes(deps);
  registerTenantUserRoutes(deps);
  registerCoreRoutes(deps);

  return { app, tenantService, prisma, jwtSecret: JWT_SECRET };
};
