import React, { useState, useEffect } from 'react';
import { Power, Wind, Thermometer, AlertCircle } from 'lucide-react';
import { fetchSystemStatus } from '../services/api';
import { SystemStatus } from '../types';
import { useAppContext } from '../context/AppContext';
import Card from './ui/Card';

const ControlPanel: React.FC = () => {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [isOn, setIsOn] = useState(false);
  const [mode, setMode] = useState<'normal' | 'economico' | 'turbo'>('normal');
  const [targetTemp, setTargetTemp] = useState(4);
  const { user, hasPermission } = useAppContext();

  useEffect(() => {
    fetchSystemStatus().then(setStatus);
  }, []);

  const canControl = hasPermission('operador');

  const handleTogglePower = () => {
    if (!canControl) return;
    setIsOn(!isOn);
    // Aqui iria uma chamada à API para realmente ligar/desligar
  };

  const handleModeChange = (newMode: 'normal' | 'economico' | 'turbo') => {
    if (!canControl) return;
    setMode(newMode);
    // Aqui iria uma chamada à API
  };

  return (
    <Card title="Painel de Controle" subtitle="Gerencie o sistema" className="glow-primary">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {/* Power Control */}
        <div className="space-y-4">
          <label className="text-sm font-medium text-slate-300 flex items-center gap-2 uppercase tracking-wider">
            <Power size={16} className="text-primary" /> Sistema
          </label>
          <div className="flex gap-3">
            <button
              onClick={handleTogglePower}
              disabled={!canControl}
              className={`flex-1 py-3 rounded-lg font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
                isOn
                  ? 'bg-accent text-slate-950 shadow-lg shadow-accent/30'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50'
              } disabled:cursor-not-allowed`}
            >
              <Power size={20} />
              {isOn ? 'Ligado' : 'Desligado'}
            </button>
          </div>
          {!canControl && (
            <div className="flex items-center gap-2 text-xs text-warning bg-warning/15 px-3 py-2 rounded border border-warning/30">
              <AlertCircle size={14} />
              Permissão insuficiente
            </div>
          )}
        </div>

        {/* Température Control */}
        <div className="space-y-4">
          <label className="text-sm font-medium text-slate-300 flex items-center gap-2 uppercase tracking-wider">
            <Thermometer size={16} className="text-secondary" /> Temperatura Alvo
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max="10"
              step="0.5"
              value={targetTemp}
              onChange={(e) => canControl && setTargetTemp(parseFloat(e.target.value))}
              disabled={!canControl}
              className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-secondary disabled:opacity-50"
            />
            <span className="text-2xl font-bold text-white w-16 text-right">{targetTemp.toFixed(1)}°C</span>
          </div>
          <div className="text-xs text-slate-400">Intervalo: 0°C - 10°C</div>
        </div>

        {/* Operation Mode */}
        <div className="space-y-4 md:col-span-2">
          <label className="text-sm font-medium text-slate-300 flex items-center gap-2 uppercase tracking-wider">
            <Wind size={16} className="text-primary" /> Modo de Operação
          </label>
          <div className="grid grid-cols-3 gap-3">
            {(['normal', 'economico', 'turbo'] as const).map((m) => (
              <button
                key={m}
                onClick={() => handleModeChange(m)}
                disabled={!canControl}
                className={`py-3 rounded-lg font-bold transition-all duration-300 uppercase tracking-wider text-sm ${
                  mode === m
                    ? 'bg-primary text-slate-950 shadow-lg shadow-primary/30'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50'
                } disabled:cursor-not-allowed`}
              >
                {m === 'normal' && '⚡ Normal'}
                {m === 'economico' && '💚 Econômico'}
                {m === 'turbo' && '🔥 Turbo'}
              </button>
            ))}
          </div>
        </div>

        {/* Current Status */}
        {status && (
          <div className="md:col-span-2 bg-slate-800/30 rounded-lg p-4 border border-slate-700/30 space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-xs text-slate-400 uppercase tracking-wider">Temperatura</div>
                <div className="text-xl font-bold text-primary">{status.temperature.toFixed(1)}°C</div>
              </div>
              <div>
                <div className="text-xs text-slate-400 uppercase tracking-wider">Umidade</div>
                <div className="text-xl font-bold text-secondary">{status.humidity.toFixed(0)}%</div>
              </div>
              <div>
                <div className="text-xs text-slate-400 uppercase tracking-wider">Relé</div>
                <div className={`text-xl font-bold ${status.relayState ? 'text-accent' : 'text-slate-500'}`}>
                  {status.relayState ? 'ON' : 'OFF'}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400 uppercase tracking-wider">Energia</div>
                <div className={`text-xl font-bold ${status.powerStatus ? 'text-accent' : 'text-danger'}`}>
                  {status.powerStatus ? 'OK' : 'ERRO'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default ControlPanel;
