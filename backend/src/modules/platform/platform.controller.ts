import type { FastifyReply, FastifyRequest } from 'fastify';
import { withSuperAdmin } from '../../middlewares/access.middleware';
import { isAccountStatus } from '../../services/auth.service';
import { writeAuditLog } from '../../services/audit.service';
import type { RouteDeps } from '../deps';
import { createPlatformService } from './platform.service';

export const createPlatformController = (deps: RouteDeps) => {
  const { prisma, tenantService } = deps;
  const service = createPlatformService(deps);

  const listTenants = withSuperAdmin(async (request) => {
    const query = request.query as { includeDeleted?: string };
    const includeDeleted = query.includeDeleted === 'true' || query.includeDeleted === '1';
    return service.listTenants(includeDeleted);
  });

  const listAudit = withSuperAdmin(async (request) => {
    const query = request.query as {
      tenantId?: string;
      actorUsername?: string;
      action?: string;
      from?: string;
      to?: string;
      limit?: string;
    };
    return service.listAudit(query);
  });

  const listDevices = withSuperAdmin(async () => {
    const devices = await prisma.device.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            tradeName: true,
          },
        },
        _count: {
          select: {
            readings: true,
          },
        },
      },
    });

    return devices.map((device) => ({
      id: device.id,
      externalId: device.externalId,
      name: device.name,
      isActive: device.isActive,
      tenantId: device.tenantId,
      tenantName: device.tenant?.tradeName || device.tenant?.name || 'Estoque Interno',
      createdAt: device.createdAt.toISOString(),
      updatedAt: device.updatedAt.toISOString(),
      readingsCount: device._count.readings,
    }));
  });

  const createDevice = withSuperAdmin(async (request, reply) => {
    const body = request.body as {
      externalId?: string;
      name?: string;
      tenantId?: number | string;
    };

    const externalId = String(body.externalId || '').trim().toUpperCase();
    const name = String(body.name || '').trim();

    if (!externalId || !name) {
      return reply.status(400).send({ error: 'externalId e name sao obrigatorios' });
    }

    let targetTenantId = Number(body.tenantId ?? NaN);
    if (!Number.isFinite(targetTenantId)) {
      const stockTenant = await tenantService.ensureTenant('Estoque Interno', 'estoque-interno');
      targetTenantId = stockTenant.id;
    } else {
      const tenant = await prisma.tenant.findUnique({ where: { id: targetTenantId } });
      if (!tenant) {
        return reply.status(404).send({ error: 'Organizacao nao encontrada' });
      }
    }

    try {
      const created = await prisma.device.create({
        data: {
          tenantId: targetTenantId,
          externalId,
          name,
          isActive: true,
        },
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              tradeName: true,
            },
          },
          _count: {
            select: {
              readings: true,
            },
          },
        },
      });

      return {
        id: created.id,
        externalId: created.externalId,
        name: created.name,
        isActive: created.isActive,
        tenantId: created.tenantId,
        tenantName: created.tenant?.tradeName || created.tenant?.name || 'Estoque Interno',
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
        readingsCount: created._count.readings,
      };
    } catch (error: any) {
      if (error?.code === 'P2002') {
        return reply.status(409).send({ error: 'Ja existe um dispositivo com este identificador' });
      }
      return reply.status(500).send({ error: 'Falha ao cadastrar dispositivo' });
    }
  });

  const linkDeviceToTenant = withSuperAdmin(async (request, reply) => {
    const params = request.params as { tenantId?: string };
    const body = request.body as { deviceId?: number | string };
    const tenantId = Number(params.tenantId);
    const deviceId = Number(body.deviceId);

    if (!Number.isFinite(tenantId) || !Number.isFinite(deviceId)) {
      return reply.status(400).send({ error: 'tenantId e deviceId sao obrigatorios' });
    }

    const [tenant, device] = await Promise.all([
      prisma.tenant.findUnique({ where: { id: tenantId } }),
      prisma.device.findUnique({ where: { id: deviceId } }),
    ]);

    if (!tenant || tenant.deletedAt || tenant.accountStatus !== 'ACTIVE') {
      return reply.status(404).send({ error: 'Organizacao nao encontrada ou inativa' });
    }
    if (!device) {
      return reply.status(404).send({ error: 'Dispositivo nao encontrado' });
    }

    const updated = await prisma.device.update({
      where: { id: deviceId },
      data: { tenantId, updatedAt: new Date() },
      include: {
        _count: { select: { readings: true } },
      },
    });

    return {
      id: updated.id,
      externalId: updated.externalId,
      name: updated.name,
      isActive: updated.isActive,
      tenantId: updated.tenantId,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      readingsCount: updated._count.readings,
    };
  });

  const unlinkDeviceToStock = withSuperAdmin(async (request, reply) => {
    const params = request.params as { tenantId?: string; deviceId?: string };
    const tenantId = Number(params.tenantId);
    const deviceId = Number(params.deviceId);

    if (!Number.isFinite(tenantId) || !Number.isFinite(deviceId)) {
      return reply.status(400).send({ error: 'tenantId e deviceId sao obrigatorios' });
    }

    const stockTenant = await tenantService.ensureTenant('Estoque Interno', 'estoque-interno');
    const device = await prisma.device.findUnique({ where: { id: deviceId } });
    if (!device || device.tenantId !== tenantId) {
      return reply.status(404).send({ error: 'Dispositivo nao encontrado nesta organizacao' });
    }

    const updated = await prisma.device.update({
      where: { id: deviceId },
      data: { tenantId: stockTenant.id, updatedAt: new Date() },
      include: {
        _count: { select: { readings: true } },
      },
    });

    return {
      id: updated.id,
      externalId: updated.externalId,
      name: updated.name,
      isActive: updated.isActive,
      tenantId: updated.tenantId,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      readingsCount: updated._count.readings,
    };
  });

  const renameTenantDevice = withSuperAdmin(async (request, reply) => {
    const params = request.params as { tenantId?: string; deviceId?: string };
    const body = request.body as { name?: string };
    const tenantId = Number(params.tenantId);
    const deviceId = Number(params.deviceId);
    const name = String(body.name || '').trim();

    if (!Number.isFinite(tenantId) || !Number.isFinite(deviceId) || !name) {
      return reply.status(400).send({ error: 'tenantId, deviceId e name sao obrigatorios' });
    }

    const device = await prisma.device.findUnique({ where: { id: deviceId } });
    if (!device || device.tenantId !== tenantId) {
      return reply.status(404).send({ error: 'Dispositivo nao encontrado nesta organizacao' });
    }

    const updated = await prisma.device.update({
      where: { id: deviceId },
      data: { name, updatedAt: new Date() },
      include: {
        _count: { select: { readings: true } },
      },
    });

    return {
      id: updated.id,
      externalId: updated.externalId,
      name: updated.name,
      isActive: updated.isActive,
      tenantId: updated.tenantId,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      readingsCount: updated._count.readings,
    };
  });

  const createTenant = withSuperAdmin(async (request, reply, payload) => {
    const body = request.body as {
      name?: string;
      slug?: string;
      tradeName?: string;
      legalName?: string;
      cnpj?: string;
      accountStatus?: string;
      owner?: {
        username?: string;
        email?: string;
        fullName?: string;
        phone?: string;
        password?: string;
        role?: string;
      };
    };

    const result = await service.createTenantWithOwner(body);
    if ('error' in result) {
      return reply.status(400).send({ error: result.error });
    }

    await writeAuditLog(request, {
      action: 'PLATFORM_TENANT_CREATE',
      actorUsername: payload.sub,
      actorPlatformRole: payload.platformRole,
      actorTenantRole: payload.tenantRole,
      actorTenantId: payload.tenantId,
      targetTenantId: result.tenant.id,
      metadata: {
        name: result.tenant.name,
        tradeName: result.tenant.tradeName,
        legalName: result.tenant.legalName,
        slug: result.tenant.slug,
        cnpj: result.tenant.cnpj,
        accountStatus: result.tenant.accountStatus,
        ownerCreated: result.metadata.ownerCreated,
        ownerRole: result.metadata.ownerRole,
      },
    });

    return result.tenant;
  });

  const updateTenant = withSuperAdmin(async (request, reply, payload) => {
    const params = request.params as { tenantId?: string };
    const tenantId = Number(params.tenantId);
    if (!Number.isFinite(tenantId)) {
      return reply.status(400).send({ error: 'tenantId invalido' });
    }

    const body = request.body as {
      name?: string;
      tradeName?: string;
      legalName?: string;
      cnpj?: string;
      slug?: string;
      accountStatus?: string;
    };

    const current = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!current || current.deletedAt) {
      return reply.status(404).send({ error: 'Organizacao nao encontrada' });
    }

    const nextAccountStatusRaw = body.accountStatus?.trim().toUpperCase();
    const nextAccountStatus = nextAccountStatusRaw
      ? isAccountStatus(nextAccountStatusRaw)
        ? nextAccountStatusRaw
        : null
      : undefined;

    if (nextAccountStatusRaw && !nextAccountStatus) {
      return reply.status(400).send({ error: 'accountStatus invalido' });
    }

    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        name: body.name?.trim() || current.name,
        tradeName: body.tradeName?.trim() || current.tradeName,
        legalName: body.legalName?.trim() || current.legalName,
        cnpj: body.cnpj?.trim() || current.cnpj,
        slug: body.slug?.trim().toLowerCase() || current.slug,
        accountStatus: nextAccountStatus ?? current.accountStatus,
        isActive: (nextAccountStatus ?? current.accountStatus) === 'ACTIVE',
        deletedAt: (nextAccountStatus ?? current.accountStatus) === 'ACTIVE' ? null : current.deletedAt,
      },
    });

    await writeAuditLog(request, {
      action: 'PLATFORM_TENANT_UPDATE',
      actorUsername: payload.sub,
      actorPlatformRole: payload.platformRole,
      actorTenantRole: payload.tenantRole,
      actorTenantId: payload.tenantId,
      targetTenantId: updated.id,
      metadata: {
        before: {
          name: current.name,
          tradeName: current.tradeName,
          legalName: current.legalName,
          cnpj: current.cnpj,
          slug: current.slug,
          accountStatus: current.accountStatus,
        },
        after: {
          name: updated.name,
          tradeName: updated.tradeName,
          legalName: updated.legalName,
          cnpj: updated.cnpj,
          slug: updated.slug,
          accountStatus: updated.accountStatus,
        },
      },
    });

    return updated;
  });

  const suspendTenant = withSuperAdmin(async (request, reply, payload) => {
    const params = request.params as { tenantId?: string };
    const tenantId = Number(params.tenantId);
    if (!Number.isFinite(tenantId)) {
      return reply.status(400).send({ error: 'tenantId invalido' });
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant || tenant.deletedAt) {
      return reply.status(404).send({ error: 'Organizacao nao encontrada' });
    }

    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        accountStatus: 'SUSPENDED',
        isActive: false,
      },
    });

    await writeAuditLog(request, {
      action: 'PLATFORM_TENANT_STATUS_UPDATE',
      actorUsername: payload.sub,
      actorPlatformRole: payload.platformRole,
      actorTenantRole: payload.tenantRole,
      actorTenantId: payload.tenantId,
      targetTenantId: updated.id,
      metadata: {
        beforeStatus: tenant.accountStatus,
        afterStatus: updated.accountStatus,
      },
    });

    return updated;
  });

  const reactivateTenant = withSuperAdmin(async (request, reply, payload) => {
    const params = request.params as { tenantId?: string };
    const tenantId = Number(params.tenantId);
    if (!Number.isFinite(tenantId)) {
      return reply.status(400).send({ error: 'tenantId invalido' });
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      return reply.status(404).send({ error: 'Organizacao nao encontrada' });
    }

    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        accountStatus: 'ACTIVE',
        isActive: true,
        deletedAt: null,
      },
    });

    await writeAuditLog(request, {
      action: 'PLATFORM_TENANT_STATUS_UPDATE',
      actorUsername: payload.sub,
      actorPlatformRole: payload.platformRole,
      actorTenantRole: payload.tenantRole,
      actorTenantId: payload.tenantId,
      targetTenantId: updated.id,
      metadata: {
        beforeStatus: tenant.accountStatus,
        afterStatus: updated.accountStatus,
      },
    });

    return updated;
  });

  const archiveTenant = withSuperAdmin(async (request, reply, payload) => {
    const params = request.params as { tenantId?: string };
    const tenantId = Number(params.tenantId);
    if (!Number.isFinite(tenantId)) {
      return reply.status(400).send({ error: 'tenantId invalido' });
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      return reply.status(404).send({ error: 'Organizacao nao encontrada' });
    }

    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        deletedAt: new Date(),
        accountStatus: 'CANCELLED',
        isActive: false,
      },
    });

    await writeAuditLog(request, {
      action: 'PLATFORM_TENANT_ARCHIVE',
      actorUsername: payload.sub,
      actorPlatformRole: payload.platformRole,
      actorTenantRole: payload.tenantRole,
      actorTenantId: payload.tenantId,
      targetTenantId: updated.id,
      metadata: {
        beforeDeletedAt: tenant.deletedAt?.toISOString() ?? null,
        afterDeletedAt: updated.deletedAt?.toISOString() ?? null,
        beforeStatus: tenant.accountStatus,
        afterStatus: updated.accountStatus,
      },
    });

    return updated;
  });

  const restoreTenant = withSuperAdmin(async (request, reply, payload) => {
    const params = request.params as { tenantId?: string };
    const tenantId = Number(params.tenantId);
    if (!Number.isFinite(tenantId)) {
      return reply.status(400).send({ error: 'tenantId invalido' });
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      return reply.status(404).send({ error: 'Organizacao nao encontrada' });
    }

    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        deletedAt: null,
        accountStatus: 'ACTIVE',
        isActive: true,
      },
    });

    await writeAuditLog(request, {
      action: 'PLATFORM_TENANT_RESTORE',
      actorUsername: payload.sub,
      actorPlatformRole: payload.platformRole,
      actorTenantRole: payload.tenantRole,
      actorTenantId: payload.tenantId,
      targetTenantId: updated.id,
      metadata: {
        beforeDeletedAt: tenant.deletedAt?.toISOString() ?? null,
        afterDeletedAt: updated.deletedAt,
        beforeStatus: tenant.accountStatus,
        afterStatus: updated.accountStatus,
      },
    });

    return updated;
  });

  return {
    listTenants,
    listAudit,
    listDevices,
    createDevice,
    linkDeviceToTenant,
    unlinkDeviceToStock,
    renameTenantDevice,
    createTenant,
    updateTenant,
    suspendTenant,
    reactivateTenant,
    archiveTenant,
    restoreTenant,
  };
};
