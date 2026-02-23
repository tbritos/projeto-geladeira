import type { RouteDeps } from '../deps';
import { createPlatformController } from './platform.controller';

export const registerPlatformRoutes = (deps: RouteDeps) => {
  const controller = createPlatformController(deps);

  deps.app.get('/api/platform/tenants', controller.listTenants);
  deps.app.get('/api/platform/audit', controller.listAudit);
  deps.app.get('/api/platform/devices', controller.listDevices);
  deps.app.post('/api/platform/devices', controller.createDevice);
  deps.app.post('/api/platform/tenants/:tenantId/devices/link', controller.linkDeviceToTenant);
  deps.app.post('/api/platform/tenants/:tenantId/devices/:deviceId/unlink', controller.unlinkDeviceToStock);
  deps.app.put('/api/platform/tenants/:tenantId/devices/:deviceId', controller.renameTenantDevice);
  deps.app.post('/api/platform/tenants', controller.createTenant);
  deps.app.put('/api/platform/tenants/:tenantId', controller.updateTenant);
  deps.app.post('/api/platform/tenants/:tenantId/suspend', controller.suspendTenant);
  deps.app.post('/api/platform/tenants/:tenantId/reactivate', controller.reactivateTenant);
  deps.app.post('/api/platform/tenants/:tenantId/archive', controller.archiveTenant);
  deps.app.post('/api/platform/tenants/:tenantId/restore', controller.restoreTenant);
};
