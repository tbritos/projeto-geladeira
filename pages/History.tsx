import React, { useEffect, useState, useMemo } from 'react';
import { fetchHistory, fetchEvents } from '../services/api';
import { HistoricalDataPoint, SystemEvent } from '../types';
import Card from '../components/ui/Card';
import HistoryFilters, { FilterOptions } from '../components/HistoryFilters';
import SimpleChart from '../components/ui/SimpleChart';
import { Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { exportToCSV, usePagination } from '../utils/historyUtils';

const HistoryPage: React.FC = () => {
  const [data, setData] = useState<HistoricalDataPoint[]>([]);
  const [events, setEvents] = useState<SystemEvent[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<FilterOptions>({
    startDate: '',
    endDate: '',
    eventType: 'ALL',
    severity: 'ALL',
    searchText: '',
  });

  useEffect(() => {
    fetchHistory().then(setData);
    fetchEvents().then(setEvents);
  }, []);

  // Filtrar eventos baseado nos filtros
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      // Filtro de tipo
      if (filters.eventType !== 'ALL' && event.type !== filters.eventType) {
        return false;
      }

      // Filtro de severidade
      if (filters.severity !== 'ALL' && event.severity !== filters.severity) {
        return false;
      }

      // Filtro de texto
      if (filters.searchText && !event.message.toLowerCase().includes(filters.searchText.toLowerCase())) {
        return false;
      }

      // Filtro de data
      if (filters.startDate) {
        const eventDate = event.timestamp.split(' ')[0];
        if (eventDate < filters.startDate) {
          return false;
        }
      }

      if (filters.endDate) {
        const eventDate = event.timestamp.split(' ')[0];
        if (eventDate > filters.endDate) {
          return false;
        }
      }

      return true;
    });
  }, [events, filters]);

  // Paginação
  const { totalPages, itemsPerPage, getPaginatedItems } = usePagination(filteredEvents, 50);
  const paginatedEvents = getPaginatedItems(currentPage);

  // Calcular estatísticas
  const stats = useMemo(() => {
    if (data.length === 0) return null;
    const temps = data.map((d) => d.temperature);
    const humidities = data.map((d) => d.humidity);
    return {
      avgTemp: (temps.reduce((a, b) => a + b) / temps.length).toFixed(1),
      minTemp: Math.min(...temps).toFixed(1),
      maxTemp: Math.max(...temps).toFixed(1),
      avgHumidity: (humidities.reduce((a, b) => a + b) / humidities.length).toFixed(0),
      minHumidity: Math.min(...humidities),
      maxHumidity: Math.max(...humidities),
    };
  }, [data]);

  const handleExportCSV = () => {
    const exportData = filteredEvents.map((event) => ({
      'Data/Hora': event.timestamp,
      'Tipo': event.type,
      'Mensagem': event.message,
      'Severidade': event.severity,
    }));

    exportToCSV(exportData, `historico_tupã_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleResetFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      eventType: 'ALL',
      severity: 'ALL',
      searchText: '',
    });
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="pb-6 border-b border-slate-800">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 bg-accent rounded-full animate-pulse shadow-[0_0_10px_#10b981]"></div>
          <span className="text-xs font-mono text-accent tracking-widest uppercase">Análise de Dados</span>
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">Histórico de Desempenho</h2>
        <p className="text-slate-400">Análise completa com banco de dados de temperaturas e eventos do sistema</p>
      </header>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Variação de Temperatura" subtitle="Últimas 24 Horas" className="glow-primary">
          <div className="mt-6 mb-2">
            <div className="flex justify-between items-end mb-4">
              <div>
                <span className="text-3xl font-bold text-white">{stats?.avgTemp || '0'}°C</span>
                <span className="text-sm text-primary ml-2 font-mono tracking-wider">MÉDIA</span>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-400 font-mono">Intervalo</div>
                <div className="text-sm text-primary font-bold">
                  {stats?.minTemp || '0'}°C - {stats?.maxTemp || '0'}°C
                </div>
              </div>
            </div>
            <SimpleChart
              data={data.map((d) => d.temperature)}
              labels={data.filter((_, i) => i % 6 === 0).map((d) => d.time)}
              color="#0ea5e9"
              height={180}
            />
          </div>
        </Card>

        <Card title="Variação de Umidade" subtitle="Últimas 24 Horas" className="glow-secondary">
          <div className="mt-6 mb-2">
            <div className="flex justify-between items-end mb-4">
              <div>
                <span className="text-3xl font-bold text-white">{stats?.avgHumidity || '0'}%</span>
                <span className="text-sm text-secondary ml-2 font-mono tracking-wider">MÉDIA</span>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-400 font-mono">Intervalo</div>
                <div className="text-sm text-secondary font-bold">
                  {stats?.minHumidity || '0'}% - {stats?.maxHumidity || '0'}%
                </div>
              </div>
            </div>
            <SimpleChart
              data={data.map((d) => d.humidity)}
              labels={data.filter((_, i) => i % 6 === 0).map((d) => d.time)}
              color="#6366f1"
              height={180}
            />
          </div>
        </Card>
      </div>

      {/* Filtros */}
      <HistoryFilters
        filters={filters}
        onFiltersChange={setFilters}
        onReset={handleResetFilters}
        recordCount={filteredEvents.length}
      />

      {/* Log de Eventos */}
      <Card title="Log de Eventos do Sistema">
        {/* Controles */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-700/30">
          <div className="text-sm text-slate-400 font-mono">
            Mostrando <span className="text-white font-bold">{paginatedEvents.length}</span> de{' '}
            <span className="text-white font-bold">{filteredEvents.length}</span> registros (página{' '}
            <span className="text-white font-bold">{currentPage}</span> de <span className="text-white font-bold">{totalPages || 1}</span>)
          </div>
          <button
            onClick={handleExportCSV}
            disabled={filteredEvents.length === 0}
            className="flex items-center gap-2 px-4 py-2 gradient-primary text-white rounded-lg text-sm hover:shadow-lg hover:shadow-primary/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={16} /> Exportar CSV
          </button>
        </div>

        {/* Tabela */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-slate-500 text-xs uppercase tracking-wider border-b border-slate-700/50 bg-slate-900/30">
                <th className="pb-4 pl-4 font-semibold">Tipo</th>
                <th className="pb-4 font-semibold">Mensagem</th>
                <th className="pb-4 font-semibold">Data/Hora</th>
                <th className="pb-4 text-right pr-4 font-semibold">Severidade</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {paginatedEvents.length > 0 ? (
                paginatedEvents.map((event, index) => (
                  <tr
                    key={event.id}
                    className="border-b border-slate-800/30 hover:bg-slate-800/40 transition-colors duration-200 group animate-fade-in"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <td className="py-4 pl-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
                          event.type === 'ALERT'
                            ? 'bg-danger/15 text-danger border-danger/30'
                            : event.type === 'DOOR'
                            ? 'bg-warning/15 text-warning border-warning/30'
                            : event.type === 'POWER'
                            ? 'bg-secondary/15 text-secondary border-secondary/30'
                            : 'bg-slate-700/30 text-slate-300 border-slate-600/30'
                        }`}
                      >
                        {event.type}
                      </span>
                    </td>
                    <td className="py-4 text-slate-200 group-hover:text-white transition-colors max-w-xs truncate">
                      {event.message}
                    </td>
                    <td className="py-4 text-slate-400 font-mono text-xs">{event.timestamp}</td>
                    <td className="py-4 text-right pr-4">
                      <div className="flex items-center justify-end gap-2">
                        <div
                          className={`w-3 h-3 rounded-full transition-all ${
                            event.severity === 'critical'
                              ? 'bg-danger shadow-[0_0_10px_rgba(244,63,94,0.8)]'
                              : event.severity === 'warning'
                              ? 'bg-warning shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                              : 'bg-accent shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                          }`}
                        />
                        <span className="text-xs uppercase tracking-wider text-slate-500 w-12 text-right">
                          {event.severity}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">
                    Nenhum registro encontrado com os filtros aplicados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-6 pt-6 border-t border-slate-700/30">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-3 py-2 bg-slate-800/50 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={18} /> Anterior
            </button>

            <div className="flex items-center gap-2">
              {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                let page = i + 1;
                if (totalPages > 5 && currentPage > 3) {
                  page = currentPage - 2 + i;
                }
                if (page > totalPages) return null;

                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 rounded-lg font-bold text-sm transition-all ${
                      currentPage === page
                        ? 'bg-primary text-slate-950 shadow-lg shadow-primary/30'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 px-3 py-2 bg-slate-800/50 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Próxima <ChevronRight size={18} />
            </button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default HistoryPage;
