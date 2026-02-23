import React, { useState, useEffect } from 'react';
import { Power, AlertCircle } from 'lucide-react';
import { fetchSystemStatus } from '../services/api';
import { SystemStatus } from '../types';
import { useAppContext } from '../context/AppContext';
import Card from './ui/Card';

const ControlPanel: React.FC = () => {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [isOn, setIsOn] = useState(false);
  const { hasPermission } = useAppContext();

  useEffect(() => {
    fetchSystemStatus().then(setStatus);
  }, []);

  const canControl = hasPermission('operador');

  const handleTogglePower = () => {
    if (!canControl) return;
    setIsOn(!isOn);
    // Aqui iria uma chamada à API para realmente ligar/desligar
  };

  return (
    <Card title="Painel de Controle" subtitle="Gerencie o sistema" className="glow-primary">
      <div className="mt-6">
        
        {/* Power Control */}
        <div className="space-y-4">
          <label className="text-sm font-medium text-slate-300 flex items-center gap-2 uppercase tracking-wider">
            <Power size={16} className="text-primary" /> Sistema
          </label>
          
          <div className="flex gap-3">
            <button
              onClick={handleTogglePower}
              disabled={!canControl}
              className={`w-full md:w-1/2 py-4 rounded-lg font-bold transition-all duration-300 flex items-center justify-center gap-3 text-lg ${
                isOn
                  ? 'bg-accent text-slate-950 shadow-lg shadow-accent/30'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50'
              } disabled:cursor-not-allowed`}
            >
              <Power size={24} />
              {isOn ? 'SISTEMA LIGADO' : 'SISTEMA DESLIGADO'}
            </button>
          </div>

          {!canControl && (
            <div className="flex items-center gap-2 text-xs text-warning bg-warning/15 px-3 py-2 rounded border border-warning/30 w-fit">
              <AlertCircle size={14} />
              Permissão insuficiente
            </div>
          )}
        </div>

        {/* Current Status Footer */}
        {status && (
          <div className="mt-6 bg-slate-800/30 rounded-lg p-4 border border-slate-700/30">
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