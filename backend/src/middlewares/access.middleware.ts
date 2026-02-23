import type { FastifyReply, FastifyRequest } from 'fastify';
import { authenticate, requireRole, requireSuperAdmin } from '../services/auth.service';
import type { JwtPayload, TenantMemberRole } from '../shared/types';

type AuthHandler = (
  request: FastifyRequest,
  reply: FastifyReply,
  payload: JwtPayload
) => Promise<unknown>;

export const withAuth = (handler: AuthHandler) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const payload = await authenticate(request, reply);
    if (!payload) return;
    return handler(request, reply, payload);
  };
};

export const withSuperAdmin = (handler: AuthHandler) => {
  return withAuth(async (request, reply, payload) => {
    if (!requireSuperAdmin(payload, reply)) return;
    return handler(request, reply, payload);
  });
};

export const withTenantRole = (
  roles: TenantMemberRole[],
  permissionErrorMessage: string,
  handler: AuthHandler
) => {
  return withAuth(async (request, reply, payload) => {
    if (!requireRole(payload, roles)) {
      return reply.status(403).send({ error: permissionErrorMessage });
    }
    return handler(request, reply, payload);
  });
};
