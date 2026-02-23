import { DEFAULT_TENANT_SLUG } from '../../config/env';
import { withAuth, withTenantRole } from '../../middlewares/access.middleware';
import { writeAuditLog } from '../../services/audit.service';
import type { RouteDeps } from '../deps';
import { createCoreService } from './core.service';

export const createCoreController = (deps: RouteDeps) => {
  const { prisma, tenantService, app } = deps;
  const service = createCoreService(deps);

  const ingestReading = async (request: any, reply: any) => {
    const data = request.body as {
      deviceId?: string;
      temperature?: number | string;
      humidity?: number | string;
      relayState?: boolean;
      doorOpen?: boolean;
      powerOk?: boolean;
    };

    const temperature = Number.parseFloat(String(data.temperature));
    const humidity = Number.parseFloat(String(data.humidity));

    if (!Number.isFinite(temperature) || !Number.isFinite(humidity)) {
      return reply.status(400).send({ error: 'temperature e humidity devem ser numericos' });
    }

    const externalId = data.deviceId || 'tupa-01';

    let device = await prisma.device.findUnique({ where: { externalId } });
    if (!device) {
      const fallbackTenant = await tenantService.ensureTenant('Cliente Padrão', DEFAULT_TENANT_SLUG);
      device = await prisma.device.create({
        data: {
          tenantId: fallbackTenant.id,
          externalId,
          name: `Dispositivo ${externalId}`,
        },
      });
    }

    try {
      const reading = await prisma.reading.create({
        data: {
          deviceId: device.id,
          tenantId: device.tenantId,
          temperature,
          humidity,
          relayState: Boolean(data.relayState),
          doorOpen: Boolean(data.doorOpen),
          powerOk: data.powerOk !== undefined ? Boolean(data.powerOk) : true,
        },
      });
      return reading;
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: 'Erro ao salvar no banco' });
    }
  };

  const status = withAuth(async (request, reply, payload) => {
    const tenant = await tenantService.resolveTenantContext(request, payload, reply);
    if (!tenant) return;

    const settings = await tenantService.getTemperatureSettings(tenant.id);
    const last = await prisma.reading.findFirst({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: 'desc' },
    });

    if (!last) {
      return {
        temperature: 0,
        humidity: 0,
        relayState: false,
        door1Status: true,
        powerStatus: true,
        minTemp: settings.minTemp,
        maxTemp: settings.maxTemp,
        alertActive: false,
        lastUpdate: new Date().toISOString(),
        tenantId: tenant.id,
        tenantName: tenant.name,
      };
    }

    return {
      temperature: last.temperature,
      humidity: last.humidity,
      relayState: last.relayState,
      door1Status: !last.doorOpen,
      powerStatus: last.powerOk,
      minTemp: settings.minTemp,
      maxTemp: settings.maxTemp,
      alertActive: last.temperature > settings.maxTemp || last.doorOpen,
      lastUpdate: last.createdAt.toISOString(),
      tenantId: tenant.id,
      tenantName: tenant.name,
    };
  });

  const history = withAuth(async (request, reply, payload) => {
    const tenant = await tenantService.resolveTenantContext(request, payload, reply);
    if (!tenant) return;
    return service.listHistory(tenant.id);
  });

  const events = withAuth(async (request, reply, payload) => {
    const tenant = await tenantService.resolveTenantContext(request, payload, reply);
    if (!tenant) return;
    const settings = await tenantService.getTemperatureSettings(tenant.id);
    return service.listEvents(tenant.id, settings.maxTemp);
  });

  const getTempSettings = withAuth(async (request, reply, payload) => {
    const tenant = await tenantService.resolveTenantContext(request, payload, reply);
    if (!tenant) return;
    return tenantService.getTemperatureSettings(tenant.id);
  });

  const updateTempSettings = withTenantRole(
    ['TENANT_ADMIN', 'OPERATOR'],
    'Sem permissao para alterar configuracoes',
    async (request, reply, payload) => {
      const tenant = await tenantService.resolveTenantContext(request, payload, reply);
      if (!tenant) return;

      const body = request.body as { minTemp?: number; maxTemp?: number };
      const minTemp = Number(body?.minTemp);
      const maxTemp = Number(body?.maxTemp);

      if (!Number.isFinite(minTemp) || !Number.isFinite(maxTemp) || minTemp >= maxTemp) {
        return reply.status(400).send({ error: 'Valores de temperatura invalidos' });
      }

      const previousSettings = await tenantService.getTemperatureSettings(tenant.id);
      const settings = await prisma.temperatureSetting.upsert({
        where: { tenantId: tenant.id },
        update: { minTemp, maxTemp },
        create: { tenantId: tenant.id, minTemp, maxTemp },
      });

      await writeAuditLog(request, {
        action: 'SETTINGS_TEMPERATURE_UPDATE',
        actorUsername: payload.sub,
        actorPlatformRole: payload.platformRole,
        actorTenantRole: payload.tenantRole,
        actorTenantId: payload.tenantId,
        targetTenantId: tenant.id,
        metadata: {
          before: { minTemp: previousSettings.minTemp, maxTemp: previousSettings.maxTemp },
          after: { minTemp: settings.minTemp, maxTemp: settings.maxTemp },
        },
      });
      return settings;
    }
  );

  const listDevices = withAuth(async (request, reply, payload) => {
    const tenant = await tenantService.resolveTenantContext(request, payload, reply);
    if (!tenant) return;

    const devices = await prisma.device.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            readings: true,
          },
        },
      },
    });

    return devices.map((device) => ({
      id: device.id,
      externalId: device.externalId,
      name: device.name,
      isActive: device.isActive,
      tenantId: device.tenantId,
      createdAt: device.createdAt.toISOString(),
      updatedAt: device.updatedAt.toISOString(),
      readingsCount: device._count.readings,
    }));
  });

  return {
    ingestReading,
    listDevices,
    status,
    history,
    events,
    getTempSettings,
    updateTempSettings,
  };
};
