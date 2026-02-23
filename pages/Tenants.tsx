import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import {
  ChevronRight,
  Download,
  Filter,
  MoreHorizontal,
  PauseCircle,
  Pencil,
  Search,
  Trash2,
} from 'lucide-react';
import Card from '../components/ui/Card';
import {
  archiveTenant,
  archiveTenantUser,
  createTenant,
  createTenantUser,
  fetchTenantUsers,
  fetchTenants,
  reactivateTenant,
  restoreTenant,
  restoreTenantUser,
  suspendTenant,
  updateTenant,
  updateTenantUserRole,
} from '../services/api';
import { TenantSummary, TenantUserSummary } from '../types';
import { useAppContext } from '../context/AppContext';

const toSlug = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

type ConfirmAction =
  | { type: 'archiveTenant'; tenant: TenantSummary }
  | { type: 'restoreTenant'; tenant: TenantSummary }
  | { type: 'archiveUser'; entry: TenantUserSummary }
  | { type: 'restoreUser'; entry: TenantUserSummary }
  | null;

type TenantSortField = 'name' | 'accountStatus' | 'createdAt' | 'updatedAt';
type TenantSortDirection = 'asc' | 'desc';

const TenantsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, activeTenantId, setActiveTenantId } = useAppContext();
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [tenantUsers, setTenantUsers] = useState<TenantUserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingUser, setSavingUser] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [ownerUsername, setOwnerUsername] = useState('');
  const [ownerFullName, setOwnerFullName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [username, setUsername] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userFullName, setUserFullName] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'OWNER' | 'TENANT_ADMIN' | 'OPERATOR' | 'VIEWER'>('VIEWER');
  const [userStatus, setUserStatus] = useState<'ACTIVE' | 'SUSPENDED' | 'CANCELLED'>('ACTIVE');
  const [error, setError] = useState('');
  const [userError, setUserError] = useState('');
  const [isCreatePanelOpen, setIsCreatePanelOpen] = useState(false);
  const [isAddUserPanelOpen, setIsAddUserPanelOpen] = useState(false);
  const [isEditPanelOpen, setIsEditPanelOpen] = useState(false);
  const [editingTenantId, setEditingTenantId] = useState<number | null>(null);
  const [editTradeName, setEditTradeName] = useState('');
  const [editLegalName, setEditLegalName] = useState('');
  const [editCnpj, setEditCnpj] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editStatus, setEditStatus] = useState<'ACTIVE' | 'SUSPENDED' | 'CANCELLED'>('ACTIVE');
  const [showArchivedTenants, setShowArchivedTenants] = useState(false);
  const [showArchivedUsers, setShowArchivedUsers] = useState(false);
  const [tenantSearch, setTenantSearch] = useState('');
  const [tenantStatusFilter, setTenantStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED' | 'CANCELLED'>(
    'ALL'
  );
  const [tenantSortField, setTenantSortField] = useState<TenantSortField>('name');
  const [tenantSortDirection, setTenantSortDirection] = useState<TenantSortDirection>('asc');
  const [tenantPage, setTenantPage] = useState(1);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [openActionTenantId, setOpenActionTenantId] = useState<number | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<TenantSummary | null>(null);

  const isSuperAdmin = user?.platformRole === 'SUPER_ADMIN';

  const sortedTenants = useMemo(
    () => [...tenants].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    [tenants]
  );

  const activeTenant = useMemo(
    () => sortedTenants.find((tenant) => tenant.id === activeTenantId),
    [activeTenantId, sortedTenants]
  );

  const filteredTenants = useMemo(() => {
    const search = tenantSearch.trim().toLowerCase();
    return sortedTenants.filter((tenant) => {
      const statusMatches =
        tenantStatusFilter === 'ALL' ? true : (tenant.accountStatus || 'ACTIVE') === tenantStatusFilter;
      const text = `${tenant.name} ${tenant.tradeName || ''} ${tenant.legalName || ''} ${tenant.cnpj || ''} ${
        tenant.slug
      }`.toLowerCase();
      const searchMatches = !search || text.includes(search);
      return statusMatches && searchMatches;
    });
  }, [sortedTenants, tenantSearch, tenantStatusFilter]);

  const sortedAndFilteredTenants = useMemo(() => {
    const list = [...filteredTenants];
    list.sort((a, b) => {
      let compare = 0;
      if (tenantSortField === 'name') {
        compare = (a.tradeName || a.name).localeCompare(b.tradeName || b.name, 'pt-BR');
      } else if (tenantSortField === 'accountStatus') {
        compare = (a.accountStatus || 'ACTIVE').localeCompare(b.accountStatus || 'ACTIVE', 'pt-BR');
      } else if (tenantSortField === 'createdAt') {
        compare = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (tenantSortField === 'updatedAt') {
        compare = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      }
      return tenantSortDirection === 'asc' ? compare : -compare;
    });
    return list;
  }, [filteredTenants, tenantSortField, tenantSortDirection]);

  const TENANTS_PAGE_SIZE = 6;
  const totalTenantPages = Math.max(1, Math.ceil(sortedAndFilteredTenants.length / TENANTS_PAGE_SIZE));

  const paginatedTenants = useMemo(() => {
    const start = (tenantPage - 1) * TENANTS_PAGE_SIZE;
    return sortedAndFilteredTenants.slice(start, start + TENANTS_PAGE_SIZE);
  }, [sortedAndFilteredTenants, tenantPage]);

  useEffect(() => {
    setTenantPage(1);
  }, [tenantSearch, tenantStatusFilter, tenantSortField, tenantSortDirection, showArchivedTenants]);

  useEffect(() => {
    if (tenantPage > totalTenantPages) {
      setTenantPage(totalTenantPages);
    }
  }, [tenantPage, totalTenantPages]);

  const loadTenants = async () => {
    if (!isSuperAdmin) {
      setLoading(false);
      return;
    }
    try {
      setError('');
      const data = await fetchTenants(showArchivedTenants);
      setTenants(data);
    } catch {
      setError('Falha ao carregar clientes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTenants();
  }, [isSuperAdmin, showArchivedTenants]);

  const loadUsers = async (tenantId: number) => {
    setLoadingUsers(true);
    setUserError('');
    try {
      const data = await fetchTenantUsers(tenantId, showArchivedUsers);
      setTenantUsers(data);
    } catch {
      setUserError('Falha ao carregar usuarios da organizacao.');
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (!activeTenantId) {
      setTenantUsers([]);
      return;
    }
    void loadUsers(activeTenantId);
  }, [activeTenantId, showArchivedUsers]);

  const handleCreateTenant = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!tradeName.trim() || !legalName.trim()) {
      setError('Informe nome fantasia e razao social.');
      return;
    }
    if (!cnpj.trim()) {
      setError('Informe o CNPJ da organizacao.');
      return;
    }
    if (!ownerUsername.trim() || !ownerEmail.trim() || !ownerPassword) {
      setError('Informe os dados do primeiro usuario (owner/admin).');
      return;
    }

    const safeSlug = toSlug(slug || tradeName || name);
    if (!safeSlug) {
      setError('Slug invalido.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const created = await createTenant({
        name: name.trim() || tradeName.trim(),
        tradeName: tradeName.trim(),
        legalName: legalName.trim(),
        cnpj: cnpj.trim(),
        slug: safeSlug,
        accountStatus: 'ACTIVE',
        owner: {
          username: ownerUsername.trim(),
          fullName: ownerFullName.trim() || undefined,
          email: ownerEmail.trim().toLowerCase(),
          phone: ownerPhone.trim() || undefined,
          password: ownerPassword,
          role: 'OWNER',
        },
      });
      setTenants((prev) => [created, ...prev]);
      setName('');
      setSlug('');
      setSlugManuallyEdited(false);
      setTradeName('');
      setLegalName('');
      setCnpj('');
      setOwnerUsername('');
      setOwnerFullName('');
      setOwnerEmail('');
      setOwnerPhone('');
      setOwnerPassword('');
      setActiveTenantId(created.id);
      setIsCreatePanelOpen(false);
    } catch {
      setError('Nao foi possivel criar o cliente. Verifique se o slug ja existe.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateUser = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeTenantId) {
      setUserError('Selecione uma organizacao antes de adicionar usuario.');
      return;
    }
    if (!username.trim() || !password) {
      setUserError('Informe username e senha.');
      return;
    }

    setSavingUser(true);
    setUserError('');
    try {
      await createTenantUser({
        username: username.trim(),
        email: userEmail.trim() || undefined,
        fullName: userFullName.trim() || undefined,
        password,
        displayName: displayName.trim() || undefined,
        phone: userPhone.trim() || undefined,
        status: userStatus,
        role,
        tenantId: activeTenantId,
      });
      setUsername('');
      setUserEmail('');
      setUserFullName('');
      setUserPhone('');
      setDisplayName('');
      setPassword('');
      setRole('VIEWER');
      setUserStatus('ACTIVE');
      setIsAddUserPanelOpen(false);
      await loadUsers(activeTenantId);
    } catch {
      setUserError('Falha ao criar usuario. Verifique username/senha e tente novamente.');
    } finally {
      setSavingUser(false);
    }
  };

  const handleRoleChange = async (
    entry: TenantUserSummary,
    nextRole: 'OWNER' | 'TENANT_ADMIN' | 'OPERATOR' | 'VIEWER'
  ) => {
    if (!activeTenantId || entry.role === nextRole) return;
    try {
      await updateTenantUserRole(entry.user.id, nextRole, activeTenantId);
      await loadUsers(activeTenantId);
    } catch {
      setUserError('Falha ao atualizar permissao do usuario.');
    }
  };

  const openEditTenant = (tenant: TenantSummary) => {
    setEditingTenantId(tenant.id);
    setEditTradeName(tenant.tradeName || tenant.name);
    setEditLegalName(tenant.legalName || '');
    setEditCnpj(tenant.cnpj || '');
    setEditSlug(tenant.slug || '');
    setEditStatus(tenant.accountStatus || 'ACTIVE');
    setError('');
    setIsEditPanelOpen(true);
  };

  const handleUpdateTenant = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingTenantId) return;
    if (!editTradeName.trim() || !editLegalName.trim() || !editCnpj.trim()) {
      setError('Preencha nome fantasia, razao social e CNPJ.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const updated = await updateTenant(editingTenantId, {
        name: editTradeName.trim(),
        tradeName: editTradeName.trim(),
        legalName: editLegalName.trim(),
        cnpj: editCnpj.trim(),
        slug: toSlug(editSlug || editTradeName),
        accountStatus: editStatus,
      });
      setTenants((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setIsEditPanelOpen(false);
    } catch {
      setError('Falha ao editar organizacao. Verifique slug/CNPJ.');
    } finally {
      setSaving(false);
    }
  };

  const handleSuspendTenant = async (tenant: TenantSummary) => {
    setSaving(true);
    setError('');
    try {
      const updated = await suspendTenant(tenant.id);
      setTenants((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      if (activeTenantId === tenant.id) {
        setActiveTenantId(tenant.id);
      }
    } catch {
      setError('Falha ao suspender organizacao.');
    } finally {
      setSaving(false);
    }
  };

  const handleReactivateTenant = async (tenant: TenantSummary) => {
    setSaving(true);
    setError('');
    try {
      const updated = await reactivateTenant(tenant.id);
      setTenants((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch {
      setError('Falha ao reativar organizacao.');
    } finally {
      setSaving(false);
    }
  };

  const handleArchiveTenant = async (tenant: TenantSummary) => {
    setSaving(true);
    setError('');
    try {
      const updated = await archiveTenant(tenant.id);
      setTenants((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      if (activeTenantId === tenant.id) {
        setTenantUsers([]);
      }
    } catch {
      setError('Falha ao arquivar organizacao.');
    } finally {
      setSaving(false);
    }
  };

  const handleRestoreTenant = async (tenant: TenantSummary) => {
    setSaving(true);
    setError('');
    try {
      const updated = await restoreTenant(tenant.id);
      setTenants((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch {
      setError('Falha ao restaurar organizacao.');
    } finally {
      setSaving(false);
    }
  };

  const handleArchiveUser = async (entry: TenantUserSummary) => {
    if (!activeTenantId) return;
    setSavingUser(true);
    setUserError('');
    try {
      await archiveTenantUser(entry.user.id, activeTenantId);
      await loadUsers(activeTenantId);
    } catch {
      setUserError('Falha ao remover usuario da organizacao.');
    } finally {
      setSavingUser(false);
    }
  };

  const handleRestoreUser = async (entry: TenantUserSummary) => {
    if (!activeTenantId) return;
    setSavingUser(true);
    setUserError('');
    try {
      await restoreTenantUser(entry.user.id, activeTenantId);
      await loadUsers(activeTenantId);
    } catch {
      setUserError('Falha ao restaurar usuario da organizacao.');
    } finally {
      setSavingUser(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    if (confirmAction.type === 'archiveTenant') {
      await handleArchiveTenant(confirmAction.tenant);
    } else if (confirmAction.type === 'restoreTenant') {
      await handleRestoreTenant(confirmAction.tenant);
    } else if (confirmAction.type === 'archiveUser') {
      await handleArchiveUser(confirmAction.entry);
    } else if (confirmAction.type === 'restoreUser') {
      await handleRestoreUser(confirmAction.entry);
    }
    setConfirmAction(null);
  };

  const exportFilteredTenantsCsv = () => {
    const escapeCsv = (value: unknown) => {
      const text = String(value ?? '');
      return `"${text.replace(/"/g, '""')}"`;
    };
    const headers = [
      'id',
      'name',
      'trade_name',
      'legal_name',
      'cnpj',
      'slug',
      'account_status',
      'is_active',
      'created_at',
      'updated_at',
      'deleted_at',
    ];
    const lines = sortedAndFilteredTenants.map((tenant) =>
      [
        tenant.id,
        tenant.name,
        tenant.tradeName || '',
        tenant.legalName || '',
        tenant.cnpj || '',
        tenant.slug,
        tenant.accountStatus || 'ACTIVE',
        tenant.isActive ? 'true' : 'false',
        tenant.createdAt,
        tenant.updatedAt,
        tenant.deletedAt || '',
      ]
        .map(escapeCsv)
        .join(',')
    );
    const content = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    anchor.download = `clientes-${stamp}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const formatDatePtBr = (iso: string) =>
    new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

  const formatCountLabel = (count: number, singular: string, plural: string) =>
    `${count} ${count === 1 ? singular : plural}`;

  useEffect(() => {
    const closeActionMenu = () => setOpenActionTenantId(null);
    window.addEventListener('click', closeActionMenu);
    return () => window.removeEventListener('click', closeActionMenu);
  }, []);

  if (!isSuperAdmin) {
    return (
      <Card title="Clientes">
        <div className="text-slate-400 text-sm">Acesso disponivel apenas para super admin.</div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <header className="pb-6 border-b border-slate-800 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Organizacoes</h2>
          <p className="text-slate-400">Gerencie clientes com uma visao limpa de status e volume.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setError('');
              setSlugManuallyEdited(false);
              setIsCreatePanelOpen(true);
            }}
            className="gradient-primary text-white rounded-lg px-4 py-2 whitespace-nowrap"
          >
            + Nova Organizacao
          </button>
        </div>
      </header>

      <Card title="Lista de Organizacoes">
        <div className="mb-4 flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={tenantSearch}
              onChange={(e) => setTenantSearch(e.target.value)}
              placeholder="Buscar por nome, CNPJ ou slug..."
              className="w-full bg-slate-900/50 border border-slate-700 rounded-lg pl-10 pr-3 py-2 text-white"
            />
          </div>
          <div className="relative flex items-center gap-2">
            <button
              onClick={(event) => {
                event.stopPropagation();
                setIsFiltersOpen((value) => !value);
              }}
              className="inline-flex items-center gap-2 bg-slate-800 border border-slate-600 text-slate-100 rounded-lg px-3 py-2 text-sm"
            >
              <Filter size={14} />
              Filtros
            </button>
            <button
              onClick={exportFilteredTenantsCsv}
              className="inline-flex items-center justify-center bg-slate-800 border border-slate-600 text-slate-100 rounded-lg w-10 h-10"
              title="Exportar CSV"
            >
              <Download size={15} />
            </button>
            {isFiltersOpen && (
              <div
                className="absolute right-0 top-12 z-20 w-64 rounded-lg border border-slate-700 bg-slate-950/95 p-3 space-y-2"
                onClick={(event) => event.stopPropagation()}
              >
                <label className="text-xs text-slate-300 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showArchivedTenants}
                    onChange={(e) => setShowArchivedTenants(e.target.checked)}
                    className="accent-primary"
                  />
                  Mostrar removidos
                </label>
                <div className="text-xs text-slate-400">Status</div>
                <select
                  value={tenantStatusFilter}
                  onChange={(e) =>
                    setTenantStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'SUSPENDED' | 'CANCELLED')
                  }
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                >
                  <option value="ALL">Todos</option>
                  <option value="ACTIVE">Ativo</option>
                  <option value="SUSPENDED">Suspenso</option>
                  <option value="CANCELLED">Cancelado</option>
                </select>
                <div className="text-xs text-slate-400">Ordenar por</div>
                <select
                  value={tenantSortField}
                  onChange={(e) => setTenantSortField(e.target.value as TenantSortField)}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                >
                  <option value="name">Nome</option>
                  <option value="accountStatus">Status</option>
                  <option value="createdAt">Cadastro</option>
                  <option value="updatedAt">Atualizacao</option>
                </select>
                <select
                  value={tenantSortDirection}
                  onChange={(e) => setTenantSortDirection(e.target.value as TenantSortDirection)}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                >
                  <option value="asc">Crescente</option>
                  <option value="desc">Decrescente</option>
                </select>
              </div>
            )}
          </div>
        </div>
        <div className="mb-3 text-xs text-slate-400">
          {sortedAndFilteredTenants.length} organizacao(oes) encontrada(s) | pagina {tenantPage}/{totalTenantPages}
        </div>
        {loading ? (
          <div className="text-slate-400 text-sm">Carregando...</div>
        ) : sortedAndFilteredTenants.length === 0 ? (
          <div className="text-slate-400 text-sm">Nenhum cliente cadastrado.</div>
        ) : (
          <div className="overflow-x-auto border border-slate-700 rounded-xl">
            <table className="w-full min-w-[860px]">
              <thead className="bg-slate-900/40">
                <tr className="text-left text-xs text-slate-400 uppercase tracking-wide">
                  <th className="px-4 py-3">Empresa</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Volume</th>
                  <th className="px-4 py-3">Cadastro</th>
                  <th className="px-4 py-3 text-right">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTenants.map((tenant) => {
                  const isActive = (tenant.accountStatus || 'ACTIVE') === 'ACTIVE' && !tenant.deletedAt;
                  const statusLabel = tenant.deletedAt
                    ? 'Removido'
                    : tenant.accountStatus === 'SUSPENDED'
                      ? 'Suspenso'
                      : tenant.accountStatus === 'CANCELLED'
                        ? 'Cancelado'
                        : 'Ativo';
                  return (
                    <tr
                      key={tenant.id}
                      className="group border-t border-slate-800 hover:bg-slate-800/45 cursor-pointer transition-colors"
                      onClick={() => {
                        setActiveTenantId(tenant.id);
                        setSelectedTenant(tenant);
                      }}
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-white flex items-center gap-2">
                          <span>{tenant.tradeName || tenant.name}</span>
                          <ChevronRight size={14} className="text-slate-500 group-hover:text-primary transition-colors" />
                        </div>
                        <div className="text-xs text-slate-400 mt-1">{tenant.cnpj || tenant.slug}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                            isActive
                              ? 'bg-accent/10 text-accent border-accent/30'
                              : statusLabel === 'Suspenso'
                                ? 'bg-warning/10 text-warning border-warning/30'
                                : 'bg-danger/10 text-danger border-danger/30'
                          }`}
                        >
                          {statusLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300">
                        {formatCountLabel(tenant._count?.devices ?? 0, 'Dispositivo', 'Dispositivos')} -{' '}
                        {formatCountLabel(tenant._count?.users ?? 0, 'Usuario', 'Usuarios')}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-400">{formatDatePtBr(tenant.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="relative flex justify-end">
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              setOpenActionTenantId((current) => (current === tenant.id ? null : tenant.id));
                            }}
                            className="w-8 h-8 rounded-lg border border-slate-700 bg-slate-900/50 text-slate-300 hover:text-white hover:bg-slate-800/60 flex items-center justify-center"
                          >
                            <MoreHorizontal size={16} />
                          </button>
                          {openActionTenantId === tenant.id && (
                            <div
                              className="absolute right-0 top-10 z-30 w-44 rounded-lg border border-slate-700 bg-slate-950/95 p-1.5 shadow-xl"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <button
                                onClick={() => {
                                  setOpenActionTenantId(null);
                                  openEditTenant(tenant);
                                }}
                                className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-200 hover:bg-slate-800/50"
                              >
                                <Pencil size={14} />
                                Editar
                              </button>
                              {!tenant.deletedAt && (
                                <button
                                  onClick={() => {
                                    setOpenActionTenantId(null);
                                    if ((tenant.accountStatus || 'ACTIVE') === 'ACTIVE') {
                                      void handleSuspendTenant(tenant);
                                    } else {
                                      void handleReactivateTenant(tenant);
                                    }
                                  }}
                                  className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-200 hover:bg-slate-800/50"
                                >
                                  <PauseCircle size={14} />
                                  {(tenant.accountStatus || 'ACTIVE') === 'ACTIVE' ? 'Suspender' : 'Reativar'}
                                </button>
                              )}
                              {!tenant.deletedAt ? (
                                <button
                                  onClick={() => {
                                    setOpenActionTenantId(null);
                                    setConfirmAction({ type: 'archiveTenant', tenant });
                                  }}
                                  className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm text-danger hover:bg-danger/10"
                                >
                                  <Trash2 size={14} />
                                  Excluir
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    setOpenActionTenantId(null);
                                    setConfirmAction({ type: 'restoreTenant', tenant });
                                  }}
                                  className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm text-secondary hover:bg-secondary/10"
                                >
                                  <PauseCircle size={14} />
                                  Restaurar
                                </button>
                              )}
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
        {!loading && sortedAndFilteredTenants.length > TENANTS_PAGE_SIZE && (
          <div className="mt-4 flex items-center justify-between">
            <button
              disabled={tenantPage <= 1}
              onClick={() => setTenantPage((page) => Math.max(1, page - 1))}
              className="px-3 py-2 rounded-lg text-sm bg-slate-800 text-slate-200 disabled:opacity-50"
            >
              Anterior
            </button>
            <div className="text-xs text-slate-400">
              Pagina {tenantPage} de {totalTenantPages}
            </div>
            <button
              disabled={tenantPage >= totalTenantPages}
              onClick={() => setTenantPage((page) => Math.min(totalTenantPages, page + 1))}
              className="px-3 py-2 rounded-lg text-sm bg-slate-800 text-slate-200 disabled:opacity-50"
            >
              Proxima
            </button>
          </div>
        )}
      </Card>
      {userError && <div className="text-danger text-sm">{userError}</div>}

      {selectedTenant &&
        createPortal(
          <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm">
            <div className="absolute top-4 bottom-4 right-0 w-full max-w-md bg-[#020617] border-l border-slate-700 rounded-l-xl px-5 pt-4 pb-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Perfil da Organizacao</h3>
                <button
                  onClick={() => setSelectedTenant(null)}
                  className="text-slate-400 hover:text-white text-sm"
                >
                  Fechar
                </button>
              </div>
              <div className="border border-slate-700 rounded-lg p-4 bg-slate-900/40 space-y-2">
                <div className="text-white font-semibold text-lg">{selectedTenant.tradeName || selectedTenant.name}</div>
                <div className="text-xs text-slate-400">Razao social: {selectedTenant.legalName || '-'}</div>
                <div className="text-xs text-slate-400">CNPJ: {selectedTenant.cnpj || '-'}</div>
                <div className="text-xs text-slate-400">Slug: {selectedTenant.slug}</div>
                <div className="text-xs text-slate-400">Criado em: {formatDatePtBr(selectedTenant.createdAt)}</div>
              </div>
              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={() => {
                    setActiveTenantId(selectedTenant.id);
                    setSelectedTenant(null);
                    navigate(`/admin/tenants/${selectedTenant.id}`);
                  }}
                  className="px-3 py-2 rounded-lg text-sm bg-primary text-slate-950 font-semibold"
                >
                  Acessar Painel do Cliente →
                </button>
              </div>
              <div className="text-xs text-slate-400">Use o painel dedicado para gerenciar usuarios e dispositivos.</div>
            </div>
          </div>,
          document.body
        )}

      {confirmAction && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#020617] border border-slate-700 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-2">
              {confirmAction.type === 'archiveTenant' && 'Confirmar exclusao'}
              {confirmAction.type === 'restoreTenant' && 'Confirmar restauracao'}
              {confirmAction.type === 'archiveUser' && 'Confirmar exclusao'}
              {confirmAction.type === 'restoreUser' && 'Confirmar restauracao'}
            </h3>
            <p className="text-sm text-slate-300 mb-5">
              {confirmAction.type === 'archiveTenant' &&
                `Excluir a organizacao "${confirmAction.tenant.tradeName || confirmAction.tenant.name}"?`}
              {confirmAction.type === 'restoreTenant' &&
                `Restaurar a organizacao "${confirmAction.tenant.tradeName || confirmAction.tenant.name}"?`}
              {confirmAction.type === 'archiveUser' &&
                `Excluir o usuario "${confirmAction.entry.user.username}" desta organizacao?`}
              {confirmAction.type === 'restoreUser' &&
                `Restaurar o usuario "${confirmAction.entry.user.username}" nesta organizacao?`}
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 rounded-lg text-sm bg-slate-800 text-slate-200"
              >
                Cancelar
              </button>
              <button
                onClick={() => void handleConfirmAction()}
                disabled={saving || savingUser}
                className="px-4 py-2 rounded-lg text-sm bg-danger/20 text-danger border border-danger/40 disabled:opacity-50"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {isCreatePanelOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-[#020617] border border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">+ Nova Organizacao</h3>
              <button
                onClick={() => setIsCreatePanelOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                Fechar
              </button>
            </div>

            <form className="space-y-6" onSubmit={handleCreateTenant}>
              <section className="border border-slate-700 rounded-xl p-4 space-y-3 bg-slate-900/20">
                <div className="text-xs uppercase tracking-wide text-slate-400 font-semibold">1. Dados da Empresa</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="space-y-1">
                    <span className="text-xs text-slate-300">Nome fantasia <span className="text-danger">*</span></span>
                    <input
                      value={tradeName}
                      onChange={(e) => {
                        setTradeName(e.target.value);
                        if (!name) setName(e.target.value);
                        if (!slugManuallyEdited) setSlug(toSlug(e.target.value));
                      }}
                      placeholder="Ex: Cliente Padrao"
                      className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs text-slate-300">Razao social <span className="text-danger">*</span></span>
                    <input
                      value={legalName}
                      onChange={(e) => setLegalName(e.target.value)}
                      placeholder="Ex: Cliente Padrao LTDA"
                      className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs text-slate-300">CNPJ <span className="text-danger">*</span></span>
                    <input
                      value={cnpj}
                      onChange={(e) => setCnpj(e.target.value)}
                      placeholder="Ex: 00.000.000/0001-00"
                      className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs text-slate-300">Slug <span className="text-danger">*</span></span>
                    <input
                      value={slug}
                      onChange={(e) => {
                        setSlugManuallyEdited(true);
                        setSlug(toSlug(e.target.value));
                      }}
                      placeholder="Ex: cliente-padrao"
                      className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    />
                  </label>
                </div>
              </section>

              <section className="border border-slate-700 rounded-xl p-4 space-y-3 bg-slate-900/20">
                <div className="text-xs uppercase tracking-wide text-slate-400 font-semibold">2. Dono da Empresa (Owner)</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="space-y-1">
                    <span className="text-xs text-slate-300">Username <span className="text-danger">*</span></span>
                    <input
                      value={ownerUsername}
                      onChange={(e) => setOwnerUsername(e.target.value)}
                      placeholder="Ex: joao.silva"
                      className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs text-slate-300">Nome completo</span>
                    <input
                      value={ownerFullName}
                      onChange={(e) => setOwnerFullName(e.target.value)}
                      placeholder="Ex: Joao Silva"
                      className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs text-slate-300">Email <span className="text-danger">*</span></span>
                    <input
                      value={ownerEmail}
                      onChange={(e) => setOwnerEmail(e.target.value)}
                      placeholder="Ex: admin@cliente.com"
                      className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs text-slate-300">Telefone (opcional)</span>
                    <input
                      value={ownerPhone}
                      onChange={(e) => setOwnerPhone(e.target.value)}
                      placeholder="Ex: (11) 99999-9999"
                      className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    />
                  </label>
                  <label className="space-y-1 md:col-span-2">
                    <span className="text-xs text-slate-300">Senha inicial <span className="text-danger">*</span></span>
                    <input
                      type="password"
                      value={ownerPassword}
                      onChange={(e) => setOwnerPassword(e.target.value)}
                      placeholder="Minimo de 6 caracteres"
                      className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    />
                  </label>
                </div>
              </section>

              <div className="flex items-center justify-between gap-3">
                <div className="text-xs text-slate-400">
                  Slug final: <span className="text-slate-300">{toSlug(slug || tradeName || name) || '-'}</span>
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="gradient-primary text-white rounded-lg px-5 py-2.5 disabled:opacity-50 font-semibold"
                >
                  {saving ? 'Criando...' : 'Criar Organizacao'}
                </button>
              </div>
            </form>

            {error && <div className="mt-3 text-danger text-sm">{error}</div>}
          </div>
        </div>
      )}

      {isEditPanelOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#020617] border border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Editar Organizacao</h3>
              <button
                onClick={() => setIsEditPanelOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                Fechar
              </button>
            </div>

            <form className="grid grid-cols-1 md:grid-cols-3 gap-3" onSubmit={handleUpdateTenant}>
              <input
                value={editTradeName}
                onChange={(e) => setEditTradeName(e.target.value)}
                placeholder="Nome fantasia"
                className="bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white"
              />
              <input
                value={editLegalName}
                onChange={(e) => setEditLegalName(e.target.value)}
                placeholder="Razao social"
                className="bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white"
              />
              <input
                value={editCnpj}
                onChange={(e) => setEditCnpj(e.target.value)}
                placeholder="CNPJ"
                className="bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white"
              />
              <input
                value={editSlug}
                onChange={(e) => setEditSlug(e.target.value)}
                placeholder="slug-organizacao"
                className="bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white"
              />
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as 'ACTIVE' | 'SUSPENDED' | 'CANCELLED')}
                className="bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="SUSPENDED">SUSPENDED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
              <button
                type="submit"
                disabled={saving}
                className="gradient-primary text-white rounded-lg px-4 py-2 disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </form>
          </div>
        </div>
      )}

      {isAddUserPanelOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#020617] border border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Adicionar Usuario</h3>
              <button
                onClick={() => setIsAddUserPanelOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                Fechar
              </button>
            </div>

            {!activeTenant ? (
              <div className="text-slate-400 text-sm">
                Selecione uma organizacao antes de adicionar usuario.
              </div>
            ) : (
              <>
                <div className="text-xs text-slate-400 mb-3">
                  Organizacao: <span className="text-white font-semibold">{activeTenant.name}</span>
                </div>
                <form className="grid grid-cols-1 md:grid-cols-3 gap-3" onSubmit={handleCreateUser}>
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="username"
                    className="bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                  <input
                    value={userFullName}
                    onChange={(e) => setUserFullName(e.target.value)}
                    placeholder="nome completo"
                    className="bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                  <input
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    placeholder="email"
                    className="bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="nome exibicao (opcional)"
                    className="bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                  <input
                    value={userPhone}
                    onChange={(e) => setUserPhone(e.target.value)}
                    placeholder="telefone (opcional)"
                    className="bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="senha inicial"
                    className="bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                  <div className="flex gap-2 md:col-span-3">
                    <select
                      value={role}
                      onChange={(e) =>
                        setRole(e.target.value as 'OWNER' | 'TENANT_ADMIN' | 'OPERATOR' | 'VIEWER')
                      }
                      className="bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white w-full"
                    >
                      <option value="OWNER">OWNER</option>
                      <option value="TENANT_ADMIN">TENANT_ADMIN</option>
                      <option value="OPERATOR">OPERATOR</option>
                      <option value="VIEWER">VIEWER</option>
                    </select>
                    <select
                      value={userStatus}
                      onChange={(e) =>
                        setUserStatus(e.target.value as 'ACTIVE' | 'SUSPENDED' | 'CANCELLED')
                      }
                      className="bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white w-full"
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="SUSPENDED">SUSPENDED</option>
                      <option value="CANCELLED">CANCELLED</option>
                    </select>
                    <button
                      type="submit"
                      disabled={savingUser}
                      className="gradient-primary text-white rounded-lg px-4 py-2 disabled:opacity-50 whitespace-nowrap"
                    >
                      {savingUser ? 'Salvando...' : 'Criar'}
                    </button>
                  </div>
                </form>
              </>
            )}
            {userError && <div className="mt-3 text-danger text-sm">{userError}</div>}
          </div>
        </div>
      )}
    </div>
  );
};

export default TenantsPage;
