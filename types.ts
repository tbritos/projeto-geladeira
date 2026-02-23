export interface SystemStatus {
  temperature: number;
  humidity: number;
  relayState: boolean; // true = ON/Active
  powerStatus: boolean; // true = OK
  door1Status: boolean; // true = Closed
  door2Status?: boolean; // true = Closed
  minTemp: number;
  maxTemp: number;
  alertActive: boolean;
  timeOutOfRange?: number; // in seconds
  lastUpdate?: string;
  tenantId?: number;
  tenantName?: string;
}

export interface SystemEvent {
  id: string;
  type: 'ALERT' | 'DOOR' | 'POWER' | 'SYSTEM';
  message: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface HistoricalDataPoint {
  time: string;
  temperature: number;
  humidity: number;
}

export interface DeviceSummary {
  id: number;
  externalId: string;
  name: string;
  isActive: boolean;
  tenantId: number;
  tenantName?: string;
  createdAt: string;
  updatedAt: string;
  readingsCount: number;
}

export interface TemperatureRecord {
  id: string;
  date: string; // ISO format
  time: string; // HH:MM:SS
  temperature: number;
  humidity: number;
  relayState: boolean;
  powerStatus: boolean;
  doorStatus: boolean;
  notes?: string;
}

export interface ApiResponse {
  temperature: number;
  humidity: number;
  relayState: string;
  powerStatus: string;
  door1Status: string;
  door2Status: string;
  minTemp: number;
  maxTemp: number;
  alertActive: boolean;
  timeOutOfRange: number;
}

export interface TenantSummary {
  id: number;
  name: string;
  slug: string;
  tradeName?: string | null;
  legalName?: string | null;
  cnpj?: string | null;
  accountStatus?: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';
  deletedAt?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    readings: number;
    devices: number;
    users: number;
  };
}

export interface TenantUserSummary {
  membershipId: number;
  membershipDeletedAt?: string | null;
  role: 'OWNER' | 'TENANT_ADMIN' | 'OPERATOR' | 'VIEWER';
  tenantId: number;
  user: {
    id: number;
    username: string;
    email?: string | null;
    fullName?: string | null;
    displayName?: string | null;
    phone?: string | null;
    profilePhoto?: string | null;
    accountStatus?: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';
    lastLoginAt?: string | null;
    deletedAt?: string | null;
    platformRole: 'SUPER_ADMIN' | 'USER';
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  };
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action:
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
  actorUsername: string;
  actorPlatformRole?: 'SUPER_ADMIN' | 'USER';
  actorTenantRole?: 'OWNER' | 'TENANT_ADMIN' | 'OPERATOR' | 'VIEWER';
  actorTenantId?: number;
  targetUsername?: string;
  targetTenantId?: number;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}
