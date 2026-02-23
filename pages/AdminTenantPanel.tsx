import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  BarChart3,
  Crown,
  Eye,
  KeyRound,
  Link2,
  MoreHorizontal,
  PackageMinus,
  PauseCircle,
  Pencil,
  Settings2,
  UserPlus,
  UserX,
} from 'lucide-react';
import Card from '../components/ui/Card';
import {
  createTenantUser,
  fetchDevices,
  fetchPlatformDevices,
  fetchTenantUsers,
  fetchTenants,
  linkDeviceToTenant,
  reactivateTenant,
  renameTenantDevice,
  suspendTenant,
  unlinkDeviceToStock,
  updateTenant,
} from '../services/api';
import { useAppContext } from '../context/AppContext';
import type { DeviceSummary, TenantSummary, TenantUserSummary } from '../types';

type TabId = 'overview' | 'users' | 'devices';
type TenantRole = 'TENANT_ADMIN' | 'VIEWER';

const AdminTenantPanel: React.FC = () => {
  const navigate = useNavigate();
  const { tenantId } = useParams<{ tenantId: string }>();
  const resolvedTenantId = Number(tenantId);
  const { setActiveTenantId } = useAppContext();

  const [tab, setTab] = useState<TabId>('overview');
  const [tenant, setTenant] = useState<TenantSummary | null>(null);
  const [users, setUsers] = useState<TenantUserSummary[]>([]);
  const [devices, setDevices] = useState<DeviceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [openUserActionId, setOpenUserActionId] = useState<number | null>(null);
  const [openDeviceActionId, setOpenDeviceActionId] = useState<number | null>(null);
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [createUserLoading, setCreateUserLoading] = useState(false);
  const [createUserError, setCreateUserError] = useState('');
  const [newUserFullName, setNewUserFullName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<TenantRole>('VIEWER');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [stockDevices, setStockDevices] = useState<DeviceSummary[]>([]);
  const [isLinkDeviceOpen, setIsLinkDeviceOpen] = useState(false);
  const [selectedStockDeviceId, setSelectedStockDeviceId] = useState('');
  const [linkDeviceLoading, setLinkDeviceLoading] = useState(false);
  const [linkDeviceError, setLinkDeviceError] = useState('');
  const [editingDevice, setEditingDevice] = useState<DeviceSummary | null>(null);
  const [editDeviceName, setEditDeviceName] = useState('');
  const [editDeviceLoading, setEditDeviceLoading] = useState(false);
  const [deviceActionLoadingId, setDeviceActionLoadingId] = useState<number | null>(null);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [editTradeName, setEditTradeName] = useState('');
  const [editLegalName, setEditLegalName] = useState('');
  const [editCnpj, setEditCnpj] = useState('');
  const [editSlug, setEditSlug] = useState('');

  useEffect(() => {
    if (!Number.isFinite(resolvedTenantId)) {
      navigate('/admin/tenants');
      return;
    }
    setActiveTenantId(resolvedTenantId);
  }, [navigate, resolvedTenantId, setActiveTenantId]);

  useEffect(() => {
    if (!Number.isFinite(resolvedTenantId)) return;
    const load = async () => {
      setLoading(true);
      setError('');
      setWarning('');
      try {
        const [tenantsResult, usersResult, devicesResult] = await Promise.allSettled([
          fetchTenants(),
          fetchTenantUsers(resolvedTenantId),
          fetchDevices(resolvedTenantId),
        ]);

        if (tenantsResult.status === 'rejected') {
          setError('Falha ao carregar dados da organizacao.');
          return;
        }

        const current = tenantsResult.value.find((item) => item.id === resolvedTenantId) ?? null;
        setTenant(current);

        const warnings: string[] = [];
        if (usersResult.status === 'fulfilled') {
          setUsers(usersResult.value);
        } else {
          setUsers([]);
          warnings.push('usuarios');
        }

        if (devicesResult.status === 'fulfilled') {
          setDevices(devicesResult.value);
        } else {
          setDevices([]);
          warnings.push('dispositivos');
        }

        if (warnings.length > 0) {
          setWarning(`Nao foi possivel carregar: ${warnings.join(' e ')}.`);
        }
      } catch {
        setError('Falha ao carregar painel da organizacao.');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [resolvedTenantId]);

  useEffect(() => {
    if (!tenant) return;
    setEditTradeName(tenant.tradeName || tenant.name || '');
    setEditLegalName(tenant.legalName || '');
    setEditCnpj(tenant.cnpj || '');
    setEditSlug(tenant.slug || '');
  }, [tenant]);

  useEffect(() => {
    const closeMenu = () => setOpenUserActionId(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  useEffect(() => {
    const closeMenu = () => setOpenDeviceActionId(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  const metrics = useMemo(() => {
    return {
      users: users.length,
      devices: devices.length,
      onlineDevices: devices.filter((item) => item.isActive).length,
      readings: devices.reduce((acc, item) => acc + (item.readingsCount ?? 0), 0),
    };
  }, [devices, users.length]);

  const statusLabel = tenant?.deletedAt
    ? 'Removido'
    : tenant?.accountStatus === 'SUSPENDED'
      ? 'Suspenso'
      : tenant?.accountStatus === 'CANCELLED'
        ? 'Cancelado'
        : 'Ativo';

  const isActiveStatus = statusLabel === 'Ativo';
  const currentPlan = 'Nao definido';
  const readingsLimit = 5000;
  const usagePercent = Math.max(0, Math.min(100, Math.round((metrics.readings / readingsLimit) * 100)));

  const tabs: Array<{ id: TabId; label: string }> = [
    { id: 'overview', label: 'Visao Geral' },
    { id: 'users', label: 'Usuarios' },
    { id: 'devices', label: 'Dispositivos' },
  ];

  const getInitials = (value: string) => {
    const clean = value.trim();
    if (!clean) return 'U';
    const parts = clean.split(/\s+/).slice(0, 2);
    return parts.map((part) => part[0]?.toUpperCase() || '').join('') || 'U';
  };

  const resolveRole = (role: TenantUserSummary['role']) => {
    if (role === 'OWNER') {
      return {
        label: 'Owner',
        icon: Crown,
        className: 'bg-primary/20 text-primary border-primary/40',
      };
    }
    if (role === 'VIEWER') {
      return {
        label: 'Viewer',
        icon: Eye,
        className: 'bg-slate-700/30 text-slate-200 border-slate-600/80',
      };
    }
    return {
      label: 'Admin',
      icon: Settings2,
      className: 'bg-accent/15 text-accent border-accent/30',
    };
  };

  const resolveUserStatus = (entry: TenantUserSummary) => {
    const isActive = (entry.user.accountStatus || 'ACTIVE') === 'ACTIVE' && entry.user.isActive && !entry.user.deletedAt;
    const isPending = isActive && !entry.user.lastLoginAt;
    return {
      label: isPending ? 'Pendente' : isActive ? 'Ativo' : 'Inativo',
      dotClass: isPending ? 'bg-warning' : isActive ? 'bg-accent' : 'bg-danger',
      textClass: isPending ? 'text-warning' : isActive ? 'text-accent' : 'text-danger',
    };
  };

  const refreshTenantOnly = async () => {
    if (!tenant) return;
    const tenantsData = await fetchTenants();
    const current = tenantsData.find((item) => item.id === tenant.id) ?? null;
    setTenant(current);
  };

  const handleSaveEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!tenant) return;
    setSavingEdit(true);
    setError('');
    try {
      const updated = await updateTenant(tenant.id, {
        name: editTradeName.trim() || tenant.name,
        tradeName: editTradeName.trim() || tenant.name,
        legalName: editLegalName.trim() || undefined,
        cnpj: editCnpj.trim() || undefined,
        slug: editSlug.trim() || tenant.slug,
      });
      setTenant(updated);
      setIsEditOpen(false);
    } catch {
      setError('Nao foi possivel salvar os dados da organizacao.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleToggleSuspension = async () => {
    if (!tenant) return;
    setActionLoading(true);
    setError('');
    try {
      if ((tenant.accountStatus || 'ACTIVE') === 'ACTIVE') {
        const updated = await suspendTenant(tenant.id);
        setTenant(updated);
      } else {
        const updated = await reactivateTenant(tenant.id);
        setTenant(updated);
      }
      await refreshTenantOnly();
    } catch {
      setError('Falha ao atualizar status da organizacao.');
    } finally {
      setActionLoading(false);
    }
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

  const refreshDevices = async () => {
    if (!tenant) return;
    const [tenantDevices, platformDevices] = await Promise.all([
      fetchDevices(tenant.id),
      fetchPlatformDevices(),
    ]);
    setDevices(tenantDevices);
    setStockDevices(platformDevices.filter((item) => (item.tenantName || '').toLowerCase() === 'estoque interno'));
  };

  const openLinkDeviceModal = async () => {
    if (!tenant) return;
    setLinkDeviceError('');
    setSelectedStockDeviceId('');
    setIsLinkDeviceOpen(true);
    try {
      const platformDevices = await fetchPlatformDevices();
      setStockDevices(platformDevices.filter((item) => (item.tenantName || '').toLowerCase() === 'estoque interno'));
    } catch {
      setStockDevices([]);
      setLinkDeviceError('Nao foi possivel carregar placas em estoque.');
    }
  };

  const handleLinkDevice = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!tenant) return;
    const deviceId = Number(selectedStockDeviceId);
    if (!Number.isFinite(deviceId)) {
      setLinkDeviceError('Selecione uma placa do estoque.');
      return;
    }
    setLinkDeviceLoading(true);
    setLinkDeviceError('');
    try {
      await linkDeviceToTenant(tenant.id, deviceId);
      await refreshDevices();
      setIsLinkDeviceOpen(false);
    } catch (error) {
      const apiError = error as { response?: { data?: { error?: string; message?: string } } };
      setLinkDeviceError(apiError.response?.data?.error || apiError.response?.data?.message || 'Falha ao vincular dispositivo.');
    } finally {
      setLinkDeviceLoading(false);
    }
  };

  const handleUnlinkDevice = async (device: DeviceSummary) => {
    if (!tenant) return;
    setDeviceActionLoadingId(device.id);
    setError('');
    try {
      await unlinkDeviceToStock(tenant.id, device.id);
      await refreshDevices();
      setOpenDeviceActionId(null);
    } catch {
      setError('Nao foi possivel desvincular o dispositivo para estoque.');
    } finally {
      setDeviceActionLoadingId(null);
    }
  };

  const handleSaveDeviceName = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!tenant || !editingDevice || !editDeviceName.trim()) return;
    setEditDeviceLoading(true);
    setError('');
    try {
      await renameTenantDevice(tenant.id, editingDevice.id, editDeviceName.trim());
      await refreshDevices();
      setEditingDevice(null);
      setEditDeviceName('');
    } catch {
      setError('Nao foi possivel editar o nome do dispositivo.');
    } finally {
      setEditDeviceLoading(false);
    }
  };

  const roleHint =
    newUserRole === 'VIEWER'
      ? 'Pode ver graficos e status das geladeiras, mas nao pode editar ou remover dispositivos.'
      : 'Pode gerenciar usuarios e dispositivos da organizacao.';

  const resetCreateUserForm = () => {
    setCreateUserError('');
    setNewUserFullName('');
    setNewUserEmail('');
    setNewUserRole('VIEWER');
    setNewUserPassword('');
  };

  const buildUsernameFromEmail = (email: string) => {
    const base = email
      .trim()
      .toLowerCase()
      .replace(/@.*/, '')
      .replace(/[^a-z0-9._-]/g, '.')
      .replace(/\.+/g, '.')
      .replace(/^\.|\.$/g, '');

    if (base) return `${base}.${Date.now().toString().slice(-5)}`;
    return `user.${Date.now().toString().slice(-6)}`;
  };

  const handleCreateUser = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!tenant) return;

    if (!newUserFullName.trim() || !newUserEmail.trim() || !newUserPassword.trim()) {
      setCreateUserError('Preencha nome, email e senha provisoria.');
      return;
    }

    setCreateUserLoading(true);
    setCreateUserError('');
    try {
      await createTenantUser({
        tenantId: tenant.id,
        username: buildUsernameFromEmail(newUserEmail),
        fullName: newUserFullName.trim(),
        displayName: newUserFullName.trim(),
        email: newUserEmail.trim().toLowerCase(),
        password: newUserPassword,
        role: newUserRole,
      });

      const refreshedUsers = await fetchTenantUsers(tenant.id);
      setUsers(refreshedUsers);
      setIsCreateUserOpen(false);
      resetCreateUserForm();
    } catch (error) {
      const apiError = error as { response?: { data?: { error?: string; message?: string } } };
      setCreateUserError(apiError.response?.data?.error || apiError.response?.data?.message || 'Nao foi possivel adicionar o usuario.');
    } finally {
      setCreateUserLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="pb-6 border-b border-slate-800 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/admin/tenants')}
            className="text-xs text-slate-400 hover:text-slate-200 mb-2"
          >
            {'<- Voltar para Organizacoes'}
          </button>
          <h2 className="text-3xl font-bold text-white mb-2">
            {tenant?.tradeName || tenant?.name || 'Painel da Organizacao'}
          </h2>
          <p className="text-slate-400">Gestao completa da organizacao em uma tela dedicada.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditOpen(true)}
            className="px-4 py-2 rounded-lg border border-slate-600 bg-slate-800 text-slate-100 text-sm font-medium"
          >
            Editar
          </button>
          <button
            onClick={() => void handleToggleSuspension()}
            disabled={actionLoading || !tenant}
            className="px-4 py-2 rounded-lg border border-danger/50 text-danger bg-danger/10 text-sm font-medium disabled:opacity-50"
          >
            {(tenant?.accountStatus || 'ACTIVE') === 'ACTIVE' ? 'Suspender' : 'Reativar'}
          </button>
        </div>
      </header>

      {error && <div className="text-danger text-sm">{error}</div>}
      {warning && <div className="text-warning text-sm">{warning}</div>}

      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        {tabs.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border ${
              tab === item.id
                ? 'bg-primary/20 border-primary/40 text-primary'
                : 'bg-slate-900/40 border-slate-700 text-slate-300 hover:bg-slate-800/40'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card title="Usuarios">
              <div className="text-3xl font-bold text-white">{loading ? '...' : metrics.users}</div>
            </Card>
            <Card title="Dispositivos">
              <div className="text-3xl font-bold text-white">{loading ? '...' : metrics.devices}</div>
            </Card>
            <Card title="Online">
              <div className="text-3xl font-bold text-white">{loading ? '...' : metrics.onlineDevices}</div>
            </Card>
            <Card title="Leituras">
              <div className="text-3xl font-bold text-white">{loading ? '...' : metrics.readings}</div>
            </Card>
          </div>

          <Card title="Resumo da Organizacao">
            {loading ? (
              <div className="text-slate-400 text-sm">Carregando...</div>
            ) : !tenant ? (
              <div className="text-slate-400 text-sm">Organizacao nao encontrada.</div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-sm">
                <div className="space-y-3">
                  <div className="text-slate-400">Dados cadastrais</div>
                  <div className="text-slate-300">Razao Social: <span className="text-white font-semibold">{tenant.legalName || '-'}</span></div>
                  <div className="text-slate-300">CNPJ: <span className="text-white font-semibold">{tenant.cnpj || '-'}</span></div>
                  <div className="text-slate-300">Slug de Acesso: <span className="text-white font-semibold">{tenant.slug}</span></div>
                  <div className="text-slate-300">
                    Criado em: <span className="text-white font-semibold">{new Date(tenant.createdAt).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="text-slate-400">Status e limites</div>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-300">Status da Conta:</span>
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                        isActiveStatus
                          ? 'bg-accent/10 text-accent border-accent/30'
                          : statusLabel === 'Suspenso'
                            ? 'bg-warning/10 text-warning border-warning/30'
                            : 'bg-danger/10 text-danger border-danger/30'
                      }`}
                    >
                      {statusLabel}
                    </span>
                  </div>
                  <div className="text-slate-300">Plano Atual: <span className="text-white font-semibold">{currentPlan}</span></div>
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                      <span>Uso de Leituras</span>
                      <span>{metrics.readings} / {readingsLimit}</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${usagePercent}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === 'users' && (
        <Card title="Usuarios da Organizacao">
          {loading ? (
            <div className="text-slate-400 text-sm">Carregando...</div>
          ) : users.length === 0 ? (
            <div className="text-slate-400 text-sm">Nenhum usuario cadastrado.</div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setCreateUserError('');
                    setIsCreateUserOpen(true);
                  }}
                  className="gradient-primary text-white rounded-lg px-4 py-2 inline-flex items-center gap-2 text-sm font-semibold"
                >
                  <UserPlus size={16} />
                  Adicionar Usuario
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[880px] text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-800">
                      <th className="py-3 pr-4">Membro</th>
                      <th className="py-3 px-4">Nivel de Acesso</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 pl-4 text-right">Acoes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {users.map((entry) => {
                      const userName = entry.user.displayName || entry.user.fullName || entry.user.username;
                      const role = resolveRole(entry.role);
                      const RoleIcon = role.icon;
                      const status = resolveUserStatus(entry);
                      return (
                        <tr key={entry.membershipId} className="hover:bg-slate-800/25 transition-colors">
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-primary/25 text-primary border border-primary/35 flex items-center justify-center text-xs font-bold">
                                {getInitials(userName)}
                              </div>
                              <div>
                                <div className="text-white font-semibold">{userName}</div>
                                <div className="text-xs text-slate-400 mt-0.5">{entry.user.email || '-'}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${role.className}`}>
                              <RoleIcon size={12} />
                              {role.label}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center gap-2 text-xs font-semibold ${status.textClass}`}>
                              <span className={`w-2 h-2 rounded-full ${status.dotClass}`} />
                              {status.label}
                            </span>
                          </td>
                          <td className="py-3 pl-4">
                            <div className="relative flex justify-end">
                              <button
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setOpenUserActionId((current) => (current === entry.membershipId ? null : entry.membershipId));
                                }}
                                className="w-8 h-8 rounded-lg border border-slate-700 bg-slate-900/50 text-slate-300 hover:text-white hover:bg-slate-800/60 flex items-center justify-center"
                                aria-label={`Abrir acoes do usuario ${userName}`}
                              >
                                <MoreHorizontal size={16} />
                              </button>
                              {openUserActionId === entry.membershipId && (
                                <div
                                  className="absolute right-2 top-10 z-30 w-56 rounded-xl border border-slate-600 bg-[#1e293b] p-1.5 shadow-2xl"
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  <button className="w-full text-left rounded-md px-3 py-2 text-sm text-slate-200 hover:bg-slate-700/60 hover:text-white inline-flex items-center gap-2 transition-colors">
                                    <Pencil size={14} />
                                    Editar Acesso
                                  </button>
                                  <div className="my-1 border-t border-slate-600/80" />
                                  <button className="w-full text-left rounded-md px-3 py-2 text-sm text-slate-200 hover:bg-slate-700/60 hover:text-white inline-flex items-center gap-2 transition-colors">
                                    <KeyRound size={14} />
                                    Redefinir Senha
                                  </button>
                                  <button className="w-full text-left rounded-md px-3 py-2 text-sm text-amber-300 hover:bg-amber-500/10 hover:text-amber-200 inline-flex items-center gap-2 transition-colors">
                                    <PauseCircle size={14} />
                                    Suspender Acesso
                                  </button>
                                  <div className="my-1 border-t border-slate-600/80" />
                                  <button className="w-full text-left rounded-md px-3 py-2 text-sm text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 inline-flex items-center gap-2 transition-colors">
                                    <UserX size={14} />
                                    Remover da Organizacao
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
            </div>
          )}
        </Card>
      )}

      {tab === 'devices' && (
        <Card title="Dispositivos da Organizacao">
          {loading ? (
            <div className="text-slate-400 text-sm">Carregando...</div>
          ) : devices.length === 0 ? (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button
                  onClick={() => void openLinkDeviceModal()}
                  className="gradient-primary text-white rounded-lg px-4 py-2 inline-flex items-center gap-2 text-sm font-semibold"
                >
                  <Link2 size={16} />
                  Vincular Dispositivo
                </button>
              </div>
              <div className="text-slate-400 text-sm">Nenhum dispositivo vinculado a esta organizacao.</div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button
                  onClick={() => void openLinkDeviceModal()}
                  className="gradient-primary text-white rounded-lg px-4 py-2 inline-flex items-center gap-2 text-sm font-semibold"
                >
                  <Link2 size={16} />
                  Vincular Dispositivo
                </button>
              </div>

              <div className="overflow-x-auto border border-slate-700 rounded-xl">
                <table className="w-full min-w-[860px] text-sm">
                  <thead className="bg-slate-900/40">
                    <tr className="text-left text-xs text-slate-400 uppercase tracking-wide">
                      <th className="px-4 py-3">Identificacao</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Ultima sincronizacao</th>
                      <th className="px-4 py-3 text-right">Acoes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {devices.map((device) => (
                      <tr key={device.id} className="hover:bg-slate-800/25 transition-colors group">
                        <td className="px-4 py-3">
                          <div className="text-white font-semibold group-hover:text-accent transition-colors">{device.name}</div>
                          <div className="text-xs text-slate-400 mt-1 font-mono">{device.externalId}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                              device.isActive
                                ? 'bg-accent/10 text-accent border-accent/30'
                                : 'bg-danger/10 text-danger border-danger/30'
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full ${device.isActive ? 'bg-accent' : 'bg-danger'}`} />
                            {device.isActive ? 'Online' : 'Offline'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-400">{getRelativeSync(device.updatedAt)}</td>
                        <td className="px-4 py-3">
                          <div className="relative flex justify-end">
                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                setOpenDeviceActionId((current) => (current === device.id ? null : device.id));
                              }}
                              className="w-8 h-8 rounded-lg border border-slate-700 bg-slate-900/50 text-slate-300 hover:text-white hover:bg-slate-800/60 flex items-center justify-center"
                              aria-label={`Abrir acoes do dispositivo ${device.name}`}
                            >
                              <MoreHorizontal size={16} />
                            </button>
                            {openDeviceActionId === device.id && (
                              <div
                                className="absolute right-2 top-10 z-30 w-52 rounded-xl border border-slate-600 bg-[#1e293b] p-1.5 shadow-2xl"
                                onClick={(event) => event.stopPropagation()}
                              >
                                <button className="w-full text-left rounded-md px-3 py-2 text-sm text-slate-200 hover:bg-slate-700/60 hover:text-white inline-flex items-center gap-2 transition-colors">
                                  <BarChart3 size={14} />
                                  Ver Leituras
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingDevice(device);
                                    setEditDeviceName(device.name);
                                    setOpenDeviceActionId(null);
                                  }}
                                  className="w-full text-left rounded-md px-3 py-2 text-sm text-slate-200 hover:bg-slate-700/60 hover:text-white inline-flex items-center gap-2 transition-colors"
                                >
                                  <Pencil size={14} />
                                  Editar Nome
                                </button>
                                <div className="my-1 border-t border-slate-600/80" />
                                <button
                                  onClick={() => void handleUnlinkDevice(device)}
                                  disabled={deviceActionLoadingId === device.id}
                                  className="w-full text-left rounded-md px-3 py-2 text-sm text-amber-300 hover:bg-amber-500/10 hover:text-amber-200 inline-flex items-center gap-2 transition-colors disabled:opacity-50"
                                >
                                  <PackageMinus size={14} />
                                  {deviceActionLoadingId === device.id ? 'Desvinculando...' : 'Desvincular'}
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Card>
      )}

      {isEditOpen && tenant && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#020617] border border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Editar Organizacao</h3>
              <button onClick={() => setIsEditOpen(false)} className="text-slate-400 hover:text-white text-sm">
                Fechar
              </button>
            </div>

            <form className="grid grid-cols-1 md:grid-cols-2 gap-3" onSubmit={handleSaveEdit}>
              <label className="space-y-1">
                <span className="text-xs text-slate-300">Nome fantasia</span>
                <input
                  value={editTradeName}
                  onChange={(e) => setEditTradeName(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-slate-300">Razao social</span>
                <input
                  value={editLegalName}
                  onChange={(e) => setEditLegalName(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-slate-300">CNPJ</span>
                <input
                  value={editCnpj}
                  onChange={(e) => setEditCnpj(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-slate-300">Slug</span>
                <input
                  value={editSlug}
                  onChange={(e) => setEditSlug(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </label>
              <div className="md:col-span-2 flex justify-end">
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="gradient-primary text-white rounded-lg px-5 py-2.5 disabled:opacity-50 font-semibold"
                >
                  {savingEdit ? 'Salvando...' : 'Salvar Alteracoes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isLinkDeviceOpen && tenant && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#0f172a] border border-[#1e293b] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">+ Vincular Dispositivo</h3>
              <button
                onClick={() => {
                  setIsLinkDeviceOpen(false);
                  setSelectedStockDeviceId('');
                  setLinkDeviceError('');
                }}
                className="text-slate-400 hover:text-white text-sm"
              >
                X
              </button>
            </div>

            <form onSubmit={handleLinkDevice} className="space-y-4">
              <label className="space-y-1 block">
                <span className="text-xs text-slate-300">Selecione uma placa em Estoque Interno</span>
                <select
                  value={selectedStockDeviceId}
                  onChange={(e) => setSelectedStockDeviceId(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white"
                >
                  <option value="">Escolha um dispositivo...</option>
                  {stockDevices.map((device) => (
                    <option key={device.id} value={String(device.id)}>
                      {device.name} ({device.externalId})
                    </option>
                  ))}
                </select>
              </label>
              <div className="text-xs text-slate-500">
                O dispositivo selecionado sera alocado para {tenant.tradeName || tenant.name}.
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsLinkDeviceOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm bg-slate-800 text-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={linkDeviceLoading}
                  className="gradient-primary text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
                >
                  {linkDeviceLoading ? 'Vinculando...' : '+ Vincular Dispositivo'}
                </button>
              </div>
            </form>

            {linkDeviceError && <div className="mt-3 text-danger text-sm">{linkDeviceError}</div>}
          </div>
        </div>
      )}

      {editingDevice && tenant && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#0f172a] border border-[#1e293b] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Editar Nome do Dispositivo</h3>
              <button
                onClick={() => {
                  setEditingDevice(null);
                  setEditDeviceName('');
                }}
                className="text-slate-400 hover:text-white text-sm"
              >
                X
              </button>
            </div>

            <form onSubmit={handleSaveDeviceName} className="space-y-4">
              <label className="space-y-1 block">
                <span className="text-xs text-slate-300">Nome de Exibicao</span>
                <input
                  value={editDeviceName}
                  onChange={(e) => setEditDeviceName(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </label>
              <div className="text-xs text-slate-500 font-mono">MAC/Serie: {editingDevice.externalId}</div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingDevice(null);
                    setEditDeviceName('');
                  }}
                  className="px-4 py-2 rounded-lg text-sm bg-slate-800 text-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editDeviceLoading}
                  className="gradient-primary text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
                >
                  {editDeviceLoading ? 'Salvando...' : 'Salvar Nome'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isCreateUserOpen && tenant && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-[#0f172a] border border-[#1e293b] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">+ Adicionar Usuario</h3>
              <button
                onClick={() => {
                  setIsCreateUserOpen(false);
                  resetCreateUserForm();
                }}
                className="text-slate-400 hover:text-white text-sm"
                aria-label="Fechar modal"
              >
                X
              </button>
            </div>

            <form className="space-y-6" onSubmit={handleCreateUser}>
              <section className="border border-[#1e293b] rounded-xl p-4 space-y-3 bg-slate-900/20">
                <div className="text-xs uppercase tracking-wide text-slate-400 font-semibold">Dados Pessoais</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="space-y-1">
                    <span className="text-xs text-slate-300">
                      Nome Completo <span className="text-danger">*</span>
                    </span>
                    <input
                      value={newUserFullName}
                      onChange={(e) => setNewUserFullName(e.target.value)}
                      placeholder="Ex: Carlos Gerente"
                      className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs text-slate-300">
                      E-mail de Login <span className="text-danger">*</span>
                    </span>
                    <input
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder="carlos@clientepadrao.com"
                      type="email"
                      className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    />
                  </label>
                </div>
              </section>

              <section className="border border-[#1e293b] rounded-xl p-4 space-y-3 bg-slate-900/20">
                <div className="text-xs uppercase tracking-wide text-slate-400 font-semibold">Acesso e Permissoes</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="space-y-1">
                    <span className="text-xs text-slate-300">
                      Nivel de Acesso (Role) <span className="text-danger">*</span>
                    </span>
                    <select
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value as TenantRole)}
                      className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    >
                      <option value="VIEWER">Viewer (Visualizador)</option>
                      <option value="TENANT_ADMIN">Admin</option>
                    </select>
                  </label>

                  <label className="space-y-1">
                    <span className="text-xs text-slate-300">
                      Senha Provisoria <span className="text-danger">*</span>
                    </span>
                    <input
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      placeholder="Digite uma senha temporaria"
                      type="password"
                      className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    />
                  </label>
                </div>
                <div className="text-xs text-slate-500">{roleHint}</div>
                <div className="text-xs text-slate-500">Dica: o usuario podera trocar a senha no primeiro acesso.</div>
              </section>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateUserOpen(false);
                    resetCreateUserForm();
                  }}
                  className="px-4 py-2 rounded-lg text-sm bg-slate-800 text-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createUserLoading}
                  className="gradient-primary text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
                >
                  {createUserLoading ? 'Salvando...' : '+ Salvar Usuario'}
                </button>
              </div>
            </form>

            {createUserError && <div className="mt-3 text-danger text-sm">{createUserError}</div>}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTenantPanel;
