import type { RouteDeps } from '../deps';
import { createTenantUsersController } from './tenant-users.controller';

export const registerTenantUserRoutes = (deps: RouteDeps) => {
  const controller = createTenantUsersController(deps);

  deps.app.get('/api/tenant/users', controller.listUsers);
  deps.app.post('/api/tenant/users', controller.createUser);
  deps.app.put('/api/tenant/users/:userId/role', controller.updateRole);
  deps.app.post('/api/tenant/users/:userId/archive', controller.archiveUser);
  deps.app.post('/api/tenant/users/:userId/restore', controller.restoreUser);
};
