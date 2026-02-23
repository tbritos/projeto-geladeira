import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import { createTenantUser, fetchTenantUsers, impersonateUser, updateTenantUserRole } from '../services/api';
import { TenantUserSummary } from '../types';
import { useAppContext } from '../context/AppContext';

const ROLE_OPTIONS = ['OWNER', 'TENANT_ADMIN', 'OPERATOR', 'VIEWER'] as const;

interface TenantUsersPageProps {
  hideHeader?: boolean;
  allowViewAs?: boolean;
}

const TenantUsersPage: React.FC<TenantUsersPageProps> = ({ hideHeader = false, allowViewAs = false }) => {
  const navigate = useNavigate();
  const { user, activeTenantId, startViewAs, setAuthToken, setRefreshToken, setUser, setActiveTenantId } = useAppContext();
  const [users, setUsers] = useState<TenantUserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<(typeof ROLE_OPTIONS)[number]>('VIEWER');
  const [viewingAsUsername, setViewingAsUsername] = useState('');

  const canManageUsers =
    user?.platformRole === 'SUPER_ADMIN' || user?.tenantRole === 'TENANT_ADMIN' || user?.tenantRole === 'OWNER';
  const canUseViewAs = allowViewAs && user?.platformRole === 'SUPER_ADMIN';

  const loadUsers = async () => {
    if (!canManageUsers) {
      setLoading(false);
      return;
    }
    try {
      setError('');
      const data = await fetchTenantUsers();
      setUsers(data);
    } catch {
      setError('Nao foi possivel carregar usuarios do tenant.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, [activeTenantId, canManageUsers]);

  const handleCreateUser = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!username.trim() || !password) {
      setError('Informe username e senha.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await createTenantUser({
        username: username.trim(),
        password,
        displayName: displayName.trim() || undefined,
        role,
      });
      setUsername('');
      setDisplayName('');
      setPassword('');
      setRole('VIEWER');
      await loadUsers();
    } catch {
      setError('Falha ao criar usuario no tenant atual.');
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = async (entry: TenantUserSummary, nextRole: (typeof ROLE_OPTIONS)[number]) => {
    if (entry.role === nextRole) return;
    try {
      await updateTenantUserRole(entry.user.id, nextRole);
      await loadUsers();
    } catch {
      setError('Falha ao atualizar papel do usuario.');
    }
  };

  const handleViewAs = (entry: TenantUserSummary) => {
    const run = async () => {
      try {
        setViewingAsUsername(entry.user.username);
        setError('');
        const session = await impersonateUser({
          username: entry.user.username,
          tenantId: entry.tenantId,
        });

        startViewAs({
          tenantId: session.user.tenantId ?? entry.tenantId,
          username: session.user.username,
          tenantRole: session.user.tenantRole ?? entry.role,
        });
        setAuthToken(session.accessToken);
        setRefreshToken(session.refreshToken);
        setActiveTenantId(session.user.tenantId ?? entry.tenantId);
        setUser({
          username: session.user.username,
          role: session.user.role,
          platformRole: session.user.platformRole,
          tenantRole: session.user.tenantRole,
          tenantId: session.user.tenantId,
          impersonatedBy: session.user.impersonatedBy,
          organizations: session.organizations,
        });
        navigate('/app');
      } catch {
        setError('Falha ao iniciar modo ver como para este usuario.');
      } finally {
        setViewingAsUsername('');
      }
    };

    void run();
  };

  if (!canManageUsers) {
    return (
      <Card title="Usuarios">
        <div className="text-slate-400 text-sm">Acesso permitido para OWNER, TENANT_ADMIN e SUPER_ADMIN.</div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {!hideHeader && (
        <header className="pb-6 border-b border-slate-800">
          <h2 className="text-3xl font-bold text-white mb-2">Usuarios do Tenant</h2>
          <p className="text-slate-400">Gerencie contas e papeis do tenant ativo.</p>
        </header>
      )}

      <Card title="Novo Usuario">
        <form className="grid grid-cols-1 md:grid-cols-4 gap-3" onSubmit={handleCreateUser}>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="username"
            className="bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white"
          />
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="nome exibicao (opcional)"
            className="bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="senha inicial"
            className="bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white"
          />
          <div className="flex gap-2">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as (typeof ROLE_OPTIONS)[number])}
              className="bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white w-full"
            >
              {ROLE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={saving}
              className="gradient-primary text-white rounded-lg px-4 py-2 disabled:opacity-50 whitespace-nowrap"
            >
              {saving ? 'Salvando...' : 'Criar'}
            </button>
          </div>
        </form>
        {error && <div className="mt-3 text-danger text-sm">{error}</div>}
      </Card>

      <Card title="Lista de Usuarios">
        {loading ? (
          <div className="text-slate-400 text-sm">Carregando...</div>
        ) : users.length === 0 ? (
          <div className="text-slate-400 text-sm">Nenhum usuario neste tenant.</div>
        ) : (
          <div className="space-y-3">
            {users.map((entry) => (
              <div
                key={entry.membershipId}
                className="border border-slate-700 rounded-lg p-4 bg-slate-900/30 flex items-center justify-between gap-4"
              >
                <div>
                  <div className="text-white font-semibold">{entry.user.displayName || entry.user.username}</div>
                  <div className="text-slate-400 text-xs">
                    username: {entry.user.username} | ativo: {entry.user.isActive ? 'sim' : 'nao'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {canUseViewAs && (
                    <button
                      onClick={() => handleViewAs(entry)}
                      disabled={viewingAsUsername === entry.user.username}
                      className="px-3 py-2 rounded-lg text-xs font-semibold bg-secondary/20 text-secondary border border-secondary/40 hover:bg-secondary/30 transition-colors"
                    >
                      {viewingAsUsername === entry.user.username ? 'Entrando...' : 'Ver como'}
                    </button>
                  )}
                  <select
                    value={entry.role}
                    onChange={(e) =>
                      handleRoleChange(entry, e.target.value as (typeof ROLE_OPTIONS)[number])
                    }
                    className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                  >
                    {ROLE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default TenantUsersPage;
