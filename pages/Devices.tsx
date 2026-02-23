import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, Download, MoreHorizontal, PackageX, Pencil, Plus, Search, Trash2, Zap } from 'lucide-react';
import Card from '../components/ui/Card';
import { createPlatformDevice, fetchDevices, fetchPlatformDevices, fetchTenants } from '../services/api';
import { useAppContext } from '../context/AppContext';
import type { DeviceSummary, TenantSummary } from '../types';

const STOCK_OPTION = 'STOCK_INTERNAL';
type DeviceStatus = 'ONLINE' | 'OFFLINE' | 'PENDING';
type StatusFilter = 'ALL' | DeviceStatus;

type DeviceFormData = {
  externalId: string;
  name: string;
  tenantId?: number;
};

type ApiErrorPayload = {
  error?: string;
  message?: string;
};

const getRelativeSync = (updatedAt: string) => {
  const diffMs = Date.now() - new Date(updatedAt).getTime();
  const minutes = Math.max(1, Math.floor(diffMs / 60000));
  if (minutes < 60) return `Ha ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Ha ${hours} h`;
  const days = Math.floor(hours / 24);
  return `Ha ${days} dia(s)`;
};

const normalizeHardwareId = (value: string) => {
  const upper = value.toUpperCase();
  const looksMacLike = /^[A-F0-9:\-\s]*$/.test(upper);

  if (looksMacLike) {
    const hex = upper.replace(/[^A-F0-9]/g, '').slice(0, 12);
    return hex.match(/.{1,2}/g)?.join(':') ?? '';
  }

  return upper.replace(/[^A-Z0-9_\-:.]/g, '').slice(0, 32);
};

const getDeviceStatus = (device: DeviceSummary): DeviceStatus => {
  if (device.readingsCount <= 0) return 'PENDING';
  return device.isActive ? 'ONLINE' : 'OFFLINE';
};

const getStatusLabel = (status: DeviceStatus) => {
  if (status === 'ONLINE') return 'Online';
  if (status === 'OFFLINE') return 'Offline';
  return 'Aguardando';
};

const getLastSyncLabel = (device: DeviceSummary) => {
  if (getDeviceStatus(device) === 'PENDING') return 'Nunca sincronizou';
  return getRelativeSync(device.updatedAt);
};

const DevicesPage: React.FC = () => {
  const { user, isViewingAsTenant } = useAppContext();
  const isGlobalAdminView = user?.platformRole === 'SUPER_ADMIN' && !isViewingAsTenant;

  const [devices, setDevices] = useState<DeviceSummary[]>([]);
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openActionDeviceId, setOpenActionDeviceId] = useState<number | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [clientFilter, setClientFilter] = useState<string>('ALL');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [hardwareId, setHardwareId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [modelVersion, setModelVersion] = useState('');
  const [selectedTenantId, setSelectedTenantId] = useState<string>(STOCK_OPTION);
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState('');

  const loadDevices = async () => {
    setLoading(true);
    setError('');
    try {
      const data = isGlobalAdminView ? await fetchPlatformDevices() : await fetchDevices();
      setDevices(data);
    } catch {
      setError(
        isGlobalAdminView
          ? 'Falha ao carregar inventario global de dispositivos.'
          : 'Falha ao carregar dispositivos da organizacao ativa.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const closeMenu = () => setOpenActionDeviceId(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  useEffect(() => {
    void loadDevices();
  }, [isGlobalAdminView]);

  useEffect(() => {
    if (!isGlobalAdminView) return;
    const loadTenants = async () => {
      try {
        const all = await fetchTenants();
        const active = all.filter(
          (tenant) => tenant.accountStatus === 'ACTIVE' && !tenant.deletedAt && tenant.slug !== 'estoque-interno'
        );
        setTenants(active);
      } catch {
        setTenants([]);
      }
    };
    void loadTenants();
  }, [isGlobalAdminView]);

  const filteredDevices = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return devices.filter((device) => {
      const deviceStatus = getDeviceStatus(device);
      if (statusFilter !== 'ALL' && deviceStatus !== statusFilter) {
        return false;
      }

      if (clientFilter === 'STOCK' && !!device.tenantName) {
        return false;
      }

      if (clientFilter.startsWith('TENANT:')) {
        const tenantId = Number(clientFilter.replace('TENANT:', ''));
        if (Number.isFinite(tenantId) && device.tenantId !== tenantId) {
          return false;
        }
      }

      if (!query) return true;

      const searchable = `${device.name} ${device.externalId} ${device.tenantName || 'Estoque Interno'}`.toLowerCase();
      return searchable.includes(query);
    });
  }, [devices, searchTerm, statusFilter, clientFilter]);

  const clientFilterOptions = useMemo(() => {
    const byId = new Map<number, string>();

    tenants.forEach((tenant) => {
      byId.set(tenant.id, tenant.tradeName || tenant.name);
    });

    devices.forEach((device) => {
      if (device.tenantName) {
        byId.set(device.tenantId, device.tenantName);
      }
    });

    return Array.from(byId.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [devices, tenants]);

  const totals = useMemo(() => {
    const now = Date.now();
    return devices.reduce(
      (acc, device) => {
        acc.total += 1;
        if (device.isActive) acc.online += 1;
        else acc.offline += 1;
        acc.readingsTotal += device.readingsCount;
        const updatedHoursAgo = (now - new Date(device.updatedAt).getTime()) / (1000 * 60 * 60);
        if (updatedHoursAgo <= 24) {
          acc.readingsToday += Math.max(0, Math.round(device.readingsCount / 7));
        }
        return acc;
      },
      { total: 0, online: 0, offline: 0, readingsToday: 0, readingsTotal: 0 }
    );
  }, [devices]);

  const subtitle = isGlobalAdminView
    ? 'Inventario global de hardware de todos os clientes.'
    : 'Inventario dos dispositivos da organizacao ativa.';

  const handleExportCsv = () => {
    const headers = ['serial', 'status', 'cliente', 'ultima_sincronizacao', 'leituras'];
    const lines = filteredDevices.map((device) => {
      const values = [
        device.name || `TUPA-GEL-${String(device.id).padStart(3, '0')}`,
        getDeviceStatus(device),
        device.tenantName || 'Estoque Interno',
        getLastSyncLabel(device),
        String(device.readingsCount),
      ];
      return values.map((value) => `"${value.replace(/"/g, '""')}"`).join(',');
    });

    const blob = new Blob([[headers.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `dispositivos-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const resetCreateForm = () => {
    setHardwareId('');
    setDisplayName('');
    setModelVersion('');
    setSelectedTenantId(STOCK_OPTION);
    setCreateError('');
  };

  const handleCreateDevice = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!hardwareId.trim() || !displayName.trim()) {
      setCreateError('Endereco MAC/Serie e Nome de exibicao sao obrigatorios.');
      return;
    }

    setSaving(true);
    setCreateError('');
    try {
      const payload: DeviceFormData = {
        externalId: hardwareId.trim(),
        name: modelVersion.trim() ? `${displayName.trim()} (${modelVersion.trim()})` : displayName.trim(),
      };

      if (selectedTenantId !== STOCK_OPTION) {
        const tenantId = Number(selectedTenantId);
        if (!Number.isFinite(tenantId)) {
          setCreateError('Organizacao invalida selecionada.');
          setSaving(false);
          return;
        }
        payload.tenantId = tenantId;
      }

      await createPlatformDevice(payload);
      setIsCreateOpen(false);
      resetCreateForm();
      await loadDevices();
    } catch (error) {
      const apiError = error as {
        response?: { data?: ApiErrorPayload };
      };
      const backendMessage = apiError.response?.data?.error || apiError.response?.data?.message;
      setCreateError(backendMessage || 'Nao foi possivel cadastrar a placa.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="pb-6 border-b border-slate-800 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Dispositivos</h2>
          <p className="text-slate-400">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="w-10 h-10 rounded-lg border border-slate-700 bg-slate-900/50 text-slate-300 hover:text-white hover:bg-slate-800/50 flex items-center justify-center"
            title="Exportar CSV"
            aria-label="Exportar tabela em CSV"
          >
            <Download size={15} />
          </button>
          {isGlobalAdminView && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="gradient-primary text-white rounded-lg px-4 py-2 inline-flex items-center gap-2 font-semibold"
            >
              <Plus size={15} />
              Novo Dispositivo
            </button>
          )}
        </div>
      </header>

      {error && <div className="text-danger text-sm">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card title="Total">
          <div className="text-3xl font-bold text-white">{loading ? '...' : totals.total}</div>
        </Card>
        <Card title="Online">
          <div className="text-3xl font-bold text-white">{loading ? '...' : totals.online}</div>
          <div className="mt-2 text-xs text-accent inline-flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent" />
            Em operacao
          </div>
        </Card>
        <Card title="Offline">
          <div className="text-3xl font-bold text-white">{loading ? '...' : totals.offline}</div>
          <div className="mt-2 text-xs text-danger inline-flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-danger" />
            Requer atencao
          </div>
        </Card>
        <Card title="Leituras Hoje">
          <div className="text-3xl font-bold text-white">{loading ? '...' : totals.readingsToday}</div>
        </Card>
      </div>

      <Card title="Inventario de Dispositivos">
        <div className="mb-4 flex flex-col lg:flex-row gap-3">
          <label className="relative flex-1" aria-label="Buscar dispositivo">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              type="text"
              placeholder="Buscar por MAC, nome ou cliente..."
              className="w-full bg-slate-900/50 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-accent"
            />
          </label>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            className="bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-accent"
            aria-label="Filtrar por status"
          >
            <option value="ALL">Status: Todos</option>
            <option value="ONLINE">Status: Online</option>
            <option value="OFFLINE">Status: Offline</option>
            <option value="PENDING">Status: Aguardando</option>
          </select>

          <select
            value={clientFilter}
            onChange={(event) => setClientFilter(event.target.value)}
            className="bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-accent"
            aria-label="Filtrar por cliente"
          >
            <option value="ALL">Cliente: Todos</option>
            <option value="STOCK">Cliente: Somente Estoque</option>
            {clientFilterOptions.map((option) => (
              <option key={option.id} value={`TENANT:${option.id}`}>
                Cliente: {option.name}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="text-slate-400 text-sm">Carregando...</div>
        ) : filteredDevices.length === 0 ? (
          <div className="text-slate-400 text-sm">Nenhum dispositivo encontrado com os filtros atuais.</div>
        ) : (
          <div className="overflow-x-auto border border-slate-700 rounded-xl">
            <table className="w-full min-w-[960px]">
              <thead className="bg-slate-900/40">
                <tr className="text-left text-xs text-slate-400 uppercase tracking-wide">
                  <th className="px-4 py-3">Identificacao</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Cliente Vinculado</th>
                  <th className="px-4 py-3">Ultima sincronizacao</th>
                  <th className="px-4 py-3 text-right">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {filteredDevices.map((device) => {
                  const serial = device.name || `TUPA-GEL-${String(device.id).padStart(3, '0')}`;
                  const status = getDeviceStatus(device);
                  const statusDotClass =
                    status === 'ONLINE' ? 'bg-accent' : status === 'OFFLINE' ? 'bg-danger' : 'bg-slate-400';
                  const statusChipClass =
                    status === 'ONLINE'
                      ? 'bg-accent/10 text-accent border-accent/30'
                      : status === 'OFFLINE'
                        ? 'bg-danger/10 text-danger border-danger/30'
                        : 'bg-slate-500/10 text-slate-300 border-slate-500/30';

                  return (
                    <tr key={device.id} className="border-t border-slate-800 hover:bg-slate-800/35 transition-colors group">
                      <td className="px-4 py-3">
                        <div className="text-white font-semibold group-hover:text-accent transition-colors">{serial}</div>
                        <div className="text-xs text-slate-400 mt-1 font-mono">{device.externalId}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusChipClass}`}>
                          <span className={`w-2 h-2 rounded-full ${statusDotClass}`} />
                          {getStatusLabel(status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300">{device.tenantName || 'Estoque Interno'}</td>
                      <td className={`px-4 py-3 text-sm ${status === 'OFFLINE' ? 'text-danger' : 'text-slate-400'}`}>
                        {getLastSyncLabel(device)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="relative flex justify-end">
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              setOpenActionDeviceId((current) => (current === device.id ? null : device.id));
                            }}
                            className="w-8 h-8 rounded-lg border border-slate-700 bg-slate-900/50 text-slate-300 hover:text-white hover:bg-slate-800/60 flex items-center justify-center"
                            aria-label={`Abrir acoes do dispositivo ${serial}`}
                          >
                            <MoreHorizontal size={16} />
                          </button>
                          {openActionDeviceId === device.id && (
                            <div
                              className="absolute right-2 top-10 z-30 w-56 rounded-xl border border-slate-700 bg-slate-900/95 p-1.5 shadow-2xl"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <button className="w-full text-left rounded-md px-3 py-2 text-sm text-slate-200 hover:bg-slate-800/70 hover:text-white inline-flex items-center gap-2 transition-colors">
                                <BarChart3 size={14} />
                                Ver Leituras
                              </button>
                              <button className="w-full text-left rounded-md px-3 py-2 text-sm text-slate-200 hover:bg-slate-800/70 hover:text-white inline-flex items-center gap-2 transition-colors">
                                <Pencil size={14} />
                                Editar Dados
                              </button>
                              <div className="my-1 border-t border-slate-700/80" />
                              <button className="w-full text-left rounded-md px-3 py-2 text-sm text-slate-200 hover:bg-slate-800/70 hover:text-white inline-flex items-center gap-2 transition-colors">
                                <Zap size={14} />
                                Ping (Testar Conexao)
                              </button>
                              <button className="w-full text-left rounded-md px-3 py-2 text-sm text-amber-300 hover:bg-amber-500/10 hover:text-amber-200 inline-flex items-center gap-2 transition-colors">
                                <PackageX size={14} />
                                Desvincular (Estoque)
                              </button>
                              <div className="my-1 border-t border-slate-700/80" />
                              <button className="w-full text-left rounded-md px-3 py-2 text-sm text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 inline-flex items-center gap-2 transition-colors">
                                <Trash2 size={14} />
                                Excluir Placa
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-[#020617] border border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">+ Novo Dispositivo</h3>
              <button
                onClick={() => {
                  setIsCreateOpen(false);
                  resetCreateForm();
                }}
                className="text-slate-400 hover:text-white text-sm"
                aria-label="Fechar modal"
              >
                X
              </button>
            </div>

            <form className="space-y-6" onSubmit={handleCreateDevice}>
              <section className="border border-slate-700 rounded-xl p-4 space-y-3 bg-slate-900/20">
                <div className="text-xs uppercase tracking-wide text-slate-400 font-semibold">Identificacao do Hardware</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="space-y-1">
                    <span className="text-xs text-slate-300">
                      Endereco MAC (ou Numero de Serie) <span className="text-danger">*</span>
                    </span>
                    <input
                      value={hardwareId}
                      onChange={(e) => setHardwareId(normalizeHardwareId(e.target.value))}
                      placeholder="Ex: 24:6F:28:A1:B2:C3"
                      className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs text-slate-300">
                      Nome de Exibicao <span className="text-danger">*</span>
                    </span>
                    <input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Ex: Geladeira Refeitorio"
                      className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    />
                  </label>
                  <label className="space-y-1 md:col-span-2">
                    <span className="text-xs text-slate-300">Modelo / Versao (Opcional)</span>
                    <input
                      value={modelVersion}
                      onChange={(e) => setModelVersion(e.target.value)}
                      placeholder="Ex: Tupa-ESP32-v1"
                      className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    />
                  </label>
                </div>
              </section>

              <section className="border border-slate-700 rounded-xl p-4 space-y-3 bg-slate-900/20">
                <div className="text-xs uppercase tracking-wide text-slate-400 font-semibold">Atribuicao (Cliente)</div>
                <label className="space-y-1 block">
                  <span className="text-xs text-slate-300">
                    Vincular a Organizacao <span className="text-danger">*</span>
                  </span>
                  <select
                    value={selectedTenantId}
                    onChange={(e) => setSelectedTenantId(e.target.value)}
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value={STOCK_OPTION}>Deixar no Estoque Interno</option>
                    {tenants.map((tenant) => (
                      <option key={tenant.id} value={String(tenant.id)}>
                        {tenant.tradeName || tenant.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="text-xs text-slate-500">
                  Dica: cadastre placas em estoque e vincule ao cliente apenas quando houver venda.
                </div>
              </section>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateOpen(false);
                    resetCreateForm();
                  }}
                  className="px-4 py-2 rounded-lg text-sm bg-slate-800 text-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="gradient-primary text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
                >
                  {saving ? 'Cadastrando...' : '+ Cadastrar Placa'}
                </button>
              </div>
            </form>

            {createError && <div className="mt-3 text-danger text-sm">{createError}</div>}
          </div>
        </div>
      )}
    </div>
  );
};

export default DevicesPage;
