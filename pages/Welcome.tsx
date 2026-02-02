import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Welcome: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');

  useEffect(() => {
    // Get username from localStorage
    const storedUsername = localStorage.getItem('currentUser');
    
    if (!storedUsername) {
      navigate('/login');
      return;
    }

    setUsername(storedUsername);

    // Redirect to dashboard after 2.5 seconds
    const timer = setTimeout(() => {
      navigate('/dashboard');
    }, 2500);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center relative overflow-hidden">
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-4">
        {/* Greeting Icon */}
        <div className="mb-8 animate-bounce" style={{ animationDuration: '2s' }}>
          <div className="w-24 h-24 rounded-full flex items-center justify-center glow-primary bg-slate-900/20 overflow-hidden">
            <img src="/src/assets/Group 43.svg" alt="Tupã" className="w-16 h-16" />
          </div>
        </div>

        {/* Main greeting text */}
        <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          Olá,{' '}
          <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            {username || 'Usuário'}
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-xl text-slate-300 mb-8 animate-fade-in" style={{ animationDelay: '0.4s' }}>
          Bem-vindo ao Tupã
        </p>

        {/* Loading indicator */}
        <div className="flex items-center gap-2 mt-8 animate-fade-in" style={{ animationDelay: '0.6s' }}>
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
          <span className="text-slate-400 text-sm font-mono">Entrando no sistema...</span>
          <div className="w-2 h-2 rounded-full bg-secondary animate-pulse" style={{ animationDelay: '0.2s' }}></div>
        </div>

        {/* Progress bar */}
        <div className="mt-12 w-48 h-1 bg-slate-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
            style={{
              animation: 'progress 2.5s ease-in-out forwards',
              '@keyframes progress': {
                '0%': { width: '0%' },
                '100%': { width: '100%' }
              }
            }}
          />
        </div>
      </div>

      {/* Decorative elements */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-950 to-transparent pointer-events-none"></div>
    </div>
  );
};

export default Welcome;
