export type SortDirection = 'asc' | 'desc';

export type DeviceKey = 'air_condition' | 'light_bulb' | 'fan';
export type DeviceAction = 'on' | 'off';

export type SensorRecord = {
  id: number;
  sensorName: string;
  value: string;
  time: string;
  numericValue?: number;
};

export type ActionHistoryRecord = {
  id: number;
  deviceName: string;
  action: string;
  status: string;
  time: string;
};

export type PagedResult<T> = {
  rows: T[];
  total: number;
};

export type SensorRealtimeMessage = {
  sensorName: string;
  value: number;
  time: string;
};

export type DeviceRealtimeMessage = {
  deviceName: DeviceKey;
  action: DeviceAction;
  status?: string;
};
