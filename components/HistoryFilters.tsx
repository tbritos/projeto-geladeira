import React from 'react';
import { Calendar, Filter, X } from 'lucide-react';
import { SystemEvent } from '../types';

export interface FilterOptions {
  startDate: string;
  endDate: string;
  eventType: 'ALL' | 'ALERT' | 'DOOR' | 'POWER' | 'SYSTEM';
  severity: 'ALL' | 'info' | 'warning' | 'critical';
  searchText: string;
}

interface HistoryFiltersProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  onReset: () => void;
  recordCount: number;
}

const HistoryFilters: React.FC<HistoryFiltersProps> = ({ filters, onFiltersChange, onReset, recordCount }) => {
  const handleChange = (key: keyof FilterOptions, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const hasActiveFilters = filters.startDate || filters.endDate || filters.eventType !== 'ALL' || filters.severity !== 'ALL' || filters.searchText;

  return (
    <div className="bg-slate-800/30 rounded-lg p-6 border border-slate-700/30 space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-primary" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">Filtros Avançados</h3>
          {hasActiveFilters && (
            <span className="ml-2 px-2 py-1 bg-primary/20 text-primary text-xs rounded-full">Ativo</span>
          )}
        </div>
        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-danger transition-colors"
          >
            <X size={14} /> Limpar Filtros
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Data Inicial */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-300 uppercase tracking-wider">Data Inicial</label>
          <div className="relative">
            <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleChange('startDate', e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-700 text-white p-2 pl-10 rounded-lg text-sm focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all"
            />
          </div>
        </div>

        {/* Data Final */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-300 uppercase tracking-wider">Data Final</label>
          <div className="relative">
            <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleChange('endDate', e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-700 text-white p-2 pl-10 rounded-lg text-sm focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all"
            />
          </div>
        </div>

        {/* Tipo de Evento */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-300 uppercase tracking-wider">Tipo</label>
          <select
            value={filters.eventType}
            onChange={(e) => handleChange('eventType', e.target.value)}
            className="w-full bg-slate-900/50 border border-slate-700 text-white p-2 rounded-lg text-sm focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all appearance-none cursor-pointer"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M10.293 3.293L6 7.586 1.707 3.293A1 1 0 00.293 4.707l5 5a1 1 0 001.414 0l5-5a1 1 0 10-1.414-1.414z'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 0.5rem center',
              backgroundSize: '1.25em 1.25em',
              paddingRight: '2rem',
            }}
          >
            <option value="ALL">Todos</option>
            <option value="ALERT">Alertas</option>
            <option value="DOOR">Porta</option>
            <option value="POWER">Energia</option>
            <option value="SYSTEM">Sistema</option>
          </select>
        </div>

        {/* Severidade */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-300 uppercase tracking-wider">Severidade</label>
          <select
            value={filters.severity}
            onChange={(e) => handleChange('severity', e.target.value)}
            className="w-full bg-slate-900/50 border border-slate-700 text-white p-2 rounded-lg text-sm focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all appearance-none cursor-pointer"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M10.293 3.293L6 7.586 1.707 3.293A1 1 0 00.293 4.707l5 5a1 1 0 001.414 0l5-5a1 1 0 10-1.414-1.414z'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 0.5rem center',
              backgroundSize: '1.25em 1.25em',
              paddingRight: '2rem',
            }}
          >
            <option value="ALL">Todos</option>
            <option value="critical">Crítico</option>
            <option value="warning">Aviso</option>
            <option value="info">Informação</option>
          </select>
        </div>

        {/* Busca */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-300 uppercase tracking-wider">Buscar</label>
          <input
            type="text"
            placeholder="Mensagem..."
            value={filters.searchText}
            onChange={(e) => handleChange('searchText', e.target.value)}
            className="w-full bg-slate-900/50 border border-slate-700 text-white p-2 rounded-lg text-sm focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all"
          />
        </div>
      </div>

      {/* Resultado */}
      <div className="text-xs text-slate-400 pt-2 border-t border-slate-700/30">
        <span className="font-mono">{recordCount} registros encontrados</span>
      </div>
    </div>
  );
};

export default HistoryFilters;
