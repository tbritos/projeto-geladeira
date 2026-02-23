import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AlertsProvider } from './context/AlertsContext';
import AdminLayout from './components/AdminLayout';
import TenantLayout from './components/TenantLayout';
import AdminDashboard from './pages/AdminDashboard';
import AdminAuditPage from './pages/AdminAudit';
import AdminGlobalSettings from './pages/AdminGlobalSettings';
import AdminTenantPanel from './pages/AdminTenantPanel';
import Dashboard from './pages/Dashboard';
import HistoryPage from './pages/History';
import SettingsPage from './pages/Settings';
import DevicesPage from './pages/Devices';
import TenantsPage from './pages/Tenants';
import TenantUsersPage from './pages/TenantUsers';
import Login from './pages/Login';
import OrganizationSelectPage from './pages/OrganizationSelect';
import Welcome from './pages/Welcome';
import { useThemeApplier } from './hooks/useThemeApplier';
import { useAppContext } from './context/AppContext';

const getHomePath = (
  user?: {
    platformRole?: 'SUPER_ADMIN' | 'USER';
    organizations?: Array<{ tenantId: number }>;
  },
  isViewingAsTenant?: boolean,
  activeTenantId?: number | null
) => {
  if (user?.platformRole === 'SUPER_ADMIN' && !isViewingAsTenant) return '/admin';

  const hasMultipleOrganizations =
    user?.platformRole === 'USER' && (user.organizations?.length ?? 0) > 1;
  if (hasMultipleOrganizations && !Number.isFinite(activeTenantId ?? NaN)) {
    return '/select-organization';
  }

  return '/app';
};

const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, authReady } = useAppContext();
  if (!authReady) {
    return null;
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const RequireSuperAdmin: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAppContext();
  if (user?.platformRole !== 'SUPER_ADMIN') {
    return <Navigate to="/app" replace />;
  }
  return <>{children}</>;
};

const RequireTenantUser: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isViewingAsTenant, activeTenantId } = useAppContext();
  const hasMultipleOrganizations = user?.platformRole === 'USER' && (user.organizations?.length ?? 0) > 1;
  if (hasMultipleOrganizations && !Number.isFinite(activeTenantId ?? NaN)) {
    return <Navigate to="/select-organization" replace />;
  }
  if (user?.platformRole !== 'SUPER_ADMIN' || isViewingAsTenant) {
    return <>{children}</>;
  }
  return <Navigate to="/admin" replace />;
};

const RequireTenantAdmin: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isViewingAsTenant, viewAsSession } = useAppContext();
  if (user?.platformRole === 'SUPER_ADMIN') {
    if (!isViewingAsTenant) return <>{children}</>;
    if (viewAsSession?.tenantRole === 'TENANT_ADMIN' || viewAsSession?.tenantRole === 'OWNER') return <>{children}</>;
    return <Navigate to="/app" replace />;
  }
  if (user?.tenantRole === 'TENANT_ADMIN' || user?.tenantRole === 'OWNER') {
    return <>{children}</>;
  }
  return <Navigate to="/app" replace />;
};

const AppContent: React.FC = () => {
  useThemeApplier();
  const { isAuthenticated, authReady, user, isViewingAsTenant, activeTenantId } = useAppContext();

  if (!authReady) {
    return null;
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to={getHomePath(user, isViewingAsTenant, activeTenantId)} replace /> : <Login />} />
        <Route path="/welcome" element={<RequireAuth><Welcome /></RequireAuth>} />
        <Route path="/select-organization" element={<RequireAuth><OrganizationSelectPage /></RequireAuth>} />

        <Route path="/" element={<RequireAuth><Navigate to={getHomePath(user, isViewingAsTenant, activeTenantId)} replace /></RequireAuth>} />

        {/* Admin Area */}
        <Route
          path="/admin/*"
          element={
            <RequireSuperAdmin>
              <AdminLayout>
                <Routes>
                  <Route path="/" element={<AdminDashboard />} />
                  <Route path="/devices" element={<DevicesPage />} />
                  <Route path="/tenants" element={<TenantsPage />} />
                  <Route path="/tenants/:tenantId" element={<AdminTenantPanel />} />
                  <Route path="/onboarding" element={<Navigate to="/admin/tenants" replace />} />
                  <Route path="/users" element={<Navigate to="/admin/tenants" replace />} />
                  <Route path="/audit" element={<AdminAuditPage />} />
                  <Route path="/settings-global" element={<AdminGlobalSettings />} />
                  <Route path="*" element={<Navigate to="/admin" replace />} />
                </Routes>
              </AdminLayout>
            </RequireSuperAdmin>
          }
        />

        {/* Tenant Area */}
        <Route
          path="/app/*"
          element={
            <RequireTenantUser>
              <TenantLayout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/devices" element={<DevicesPage />} />
                  <Route path="/history" element={<HistoryPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route
                    path="/users"
                    element={
                      <RequireTenantAdmin>
                        <TenantUsersPage />
                      </RequireTenantAdmin>
                    }
                  />
                  <Route path="*" element={<Navigate to="/app" replace />} />
                </Routes>
              </TenantLayout>
            </RequireTenantUser>
          }
        />
        <Route path="*" element={<Navigate to={isAuthenticated ? getHomePath(user, isViewingAsTenant, activeTenantId) : '/login'} replace />} />
      </Routes>
    </Router>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <AlertsProvider>
        <AppContent />
      </AlertsProvider>
    </AppProvider>
  );
};

export default App;
