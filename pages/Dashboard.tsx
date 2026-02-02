import React, { useEffect, useState } from 'react';
import { fetchSystemStatus } from '../services/api';
import { SystemStatus } from '../types';
import Card from '../components/ui/Card';
import ControlPanelWidget from '../components/ControlPanelWidget';
import { useSmartAlerts } from '../hooks/useSmartAlerts';
import { Thermometer, Droplets, Zap, DoorClosed, AlertOctagon, Snowflake, Fan, Cpu, Activity, Clock } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const Dashboard: React.FC = () => {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const { hasPermission } = useAppContext();

  useEffect(() => {
    const getData = async () => {
      const data = await fetchSystemStatus();
      setStatus(data);
      setLastUpdate(new Date());
    };
    getData();
    const interval = setInterval(getData, 2000);
    return () => clearInterval(interval);
  }, []);

  // Ativa alertas inteligentes
  useSmartAlerts(status);

  if (!status) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-6">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-slate-800 border-t-primary rounded-full animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
            <Cpu size={24} className="text-primary animate-pulse" />
        </div>
      </div>
      <div className="text-slate-400 font-mono text-sm tracking-widest uppercase">Inicializando Sistema...</div>
    </div>
  );

  // Calculated Status Colors
  const tempColor = status.alertActive ? 'text-danger' : 'text-primary';
  const tempBg = status.alertActive ? 'bg-danger/10 border-danger/30' : 'bg-primary/10 border-primary/30';

  return (
    <div className="space-y-6">
      {/* HUD Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 bg-accent rounded-full animate-pulse shadow-[0_0_10px_#10b981]"></div>
            <span className="text-xs font-mono text-accent tracking-widest uppercase">Sistema Online</span>
          </div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Monitoramento em Tempo Real</h2>
        </div>
        <div className="flex items-center gap-4 bg-surface border border-slate-800 rounded-lg px-4 py-2">
            <Clock size={16} className="text-slate-400" />
            <div className="text-right">
                <div className="text-[10px] text-slate-500 font-mono uppercase">Última Leitura</div>
                <div className="text-sm font-mono text-slate-200">{lastUpdate.toLocaleTimeString()}</div>
            </div>
        </div>
      </header>

      {/* Critical Alert */}
      {status.alertActive && (
        <div className="bg-danger/10 border border-danger/50 rounded-lg p-4 flex items-center gap-4 animate-pulse">
          <AlertOctagon size={32} className="text-danger" />
          <div>
            <h3 className="text-danger font-bold text-lg">ALERTA DE TEMPERATURA CRÍTICA</h3>
            <p className="text-danger/80 text-sm font-mono">Tempo fora da faixa: {status.timeOutOfRange}s</p>
          </div>
        </div>
      )}

      {/* Main Gauges */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Temperature Card */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-surface/50 backdrop-blur-md p-8 group hover:border-primary/30 transition-all">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Thermometer size={120} />
            </div>
            
            <div className="flex justify-between items-start">
                <div>
                    <span className="text-slate-400 text-sm font-mono uppercase tracking-wider">Temperatura Interna</span>
                    <div className={`mt-2 text-6xl font-bold tracking-tighter ${tempColor} drop-shadow-lg`}>
                        {status.temperature.toFixed(1)}
                        <span className="text-2xl text-slate-500 ml-1">°C</span>
                    </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-bold border ${tempBg} ${tempColor}`}>
                    SENSOR PRINCIPAL
                </div>
            </div>

            {/* Simulated Progress Bar for Range */}
            <div className="mt-8">
                <div className="flex justify-between text-xs text-slate-500 font-mono mb-2">
                    <span>{status.minTemp.toFixed(1)}°C (Min)</span>
                    <span>{status.maxTemp.toFixed(1)}°C (Max)</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden relative">
                    {/* Range Zone */}
                    <div className="absolute left-[20%] right-[20%] h-full bg-slate-700/50"></div> 
                    {/* Indicator */}
                    <div 
                        className={`absolute h-full w-2 rounded-full transition-all duration-1000 ${status.alertActive ? 'bg-danger shadow-[0_0_10px_#f43f5e]' : 'bg-primary shadow-[0_0_10px_#0ea5e9]'}`}
                        style={{ left: `${Math.min(Math.max((status.temperature / 12) * 100, 0), 100)}%` }}
                    ></div>
                </div>
            </div>
        </div>

        {/* Humidity Card */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-surface/50 backdrop-blur-md p-8 group hover:border-secondary/30 transition-all">
             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Droplets size={120} />
            </div>

            <div className="flex justify-between items-start">
                <div>
                    <span className="text-slate-400 text-sm font-mono uppercase tracking-wider">Umidade Relativa</span>
                    <div className="mt-2 text-6xl font-bold tracking-tighter text-secondary drop-shadow-lg">
                        {status.humidity.toFixed(0)}
                        <span className="text-2xl text-slate-500 ml-1">%</span>
                    </div>
                </div>
                <div className="px-3 py-1 rounded-full text-xs font-bold border border-secondary/30 bg-secondary/10 text-secondary">
                    HIGRÔMETRO
                </div>
            </div>

            <div className="mt-10 flex items-center gap-2 text-sm text-slate-400">
                <Activity size={16} className="text-secondary" />
                <span>Qualidade do ar estável</span>
            </div>
        </div>
      </div>

      {/* Control Status Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatusModule 
            active={status.relayState} 
            label="COMPRESSOR" 
            icon={Snowflake} 
            activeColor="text-white bg-gradient-to-br from-primary to-blue-600" 
            inactiveColor="text-slate-500 bg-slate-900 border-slate-800"
        />
        <StatusModule 
            active={!status.door1Status} 
            label="PORTA 1" 
            icon={DoorClosed} 
            activeColor="text-white bg-danger animate-pulse" 
            inactiveColor="text-accent bg-slate-900 border-slate-800"
            customLabel={!status.door1Status ? "ABERTA" : "FECHADA"}
        />
        <StatusModule 
            active={status.powerStatus} 
            label="ENERGIA" 
            icon={Zap} 
            activeColor="text-slate-900 bg-accent" 
            inactiveColor="text-slate-500 bg-slate-900"
            customLabel={status.powerStatus ? "ONLINE" : "OFFLINE"}
        />
        <StatusModule 
            active={true} 
            label="VENTILAÇÃO" 
            icon={Fan} 
            activeColor="text-warning bg-warning/10 border-warning/30" 
            inactiveColor="text-slate-500"
            spin={true}
        />
      </div>

      {/* Control Panel - Only for Operador and Admin */}
      {hasPermission('operador') && (
        <ControlPanelWidget />
      )}
    </div>
  );
};

// Sub-component for Status Modules
const StatusModule = ({ active, label, icon: Icon, activeColor, inactiveColor, customLabel, spin }: any) => (
    <div className={`p-4 rounded-xl border transition-all duration-300 flex flex-col items-center justify-center gap-3 text-center ${active ? activeColor : `border ${inactiveColor}`}`}>
        <Icon size={24} className={spin && active ? 'animate-spin' : ''} />
        <div>
            <div className="text-[10px] font-mono uppercase opacity-70 mb-1">{label}</div>
            <div className="font-bold text-sm tracking-wider">{customLabel || (active ? 'ON' : 'OFF')}</div>
        </div>
    </div>
);

export default Dashboard;