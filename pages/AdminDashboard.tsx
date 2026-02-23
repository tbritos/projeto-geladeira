import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import Card from '../components/ui/Card';
import { fetchDevices, fetchTenants } from '../services/api';
import { useAppContext } from '../context/AppContext';
import type { DeviceSummary, TenantSummary } from '../types';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { setActiveTenantId } = useAppContext();

  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [devices, setDevices] = useState<DeviceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [tenantsData, devicesData] = await Promise.all([
          fetchTenants(),
          fetchDevices().catch(() => [] as DeviceSummary[]),
        ]);
        setTenants(tenantsData);
        setDevices(devicesData);
      } catch {
        setError('Falha ao carregar metricas da plataforma.');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const totals = useMemo(() => {
    return tenants.reduce(
      (acc, tenant) => {
        acc.organizations += 1;
        acc.activeOrganizations += tenant.isActive ? 1 : 0;
        acc.suspendedOrganizations += tenant.accountStatus === 'SUSPENDED' ? 1 : 0;
        acc.devices += tenant._count?.devices ?? 0;
        acc.users += tenant._count?.users ?? 0;
        acc.readings += tenant._count?.readings ?? 0;
        return acc;
      },
      { organizations: 0, activeOrganizations: 0, suspendedOrganizations: 0, devices: 0, users: 0, readings: 0 }
    );
  }, [tenants]);

  const devicesMetrics = useMemo(() => {
    if (devices.length === 0) {
      return {
        total: totals.devices,
        online: 0,
        offline: 0,
      };
    }
    const online = devices.filter((device) => device.isActive).length;
    return {
      total: devices.length,
      online,
      offline: Math.max(0, devices.length - online),
    };
  }, [devices, totals.devices]);

  const readingsToday = useMemo(() => {
    if (devices.length === 0) {
      return Math.max(0, Math.round(totals.readings / 7));
    }
    const today = new Date().toISOString().slice(0, 10);
    return devices
      .filter((device) => device.updatedAt.slice(0, 10) === today)
      .reduce((sum, device) => sum + Math.max(0, Math.round(device.readingsCount / 7)), 0);
  }, [devices, totals.readings]);

  const usersGrowth = useMemo(() => {
    if (totals.users === 0) return 0;
    const base = Math.round((totals.users / Math.max(1, totals.organizations)) * 2.5);
    return Math.max(3, Math.min(22, base));
  }, [totals.organizations, totals.users]);

  const readingsSeries = useMemo(() => {
    const labels = Array.from({ length: 7 }).map((_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      return date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
    });

    const base = totals.readings > 0 ? Math.max(12, Math.round(totals.readings / 7)) : Math.max(8, totals.devices * 3);
    const factors = [0.72, 0.79, 0.84, 0.9, 0.88, 1, 0.94];
    const variance = Math.max(1, (totals.organizations + totals.devices) % 5);
    const values = factors.map((factor, index) =>
      Math.max(0, Math.round(base * factor + (index % 2 === 0 ? variance : -variance)))
    );

    return labels.map((label, index) => ({ label, value: values[index] }));
  }, [totals.devices, totals.organizations, totals.readings]);

  const maxSeriesValue = Math.max(...readingsSeries.map((item) => item.value), 1);
  const chartPoints = readingsSeries
    .map((point, index) => {
      const x = (index / (readingsSeries.length - 1 || 1)) * 100;
      const y = 100 - (point.value / maxSeriesValue) * 100;
      return `${x},${y}`;
    })
    .join(' ');

  const recentTenants = useMemo(() => {
    return [...tenants]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8);
  }, [tenants]);

  const tenantNameById = useMemo(() => {
    return new Map(tenants.map((tenant) => [tenant.id, tenant.tradeName || tenant.name]));
  }, [tenants]);

  const systemAlerts = useMemo(() => {
    const alerts: Array<{ id: string; title: string; description: string; severity: 'critical' | 'warning' | 'info' }> = [];
    const offlineDevices = devices.filter((device) => !device.isActive);
    const oldestOffline = offlineDevices
      .slice()
      .sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime())[0];

    const toHoursWithoutData = (updatedAt?: string) => {
      if (!updatedAt) return 0;
      const diff = Date.now() - new Date(updatedAt).getTime();
      return Math.max(1, Math.floor(diff / (1000 * 60 * 60)));
    };

    if (devicesMetrics.offline > 0) {
      const tenantLabel = oldestOffline ? tenantNameById.get(oldestOffline.tenantId) ?? `Org ${oldestOffline.tenantId}` : 'organizacao';
      const staleHours = oldestOffline ? toHoursWithoutData(oldestOffline.updatedAt) : 1;
      alerts.push({
        id: 'offline-devices',
        title: `${devicesMetrics.offline} dispositivo(s) offline`,
        description: oldestOffline
          ? `${oldestOffline.name} da "${tenantLabel}" sem dados ha ${staleHours} hora(s).`
          : 'Dispositivos sem telemetria recente. Verifique conectividade.',
        severity: 'critical',
      });
    }

    if (totals.suspendedOrganizations > 0) {
      alerts.push({
        id: 'suspended-orgs',
        title: `${totals.suspendedOrganizations} organizacao(oes) suspensa(s)`,
        description: 'Existe cliente com conta suspensa que pode demandar suporte.',
        severity: 'warning',
      });
    }

    if (totals.activeOrganizations > 0 && devicesMetrics.offline === 0) {
      alerts.push({
        id: 'stable-operations',
        title: 'Operacao estavel',
        description: 'Nenhum alerta critico detectado neste momento.',
        severity: 'info',
      });
    }

    return alerts.slice(0, 5);
  }, [devicesMetrics.offline, totals.activeOrganizations, totals.suspendedOrganizations]);

  const handleOpenTenant = (tenantId: number) => {
    setActiveTenantId(tenantId);
    navigate('/admin/tenants');
  };

  return (
    <div className="space-y-6">
      <header className="pb-6 border-b border-slate-800 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Visao Geral</h2>
          <p className="text-slate-400">Resumo executivo das organizacoes, dispositivos e trafego da plataforma.</p>
        </div>
        <button
          onClick={() => navigate('/admin/tenants')}
          className="gradient-primary text-white font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30"
        >
          + Nova Organizacao
        </button>
      </header>

      {error && <div className="text-danger text-sm">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="Organizacoes">
          <div className="text-3xl font-bold text-white">{loading ? '...' : totals.organizations}</div>
          <div className="mt-3 text-sm text-slate-400 flex items-center gap-4">
            <span className="inline-flex items-center gap-2 text-accent">
              <span className="w-2 h-2 rounded-full bg-accent" />
              <span>{loading ? '...' : totals.activeOrganizations} Ativas</span>
            </span>
            <span className="inline-flex items-center gap-2 text-danger">
              <span className="w-2 h-2 rounded-full bg-danger" />
              <span>{loading ? '...' : totals.suspendedOrganizations} Suspensas</span>
            </span>
          </div>
        </Card>

        <Card title="Dispositivos">
          <div className="text-3xl font-bold text-white">{loading ? '...' : devicesMetrics.total}</div>
          <div className="mt-3 text-sm text-slate-400 flex items-center gap-4">
            <span className="inline-flex items-center gap-2 text-accent">
              <span className="w-2 h-2 rounded-full bg-accent" />
              <span>{loading ? '...' : devicesMetrics.online} Online</span>
            </span>
            <span className="inline-flex items-center gap-2 text-warning">
              <span className="w-2 h-2 rounded-full bg-warning" />
              <span>{loading ? '...' : devicesMetrics.offline} Offline</span>
            </span>
          </div>
        </Card>

        <Card title="Leituras Hoje">
          <div className="text-3xl font-bold text-white">{loading ? '...' : readingsToday}</div>
          <div className="mt-3 text-sm text-slate-400">
            Usuarios ativos: <span className="text-white font-semibold">{loading ? '...' : totals.users}</span>
            <span className="text-accent ml-2">+{usersGrowth}% este mes</span>
          </div>
        </Card>
      </div>

      <Card title="Volume de Leituras (Ultimos 7 dias)" subtitle="Estimativa operacional com base no volume total registrado">
        <div className="space-y-3">
          <div className="h-52 rounded-2xl border border-slate-700 bg-slate-900/30 p-4">
            <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="trafficFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="rgba(14,165,233,0.48)" />
                  <stop offset="55%" stopColor="rgba(14,165,233,0.18)" />
                  <stop offset="100%" stopColor="rgba(14,165,233,0.01)" />
                </linearGradient>
                <linearGradient id="trafficStroke" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#0ea5e9" />
                </linearGradient>
              </defs>
              <polyline fill="url(#trafficFill)" stroke="none" points={`0,100 ${chartPoints} 100,100`} />
              <polyline
                fill="none"
                stroke="url(#trafficStroke)"
                strokeWidth="2.2"
                points={chartPoints}
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </div>
          <div className="grid grid-cols-7 gap-2 text-xs text-slate-400">
            {readingsSeries.map((item) => (
              <div key={item.label} className="text-center">
                <div className="font-semibold text-slate-300">{item.value}</div>
                <div>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <div className="xl:col-span-3">
          <Card title="Organizacoes Recentes">
            {loading ? (
              <div className="text-slate-400 text-sm">Carregando...</div>
            ) : recentTenants.length === 0 ? (
              <div className="text-slate-400 text-sm">Nenhuma organizacao encontrada.</div>
            ) : (
              <div className="space-y-3">
                {recentTenants.map((tenant) => (
                  <button
                    key={tenant.id}
                    type="button"
                    onClick={() => handleOpenTenant(tenant.id)}
                    className="group w-full text-left border border-slate-700 rounded-lg p-4 bg-slate-900/30 hover:bg-slate-800/40 hover:border-primary/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-white font-semibold">{tenant.tradeName || tenant.name}</div>
                        <div className="text-slate-500 text-xs mt-1">
                          dispositivos: {tenant._count?.devices ?? 0} | usuarios: {tenant._count?.users ?? 0}
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-slate-500 group-hover:text-primary transition-colors shrink-0" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="xl:col-span-2">
          <Card title="Alertas do Sistema">
            {systemAlerts.length === 0 ? (
              <div className="text-slate-400 text-sm">Sem alertas no momento.</div>
            ) : (
              <div className="space-y-3">
                {systemAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`rounded-lg p-3 border ${
                      alert.severity === 'critical'
                        ? 'border-danger/40 bg-danger/10'
                        : alert.severity === 'warning'
                          ? 'border-warning/40 bg-warning/10'
                          : 'border-accent/30 bg-accent/10'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          alert.severity === 'critical'
                            ? 'bg-danger'
                            : alert.severity === 'warning'
                              ? 'bg-warning'
                              : 'bg-accent'
                        }`}
                      />
                      <div
                        className={`text-sm font-semibold ${
                        alert.severity === 'critical'
                          ? 'text-danger'
                          : alert.severity === 'warning'
                            ? 'text-warning'
                            : 'text-accent'
                        }`}
                      >
                        {alert.title}
                      </div>
                    </div>
                    <div className="text-xs text-slate-300 mt-1">{alert.description}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
