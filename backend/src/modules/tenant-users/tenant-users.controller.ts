import { withTenantRole } from '../../middlewares/access.middleware';
import { isTenantMemberRole } from '../../services/auth.service';
import { writeAuditLog } from '../../services/audit.service';
import type { RouteDeps } from '../deps';
import { createTenantUsersService } from './tenant-users.service';

const userSelect = {
  id: true,
  username: true,
  email: true,
  fullName: true,
  displayName: true,
  phone: true,
  profilePhoto: true,
  accountStatus: true,
  lastLoginAt: true,
  platformRole: true,
  isActive: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const createTenantUsersController = (deps: RouteDeps) => {
  const { prisma, tenantService } = deps;
  const service = createTenantUsersService(deps);

  const listUsers = withTenantRole(
    ['OWNER', 'TENANT_ADMIN'],
    'Sem permissao para listar usuarios',
    async (request, reply, payload) => {
      const tenant = await tenantService.resolveTenantContext(request, payload, reply);
      if (!tenant) return;
      const query = request.query as { includeDeleted?: string };
      const includeDeleted = query.includeDeleted === 'true' || query.includeDeleted === '1';
      return service.listUsers(tenant.id, includeDeleted);
    }
  );

  const createUser = withTenantRole(
    ['OWNER', 'TENANT_ADMIN'],
    'Sem permissao para criar usuarios',
    async (request, reply, payload) => {
      const tenant = await tenantService.resolveTenantContext(request, payload, reply);
      if (!tenant) return;

      const body = request.body as {
        username?: string;
        email?: string;
        fullName?: string;
        password?: string;
        displayName?: string;
        phone?: string;
        profilePhoto?: string;
        status?: string;
        role?: string;
      };
      const result = await service.createTenantUser(tenant.id, body);
      if ('error' in result) {
        return reply.status(400).send({ error: result.error });
      }

      await writeAuditLog(request, {
        action: 'TENANT_USER_CREATE',
        actorUsername: payload.sub,
        actorPlatformRole: payload.platformRole,
        actorTenantRole: payload.tenantRole,
        actorTenantId: payload.tenantId,
        targetUsername: result.user.username,
        targetTenantId: result.tenantId,
        metadata: {
          role: result.role,
        },
      });

      return result;
    }
  );

  const updateRole = withTenantRole(
    ['OWNER', 'TENANT_ADMIN'],
    'Sem permissao para alterar papel de usuario',
    async (request, reply, payload) => {
      const tenant = await tenantService.resolveTenantContext(request, payload, reply);
      if (!tenant) return;

      const params = request.params as { userId?: string };
      const userId = Number(params.userId);
      const body = request.body as { role?: string };
      const memberRoleRaw = body.role?.trim().toUpperCase() || '';

      if (!Number.isFinite(userId)) {
        return reply.status(400).send({ error: 'userId invalido' });
      }
      if (!isTenantMemberRole(memberRoleRaw)) {
        return reply.status(400).send({ error: 'role invalida. Use OWNER, TENANT_ADMIN, OPERATOR ou VIEWER' });
      }

      const previousMembership = await prisma.membership.findUnique({
        where: { userId_tenantId: { userId, tenantId: tenant.id } },
      });

      const membership = await prisma.membership.update({
        where: { userId_tenantId: { userId, tenantId: tenant.id } },
        data: { role: memberRoleRaw },
        include: { user: { select: userSelect } },
      });

      await writeAuditLog(request, {
        action: 'TENANT_USER_ROLE_UPDATE',
        actorUsername: payload.sub,
        actorPlatformRole: payload.platformRole,
        actorTenantRole: payload.tenantRole,
        actorTenantId: payload.tenantId,
        targetUsername: membership.user.username,
        targetTenantId: membership.tenantId,
        metadata: {
          beforeRole: previousMembership?.role,
          afterRole: membership.role,
        },
      });

      return {
        membershipId: membership.id,
        membershipDeletedAt: membership.deletedAt?.toISOString() ?? null,
        role: membership.role,
        tenantId: membership.tenantId,
        user: membership.user,
      };
    }
  );

  const archiveUser = withTenantRole(
    ['OWNER', 'TENANT_ADMIN'],
    'Sem permissao para remover usuario da organizacao',
    async (request, reply, payload) => {
      const tenant = await tenantService.resolveTenantContext(request, payload, reply);
      if (!tenant) return;

      const userId = Number((request.params as { userId?: string }).userId);
      if (!Number.isFinite(userId)) return reply.status(400).send({ error: 'userId invalido' });

      const membership = await prisma.membership.findUnique({
        where: { userId_tenantId: { userId, tenantId: tenant.id } },
        include: { user: { select: userSelect } },
      });
      if (!membership) return reply.status(404).send({ error: 'Usuario nao pertence a organizacao' });

      const updated = await prisma.membership.update({
        where: { userId_tenantId: { userId, tenantId: tenant.id } },
        data: { deletedAt: new Date() },
        include: { user: { select: userSelect } },
      });

      await writeAuditLog(request, {
        action: 'TENANT_USER_ARCHIVE',
        actorUsername: payload.sub,
        actorPlatformRole: payload.platformRole,
        actorTenantRole: payload.tenantRole,
        actorTenantId: payload.tenantId,
        targetUsername: updated.user.username,
        targetTenantId: updated.tenantId,
        metadata: {
          beforeDeletedAt: membership.deletedAt?.toISOString() ?? null,
          afterDeletedAt: updated.deletedAt?.toISOString() ?? null,
        },
      });

      return {
        membershipId: updated.id,
        membershipDeletedAt: updated.deletedAt?.toISOString() ?? null,
        role: updated.role,
        tenantId: updated.tenantId,
        user: updated.user,
      };
    }
  );

  const restoreUser = withTenantRole(
    ['OWNER', 'TENANT_ADMIN'],
    'Sem permissao para restaurar usuario da organizacao',
    async (request, reply, payload) => {
      const tenant = await tenantService.resolveTenantContext(request, payload, reply);
      if (!tenant) return;

      const userId = Number((request.params as { userId?: string }).userId);
      if (!Number.isFinite(userId)) return reply.status(400).send({ error: 'userId invalido' });

      const membership = await prisma.membership.findUnique({
        where: { userId_tenantId: { userId, tenantId: tenant.id } },
        include: { user: { select: userSelect } },
      });
      if (!membership) return reply.status(404).send({ error: 'Usuario nao pertence a organizacao' });

      if (membership.user.deletedAt) {
        await prisma.user.update({
          where: { id: membership.user.id },
          data: { deletedAt: null },
        });
      }

      const updated = await prisma.membership.update({
        where: { userId_tenantId: { userId, tenantId: tenant.id } },
        data: { deletedAt: null },
        include: { user: { select: userSelect } },
      });

      await writeAuditLog(request, {
        action: 'TENANT_USER_RESTORE',
        actorUsername: payload.sub,
        actorPlatformRole: payload.platformRole,
        actorTenantRole: payload.tenantRole,
        actorTenantId: payload.tenantId,
        targetUsername: updated.user.username,
        targetTenantId: updated.tenantId,
        metadata: {
          beforeDeletedAt: membership.deletedAt?.toISOString() ?? null,
          afterDeletedAt: updated.deletedAt,
        },
      });

      return {
        membershipId: updated.id,
        membershipDeletedAt: updated.deletedAt?.toISOString() ?? null,
        role: updated.role,
        tenantId: updated.tenantId,
        user: updated.user,
      };
    }
  );

  return {
    listUsers,
    createUser,
    updateRole,
    archiveUser,
    restoreUser,
  };
};
