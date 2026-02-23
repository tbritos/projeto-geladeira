import axios from 'axios';
import type { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import type {
  AuditLogEntry,
  DeviceSummary,
  HistoricalDataPoint,
  SystemEvent,
  SystemStatus,
  TenantSummary,
  TenantUserSummary,
} from '../types';

const normalizeApiUrl = (rawUrl?: string) => {
  const base = (rawUrl || 'http://localhost:3333/api').trim().replace(/\/+$/, '');
  return /\/api$/i.test(base) ? base : `${base}/api`;
};

const API_URL = normalizeApiUrl(import.meta.env.VITE_API_URL);
const ACCESS_TOKEN_KEY = 'authToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const ACTIVE_TENANT_KEY = 'activeTenantId';

interface RetryAxiosRequestConfig extends AxiosRequestConfig {
  _retry?: boolean;
}

const apiClient = axios.create({
  baseURL: API_URL,
});

const clearSessionStorage = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem('currentUser');
  localStorage.removeItem('userRole');
  localStorage.removeItem('userPlatformRole');
  localStorage.removeItem('userTenantRole');
  localStorage.removeItem('userTenantId');
  localStorage.removeItem(ACTIVE_TENANT_KEY);
  localStorage.removeItem('viewAsSession');
  localStorage.removeItem('impersonationBackupSession');
};

const setSessionTokens = (accessToken: string, refreshToken: string) => {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
};

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

const refreshAccessToken = async (): Promise<string | null> => {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) return null;

  try {
    const response = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
    const data = response.data as { accessToken: string; refreshToken: string };
    setSessionTokens(data.accessToken, data.refreshToken);
    return data.accessToken;
  } catch {
    clearSessionStorage();
    return null;
  }
};

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  const activeTenantId = localStorage.getItem(ACTIVE_TENANT_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (activeTenantId) {
    config.headers['x-tenant-id'] = activeTenantId;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryAxiosRequestConfig | undefined;
    const status = error.response?.status;
    const url = originalRequest?.url ?? '';

    const isAuthRoute = url.includes('/auth/login') || url.includes('/auth/refresh');

    if (status !== 401 || !originalRequest || originalRequest._retry || isAuthRoute) {
      if (status === 401 && isAuthRoute) {
        clearSessionStorage();
        window.dispatchEvent(new Event('auth-expired'));
      }
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = refreshAccessToken().finally(() => {
        isRefreshing = false;
      });
    }

    const newAccessToken = await refreshPromise;

    if (!newAccessToken) {
      clearSessionStorage();
      window.dispatchEvent(new Event('auth-expired'));
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    originalRequest.headers = {
      ...(originalRequest.headers ?? {}),
      Authorization: `Bearer ${newAccessToken}`,
    };

    return apiClient(originalRequest);
  }
);

const DEFAULT_STATUS: SystemStatus = {
  temperature: 0,
  humidity: 0,
  relayState: false,
  powerStatus: true,
  door1Status: true,
  minTemp: 2,
  maxTemp: 8,
  alertActive: false,
};

type OrganizationOption = {
  tenantId: number;
  tenantName: string;
  tenantSlug: string;
  role: 'OWNER' | 'TENANT_ADMIN' | 'OPERATOR' | 'VIEWER';
  accountStatus: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';
};

export const login = async (username: string, password: string) => {
  const response = await apiClient.post('/auth/login', {
    username,
    password,
  });
  return response.data as {
    accessToken: string;
    refreshToken: string;
    user: {
      username: string;
      role: 'admin' | 'operador' | 'visualizador';
      platformRole: 'SUPER_ADMIN' | 'USER';
      tenantRole?: 'OWNER' | 'TENANT_ADMIN' | 'OPERATOR' | 'VIEWER';
      tenantId?: number;
      impersonatedBy?: string;
    };
    organizations: OrganizationOption[];
  };
};

export const impersonateUser = async (input: { username: string; tenantId?: number }) => {
  const response = await apiClient.post('/auth/impersonate', input);
  return response.data as {
    accessToken: string;
    refreshToken: string;
    user: {
      username: string;
      role: 'admin' | 'operador' | 'visualizador';
      platformRole: 'SUPER_ADMIN' | 'USER';
      tenantRole?: 'OWNER' | 'TENANT_ADMIN' | 'OPERATOR' | 'VIEWER';
      tenantId?: number;
      impersonatedBy?: string;
    };
    organizations: OrganizationOption[];
  };
};

export const switchOrganization = async (tenantId: number) => {
  const response = await apiClient.post('/auth/switch-organization', { tenantId });
  return response.data as {
    accessToken: string;
    refreshToken: string;
    user: {
      username: string;
      role: 'admin' | 'operador' | 'visualizador';
      platformRole: 'SUPER_ADMIN' | 'USER';
      tenantRole?: 'OWNER' | 'TENANT_ADMIN' | 'OPERATOR' | 'VIEWER';
      tenantId?: number;
      impersonatedBy?: string;
    };
    organizations: OrganizationOption[];
  };
};

export const logoutSession = async () => {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  try {
    await apiClient.post('/auth/logout', { refreshToken });
  } catch {
    // Ignora falha para permitir logout local.
  } finally {
    clearSessionStorage();
  }
};

export const fetchSystemStatus = async (): Promise<SystemStatus> => {
  try {
    const response = await apiClient.get<SystemStatus>('/status');
    return {
      ...DEFAULT_STATUS,
      ...response.data,
    };
  } catch (error) {
    console.error('Erro ao conectar com backend:', error);
    return DEFAULT_STATUS;
  }
};

export const fetchTenants = async (includeDeleted = false): Promise<TenantSummary[]> => {
  const response = await apiClient.get<TenantSummary[]>('/platform/tenants', {
    params: includeDeleted ? { includeDeleted: 'true' } : undefined,
  });
  return response.data;
};

export const fetchAuditLogs = async (params?: {
  tenantId?: number;
  actorUsername?: string;
  action?: string;
  from?: string;
  to?: string;
  limit?: number;
}): Promise<AuditLogEntry[]> => {
  const response = await apiClient.get<AuditLogEntry[]>('/platform/audit', { params });
  return response.data;
};

export const createTenant = async (input: {
  name: string;
  slug: string;
  tradeName?: string;
  legalName?: string;
  cnpj?: string;
  accountStatus?: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';
  owner?: {
    username: string;
    email?: string;
    fullName?: string;
    phone?: string;
    password: string;
    role?: 'OWNER' | 'TENANT_ADMIN';
  };
}): Promise<TenantSummary> => {
  const response = await apiClient.post<TenantSummary>('/platform/tenants', input);
  return response.data;
};

export const updateTenant = async (
  tenantId: number,
  input: {
    name?: string;
    tradeName?: string;
    legalName?: string;
    cnpj?: string;
    slug?: string;
    accountStatus?: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';
  }
): Promise<TenantSummary> => {
  const response = await apiClient.put<TenantSummary>(`/platform/tenants/${tenantId}`, input);
  return response.data;
};

export const suspendTenant = async (tenantId: number): Promise<TenantSummary> => {
  const response = await apiClient.post<TenantSummary>(`/platform/tenants/${tenantId}/suspend`);
  return response.data;
};

export const reactivateTenant = async (tenantId: number): Promise<TenantSummary> => {
  const response = await apiClient.post<TenantSummary>(`/platform/tenants/${tenantId}/reactivate`);
  return response.data;
};

export const archiveTenant = async (tenantId: number): Promise<TenantSummary> => {
  const response = await apiClient.post<TenantSummary>(`/platform/tenants/${tenantId}/archive`);
  return response.data;
};

export const restoreTenant = async (tenantId: number): Promise<TenantSummary> => {
  const response = await apiClient.post<TenantSummary>(`/platform/tenants/${tenantId}/restore`);
  return response.data;
};

export const fetchTenantUsers = async (tenantId?: number, includeDeleted = false): Promise<TenantUserSummary[]> => {
  const response = await apiClient.get<TenantUserSummary[]>('/tenant/users', {
    params: includeDeleted ? { includeDeleted: 'true' } : undefined,
    headers: tenantId ? { 'x-tenant-id': String(tenantId) } : undefined,
  });
  return response.data;
};

export const createTenantUser = async (input: {
  username: string;
  email?: string;
  fullName?: string;
  password: string;
  displayName?: string;
  phone?: string;
  profilePhoto?: string;
  status?: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';
  role: 'OWNER' | 'TENANT_ADMIN' | 'OPERATOR' | 'VIEWER';
  tenantId?: number;
}): Promise<TenantUserSummary> => {
  const { tenantId, ...payload } = input;
  const response = await apiClient.post<TenantUserSummary>('/tenant/users', payload, {
    headers: tenantId ? { 'x-tenant-id': String(tenantId) } : undefined,
  });
  return response.data;
};

export const updateTenantUserRole = async (
  userId: number,
  role: 'OWNER' | 'TENANT_ADMIN' | 'OPERATOR' | 'VIEWER',
  tenantId?: number
): Promise<TenantUserSummary> => {
  const response = await apiClient.put<TenantUserSummary>(`/tenant/users/${userId}/role`, { role }, {
    headers: tenantId ? { 'x-tenant-id': String(tenantId) } : undefined,
  });
  return response.data;
};

export const archiveTenantUser = async (userId: number, tenantId?: number): Promise<TenantUserSummary> => {
  const response = await apiClient.post<TenantUserSummary>(`/tenant/users/${userId}/archive`, undefined, {
    headers: tenantId ? { 'x-tenant-id': String(tenantId) } : undefined,
  });
  return response.data;
};

export const restoreTenantUser = async (userId: number, tenantId?: number): Promise<TenantUserSummary> => {
  const response = await apiClient.post<TenantUserSummary>(`/tenant/users/${userId}/restore`, undefined, {
    headers: tenantId ? { 'x-tenant-id': String(tenantId) } : undefined,
  });
  return response.data;
};

export const fetchEvents = async (): Promise<SystemEvent[]> => {
  try {
    const response = await apiClient.get<SystemEvent[]>('/events');
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar eventos:', error);
    return [];
  }
};

export const fetchHistory = async (_period?: string): Promise<HistoricalDataPoint[]> => {
  try {
    const response = await apiClient.get<HistoricalDataPoint[]>('/history');
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar historico:', error);
    return [];
  }
};

export const fetchDevices = async (tenantId?: number): Promise<DeviceSummary[]> => {
  const response = await apiClient.get<DeviceSummary[]>('/devices', {
    headers: tenantId ? { 'x-tenant-id': String(tenantId) } : undefined,
  });
  return response.data;
};

export const fetchPlatformDevices = async (): Promise<DeviceSummary[]> => {
  const response = await apiClient.get<DeviceSummary[]>('/platform/devices');
  return response.data;
};

export const createPlatformDevice = async (input: {
  externalId: string;
  name: string;
  tenantId?: number;
}): Promise<DeviceSummary> => {
  const response = await apiClient.post<DeviceSummary>('/platform/devices', input);
  return response.data;
};

export const linkDeviceToTenant = async (tenantId: number, deviceId: number): Promise<DeviceSummary> => {
  const response = await apiClient.post<DeviceSummary>(`/platform/tenants/${tenantId}/devices/link`, { deviceId });
  return response.data;
};

export const unlinkDeviceToStock = async (tenantId: number, deviceId: number): Promise<DeviceSummary> => {
  const response = await apiClient.post<DeviceSummary>(`/platform/tenants/${tenantId}/devices/${deviceId}/unlink`);
  return response.data;
};

export const renameTenantDevice = async (
  tenantId: number,
  deviceId: number,
  name: string
): Promise<DeviceSummary> => {
  const response = await apiClient.put<DeviceSummary>(`/platform/tenants/${tenantId}/devices/${deviceId}`, { name });
  return response.data;
};

export const updateSettings = async (settings: unknown) => {
  console.log('Settings salvas (mock):', settings);
  await new Promise((resolve) => setTimeout(resolve, 300));
  return true;
};

export const updateTemperatureSettings = async (min: number, max: number) => {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) {
    return false;
  }
  try {
    await apiClient.put('/settings/temperature', { minTemp: min, maxTemp: max });
    return true;
  } catch (error) {
    console.error('Falha ao atualizar temperaturas:', error);
    return false;
  }
};

export const updateAlertSettings = async (enabled: boolean, phone: string) => {
  console.log(`Alertas configurados: ${enabled} para ${phone}`);
  await new Promise((resolve) => setTimeout(resolve, 500));
  return true;
};

const api = {
  login,
  impersonateUser,
  switchOrganization,
  logoutSession,
  fetchSystemStatus,
  fetchTenants,
  fetchAuditLogs,
  createTenant,
  updateTenant,
  suspendTenant,
  reactivateTenant,
  archiveTenant,
  restoreTenant,
  fetchTenantUsers,
  createTenantUser,
  updateTenantUserRole,
  archiveTenantUser,
  restoreTenantUser,
  fetchEvents,
  fetchHistory,
  fetchDevices,
  fetchPlatformDevices,
  createPlatformDevice,
  linkDeviceToTenant,
  unlinkDeviceToStock,
  renameTenantDevice,
  updateSettings,
  updateTemperatureSettings,
  updateAlertSettings,
};

export default api;
