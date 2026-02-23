import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import TenantUsersPage from './TenantUsers';
import { useAppContext } from '../context/AppContext';

const AdminUsersPage: React.FC = () => {
  const { activeTenantId } = useAppContext();

  const hasActiveTenant = useMemo(() => typeof activeTenantId === 'number', [activeTenantId]);

  return (
    <div className="space-y-6">
      <header className="pb-6 border-b border-slate-800">
        <h2 className="text-3xl font-bold text-white mb-2">Usuarios das Organizacoes</h2>
        <p className="text-slate-400">Gerencie usuarios da organizacao atualmente selecionada.</p>
      </header>

      {!hasActiveTenant && (
        <Card title="Selecionar Organizacao">
          <div className="space-y-3">
            <p className="text-slate-300 text-sm">
              Nenhuma organizacao ativa selecionada. Escolha uma organizacao para liberar o gerenciamento de usuarios.
            </p>
            <Link
              to="/admin/tenants"
              className="inline-flex items-center px-4 py-2 rounded-lg gradient-primary text-white text-sm font-semibold"
            >
              Ir para Organizacoes
            </Link>
          </div>
        </Card>
      )}

      {hasActiveTenant && <TenantUsersPage hideHeader allowViewAs />}
    </div>
  );
};

export default AdminUsersPage;
