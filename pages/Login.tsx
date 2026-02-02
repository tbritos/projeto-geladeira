import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ChevronRight, AlertCircle, Shield, Eye, EyeOff } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [pass, setPass] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimeout, setLockTimeout] = useState(0);
  const navigate = useNavigate();
  const { setUser } = useAppContext();

  // Decrementa o tempo de bloqueio
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLocked && lockTimeout > 0) {
      interval = setInterval(() => {
        setLockTimeout(prev => prev - 1);
      }, 1000);
    } else if (lockTimeout === 0 && isLocked) {
      setIsLocked(false);
    }
    return () => clearInterval(interval);
  }, [isLocked, lockTimeout]);

  // Credenciais válidas
  const validCredentials = [
    { username: 'admin', password: '1234' },
    { username: 'admin', password: 'admin' },
    { username: 'user', password: '1234' },
    { username: 'user', password: 'admin' },
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLocked) return;

    if (!username.trim()) {
      setError(true);
      setErrorMsg('Insira o nome de usuário');
      return;
    }

    if (!pass) {
      setError(true);
      setErrorMsg('Insira a senha');
      return;
    }

    setIsLoading(true);
    
    // Simula delay de autenticação
    setTimeout(() => {
      const isValid = validCredentials.some(
        cred => cred.username === username && cred.password === pass
      );

      if (isValid) {
        setAttemptCount(0);
        setUser({ username, role: 'operador' });
        navigate('/welcome');
      } else {
        const newAttemptCount = attemptCount + 1;
        setAttemptCount(newAttemptCount);
        setError(true);
        setErrorMsg('Usuário ou senha incorretos');
        setUsername('');
        setPass('');
        setIsLoading(false);
        
        // Bloqueia após 3 tentativas erradas
        if (newAttemptCount >= 3) {
          setIsLocked(true);
          setLockTimeout(30);
        } else {
          setTimeout(() => setError(false), 2000);
        }
      }
    }, 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-background via-slate-950 to-background">
        {/* Animated Gradient Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse opacity-20"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-pulse opacity-20" style={{animationDelay: '1s'}}></div>
        </div>

        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(14,165,233,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(14,165,233,0.05)_1px,transparent_1px)] bg-[size:40px_40px] opacity-50"></div>
        
        {/* Content */}
        <div className="w-full max-w-md relative z-20 animate-fade-in">
            {/* Card Container */}
            <div className="glass-card rounded-2xl p-8 border border-slate-700/50">
                {/* Logo Section */}
                <div className="text-center mb-10">
                  <div className="flex justify-center mb-4">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary to-secondary blur-xl opacity-20 rounded-full animate-pulse"></div>
                      <div className="relative p-2 rounded-2xl bg-slate-900/30 flex items-center justify-center">
                        <img src="/src/assets/Group 41.svg" alt="Tupã" className="w-20 h-20" />
                      </div>
                    </div>
                  </div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Tupã</h1>
                </div>

                {/* Form */}
                <form onSubmit={handleLogin} className="space-y-6">
                  {/* Locked Message */}
                  {isLocked && (
                    <div className="flex items-start gap-3 bg-danger/15 border border-danger/40 rounded-lg p-4 animate-slide-in-right">
                      <AlertCircle size={20} className="text-danger flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-danger font-semibold text-sm">Conta Temporariamente Bloqueada</p>
                        <p className="text-danger/70 text-xs mt-1 font-mono">Tentativas máximas excedidas. Tente novamente em {lockTimeout}s</p>
                      </div>
                    </div>
                  )}

                  {/* Username Input */}
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary opacity-0 group-focus-within:opacity-20 rounded-lg blur-md transition-opacity duration-300"></div>
                    <div className="relative">
                      <div className="absolute left-3 top-3.5 text-slate-400 group-focus-within:text-primary transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <input 
                        type="text" 
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        disabled={isLoading || isLocked}
                        className="w-full bg-slate-900/50 border border-slate-700 text-white p-3 pl-10 outline-none rounded-lg focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-mono"
                        placeholder="Usuário..."
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Password Input */}
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary opacity-0 group-focus-within:opacity-20 rounded-lg blur-md transition-opacity duration-300"></div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3.5 text-slate-400 group-focus-within:text-primary transition-colors" size={20} />
                      <input 
                        type={showPassword ? "text" : "password"} 
                        value={pass}
                        onChange={e => setPass(e.target.value)}
                        disabled={isLoading || isLocked}
                        className="w-full bg-slate-900/50 border border-slate-700 text-white p-3 pl-10 pr-10 outline-none rounded-lg focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-mono"
                        placeholder="Senha..."
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3.5 text-slate-400 hover:text-primary transition-colors"
                        disabled={isLoading || isLocked}
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>

                  {/* Attempt Counter */}
                  {attemptCount > 0 && !isLocked && (
                    <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-800/30 rounded-lg px-3 py-2 border border-slate-700/30">
                      <div className="flex gap-1">
                        {[...Array(3)].map((_, i) => (
                          <div
                            key={i}
                            className={`w-1.5 h-1.5 rounded-full transition-colors ${
                              i < attemptCount ? 'bg-danger' : 'bg-slate-600'
                            }`}
                          />
                        ))}
                      </div>
                      <span>Tentativa {attemptCount} de 3</span>
                    </div>
                  )}

                  {/* Error Message */}
                  {error && (
                    <div className="flex items-center gap-3 bg-danger/10 border border-danger/30 rounded-lg p-3 animate-slide-in-right">
                      <AlertCircle size={16} className="text-danger flex-shrink-0" />
                      <span className="text-danger text-sm font-mono">{errorMsg}</span>
                    </div>
                  )}

                  {/* Login Button */}
                  <button 
                    type="submit"
                    disabled={isLoading || !username || !pass || isLocked}
                    className="w-full gradient-primary text-white font-bold py-3 rounded-lg uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-primary/30 relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-white/20 translate-x-full group-hover:translate-x-0 transition-transform duration-300"></div>
                    <div className="relative flex items-center gap-2">
                      {isLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Autenticando...</span>
                        </>
                      ) : (
                        <>
                          <span>Entrar</span>
                          <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </div>
                  </button>
                </form>


            </div>

            {/* Demo Info */}
            <div className="mt-8 text-center space-y-2">
              <p className="text-slate-500 text-xs">Senhas de teste:</p>
              <div className="flex items-center justify-center gap-2">
                <span className="px-3 py-1 bg-slate-800/50 border border-slate-700 rounded text-xs text-primary font-mono">1234</span>
                <span className="text-slate-600 text-xs">ou</span>
                <span className="px-3 py-1 bg-slate-800/50 border border-slate-700 rounded text-xs text-primary font-mono">admin</span>
              </div>
            </div>
        </div>
    </div>
  );
};

export default Login;