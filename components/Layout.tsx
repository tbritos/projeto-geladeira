import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, History, Settings, LogOut, Menu, X, Moon, Sun, Building2, Users } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { logoutSession } from '../services/api';
import logoImg from '../src/assets/logobranca.svg';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, theme, toggleTheme, logout, activeTenantId } = useAppContext();

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: History, label: 'Historico', path: '/history' },
    { icon: Settings, label: 'Configuracao', path: '/settings' },
    ...(user?.platformRole === 'SUPER_ADMIN' || user?.tenantRole === 'TENANT_ADMIN'
      ? [{ icon: Users, label: 'Usuarios', path: '/users' }]
      : []),
    ...(user?.platformRole === 'SUPER_ADMIN' ? [{ icon: Building2, label: 'Clientes', path: '/tenants' }] : []),
  ];

  return (
    <div className="min-h-screen flex text-slate-200">
      <div className="lg:hidden fixed top-0 w-full z-50 glass-panel border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={logoImg} alt="Tupa" className="w-8 h-8" />
          <span className="font-bold text-lg tracking-tight">Tupa</span>
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-slate-300">
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 bg-[#020617] border-r border-slate-800 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static flex flex-col ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-8">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20 overflow-hidden">
              <img src={logoImg} alt="Tupa" className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-xl tracking-tight leading-none text-white">Tupa</h1>
            </div>
          </div>

          <nav className="space-y-2">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group relative overflow-hidden ${
                    isActive
                      ? 'text-white bg-slate-800/50 border border-slate-700 shadow-inner'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>}
                  <item.icon size={20} className={isActive ? 'text-primary' : 'group-hover:text-primary transition-colors'} />
                  <span className="font-medium tracking-wide">{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-slate-800 space-y-3">
          {user && (
            <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/30 text-xs space-y-1">
              <div className="text-slate-400">Usuario</div>
              <div className="font-semibold text-white capitalize flex items-center justify-between">
                <span>{user.username}</span>
                <span className="text-primary text-xs">{user.role}</span>
              </div>
              {user.platformRole === 'SUPER_ADMIN' && (
                <div className="text-[11px] text-slate-400">
                  Tenant ativo: <span className="text-slate-200">{activeTenantId ?? 'nenhum'}</span>
                </div>
              )}
            </div>
          )}

          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 text-slate-400 hover:text-primary transition-colors text-sm font-medium w-full px-4 py-2 hover:bg-slate-800/30 rounded-lg"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            <span>{theme === 'dark' ? 'Tema Claro' : 'Tema Escuro'}</span>
          </button>

          <button
            onClick={async () => {
              await logoutSession();
              logout();
              navigate('/login');
            }}
            className="flex items-center gap-2 text-slate-500 hover:text-danger transition-colors text-sm font-medium w-full px-4 py-2 hover:bg-danger/10 rounded-lg"
          >
            <LogOut size={16} />
            <span>Encerrar Sessao</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 pt-20 lg:pt-8 px-4 lg:px-12 pb-8 overflow-x-hidden relative">
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>

      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-30 lg:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}
    </div>
  );
};

export default Layout;
