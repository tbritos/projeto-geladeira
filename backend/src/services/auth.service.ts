import type { FastifyReply, FastifyRequest } from 'fastify';
import jwt, { SignOptions, TokenExpiredError } from 'jsonwebtoken';
import {
  JWT_EXPIRES_IN,
  JWT_REFRESH_EXPIRES_IN,
  JWT_REFRESH_SECRET,
  JWT_SECRET,
} from '../config/env';
import type { AccountStatus, JwtPayload, TenantMemberRole, UserRole } from '../shared/types';

const refreshSessions = new Set<string>();

const extractToken = (request: FastifyRequest) => {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice(7).trim();
};

export const isTenantMemberRole = (value: string): value is TenantMemberRole => {
  return ['OWNER', 'TENANT_ADMIN', 'OPERATOR', 'VIEWER'].includes(value);
};

export const isAccountStatus = (value: string): value is AccountStatus => {
  return ['ACTIVE', 'SUSPENDED', 'CANCELLED'].includes(value);
};

export const tenantRoleToUserRole = (tenantRole?: TenantMemberRole): UserRole => {
  if (tenantRole === 'OWNER') return 'admin';
  if (tenantRole === 'TENANT_ADMIN') return 'admin';
  if (tenantRole === 'OPERATOR') return 'operador';
  return 'visualizador';
};

export const authenticate = async (request: FastifyRequest, reply: FastifyReply): Promise<JwtPayload | null> => {
  const token = extractToken(request);
  if (!token) {
    reply.status(401).send({ error: 'Token ausente' });
    return null;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    if (payload.tokenType !== 'access') {
      reply.status(401).send({ error: 'Token invalido', code: 'TOKEN_INVALID' });
      return null;
    }
    return payload;
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      reply.status(401).send({ error: 'Token expirado', code: 'TOKEN_EXPIRED' });
      return null;
    }
    reply.status(401).send({ error: 'Token invalido', code: 'TOKEN_INVALID' });
    return null;
  }
};

export const requireRole = (payload: JwtPayload, roles: TenantMemberRole[]) => {
  if (payload.platformRole === 'SUPER_ADMIN') return true;
  if (!payload.tenantRole) return false;
  return roles.includes(payload.tenantRole);
};

export const requireSuperAdmin = (payload: JwtPayload, reply: FastifyReply) => {
  if (payload.platformRole !== 'SUPER_ADMIN') {
    reply.status(403).send({ error: 'Acesso restrito a super admin' });
    return false;
  }
  return true;
};

const buildAccessToken = (payload: Omit<JwtPayload, 'tokenType'>) => {
  const { sub, ...claims } = payload;
  const signOptions: SignOptions = {
    subject: sub,
    expiresIn: JWT_EXPIRES_IN as SignOptions['expiresIn'],
  };
  return jwt.sign({ ...claims, tokenType: 'access' }, JWT_SECRET, signOptions);
};

const buildRefreshToken = (payload: Omit<JwtPayload, 'tokenType'>) => {
  const { sub, ...claims } = payload;
  const signOptions: SignOptions = {
    subject: sub,
    expiresIn: JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn'],
  };
  return jwt.sign({ ...claims, tokenType: 'refresh' }, JWT_REFRESH_SECRET, signOptions);
};

export const issueTokens = (payload: Omit<JwtPayload, 'tokenType'>) => {
  const accessToken = buildAccessToken(payload);
  const refreshToken = buildRefreshToken(payload);
  refreshSessions.add(refreshToken);
  return { accessToken, refreshToken };
};

export const verifyAndDecodeRefreshToken = (refreshToken: string): JwtPayload => {
  return jwt.verify(refreshToken, JWT_REFRESH_SECRET) as JwtPayload;
};

export const validateRefreshSession = (refreshToken: string) => refreshSessions.has(refreshToken);
export const invalidateRefreshSession = (refreshToken: string) => refreshSessions.delete(refreshToken);
export const getAccessTokenFromRequest = extractToken;
