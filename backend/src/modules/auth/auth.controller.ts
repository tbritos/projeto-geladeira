import type { FastifyReply, FastifyRequest } from 'fastify';
import bcrypt from 'bcryptjs';
import jwt, { TokenExpiredError } from 'jsonwebtoken';
import { JWT_REFRESH_SECRET, JWT_SECRET } from '../../config/env';
import { withAuth, withSuperAdmin } from '../../middlewares/access.middleware';
import {
  getAccessTokenFromRequest,
  invalidateRefreshSession,
  issueTokens,
  tenantRoleToUserRole,
  validateRefreshSession,
  verifyAndDecodeRefreshToken,
} from '../../services/auth.service';
import { writeAuditLog } from '../../services/audit.service';
import type { JwtPayload, PlatformRole, TenantMemberRole } from '../../shared/types';
import type { RouteDeps } from '../deps';

export const createAuthController = ({ prisma, tenantService }: RouteDeps) => {
  const login = async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as { username?: string; password?: string; tenantSlug?: string };

    const username = body?.username?.trim();
    const password = body?.password;
    const tenantSlug = body?.tenantSlug?.trim().toLowerCase();

    if (!username || !password) {
      await writeAuditLog(request, {
        action: 'AUTH_LOGIN_FAILED',
        actorUsername: username || 'unknown',
        metadata: { reason: 'missing_credentials' },
      });
      return reply.status(400).send({ error: 'Usuario e senha sao obrigatorios' });
    }

    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        memberships: {
          where: {
            deletedAt: null,
            tenant: {
              deletedAt: null,
            },
          },
          include: {
            tenant: true,
          },
        },
      },
    });

    if (!user || !user.isActive || user.deletedAt || user.accountStatus !== 'ACTIVE') {
      await writeAuditLog(request, {
        action: 'AUTH_LOGIN_FAILED',
        actorUsername: username,
        metadata: { reason: 'user_not_found_or_inactive' },
      });
      return reply.status(401).send({ error: 'Credenciais invalidas' });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      await writeAuditLog(request, {
        action: 'AUTH_LOGIN_FAILED',
        actorUsername: username,
        metadata: { reason: 'invalid_password' },
      });
      return reply.status(401).send({ error: 'Credenciais invalidas' });
    }

    const activeMembership = tenantSlug
      ? user.memberships.find((membership) => membership.tenant.slug === tenantSlug)
      : user.memberships[0];

    if (user.platformRole !== 'SUPER_ADMIN' && !activeMembership) {
      await writeAuditLog(request, {
        action: 'AUTH_LOGIN_FAILED',
        actorUsername: username,
        metadata: { reason: 'missing_tenant_membership' },
      });
      return reply.status(403).send({ error: 'Usuario sem tenant vinculado' });
    }

    const tokenPayload: Omit<JwtPayload, 'tokenType'> = {
      sub: user.username,
      role:
        user.platformRole === 'SUPER_ADMIN'
          ? 'admin'
          : tenantRoleToUserRole(activeMembership?.role as TenantMemberRole),
      platformRole: user.platformRole as PlatformRole,
      tenantRole: (activeMembership?.role as TenantMemberRole | undefined) ?? undefined,
      tenantId: activeMembership?.tenantId,
    };

    const tokens = issueTokens(tokenPayload);
    const organizations = await tenantService.buildOrganizationOptions(user.id);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
      },
    });

    await writeAuditLog(request, {
      action: 'AUTH_LOGIN_SUCCESS',
      actorUsername: user.username,
      actorPlatformRole: tokenPayload.platformRole,
      actorTenantRole: tokenPayload.tenantRole,
      actorTenantId: tokenPayload.tenantId,
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        profilePhoto: user.profilePhoto,
        role: tokenPayload.role,
        platformRole: tokenPayload.platformRole,
        tenantRole: tokenPayload.tenantRole,
        tenantId: tokenPayload.tenantId,
        status: user.accountStatus,
        lastLoginAt: new Date().toISOString(),
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
      organizations,
    };
  };

  const refresh = async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as { refreshToken?: string };
    const refreshToken = body?.refreshToken?.trim();

    if (!refreshToken) {
      return reply.status(400).send({ error: 'Refresh token ausente' });
    }

    let payload: JwtPayload;
    try {
      payload = verifyAndDecodeRefreshToken(refreshToken);
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        return reply.status(401).send({ error: 'Refresh token expirado', code: 'REFRESH_TOKEN_EXPIRED' });
      }
      return reply.status(401).send({ error: 'Refresh token invalido', code: 'REFRESH_TOKEN_INVALID' });
    }

    if (payload.tokenType !== 'refresh') {
      return reply.status(401).send({ error: 'Refresh token invalido', code: 'REFRESH_TOKEN_INVALID' });
    }

    if (!validateRefreshSession(refreshToken)) {
      return reply.status(401).send({ error: 'Sessao expirada', code: 'SESSION_EXPIRED' });
    }

    const tokens = issueTokens({
      sub: payload.sub,
      role: payload.role,
      platformRole: payload.platformRole,
      tenantRole: payload.tenantRole,
      tenantId: payload.tenantId,
      impersonatedBy: payload.impersonatedBy,
    });

    invalidateRefreshSession(refreshToken);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  };

  const logout = withAuth(async (request, _reply, accessPayload) => {
    const body = request.body as { refreshToken?: string };
    const refreshToken = body?.refreshToken?.trim();

    if (refreshToken) {
      try {
        jwt.verify(refreshToken, JWT_REFRESH_SECRET);
        invalidateRefreshSession(refreshToken);
        await writeAuditLog(request, {
          action: 'AUTH_LOGOUT',
          actorUsername: accessPayload.sub,
          actorPlatformRole: accessPayload.platformRole,
          actorTenantRole: accessPayload.tenantRole,
          actorTenantId: accessPayload.tenantId,
        });
        return { success: true };
      } catch {
        return { success: true };
      }
    }

    const token = getAccessTokenFromRequest(request);
    if (token) {
      try {
        jwt.verify(token, JWT_SECRET);
      } catch {
        // noop
      }
    }

    return { success: true };
  });

  const switchOrganization = withAuth(async (request, reply, payload) => {
    if (payload.platformRole === 'SUPER_ADMIN') {
      return reply.status(400).send({ error: 'Super admin nao usa switch organization' });
    }

    const body = request.body as { tenantId?: number };
    const tenantId = Number(body?.tenantId);
    if (!Number.isFinite(tenantId)) {
      return reply.status(400).send({ error: 'tenantId invalido' });
    }

    const user = await prisma.user.findUnique({
      where: { username: payload.sub },
      include: {
        memberships: {
          where: { deletedAt: null },
          include: {
            tenant: true,
          },
        },
      },
    });

    if (!user || !user.isActive || user.deletedAt || user.accountStatus !== 'ACTIVE') {
      return reply.status(404).send({ error: 'Usuario nao encontrado ou inativo' });
    }

    const membership = user.memberships.find(
      (item) =>
        item.tenantId === tenantId &&
        !item.deletedAt &&
        item.tenant.isActive &&
        !item.tenant.deletedAt &&
        item.tenant.accountStatus === 'ACTIVE'
    );
    if (!membership) {
      return reply.status(403).send({ error: 'Usuario nao vinculado a esta organizacao' });
    }

    const tokenPayload: Omit<JwtPayload, 'tokenType'> = {
      sub: user.username,
      role: tenantRoleToUserRole(membership.role as TenantMemberRole),
      platformRole: user.platformRole as PlatformRole,
      tenantRole: membership.role as TenantMemberRole,
      tenantId: membership.tenantId,
      impersonatedBy: payload.impersonatedBy,
    };

    const tokens = issueTokens(tokenPayload);
    const organizations = await tenantService.buildOrganizationOptions(user.id);

    await writeAuditLog(request, {
      action: 'AUTH_SWITCH_ORGANIZATION',
      actorUsername: user.username,
      actorPlatformRole: tokenPayload.platformRole,
      actorTenantRole: tokenPayload.tenantRole,
      actorTenantId: tokenPayload.tenantId,
      targetTenantId: membership.tenantId,
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        profilePhoto: user.profilePhoto,
        role: tokenPayload.role,
        platformRole: tokenPayload.platformRole,
        tenantRole: tokenPayload.tenantRole,
        tenantId: tokenPayload.tenantId,
        impersonatedBy: tokenPayload.impersonatedBy,
        status: user.accountStatus,
        lastLoginAt: user.lastLoginAt?.toISOString(),
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
      organizations,
    };
  });

  const me = withAuth(async (_request, reply, payload) => {
    const user = await prisma.user.findUnique({
      where: { username: payload.sub },
    });
    if (!user || user.deletedAt) {
      return reply.status(404).send({ error: 'Usuario nao encontrado' });
    }
    const organizations = await tenantService.buildOrganizationOptions(user.id);

    return {
      user: {
        id: user.id,
        username: payload.sub,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        profilePhoto: user.profilePhoto,
        role: payload.role,
        platformRole: payload.platformRole,
        tenantRole: payload.tenantRole,
        tenantId: payload.tenantId,
        impersonatedBy: payload.impersonatedBy,
        status: user.accountStatus,
        lastLoginAt: user.lastLoginAt?.toISOString(),
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
      organizations,
    };
  });

  const impersonate = withSuperAdmin(async (request, reply, payload) => {
    const body = request.body as { username?: string; userId?: number; tenantId?: number };
    const username = body?.username?.trim();
    const userId = Number(body?.userId);
    const tenantId = Number(body?.tenantId);

    if (!username && !Number.isFinite(userId)) {
      return reply.status(400).send({ error: 'username ou userId obrigatorio' });
    }

    const targetUser = await prisma.user.findFirst({
      where: Number.isFinite(userId) ? { id: userId } : { username },
      include: {
        memberships: {
          where: { deletedAt: null },
        },
      },
    });

    if (!targetUser || !targetUser.isActive || targetUser.deletedAt || targetUser.accountStatus !== 'ACTIVE') {
      return reply.status(404).send({ error: 'Usuario alvo nao encontrado ou inativo' });
    }

    if (targetUser.platformRole === 'SUPER_ADMIN') {
      return reply.status(400).send({ error: 'Nao e permitido impersonar super admin' });
    }

    const membership = Number.isFinite(tenantId)
      ? targetUser.memberships.find((item) => item.tenantId === tenantId)
      : targetUser.memberships[0];

    if (!membership) {
      return reply.status(400).send({ error: 'Usuario alvo nao possui vinculo com tenant' });
    }

    const tokenPayload: Omit<JwtPayload, 'tokenType'> = {
      sub: targetUser.username,
      role: tenantRoleToUserRole(membership.role as TenantMemberRole),
      platformRole: 'USER',
      tenantRole: membership.role as TenantMemberRole,
      tenantId: membership.tenantId,
      impersonatedBy: payload.sub,
    };

    const tokens = issueTokens(tokenPayload);
    const organizations = await tenantService.buildOrganizationOptions(targetUser.id);

    await writeAuditLog(request, {
      action: 'AUTH_IMPERSONATE',
      actorUsername: payload.sub,
      actorPlatformRole: payload.platformRole,
      actorTenantRole: payload.tenantRole,
      actorTenantId: payload.tenantId,
      targetUsername: targetUser.username,
      targetTenantId: membership.tenantId,
      metadata: {
        targetRole: membership.role,
      },
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: targetUser.id,
        username: targetUser.username,
        fullName: targetUser.fullName,
        email: targetUser.email,
        phone: targetUser.phone,
        profilePhoto: targetUser.profilePhoto,
        role: tokenPayload.role,
        platformRole: tokenPayload.platformRole,
        tenantRole: tokenPayload.tenantRole,
        tenantId: tokenPayload.tenantId,
        impersonatedBy: tokenPayload.impersonatedBy,
        status: targetUser.accountStatus,
        lastLoginAt: targetUser.lastLoginAt?.toISOString(),
        createdAt: targetUser.createdAt.toISOString(),
        updatedAt: targetUser.updatedAt.toISOString(),
      },
      organizations,
    };
  });

  return {
    login,
    refresh,
    logout,
    switchOrganization,
    me,
    impersonate,
  };
};
