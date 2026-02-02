import React, { useEffect, useState } from 'react';
import Card from '../components/ui/Card';
import { fetchSystemStatus, updateTemperatureSettings } from '../services/api';
import { Save, Bell, Smartphone, Shield, Thermometer } from 'lucide-react';

const SettingsPage: React.FC = () => {
  const [minVal, setMinVal] = useState('0');
  const [maxVal, setMaxVal] = useState('0');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

  useEffect(() => {
    fetchSystemStatus().then(data => {
      setMinVal(data.minTemp.toString());
      setMaxVal(data.maxTemp.toString());
    });
  }, []);

  const handleSave = async () => {
    setLoading(true);
    await updateTemperatureSettings('min', parseFloat(minVal));
    await updateTemperatureSettings('max', parseFloat(maxVal));
    setLoading(false);
    setNotification({ msg: 'Configurações atualizadas com sucesso.', type: 'success' });
    setTimeout(() => setNotification(null), 3000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <header className="pb-6 border-b border-slate-800">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 bg-accent rounded-full animate-pulse shadow-[0_0_10px_#10b981]"></div>
          <span className="text-xs font-mono text-accent tracking-widest uppercase">Sistema de Configuração</span>
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">Ajustes & Configuração</h2>
        <p className="text-slate-400">Gerencie os parâmetros de controle do controlador inteligente.</p>
      </header>

      <Card title="Controle de Histerese" subtitle="Defina os limites de temperatura para ativação" className="glow-primary">
        <div className="flex flex-col lg:flex-row gap-8 mt-6">
          <div className="flex-1 space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 flex items-center gap-2 uppercase tracking-wider">
                <Thermometer size={16} className="text-primary" /> Mínimo (Desliga Relé)
              </label>
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-primary to-transparent opacity-0 group-focus-within:opacity-20 rounded-xl blur-md transition-opacity duration-300"></div>
                <input 
                  type="number" 
                  step="0.1"
                  value={minVal}
                  onChange={e => setMinVal(e.target.value)}
                  className="relative w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary/50 outline-none transition-all duration-300 font-mono"
                />
                <span className="absolute right-4 top-3.5 text-slate-500 text-sm font-semibold">°C</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 flex items-center gap-2 uppercase tracking-wider">
                <Thermometer size={16} className="text-danger" /> Máximo (Liga Relé)
              </label>
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-danger to-transparent opacity-0 group-focus-within:opacity-20 rounded-xl blur-md transition-opacity duration-300"></div>
                <input 
                  type="number" 
                  step="0.1"
                  value={maxVal}
                  onChange={e => setMaxVal(e.target.value)}
                  className="relative w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-danger focus:ring-1 focus:ring-danger/50 outline-none transition-all duration-300 font-mono"
                />
                <span className="absolute right-4 top-3.5 text-slate-500 text-sm font-semibold">°C</span>
              </div>
            </div>

            {notification && (
              <div className={`p-4 rounded-lg text-sm font-medium border animate-slide-in-left ${notification.type === 'success' ? 'bg-accent/15 text-accent border-accent/30' : 'bg-danger/15 text-danger border-danger/30'}`}>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${notification.type === 'success' ? 'bg-accent' : 'bg-danger'}`}></div>
                  {notification.msg}
                </div>
              </div>
            )}

            <button 
              onClick={handleSave}
              disabled={loading}
              className="w-full gradient-primary text-white font-medium py-3 rounded-xl transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-primary/30"
            >
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={18} />}
              Salvar Parâmetros
            </button>
          </div>
          
          <div className="lg:flex-1 glass-card rounded-2xl p-6 border border-slate-700/50 flex flex-col justify-center">
            <h4 className="font-semibold text-white mb-4 text-lg">📌 Como Funciona</h4>
            <ul className="space-y-4 text-sm text-slate-400">
              <li className="flex gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>Se a temperatura <strong className="text-white">subir acima</strong> do <strong>Máximo</strong>, o sistema <strong className="text-primary">liga</strong> o compressor.</span>
              </li>
              <li className="flex gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>O compressor continua ligado até a temperatura <strong className="text-white">cair abaixo</strong> do <strong>Mínimo</strong>.</span>
              </li>
              <li className="flex gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>Isso evita que o motor ligue e desligue constantemente (ciclos curtos).</span>
              </li>
            </ul>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Notificações" action={<div className="bg-accent/20 text-accent px-3 py-1 rounded-full text-xs font-bold border border-accent/30 tracking-wider">ATIVO</div>} className="glow-accent">
          <div className="space-y-4 mt-4">
            <div className="flex items-center justify-between p-4 bg-slate-800/30 hover:bg-slate-800/50 rounded-xl border border-slate-700/30 transition-all duration-300 group cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                  <Bell size={18} className="text-primary" />
                </div>
                <div>
                  <span className="text-slate-200 text-sm font-semibold block">Alerta Sonoro (Buzzer)</span>
                  <span className="text-xs text-slate-500">Som em caso de anomalias</span>
                </div>
              </div>
              <div className="w-12 h-7 bg-primary rounded-full relative cursor-pointer shadow-lg shadow-primary/30 flex items-center justify-end pr-1 transition-all">
                <div className="w-5 h-5 bg-white rounded-full" />
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-800/30 hover:bg-slate-800/50 rounded-xl border border-slate-700/30 transition-all duration-300 group cursor-pointer opacity-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-secondary/10 rounded-lg group-hover:bg-secondary/20 transition-colors">
                  <Smartphone size={18} className="text-secondary" />
                </div>
                <div>
                  <span className="text-slate-200 text-sm font-semibold block">Push Notification</span>
                  <span className="text-xs text-slate-500">Notificações mobile (em breve)</span>
                </div>
              </div>
              <div className="w-12 h-7 bg-slate-700 rounded-full relative cursor-pointer flex items-center justify-start pl-1 transition-all">
                <div className="w-5 h-5 bg-slate-500 rounded-full" />
              </div>
            </div>
          </div>
        </Card>

        <Card title="Segurança" className="glow-secondary">
          <div className="space-y-3 mt-4">
            <button className="w-full flex items-center justify-between p-4 bg-slate-800/30 hover:bg-slate-800/50 rounded-xl border border-slate-700/30 transition-all duration-300 group">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-secondary/10 rounded-lg group-hover:bg-secondary/20 transition-colors">
                  <Shield size={18} className="text-secondary" />
                </div>
                <div className="text-left">
                  <span className="text-slate-200 text-sm font-semibold block">Alterar Senha</span>
                  <span className="text-xs text-slate-500">Atualize sua chave de acesso</span>
                </div>
              </div>
              <div className="text-slate-400 group-hover:text-secondary transition-colors">
                →
              </div>
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SettingsPage;
