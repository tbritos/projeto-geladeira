import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ChevronRight, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { login } from '../services/api';
import logoImg from '../src/assets/logobranca.svg';

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
  const { setUser, setAuthToken, setRefreshToken, setActiveTenantId } = useAppContext();

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLocked && lockTimeout > 0) {
      interval = setInterval(() => {
        setLockTimeout((prev) => prev - 1);
      }, 1000);
    } else if (lockTimeout === 0 && isLocked) {
      setIsLocked(false);
    }
    return () => clearInterval(interval);
  }, [isLocked, lockTimeout]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;

    if (!username.trim()) {
      setError(true);
      setErrorMsg('Insira o nome de usuario');
      return;
    }

    if (!pass) {
      setError(true);
      setErrorMsg('Insira a senha');
      return;
    }

    setError(false);
    setIsLoading(true);

    try {
      const response = await login(username, pass);
      setAttemptCount(0);
      setAuthToken(response.accessToken);
      setRefreshToken(response.refreshToken);
      const hasMultipleOrganizations = (response.organizations?.length ?? 0) > 1;
      setActiveTenantId(hasMultipleOrganizations ? null : response.user.tenantId ?? null);
      setUser({
        username: response.user.username,
        role: response.user.role,
        platformRole: response.user.platformRole,
        tenantRole: response.user.tenantRole,
        tenantId: response.user.tenantId,
        organizations: response.organizations,
      });
      navigate('/welcome');
    } catch {
      const newAttemptCount = attemptCount + 1;
      setAttemptCount(newAttemptCount);
      setError(true);
      setErrorMsg('Usuario ou senha incorretos');
      setPass('');

      if (newAttemptCount >= 3) {
        setIsLocked(true);
        setLockTimeout(30);
      } else {
        setTimeout(() => setError(false), 2000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-background via-slate-950 to-background">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse opacity-20"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-pulse opacity-20" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(14,165,233,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(14,165,233,0.05)_1px,transparent_1px)] bg-[size:40px_40px] opacity-50"></div>

      <div className="w-full max-w-md relative z-20 animate-fade-in">
        <div className="glass-card rounded-2xl p-8 border border-slate-700/50">
          <div className="text-center mb-10">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary to-secondary blur-xl opacity-20 rounded-full animate-pulse"></div>
                <div className="relative p-2 rounded-2xl bg-slate-900/30 flex items-center justify-center">
                  <img src={logoImg} alt="Tupa Logo" className="w-20 h-20" />
                </div>
              </div>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Tupa</h1>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {isLocked && (
              <div className="flex items-start gap-3 bg-danger/15 border border-danger/40 rounded-lg p-4">
                <AlertCircle size={20} className="text-danger flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-danger font-semibold text-sm">Conta temporariamente bloqueada</p>
                  <p className="text-danger/70 text-xs mt-1 font-mono">Tente novamente em {lockTimeout}s</p>
                </div>
              </div>
            )}

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
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading || isLocked}
                  className="w-full bg-slate-900/50 border border-slate-700 text-white p-3 pl-10 outline-none rounded-lg focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-mono"
                  placeholder="Usuario..."
                  autoFocus
                />
              </div>
            </div>

            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary opacity-0 group-focus-within:opacity-20 rounded-lg blur-md transition-opacity duration-300"></div>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 text-slate-400 group-focus-within:text-primary transition-colors" size={20} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
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

            {error && (
              <div className="flex items-center gap-3 bg-danger/10 border border-danger/30 rounded-lg p-3 animate-slide-in-right">
                <AlertCircle size={16} className="text-danger flex-shrink-0" />
                <span className="text-danger text-sm font-mono">{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !username || !pass || isLocked}
              className="w-full gradient-primary text-white font-bold py-3 rounded-lg uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-primary/30 relative overflow-hidden"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Entrar</span>
                  <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>

        <div className="mt-8 text-center space-y-2">
          <p className="text-slate-500 text-xs">Credenciais definidas no backend (.env)</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
