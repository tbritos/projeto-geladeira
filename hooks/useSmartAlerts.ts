import { useEffect, useRef } from 'react';
import { useAlerts } from '../context/AlertsContext';
import { SystemStatus } from '../types';

export const useSmartAlerts = (status: SystemStatus | null) => {
  const { addAlert } = useAlerts();
  const lastAlertRef = useRef<{ [key: string]: boolean }>({});

  useEffect(() => {
    if (!status) return;

    // Alertas de Temperatura
    if (status.alertActive && !lastAlertRef.current['temp_alert']) {
      addAlert({
        type: 'critical',
        title: '⚠️ Alerta de Temperatura',
        message: `Temperatura fora do intervalo: ${status.temperature.toFixed(1)}°C (ideal: ${status.minTemp}°C - ${status.maxTemp}°C)`,
      });
      lastAlertRef.current['temp_alert'] = true;
    } else if (!status.alertActive && lastAlertRef.current['temp_alert']) {
      addAlert({
        type: 'info',
        title: '✅ Temperatura Normalizada',
        message: `Sistema voltou ao intervalo normal: ${status.temperature.toFixed(1)}°C`,
        duration: 5000,
      });
      lastAlertRef.current['temp_alert'] = false;
    }

    // Alertas de Umidade
    const humidity = status.humidity;
    if (humidity < 30 && !lastAlertRef.current['humidity_low']) {
      addAlert({
        type: 'warning',
        title: '💧 Umidade Baixa',
        message: `Umidade em nível baixo: ${humidity.toFixed(0)}% (ideal: >50%)`,
      });
      lastAlertRef.current['humidity_low'] = true;
    } else if (humidity >= 30 && lastAlertRef.current['humidity_low']) {
      lastAlertRef.current['humidity_low'] = false;
    }

    if (humidity > 80 && !lastAlertRef.current['humidity_high']) {
      addAlert({
        type: 'warning',
        title: '💨 Umidade Alta',
        message: `Umidade em nível alto: ${humidity.toFixed(0)}% (ideal: <70%)`,
      });
      lastAlertRef.current['humidity_high'] = true;
    } else if (humidity <= 80 && lastAlertRef.current['humidity_high']) {
      lastAlertRef.current['humidity_high'] = false;
    }

    // Alertas de Porta Aberta
    if (!status.door1Status && !lastAlertRef.current['door_open']) {
      addAlert({
        type: 'warning',
        title: '🚪 Porta Aberta',
        message: 'A porta do sistema está aberta',
      });
      lastAlertRef.current['door_open'] = true;
    } else if (status.door1Status && lastAlertRef.current['door_open']) {
      addAlert({
        type: 'info',
        title: '✅ Porta Fechada',
        message: 'A porta foi fechada normalmente',
        duration: 3000,
      });
      lastAlertRef.current['door_open'] = false;
    }

    // Alertas de Energia
    if (!status.powerStatus && !lastAlertRef.current['power_issue']) {
      addAlert({
        type: 'critical',
        title: '⚡ Problema de Energia',
        message: 'Sistema perdeu conexão de energia',
      });
      lastAlertRef.current['power_issue'] = true;
    } else if (status.powerStatus && lastAlertRef.current['power_issue']) {
      addAlert({
        type: 'info',
        title: '✅ Energia Restaurada',
        message: 'Sistema voltou à alimentação normal',
        duration: 5000,
      });
      lastAlertRef.current['power_issue'] = false;
    }

    // Alertas de Relay
    if (status.relayState && !lastAlertRef.current['relay_on']) {
      addAlert({
        type: 'info',
        title: '❄️ Compressor Ativado',
        message: 'Sistema de refrigeração está ligado',
        duration: 3000,
      });
      lastAlertRef.current['relay_on'] = true;
    }
  }, [status, addAlert]);
};
