import type { RouteDeps } from '../deps';
import { createAuthController } from './auth.controller';

export const registerAuthRoutes = (deps: RouteDeps) => {
  const controller = createAuthController(deps);

  deps.app.post('/api/auth/login', controller.login);
  deps.app.post('/api/auth/refresh', controller.refresh);
  deps.app.post('/api/auth/logout', controller.logout);
  deps.app.post('/api/auth/switch-organization', controller.switchOrganization);
  deps.app.get('/api/auth/me', controller.me);
  deps.app.post('/api/auth/impersonate', controller.impersonate);
};
