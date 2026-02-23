import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import { useAppContext } from '../context/AppContext';
import { switchOrganization } from '../services/api';

const OrganizationSelectPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, setAuthToken, setRefreshToken, setUser, setActiveTenantId } = useAppContext();
  const [loadingTenantId, setLoadingTenantId] = useState<number | null>(null);
  const [error, setError] = useState('');

  const organizations = useMemo(() => user?.organizations ?? [], [user?.organizations]);

  useEffect(() => {
    if (user?.platformRole === 'SUPER_ADMIN' && !user?.impersonatedBy) {
      navigate('/admin');
    }
  }, [navigate, user?.impersonatedBy, user?.platformRole]);

  const handleSelect = (tenantId: number) => {
    const run = async () => {
      try {
        setLoadingTenantId(tenantId);
        setError('');
        const session = await switchOrganization(tenantId);
        setAuthToken(session.accessToken);
        setRefreshToken(session.refreshToken);
        setActiveTenantId(session.user.tenantId ?? tenantId);
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
        setError('Falha ao selecionar organizacao.');
      } finally {
        setLoadingTenantId(null);
      }
    };

    void run();
  };

  if (organizations.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card title="Organizacoes">
          <div className="text-slate-400 text-sm">
            Nenhuma organizacao vinculada a sua conta. Contate o administrador.
          </div>
        </Card>
      </div>
    );
  }

  if (organizations.length === 1) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card title="Organizacao">
          <div className="space-y-3">
            <div className="text-slate-300 text-sm">
              Sua conta possui apenas uma organizacao: <strong>{organizations[0].tenantName}</strong>
            </div>
            <button
              onClick={() => handleSelect(organizations[0].tenantId)}
              className="gradient-primary text-white rounded-lg px-4 py-2 text-sm font-semibold"
              disabled={loadingTenantId === organizations[0].tenantId}
            >
              {loadingTenantId === organizations[0].tenantId ? 'Entrando...' : 'Entrar'}
            </button>
            {error && <div className="text-danger text-sm">{error}</div>}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-3xl space-y-6">
        <header className="text-center">
          <h1 className="text-3xl font-bold text-white">Escolha sua Organizacao</h1>
          <p className="text-slate-400 text-sm mt-2">
            Selecione em qual organizacao voce deseja entrar nesta sessao.
          </p>
        </header>

        <Card title="Organizacoes Disponiveis">
          <div className="space-y-3">
            {organizations.map((org) => (
              <div
                key={org.tenantId}
                className="border border-slate-700 rounded-lg p-4 bg-slate-900/30 flex items-center justify-between gap-4"
              >
                <div>
                  <div className="text-white font-semibold">{org.tenantName}</div>
                  <div className="text-slate-400 text-xs">
                    slug: {org.tenantSlug} | papel: {org.role}
                  </div>
                </div>
                <button
                  onClick={() => handleSelect(org.tenantId)}
                  disabled={loadingTenantId === org.tenantId}
                  className="gradient-primary text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
                >
                  {loadingTenantId === org.tenantId ? 'Entrando...' : 'Entrar'}
                </button>
              </div>
            ))}
          </div>
          {error && <div className="mt-3 text-danger text-sm">{error}</div>}
        </Card>
      </div>
    </div>
  );
};

export default OrganizationSelectPage;
