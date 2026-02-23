import React, { useEffect, useMemo, useState } from 'react';
import { Search, Settings2, Eye } from 'lucide-react';
import Card from '../components/ui/Card';
import { fetchAuditLogs, fetchTenants } from '../services/api';
import { AuditLogEntry, TenantSummary } from '../types';

const ACTION_OPTIONS: AuditLogEntry['action'][] = [
  'AUTH_LOGIN_SUCCESS',
  'AUTH_LOGIN_FAILED',
  'AUTH_LOGOUT',
  'AUTH_SWITCH_ORGANIZATION',
  'AUTH_IMPERSONATE',
  'PLATFORM_TENANT_CREATE',
  'PLATFORM_TENANT_UPDATE',
  'PLATFORM_TENANT_STATUS_UPDATE',
  'TENANT_USER_CREATE',
  'TENANT_USER_ROLE_UPDATE',
  'SETTINGS_TEMPERATURE_UPDATE',
];

const ACTION_PRESENTATION: Record<
  AuditLogEntry['action'],
  {
    label: string;
    className: string;
  }
> = {
  AUTH_LOGIN_SUCCESS: {
    label: 'Login Realizado',
    className: 'bg-accent/10 text-accent border-accent/30',
  },
  AUTH_LOGIN_FAILED: {
    label: 'Falha no Login',
    className: 'bg-danger/10 text-danger border-danger/30',
  },
  AUTH_LOGOUT: {
    label: 'Logout',
    className: 'bg-slate-500/10 text-slate-300 border-slate-500/30',
  },
  AUTH_SWITCH_ORGANIZATION: {
    label: 'Troca de Organizacao',
    className: 'bg-primary/15 text-primary border-primary/35',
  },
  AUTH_IMPERSONATE: {
    label: 'Acesso Como Usuario',
    className: 'bg-warning/10 text-warning border-warning/30',
  },
  PLATFORM_TENANT_CREATE: {
    label: 'Organizacao Criada',
    className: 'bg-accent/10 text-accent border-accent/30',
  },
  PLATFORM_TENANT_UPDATE: {
    label: 'Organizacao Atualizada',
    className: 'bg-primary/15 text-primary border-primary/35',
  },
  PLATFORM_TENANT_STATUS_UPDATE: {
    label: 'Status da Organizacao',
    className: 'bg-warning/10 text-warning border-warning/30',
  },
  TENANT_USER_CREATE: {
    label: 'Usuario Adicionado',
    className: 'bg-accent/10 text-accent border-accent/30',
  },
  TENANT_USER_ROLE_UPDATE: {
    label: 'Permissao Alterada',
    className: 'bg-primary/15 text-primary border-primary/35',
  },
  SETTINGS_TEMPERATURE_UPDATE: {
    label: 'Configuracao de Temperatura',
    className: 'bg-slate-500/10 text-slate-300 border-slate-500/30',
  },
  PLATFORM_TENANT_ARCHIVE: {
    label: 'Organizacao Arquivada',
    className: 'bg-danger/10 text-danger border-danger/30',
  },
  PLATFORM_TENANT_RESTORE: {
    label: 'Organizacao Restaurada',
    className: 'bg-accent/10 text-accent border-accent/30',
  },
  TENANT_USER_ARCHIVE: {
    label: 'Usuario Arquivado',
    className: 'bg-danger/10 text-danger border-danger/30',
  },
  TENANT_USER_RESTORE: {
    label: 'Usuario Restaurado',
    className: 'bg-accent/10 text-accent border-accent/30',
  },
};

const AdminAuditPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [actorUsername, setActorUsername] = useState('');
  const [action, setAction] = useState('');
  const [limit, setLimit] = useState('100');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  const tenantNameById = useMemo(() => {
    const map = new Map<number, string>();
    tenants.forEach((tenant) => {
      map.set(tenant.id, tenant.tradeName || tenant.name);
    });
    return map;
  }, [tenants]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [tenantData, logsData] = await Promise.all([
        fetchTenants(),
        fetchAuditLogs({
          tenantId: tenantId ? Number(tenantId) : undefined,
          actorUsername: actorUsername.trim() || undefined,
          action: action || undefined,
          from: from || undefined,
          to: to || undefined,
          limit: limit ? Number(limit) : undefined,
        }),
      ]);
      setTenants(tenantData);
      setLogs(logsData);
    } catch {
      setError('Falha ao carregar auditoria.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-6">
      <header className="pb-6 border-b border-slate-800">
        <h2 className="text-3xl font-bold text-white mb-2">Auditoria</h2>
        <p className="text-slate-400">Rastreio de acessos e alteracoes sensiveis do sistema.</p>
      </header>

      <Card title="Filtros">
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_220px_auto_auto] gap-3">
            <label className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={actorUsername}
                onChange={(e) => setActorUsername(e.target.value)}
                placeholder="Buscar por usuario"
                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-white"
              />
            </label>
            <input
              type="datetime-local"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white"
            />
            <button
              onClick={() => setShowAdvanced((prev) => !prev)}
              className="rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-2 text-slate-200 inline-flex items-center gap-2"
            >
              <Settings2 size={14} />
              Filtros Avancados
            </button>
            <button
              onClick={() => void load()}
              className="gradient-primary text-white rounded-lg px-4 py-2 whitespace-nowrap"
            >
              Buscar
            </button>
          </div>

          {showAdvanced && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3 rounded-lg border border-slate-700 bg-slate-900/30">
              <select
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                className="bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white"
              >
                <option value="">Todas organizacoes</option>
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.tradeName || tenant.name}
                  </option>
                ))}
              </select>
              <select
                value={action}
                onChange={(e) => setAction(e.target.value)}
                className="bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white"
              >
                <option value="">Todas acoes</option>
                {ACTION_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {ACTION_PRESENTATION[item]?.label || item}
                  </option>
                ))}
              </select>
              <input
                type="datetime-local"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white"
              />
              <input
                type="number"
                min={1}
                max={500}
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                className="bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white"
                placeholder="Limite"
              />
            </div>
          )}
        </div>
        {error && <div className="mt-3 text-danger text-sm">{error}</div>}
      </Card>

      <Card title="Eventos">
        {loading ? (
          <div className="text-slate-400 text-sm">Carregando...</div>
        ) : logs.length === 0 ? (
          <div className="text-slate-400 text-sm">Nenhum evento encontrado.</div>
        ) : (
          <div className="overflow-x-auto border border-slate-700 rounded-xl">
            <table className="w-full min-w-[920px] text-sm">
              <thead className="bg-slate-900/40">
                <tr className="text-left text-xs text-slate-400 uppercase tracking-wide">
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Usuario</th>
                  <th className="px-4 py-3">Acao</th>
                  <th className="px-4 py-3">Organizacao</th>
                  <th className="px-4 py-3 text-right">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {logs.map((entry) => {
                  const actionView = ACTION_PRESENTATION[entry.action] || {
                    label: entry.action,
                    className: 'bg-slate-500/10 text-slate-300 border-slate-500/30',
                  };
                  const organization =
                    (entry.targetTenantId && tenantNameById.get(entry.targetTenantId)) ||
                    (entry.actorTenantId && tenantNameById.get(entry.actorTenantId)) ||
                    '-';
                  return (
                    <tr key={entry.id} className="hover:bg-slate-800/25 transition-colors">
                      <td className="px-4 py-3 text-slate-300">{new Date(entry.timestamp).toLocaleString('pt-BR')}</td>
                      <td className="px-4 py-3 text-white font-medium">{entry.actorUsername}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${actionView.className}`}>
                          {actionView.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{organization}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setSelectedLog(entry)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900/50 text-slate-200 hover:bg-slate-800/60"
                        >
                          <Eye size={14} />
                          Ver
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-[#0f172a] border border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Detalhes do Evento</h3>
              <button onClick={() => setSelectedLog(null)} className="text-slate-400 hover:text-white text-sm">
                Fechar
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="text-slate-300">Data: <span className="text-white">{new Date(selectedLog.timestamp).toLocaleString('pt-BR')}</span></div>
              <div className="text-slate-300">Usuario: <span className="text-white">{selectedLog.actorUsername}</span></div>
              <div className="text-slate-300">Acao: <span className="text-white">{ACTION_PRESENTATION[selectedLog.action]?.label || selectedLog.action}</span></div>
              <div className="text-slate-300">Alvo: <span className="text-white">{selectedLog.targetUsername || '-'}</span></div>
              <div className="text-slate-300">IP: <span className="text-white">{selectedLog.ip || '-'}</span></div>
              <div className="text-slate-300">Navegador: <span className="text-white break-all">{selectedLog.userAgent || '-'}</span></div>
            </div>

            {selectedLog.metadata && (
              <pre className="mt-4 text-xs text-slate-300 bg-slate-950/70 border border-slate-800 rounded p-3 overflow-x-auto">
                {JSON.stringify(selectedLog.metadata, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAuditPage;
