import { SystemStatus, ApiResponse, HistoricalDataPoint, SystemEvent } from '../types';

// Helper to simulate data parsing
const parseStatus = (data: ApiResponse): SystemStatus => {
  return {
    temperature: data.temperature,
    humidity: data.humidity,
    relayState: data.relayState === "HIGH", 
    powerStatus: data.powerStatus === "HIGH",
    door1Status: data.door1Status === "HIGH",
    door2Status: data.door2Status === "HIGH",
    minTemp: data.minTemp,
    maxTemp: data.maxTemp,
    alertActive: data.alertActive,
    timeOutOfRange: data.timeOutOfRange
  };
};

// Simulation State
let mockTemp = 5.0;
let cooling = false;

const generateMockData = (): SystemStatus => {
  // Simulate physics
  if (cooling) {
      mockTemp -= 0.1;
      if (mockTemp <= 2.0) cooling = false;
  } else {
      mockTemp += 0.05;
      if (mockTemp >= 8.0) cooling = true;
  }

  // Random flutter
  const currentTemp = mockTemp + (Math.random() * 0.1 - 0.05);
  
  // Logic
  const relayActive = cooling;
  const isAlert = currentTemp > 10.0;

  return {
    temperature: currentTemp,
    humidity: 58 + Math.random() * 2,
    relayState: relayActive, 
    powerStatus: true, 
    door1Status: Math.random() > 0.05, // 5% chance open
    door2Status: true,
    minTemp: 2.0,
    maxTemp: 8.0,
    alertActive: isAlert,
    timeOutOfRange: isAlert ? 120 : 0
  };
};

export const fetchHistory = async (): Promise<HistoricalDataPoint[]> => {
  const points: HistoricalDataPoint[] = [];
  const now = new Date();
  for (let i = 24; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60 * 60 * 1000);
    points.push({
      time: time.getHours().toString().padStart(2, '0') + ":00",
      temperature: parseFloat((4 + Math.sin(i) * 2).toFixed(1)),
      humidity: Math.floor(55 + Math.random() * 10)
    });
  }
  return points;
};

export const fetchEvents = async (): Promise<SystemEvent[]> => {
  return [
    { id: '1', type: 'SYSTEM', message: 'Sistema iniciado com sucesso', timestamp: '08:00', severity: 'info' },
    { id: '2', type: 'DOOR', message: 'Porta 1 aberta', timestamp: '09:30', severity: 'warning' },
    { id: '3', type: 'SYSTEM', message: 'Compressor ativado', timestamp: '09:35', severity: 'info' },
  ];
};

export const fetchSystemStatus = async (): Promise<SystemStatus> => {
  try {
    // Try to fetch from real ESP32
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 500); // 500ms timeout for real device
    
    const response = await fetch('/api/status', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`API Error`);
    const data: ApiResponse = await response.json();
    return parseStatus(data);
  } catch (error) {
    // Fallback to simulation
    return new Promise((resolve) => {
        setTimeout(() => resolve(generateMockData()), 300); 
    });
  }
};

export const updateTemperatureSettings = async (type: 'min' | 'max', value: number): Promise<boolean> => {
  console.log(`Setting ${type} to ${value}`);
  return true;
};