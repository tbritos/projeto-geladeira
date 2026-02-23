import type { FastifyReply, FastifyRequest } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { BOOTSTRAP_USERS } from '../config/bootstrap';
import { DEFAULT_TENANT_SLUG, FALLBACK_MAX_TEMP, FALLBACK_MIN_TEMP } from '../config/env';
import type { JwtPayload, OrganizationOption } from '../shared/types';

export const createTenantService = (prisma: PrismaClient) => {
  const ensureTenant = async (name: string, slug: string) => {
    return prisma.tenant.upsert({
      where: { slug },
      update: { isActive: true, accountStatus: 'ACTIVE', deletedAt: null },
      create: { name, slug, accountStatus: 'ACTIVE' },
    });
  };

  const getTemperatureSettings = async (tenantId: number) => {
    return prisma.temperatureSetting.upsert({
      where: { tenantId },
      update: {},
      create: {
        tenantId,
        minTemp: FALLBACK_MIN_TEMP,
        maxTemp: FALLBACK_MAX_TEMP,
      },
    });
  };

  const resolveTenantContext = async (request: FastifyRequest, payload: JwtPayload, reply: FastifyReply) => {
    const queryTenantId = Number((request.query as { tenantId?: string })?.tenantId ?? NaN);
    const headerTenantId = Number(request.headers['x-tenant-id'] ?? NaN);

    let tenantId: number | undefined;

    if (payload.platformRole === 'SUPER_ADMIN') {
      if (Number.isFinite(headerTenantId)) {
        tenantId = headerTenantId;
      } else if (Number.isFinite(queryTenantId)) {
        tenantId = queryTenantId;
      } else if (payload.tenantId) {
        tenantId = payload.tenantId;
      }
    } else {
      tenantId = payload.tenantId;
    }

    if (!tenantId) {
      reply.status(403).send({ error: 'Tenant nao definido para a sessao' });
      return null;
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant || !tenant.isActive || tenant.deletedAt || tenant.accountStatus !== 'ACTIVE') {
      reply.status(403).send({ error: 'Tenant invalido ou inativo' });
      return null;
    }

    return tenant;
  };

  const buildOrganizationOptions = async (userId: number): Promise<OrganizationOption[]> => {
    const memberships = await prisma.membership.findMany({
      where: {
        userId,
        deletedAt: null,
        tenant: {
          isActive: true,
          deletedAt: null,
        },
      },
      include: {
        tenant: true,
      },
      orderBy: {
        tenant: {
          name: 'asc',
        },
      },
    });

    return memberships.map((membership) => ({
      tenantId: membership.tenantId,
      tenantName: membership.tenant.name,
      tenantSlug: membership.tenant.slug,
      role: membership.role as OrganizationOption['role'],
      accountStatus: membership.tenant.accountStatus as OrganizationOption['accountStatus'],
    }));
  };

  const upsertBootstrapUser = async (
    tenantId: number,
    config: { username: string; passwordHash: string; platformRole: 'SUPER_ADMIN' | 'USER'; tenantRole: string }
  ) => {
    const user = await prisma.user.upsert({
      where: { username: config.username },
      update: {
        platformRole: config.platformRole,
        isActive: true,
        accountStatus: 'ACTIVE',
        deletedAt: null,
        passwordHash: config.passwordHash,
      },
      create: {
        username: config.username,
        platformRole: config.platformRole,
        isActive: true,
        accountStatus: 'ACTIVE',
        passwordHash: config.passwordHash,
        displayName: config.username,
      },
    });

    await prisma.membership.upsert({
      where: {
        userId_tenantId: {
          userId: user.id,
          tenantId,
        },
      },
      update: {
        role: config.tenantRole,
        deletedAt: null,
      },
      create: {
        userId: user.id,
        tenantId,
        role: config.tenantRole,
      },
    });
  };

  const bootstrap = async () => {
    const defaultTenant = await ensureTenant('Cliente Padrao', DEFAULT_TENANT_SLUG);

    await prisma.device.upsert({
      where: { externalId: 'tupa-01' },
      update: { tenantId: defaultTenant.id, isActive: true },
      create: {
        tenantId: defaultTenant.id,
        externalId: 'tupa-01',
        name: 'Dispositivo Padrao',
        isActive: true,
      },
    });

    await getTemperatureSettings(defaultTenant.id);

    for (const bootstrapUser of BOOTSTRAP_USERS) {
      await upsertBootstrapUser(defaultTenant.id, bootstrapUser);
    }
  };

  return {
    ensureTenant,
    getTemperatureSettings,
    resolveTenantContext,
    buildOrganizationOptions,
    bootstrap,
  };
};

export type TenantService = ReturnType<typeof createTenantService>;
