import type { RouteDeps } from '../deps';
import { createCoreController } from './core.controller';

export const registerCoreRoutes = (deps: RouteDeps) => {
  const controller = createCoreController(deps);

  deps.app.post('/api/readings', controller.ingestReading);
  deps.app.get('/api/devices', controller.listDevices);
  deps.app.get('/api/status', controller.status);
  deps.app.get('/api/history', controller.history);
  deps.app.get('/api/events', controller.events);
  deps.app.get('/api/settings/temperature', controller.getTempSettings);
  deps.app.put('/api/settings/temperature', controller.updateTempSettings);
};
