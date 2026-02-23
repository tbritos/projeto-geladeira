import React from 'react';
import Card from '../components/ui/Card';
import { ShieldCheck, UserCog } from 'lucide-react';

const AdminGlobalSettings: React.FC = () => {
  return (
    <div className="space-y-6">
      <header className="pb-6 border-b border-slate-800">
        <h2 className="text-3xl font-bold text-white mb-2">Configuracoes</h2>
        <p className="text-slate-400">Gerencie regras gerais da plataforma e administradores internos.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Administradores da Plataforma" subtitle="Controle de acesso interno">
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-900/40 p-3">
              <div className="w-9 h-9 rounded-full bg-slate-700 text-slate-100 flex items-center justify-center">
                <UserCog size={16} />
              </div>
              <div>
                <div className="text-white text-sm font-semibold">Criacao de novos admins</div>
                <div className="text-xs text-slate-400">Em breve: convite e permissao por perfil.</div>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Politicas de Seguranca" subtitle="Parametros globais de acesso">
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-900/40 p-3">
              <div className="w-9 h-9 rounded-full bg-slate-700 text-slate-100 flex items-center justify-center">
                <ShieldCheck size={16} />
              </div>
              <div>
                <div className="text-white text-sm font-semibold">Regras de autenticacao</div>
                <div className="text-xs text-slate-400">Em breve: forcar troca de senha e politicas de sessao.</div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AdminGlobalSettings;
