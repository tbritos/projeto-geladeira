import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  Building2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Cpu,
  Home,
  LogOut,
  Menu,
  Moon,
  Search,
  Settings,
  Sun,
  X,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { fetchTenants, logoutSession } from '../services/api';
import logoImg from '../src/assets/logobranca.svg';
import { useAlerts } from '../context/AlertsContext';
import CommandPalette, { CommandItem } from './ui/CommandPalette';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(() => localStorage.getItem('adminSidebarCollapsed') === '1');
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [orgSuggestions, setOrgSuggestions] = useState<Array<{ id: number; name: string; slug: string }>>([]);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, theme, toggleTheme, logout } = useAppContext();
  const { alerts } = useAlerts();

  const topMenuItems = [
    { icon: Home, label: 'Visao Geral', path: '/admin', keywords: ['dashboard', 'resumo'] },
    { icon: Building2, label: 'Organizacoes', path: '/admin/tenants', keywords: ['clientes'] },
    { icon: Cpu, label: 'Dispositivos', path: '/admin/devices', keywords: ['sensores', 'iot'] },
    { icon: ClipboardList, label: 'Auditoria', path: '/admin/audit', keywords: ['logs'] },
  ];

  useEffect(() => {
    localStorage.setItem('adminSidebarCollapsed', collapsed ? '1' : '0');
  }, [collapsed]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k';
      if (isShortcut) {
        event.preventDefault();
        setPaletteOpen((value) => !value);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const loadSuggestions = async () => {
      try {
        const tenants = await fetchTenants();
        setOrgSuggestions(tenants.slice(0, 30).map((tenant) => ({ id: tenant.id, name: tenant.name, slug: tenant.slug })));
      } catch {
        setOrgSuggestions([]);
      }
    };
    void loadSuggestions();
  }, []);

  const breadcrumbs = useMemo(() => {
    const map: Record<string, string> = {
      admin: 'Admin',
      tenants: 'Organizacoes',
      audit: 'Auditoria',
      devices: 'Dispositivos',
      'settings-global': 'Configuracoes',
    };
    const parts = location.pathname.split('/').filter(Boolean);
    return parts.map((part) => map[part] || part);
  }, [location.pathname]);

  const commandItems: CommandItem[] = useMemo(() => {
    const base: CommandItem[] = topMenuItems.map((item) => ({
      id: `menu-${item.path}`,
      label: item.label,
      hint: `Ir para ${item.label}`,
      keywords: item.keywords,
      onSelect: () => navigate(item.path),
    }));
    const quick: CommandItem[] = [
      {
        id: 'quick-new-org',
        label: 'Criar nova organizacao',
        hint: 'Abrir tela de organizacoes',
        keywords: ['novo', 'criar', 'cliente'],
        onSelect: () => navigate('/admin/tenants'),
      },
      {
        id: 'quick-global-settings',
        label: 'Configuracoes',
        hint: 'Acessar configuracoes do sistema',
        keywords: ['admin', 'sistema', 'configuracoes'],
        onSelect: () => navigate('/admin/settings-global'),
      },
    ];
    const orgs: CommandItem[] = orgSuggestions.map((org) => ({
      id: `org-${org.id}`,
      label: org.name,
      hint: `Organizacao (${org.slug})`,
      keywords: ['organizacao', 'cliente', org.slug],
      onSelect: () => navigate('/admin/tenants'),
    }));
    return [...quick, ...base, ...orgs];
  }, [navigate, orgSuggestions, topMenuItems]);

  return (
    <div className="min-h-screen flex text-slate-200">
      <div className="lg:hidden fixed top-0 w-full z-50 glass-panel border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={logoImg} alt="Tupa" className="w-8 h-8" />
          <span className="font-bold text-lg tracking-tight">Tupa Admin</span>
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-slate-300">
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      <aside
        className={`fixed inset-y-0 left-0 z-40 relative h-screen shrink-0 ${collapsed ? 'w-20' : 'w-72'} bg-[#020617] border-r border-slate-800 transform transition-all duration-300 ease-in-out lg:translate-x-0 lg:sticky lg:top-0 flex flex-col overflow-visible ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className={`${collapsed ? 'px-2 py-6 pb-52' : 'p-8 pb-56'} h-full overflow-y-auto no-scrollbar`}>
          <div className={`relative flex items-center ${collapsed ? 'justify-center' : 'justify-between'} gap-2 mb-10`}>
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden border ${
                  theme === 'light' ? 'bg-white border-slate-300' : 'bg-slate-900 border-slate-700'
                }`}
              >
                <img src={logoImg} alt="Tupa" className="w-6 h-6" />
              </div>
              {!collapsed && <div>
                <h1 className="font-bold text-xl tracking-tight leading-none text-white">Tupa Admin</h1>
              </div>}
            </div>
          </div>

          <button
            onClick={() => setCollapsed((value) => !value)}
            className={`group relative hidden lg:flex items-center ${collapsed ? 'justify-center' : 'gap-2'} text-slate-400 hover:text-white transition-colors text-sm font-medium w-full px-4 py-2 mb-4 hover:bg-slate-800/30 rounded-lg border border-slate-800`}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            {!collapsed && <span>{collapsed ? 'Expandir Menu' : 'Recolher Menu'}</span>}
            {collapsed && (
              <span className="pointer-events-none absolute left-full top-1/2 ml-3 -translate-y-1/2 whitespace-nowrap rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200 opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                Expandir Menu
              </span>
            )}
          </button>

          {!collapsed && <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-2">Operacao</div>}
          <nav className="space-y-2">
            {topMenuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`group relative flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'text-white bg-slate-800/70 border border-slate-700 shadow-inner font-semibold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>}
                  <item.icon size={20} className={isActive ? 'text-primary' : 'group-hover:text-primary transition-colors'} />
                  {!collapsed && <span className="font-medium tracking-wide">{item.label}</span>}
                  {collapsed && (
                    <span className="pointer-events-none absolute left-full top-1/2 ml-3 -translate-y-1/2 whitespace-nowrap rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200 opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                      {item.label}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className={`${collapsed ? 'px-2 py-4' : 'p-6'} absolute bottom-0 left-0 right-0 z-10 border-t border-slate-800 space-y-3 bg-[#020617]`}>
          {!collapsed && <div className="text-[11px] uppercase tracking-wide text-slate-500">Sistema</div>}
          {user && (
            <div className={`group relative flex items-center ${collapsed ? 'justify-center px-0 py-1' : 'gap-3 p-3'} bg-slate-800/30 rounded-lg border border-slate-700/30 text-xs`}>
              <div className="w-8 h-8 rounded-full bg-slate-700 text-slate-100 flex items-center justify-center font-semibold">
                {(user.username?.[0] ?? 'A').toUpperCase()}
              </div>
              {!collapsed && (
                <div className="space-y-1">
                  <div className="text-slate-400">Perfil</div>
                  <div className="font-semibold text-white">{user.username}</div>
                </div>
              )}
              {collapsed && (
                <span className="pointer-events-none absolute left-full top-1/2 ml-3 -translate-y-1/2 whitespace-nowrap rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200 opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                  Perfil: {user.username}
                </span>
              )}
            </div>
          )}

          <button
            onClick={() => navigate('/admin/settings-global')}
            className={`group relative flex items-center ${collapsed ? 'justify-center' : 'gap-2'} text-slate-400 hover:text-white transition-colors text-sm font-medium w-full px-4 py-2 hover:bg-slate-800/30 rounded-lg`}
          >
            <Settings size={16} />
            {!collapsed && <span>Configuracoes</span>}
            {collapsed && (
              <span className="pointer-events-none absolute left-full top-1/2 ml-3 -translate-y-1/2 whitespace-nowrap rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200 opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                Configuracoes
              </span>
            )}
          </button>

          <button
            onClick={async () => {
              await logoutSession();
              logout();
              navigate('/login');
            }}
            className={`group relative flex items-center ${collapsed ? 'justify-center' : 'gap-2'} text-slate-500 hover:text-danger transition-colors text-sm font-medium w-full px-4 py-2 hover:bg-danger/10 rounded-lg`}
          >
            <LogOut size={16} />
            {!collapsed && <span>Encerrar Sessao</span>}
            {collapsed && (
              <span className="pointer-events-none absolute left-full top-1/2 ml-3 -translate-y-1/2 whitespace-nowrap rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200 opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                Encerrar Sessao
              </span>
            )}
          </button>
        </div>
      </aside>

      <main className="flex-1 pt-20 lg:pt-4 px-4 lg:px-8 pb-8 overflow-x-hidden relative">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="border-b border-slate-800 pb-3 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="text-sm text-slate-400">
              {breadcrumbs.map((crumb, index) => (
                <span key={`${crumb}-${index}`}>
                  {index > 0 && <span className="mx-2 text-slate-600">/</span>}
                  <span className={index === breadcrumbs.length - 1 ? 'text-slate-200 font-semibold' : ''}>{crumb}</span>
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPaletteOpen(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-700 bg-slate-900/40 text-slate-300 text-sm hover:bg-slate-900"
              >
                <Search size={14} />
                <span>Buscar</span>
              </button>
              <button
                onClick={toggleTheme}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-700 bg-slate-900/40 text-slate-300 text-sm hover:bg-slate-900 hover:text-primary"
                title={theme === 'dark' ? 'Tema Claro' : 'Tema Escuro'}
              >
                {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
              </button>
              <button
                onClick={() => setNotificationsOpen((value) => !value)}
                className="relative p-2 rounded-lg border border-slate-700 bg-slate-900/40 text-slate-300 hover:bg-slate-900"
                title="Notificacoes"
              >
                <Bell size={16} />
                {alerts.length > 0 && (
                  <span className="absolute -top-1 -right-1 text-[10px] px-1.5 py-0.5 rounded-full bg-danger text-white">
                    {alerts.length}
                  </span>
                )}
              </button>
            </div>
          </div>
          {notificationsOpen && (
            <div className="border border-slate-700 rounded-lg bg-slate-950/80 p-3 space-y-2">
              <div className="text-xs uppercase text-slate-500 tracking-wide">Notificacoes</div>
              {alerts.length === 0 ? (
                <div className="text-sm text-slate-400">Sem notificacoes no momento.</div>
              ) : (
                alerts.slice(-5).reverse().map((alert) => (
                  <div key={alert.id} className="text-sm text-slate-300 border border-slate-800 rounded p-2">
                    <div className="font-semibold">{alert.title}</div>
                    <div className="text-xs text-slate-400">{alert.message}</div>
                  </div>
                ))
              )}
            </div>
          )}
          <div>{children}</div>
        </div>
      </main>

      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-30 lg:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} items={commandItems} title="Navegacao rapida" />
    </div>
  );
};

export default AdminLayout;
