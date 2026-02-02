export interface SystemStatus {
  temperature: number;
  humidity: number;
  relayState: boolean; // true = ON/Active
  powerStatus: boolean; // true = OK
  door1Status: boolean; // true = Closed
  door2Status: boolean; // true = Closed
  minTemp: number;
  maxTemp: number;
  alertActive: boolean;
  timeOutOfRange: number; // in seconds
}

export interface SystemEvent {
  id: string;
  type: 'ALERT' | 'DOOR' | 'POWER' | 'SYSTEM';
  message: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface HistoricalDataPoint {
  time: string;
  temperature: number;
  humidity: number;
}

export interface TemperatureRecord {
  id: string;
  date: string; // ISO format
  time: string; // HH:MM:SS
  temperature: number;
  humidity: number;
  relayState: boolean;
  powerStatus: boolean;
  doorStatus: boolean;
  notes?: string;
}

export interface ApiResponse {
  temperature: number;
  humidity: number;
  relayState: string;
  powerStatus: string;
  door1Status: string;
  door2Status: string;
  minTemp: number;
  maxTemp: number;
  alertActive: boolean;
  timeOutOfRange: number;
}
