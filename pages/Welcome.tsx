import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import welcomeIcon from '../src/assets/Group 43.svg';
import { useAppContext } from '../context/AppContext';

const Welcome: React.FC = () => {
  const navigate = useNavigate();
  const { user, isViewingAsTenant, activeTenantId } = useAppContext();
  const [username, setUsername] = useState('');

  useEffect(() => {
    const storedUsername = localStorage.getItem('currentUser');

    if (!storedUsername) {
      navigate('/login');
      return;
    }

    setUsername(storedUsername);

    const timer = setTimeout(() => {
      const hasMultipleOrganizations =
        user?.platformRole === 'USER' && (user.organizations?.length ?? 0) > 1;

      if (user?.platformRole === 'SUPER_ADMIN' && !isViewingAsTenant) {
        navigate('/admin');
        return;
      }

      if (hasMultipleOrganizations && !Number.isFinite(activeTenantId ?? NaN)) {
        navigate('/select-organization');
        return;
      }

      navigate('/app');
    }, 2500);

    return () => clearTimeout(timer);
  }, [activeTenantId, isViewingAsTenant, navigate, user?.organizations, user?.platformRole]);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-float"></div>
        <div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-float"
          style={{ animationDelay: '2s' }}
        ></div>
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center text-center px-4">
        <div className="mb-8 animate-bounce" style={{ animationDuration: '2s' }}>
          <div className="w-24 h-24 rounded-full flex items-center justify-center glow-primary bg-slate-900/20 overflow-hidden">
            <img src={welcomeIcon} alt="Tupa" className="w-16 h-16" />
          </div>
        </div>

        <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          Ola, <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">{username || 'Usuario'}</span>
        </h1>

        <p className="text-xl text-slate-300 mb-8 animate-fade-in" style={{ animationDelay: '0.4s' }}>
          Bem-vindo ao Tupa
        </p>

        <div className="flex items-center gap-2 mt-8 animate-fade-in" style={{ animationDelay: '0.6s' }}>
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
          <span className="text-slate-400 text-sm font-mono">Entrando no sistema...</span>
          <div className="w-2 h-2 rounded-full bg-secondary animate-pulse" style={{ animationDelay: '0.2s' }}></div>
        </div>

        <div className="mt-12 w-48 h-1 bg-slate-700 rounded-full overflow-hidden">
          <div className="h-full w-full bg-gradient-to-r from-primary to-secondary rounded-full animate-pulse" />
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-950 to-transparent pointer-events-none"></div>
    </div>
  );
};

export default Welcome;
