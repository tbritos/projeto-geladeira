import type { SystemEvent } from '../../shared/types';
import type { RouteDeps } from '../deps';

export const createCoreService = ({ prisma }: RouteDeps) => {
  const listHistory = async (tenantId: number) => {
    const readings = await prisma.reading.findMany({
      where: { tenantId },
      take: 100,
      orderBy: { createdAt: 'desc' },
    });

    return readings.reverse().map((reading) => ({
      time: new Date(reading.createdAt).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      temperature: reading.temperature,
      humidity: reading.humidity,
    }));
  };

  const listEvents = async (tenantId: number, maxTemp: number) => {
    const readings = await prisma.reading.findMany({
      where: { tenantId },
      take: 100,
      orderBy: { createdAt: 'desc' },
    });

    const events: SystemEvent[] = [];

    for (const reading of readings) {
      const timestamp = reading.createdAt.toISOString();

      if (reading.temperature > maxTemp) {
        events.push({
          id: `tenant-${tenantId}-reading-${reading.id}-temp-high`,
          type: 'ALERT',
          message: `Temperatura acima do limite (${reading.temperature.toFixed(1)}C)`,
          timestamp,
          severity: 'critical',
        });
      }

      if (reading.doorOpen) {
        events.push({
          id: `tenant-${tenantId}-reading-${reading.id}-door-open`,
          type: 'DOOR',
          message: 'Porta aberta detectada',
          timestamp,
          severity: 'warning',
        });
      }

      if (!reading.powerOk) {
        events.push({
          id: `tenant-${tenantId}-reading-${reading.id}-power-fail`,
          type: 'POWER',
          message: 'Falha de energia detectada',
          timestamp,
          severity: 'critical',
        });
      }
    }

    if (events.length === 0) {
      const latest = readings[0];
      events.push({
        id: latest ? `tenant-${tenantId}-reading-${latest.id}-system-ok` : `tenant-${tenantId}-system-bootstrap`,
        type: 'SYSTEM',
        message: 'Sistema operando normalmente',
        timestamp: latest ? latest.createdAt.toISOString() : new Date().toISOString(),
        severity: 'info',
      });
    }

    return events
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 200);
  };

  return {
    listHistory,
    listEvents,
  };
};
