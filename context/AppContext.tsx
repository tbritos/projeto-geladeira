import React, { createContext, useContext, useEffect, useState } from 'react';

export type UserRole = 'admin' | 'operador' | 'visualizador';
export type ThemeMode = 'dark' | 'light';

export interface User {
  username: string;
  role: UserRole;
  platformRole?: 'SUPER_ADMIN' | 'USER';
  tenantRole?: 'OWNER' | 'TENANT_ADMIN' | 'OPERATOR' | 'VIEWER';
  tenantId?: number;
  impersonatedBy?: string;
  organizations?: Array<{
    tenantId: number;
    tenantName: string;
    tenantSlug: string;
    role: 'OWNER' | 'TENANT_ADMIN' | 'OPERATOR' | 'VIEWER';
    accountStatus?: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';
  }>;
  email?: string;
}

export interface ViewAsSession {
  tenantId: number;
  username: string;
  tenantRole: 'OWNER' | 'TENANT_ADMIN' | 'OPERATOR' | 'VIEWER';
}

interface AppContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  authToken: string | null;
  setAuthToken: (token: string | null) => void;
  refreshToken: string | null;
  setRefreshToken: (token: string | null) => void;
  activeTenantId: number | null;
  setActiveTenantId: (tenantId: number | null) => void;
  viewAsSession: ViewAsSession | null;
  startViewAs: (session: ViewAsSession) => void;
  stopViewAs: () => void;
  isViewingAsTenant: boolean;
  logout: () => void;
  isAuthenticated: boolean;
  authReady: boolean;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  hasPermission: (requiredRole: UserRole) => boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3333/api';
const ACCESS_TOKEN_KEY = 'authToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const ACTIVE_TENANT_KEY = 'activeTenantId';
const VIEW_AS_KEY = 'viewAsSession';
const IMPERSONATION_BACKUP_KEY = 'impersonationBackupSession';
const USER_ORGS_KEY = 'userOrganizations';

interface ImpersonationBackupSession {
  authToken: string;
  refreshToken: string;
  user: User;
  activeTenantId: number | null;
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUserState] = useState<User | null>(null);
  const [authToken, setAuthTokenState] = useState<string | null>(null);
  const [refreshToken, setRefreshTokenState] = useState<string | null>(null);
  const [activeTenantId, setActiveTenantIdState] = useState<number | null>(null);
  const [viewAsSession, setViewAsSessionState] = useState<ViewAsSession | null>(null);
  const [hasImpersonationBackup, setHasImpersonationBackup] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [theme, setThemeState] = useState<ThemeMode>('dark');

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const setAuthToken = (token: string | null) => {
    setAuthTokenState(token);
    if (token) {
      localStorage.setItem(ACCESS_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
    }
  };

  const setRefreshToken = (token: string | null) => {
    setRefreshTokenState(token);
    if (token) {
      localStorage.setItem(REFRESH_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  };

  const setUser = (newUser: User | null) => {
    setUserState(newUser);
    if (newUser) {
      localStorage.setItem('currentUser', newUser.username);
      localStorage.setItem('userRole', newUser.role);
      localStorage.setItem('userPlatformRole', newUser.platformRole ?? 'USER');
      if (newUser.tenantRole) {
        localStorage.setItem('userTenantRole', newUser.tenantRole);
      } else {
        localStorage.removeItem('userTenantRole');
      }
      if (typeof newUser.tenantId === 'number') {
        localStorage.setItem('userTenantId', String(newUser.tenantId));
      } else {
        localStorage.removeItem('userTenantId');
      }
      if (Array.isArray(newUser.organizations)) {
        localStorage.setItem(USER_ORGS_KEY, JSON.stringify(newUser.organizations));
      } else {
        localStorage.removeItem(USER_ORGS_KEY);
      }
    } else {
      localStorage.removeItem('currentUser');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userPlatformRole');
      localStorage.removeItem('userTenantRole');
      localStorage.removeItem('userTenantId');
      localStorage.removeItem(USER_ORGS_KEY);
    }
  };

  const setActiveTenantId = (tenantId: number | null) => {
    setActiveTenantIdState(tenantId);
    if (tenantId == null || !Number.isFinite(tenantId)) {
      localStorage.removeItem(ACTIVE_TENANT_KEY);
      return;
    }
    localStorage.setItem(ACTIVE_TENANT_KEY, String(tenantId));
  };

  const logout = () => {
    setUserState(null);
    setAuthTokenState(null);
    setRefreshTokenState(null);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userPlatformRole');
    localStorage.removeItem('userTenantRole');
    localStorage.removeItem('userTenantId');
    localStorage.removeItem(USER_ORGS_KEY);
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(ACTIVE_TENANT_KEY);
    localStorage.removeItem(VIEW_AS_KEY);
    localStorage.removeItem(IMPERSONATION_BACKUP_KEY);
    setViewAsSessionState(null);
    setHasImpersonationBackup(false);
  };

  const startViewAs = (session: ViewAsSession) => {
    if (user?.platformRole === 'SUPER_ADMIN' && authToken && refreshToken && !hasImpersonationBackup) {
      const backup: ImpersonationBackupSession = {
        authToken,
        refreshToken,
        user,
        activeTenantId,
      };
      localStorage.setItem(IMPERSONATION_BACKUP_KEY, JSON.stringify(backup));
      setHasImpersonationBackup(true);
    }
    setViewAsSessionState(session);
    setActiveTenantId(session.tenantId);
    localStorage.setItem(VIEW_AS_KEY, JSON.stringify(session));
  };

  const stopViewAs = () => {
    const backupRaw = localStorage.getItem(IMPERSONATION_BACKUP_KEY);
    if (backupRaw) {
      try {
        const backup = JSON.parse(backupRaw) as ImpersonationBackupSession;
        if (backup.authToken && backup.refreshToken && backup.user) {
          setAuthToken(backup.authToken);
          setRefreshToken(backup.refreshToken);
          setUserState(backup.user);
          setActiveTenantIdState(
            typeof backup.activeTenantId === 'number' ? backup.activeTenantId : null
          );
          if (typeof backup.activeTenantId === 'number') {
            localStorage.setItem(ACTIVE_TENANT_KEY, String(backup.activeTenantId));
          } else {
            localStorage.removeItem(ACTIVE_TENANT_KEY);
          }
          localStorage.setItem('currentUser', backup.user.username);
          localStorage.setItem('userRole', backup.user.role);
          localStorage.setItem('userPlatformRole', backup.user.platformRole ?? 'USER');
          if (backup.user.tenantRole) {
            localStorage.setItem('userTenantRole', backup.user.tenantRole);
          } else {
            localStorage.removeItem('userTenantRole');
          }
          if (typeof backup.user.tenantId === 'number') {
            localStorage.setItem('userTenantId', String(backup.user.tenantId));
          } else {
            localStorage.removeItem('userTenantId');
          }
          if (Array.isArray(backup.user.organizations)) {
            localStorage.setItem(USER_ORGS_KEY, JSON.stringify(backup.user.organizations));
          } else {
            localStorage.removeItem(USER_ORGS_KEY);
          }
        }
      } catch {
        // noop
      }
    }
    setViewAsSessionState(null);
    setHasImpersonationBackup(false);
    localStorage.removeItem(VIEW_AS_KEY);
    localStorage.removeItem(IMPERSONATION_BACKUP_KEY);
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as ThemeMode;
    if (savedTheme) {
      setThemeState(savedTheme);
    }
  }, []);

  useEffect(() => {
    const currentUser = localStorage.getItem('currentUser');
    const userRole = (localStorage.getItem('userRole') as UserRole) || 'visualizador';
    const userPlatformRole = localStorage.getItem('userPlatformRole') as 'SUPER_ADMIN' | 'USER' | null;
    const userTenantRole = localStorage.getItem('userTenantRole') as 'OWNER' | 'TENANT_ADMIN' | 'OPERATOR' | 'VIEWER' | null;
    const userTenantId = Number(localStorage.getItem('userTenantId') ?? NaN);
    const userOrganizationsRaw = localStorage.getItem(USER_ORGS_KEY);
    const storedToken = localStorage.getItem(ACCESS_TOKEN_KEY);
    const storedRefresh = localStorage.getItem(REFRESH_TOKEN_KEY);
    const storedActiveTenantId = Number(localStorage.getItem(ACTIVE_TENANT_KEY) ?? NaN);
    const storedViewAs = localStorage.getItem(VIEW_AS_KEY);

    if (storedToken) {
      setAuthTokenState(storedToken);
    }
    if (storedRefresh) {
      setRefreshTokenState(storedRefresh);
    }
    if (Number.isFinite(storedActiveTenantId)) {
      setActiveTenantIdState(storedActiveTenantId);
    }
    if (storedViewAs) {
      try {
        const parsed = JSON.parse(storedViewAs) as ViewAsSession;
        if (parsed && Number.isFinite(parsed.tenantId) && parsed.username && parsed.tenantRole) {
          setViewAsSessionState(parsed);
        } else {
          localStorage.removeItem(VIEW_AS_KEY);
        }
      } catch {
        localStorage.removeItem(VIEW_AS_KEY);
      }
    }
    const storedBackup = localStorage.getItem(IMPERSONATION_BACKUP_KEY);
    if (storedBackup) {
      setHasImpersonationBackup(true);
    }

    if (!storedToken && !storedRefresh) {
      let organizations: User['organizations'] | undefined;
      if (userOrganizationsRaw) {
        try {
          organizations = JSON.parse(userOrganizationsRaw) as User['organizations'];
        } catch {
          organizations = undefined;
        }
      }
      if (currentUser) {
        setUserState({
          username: currentUser,
          role: userRole,
          platformRole: userPlatformRole ?? 'USER',
          tenantRole: userTenantRole ?? undefined,
          tenantId: Number.isFinite(userTenantId) ? userTenantId : undefined,
          organizations,
        });
      }
      setAuthReady(true);
      return;
    }

    const validateSession = async () => {
      try {
        const meResponse = await fetch(`${API_URL}/auth/me`, {
          headers: storedToken ? { Authorization: `Bearer ${storedToken}` } : {},
        });

        if (meResponse.ok) {
          const data = (await meResponse.json()) as {
            user: User;
            organizations?: User['organizations'];
          };
          const normalizedUser: User = {
            ...data.user,
            organizations: data.organizations ?? data.user.organizations ?? [],
          };
          setUser(normalizedUser);
          if (!Number.isFinite(storedActiveTenantId) && typeof normalizedUser.tenantId === 'number') {
            setActiveTenantId(normalizedUser.tenantId);
          }
          setAuthReady(true);
          return;
        }

        if (!storedRefresh) {
          throw new Error('Sessao invalida');
        }

        const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: storedRefresh }),
        });

        if (!refreshResponse.ok) {
          throw new Error('Refresh invalido');
        }

        const refreshData = (await refreshResponse.json()) as {
          accessToken: string;
          refreshToken: string;
        };

        setAuthToken(refreshData.accessToken);
        setRefreshToken(refreshData.refreshToken);

        const retryMe = await fetch(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${refreshData.accessToken}` },
        });

        if (!retryMe.ok) {
          throw new Error('Sessao invalida apos refresh');
        }

        const data = (await retryMe.json()) as {
          user: User;
          organizations?: User['organizations'];
        };
        const normalizedUser: User = {
          ...data.user,
          organizations: data.organizations ?? data.user.organizations ?? [],
        };
        setUser(normalizedUser);
        if (!Number.isFinite(storedActiveTenantId) && typeof normalizedUser.tenantId === 'number') {
          setActiveTenantId(normalizedUser.tenantId);
        }
      } catch {
        logout();
      } finally {
        setAuthReady(true);
      }
    };

    void validateSession();
  }, []);

  useEffect(() => {
    const onAuthExpired = () => logout();
    window.addEventListener('auth-expired', onAuthExpired);
    return () => window.removeEventListener('auth-expired', onAuthExpired);
  }, []);

  useEffect(() => {
    if (user?.platformRole !== 'SUPER_ADMIN' && viewAsSession) {
      // Mantem o estado de impersonacao enquanto estiver em sessao "ver como".
      if (!hasImpersonationBackup) {
        setViewAsSessionState(null);
        localStorage.removeItem(VIEW_AS_KEY);
      }
    }
  }, [hasImpersonationBackup, user?.platformRole, viewAsSession]);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  };

  const hasPermission = (requiredRole: UserRole): boolean => {
    if (!user) return false;

    const roleHierarchy: Record<UserRole, number> = {
      admin: 3,
      operador: 2,
      visualizador: 1,
    };

    return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
  };

  const value: AppContextType = {
    user,
    setUser,
    authToken,
    setAuthToken,
    refreshToken,
    setRefreshToken,
    activeTenantId,
    setActiveTenantId,
    viewAsSession,
    startViewAs,
    stopViewAs,
    isViewingAsTenant: Boolean(viewAsSession && hasImpersonationBackup),
    logout,
    isAuthenticated: Boolean(user && authToken),
    authReady,
    theme,
    setTheme,
    toggleTheme,
    hasPermission,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext deve ser usado dentro de AppProvider');
  }
  return context;
};
