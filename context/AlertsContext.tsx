import React, { useState, useEffect } from 'react';
import { AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export interface AlertNotification {
  id: string;
  type: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  duration?: number; // em ms, undefined = permanente
}

interface AlertsContextType {
  alerts: AlertNotification[];
  addAlert: (alert: Omit<AlertNotification, 'id'>) => void;
  removeAlert: (id: string) => void;
  clearAll: () => void;
}

export const AlertsContext = React.createContext<AlertsContextType | undefined>(undefined);

export const AlertsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [alerts, setAlerts] = useState<AlertNotification[]>([]);

  const addAlert = (alert: Omit<AlertNotification, 'id'>) => {
    const id = `${Date.now()}-${Math.random()}`;
    const newAlert: AlertNotification = { ...alert, id };

    setAlerts((prev) => [...prev, newAlert]);

    // Auto-remover se tiver duration
    if (alert.duration) {
      setTimeout(() => {
        removeAlert(id);
      }, alert.duration);
    }
  };

  const removeAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const clearAll = () => {
    setAlerts([]);
  };

  return (
    <AlertsContext.Provider value={{ alerts, addAlert, removeAlert, clearAll }}>
      {children}
      <AlertsContainer />
    </AlertsContext.Provider>
  );
};

export const useAlerts = () => {
  const context = React.useContext(AlertsContext);
  if (context === undefined) {
    throw new Error('useAlerts deve ser usado dentro de AlertsProvider');
  }
  return context;
};

const AlertsContainer: React.FC = () => {
  const { alerts, removeAlert } = useAlerts();

  const getIcon = (type: string) => {
    switch (type) {
      case 'critical':
        return <AlertCircle className="w-5 h-5" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  const getStyles = (type: string) => {
    switch (type) {
      case 'critical':
        return 'bg-danger/10 border-danger/30 text-danger';
      case 'warning':
        return 'bg-warning/10 border-warning/30 text-warning';
      default:
        return 'bg-accent/10 border-accent/30 text-accent';
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 space-y-3 max-w-md">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={`border rounded-lg p-4 flex items-start gap-3 shadow-lg backdrop-blur-sm animate-slide-in-right ${getStyles(
            alert.type
          )}`}
        >
          <div className="flex-shrink-0 mt-0.5">{getIcon(alert.type)}</div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm">{alert.title}</h3>
            <p className="text-xs opacity-90">{alert.message}</p>
          </div>
          <button
            onClick={() => removeAlert(alert.id)}
            className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
