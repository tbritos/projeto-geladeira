import type { FastifyReply, FastifyRequest } from 'fastify';

export type UserRole = 'admin' | 'operador' | 'visualizador';
export type PlatformRole = 'SUPER_ADMIN' | 'USER';
export type TenantMemberRole = 'OWNER' | 'TENANT_ADMIN' | 'OPERATOR' | 'VIEWER';
export type AccountStatus = 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';

export interface JwtPayload {
  sub: string;
  role: UserRole;
  platformRole: PlatformRole;
  tenantRole?: TenantMemberRole;
  tenantId?: number;
  impersonatedBy?: string;
  tokenType: 'access' | 'refresh';
}

export interface SystemEvent {
  id: string;
  type: 'ALERT' | 'DOOR' | 'POWER' | 'SYSTEM';
  message: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'critical';
}

export type AuditAction =
  | 'AUTH_LOGIN_SUCCESS'
  | 'AUTH_LOGIN_FAILED'
  | 'AUTH_LOGOUT'
  | 'AUTH_SWITCH_ORGANIZATION'
  | 'AUTH_IMPERSONATE'
  | 'PLATFORM_TENANT_CREATE'
  | 'PLATFORM_TENANT_UPDATE'
  | 'PLATFORM_TENANT_STATUS_UPDATE'
  | 'PLATFORM_TENANT_ARCHIVE'
  | 'PLATFORM_TENANT_RESTORE'
  | 'TENANT_USER_CREATE'
  | 'TENANT_USER_ROLE_UPDATE'
  | 'TENANT_USER_ARCHIVE'
  | 'TENANT_USER_RESTORE'
  | 'SETTINGS_TEMPERATURE_UPDATE';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: AuditAction;
  actorUsername: string;
  actorPlatformRole?: PlatformRole;
  actorTenantRole?: TenantMemberRole;
  actorTenantId?: number;
  targetUsername?: string;
  targetTenantId?: number;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export interface BootstrapUserConfig {
  username: string;
  passwordHash: string;
  platformRole: PlatformRole;
  tenantRole: TenantMemberRole;
}

export interface OrganizationOption {
  tenantId: number;
  tenantName: string;
  tenantSlug: string;
  role: TenantMemberRole;
  accountStatus: AccountStatus;
}

export type AuthenticatedHandler = (
  request: FastifyRequest,
  reply: FastifyReply,
  payload: JwtPayload
) => Promise<unknown>;
