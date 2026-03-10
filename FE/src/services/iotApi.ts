import { postJson } from './http';
import { IOT_CONFIG } from '../config/iot';
import {
  ActionHistoryRecord,
  DeviceAction,
  DeviceKey,
  PagedResult,
  SensorRecord,
  SortDirection,
} from '../types/iot';

type SearchOptions = {
  page?: number;
  size?: number;
  sortBy?: string;
  direction?: SortDirection;
};

type UnknownApiPayload = Record<string, unknown>;

type SensorSearchBody = {
  nameSensor?: string;
  value?: number;
  dateTime?: string;
};

type ActionSearchBody = {
  nameDevice?: string;
  status?: string;
  action?: string;
  date?: string;
};

const DEVICE_LED_FALLBACK_MAP: Record<DeviceKey, string[]> = {
  fan: ['fan', 'vang'],
  air_condition: ['air_condition', 'xanh'],
  light_bulb: ['light_bulb', 'do'],
};

function extractRows(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const objectPayload = payload as UnknownApiPayload;

  if (Array.isArray(objectPayload.content)) {
    return objectPayload.content;
  }

  if (Array.isArray(objectPayload.data)) {
    return objectPayload.data;
  }

  if (objectPayload.data && typeof objectPayload.data === 'object') {
    const nestedData = objectPayload.data as UnknownApiPayload;
    if (Array.isArray(nestedData.content)) {
      return nestedData.content;
    }
  }

  return [];
}

function extractTotal(payload: unknown, rowCount: number): number {
  if (!payload || typeof payload !== 'object') {
    return rowCount;
  }

  const objectPayload = payload as UnknownApiPayload;

  const candidates = [objectPayload.totalElements, objectPayload.total, objectPayload.count];
  for (const candidate of candidates) {
    if (typeof candidate === 'number') {
      return candidate;
    }
  }

  if (objectPayload.data && typeof objectPayload.data === 'object') {
    const nestedData = objectPayload.data as UnknownApiPayload;
    if (typeof nestedData.totalElements === 'number') {
      return nestedData.totalElements;
    }
  }

  return rowCount;
}

function formatDateTime(input: unknown): string {
  if (typeof input !== 'string' || !input.trim()) {
    return '-';
  }

  return input.replace('T', ' ');
}

function parseNumber(input: unknown): number | undefined {
  if (typeof input === 'number' && Number.isFinite(input)) {
    return input;
  }

  if (typeof input === 'string') {
    const parsed = Number(input);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

function sensorUnit(sensorName: string): string {
  const normalized = sensorName.toLowerCase();
  if (normalized.includes('temp') || normalized.includes('nhiet') || normalized.includes('nhiệt')) {
    return '°C';
  }
  if (normalized.includes('humidity') || normalized.includes('do am') || normalized.includes('độ ẩm')) {
    return '%';
  }
  if (normalized.includes('light') || normalized.includes('anh sang') || normalized.includes('ánh sáng')) {
    return ' Lux';
  }
  return '';
}

function mapSensorRow(raw: unknown, fallbackId: number): SensorRecord {
  const objectRow = (raw && typeof raw === 'object' ? raw : {}) as UnknownApiPayload;
  const name =
    typeof objectRow.nameSensor === 'string'
      ? objectRow.nameSensor
      : typeof objectRow.sensorName === 'string'
        ? objectRow.sensorName
        : 'Unknown';
  const numericValue = parseNumber(objectRow.value);
  const normalizedValue =
    typeof objectRow.value === 'string'
      ? objectRow.value
      : numericValue !== undefined
        ? `${numericValue}${sensorUnit(name)}`
        : '-';

  return {
    id:
      typeof objectRow.idData === 'number'
        ? objectRow.idData
        : typeof objectRow.id === 'number'
          ? objectRow.id
          : fallbackId,
    sensorName: name,
    value: normalizedValue,
    time: formatDateTime(objectRow.dateTime ?? objectRow.time ?? objectRow.createdAt),
    numericValue,
  };
}

function normalizeAction(input: unknown): string {
  if (typeof input !== 'string') {
    return '-';
  }

  return input.toUpperCase();
}

function mapActionRow(raw: unknown, fallbackId: number): ActionHistoryRecord {
  const objectRow = (raw && typeof raw === 'object' ? raw : {}) as UnknownApiPayload;

  return {
    id:
      typeof objectRow.idAction === 'number'
        ? objectRow.idAction
        : typeof objectRow.id === 'number'
          ? objectRow.id
          : fallbackId,
    deviceName:
      typeof objectRow.nameDevice === 'string'
        ? objectRow.nameDevice
        : typeof objectRow.deviceName === 'string'
          ? objectRow.deviceName
          : 'Unknown',
    action: normalizeAction(objectRow.action),
    status: normalizeAction(objectRow.status),
    time: formatDateTime(objectRow.date ?? objectRow.dateTime ?? objectRow.time ?? objectRow.createdAt),
  };
}

export async function searchDataSensor(
  body: SensorSearchBody,
  options: SearchOptions,
): Promise<PagedResult<SensorRecord>> {
  const response = await postJson<unknown>('/api/data-sensor/search', body, {
    page: options.page ?? 0,
    size: options.size ?? 10,
    sortBy: options.sortBy ?? 'dateTime',
    direction: options.direction ?? 'desc',
  });

  const rows = extractRows(response).map((row, index) => mapSensorRow(row, index + 1));
  return {
    rows,
    total: extractTotal(response, rows.length),
  };
}

export async function searchActionHistory(
  body: ActionSearchBody,
  options: SearchOptions,
): Promise<PagedResult<ActionHistoryRecord>> {
  const response = await postJson<unknown>('/api/action-history/search', body, {
    page: options.page ?? 0,
    size: options.size ?? 10,
    sortBy: options.sortBy ?? 'dateTime',
    direction: options.direction ?? 'desc',
  });

  const rows = extractRows(response).map((row, index) => mapActionRow(row, index + 1));
  return {
    rows,
    total: extractTotal(response, rows.length),
  };
}

export async function controlDevice(deviceName: DeviceKey, action: DeviceAction): Promise<void> {
  const candidates = [
    IOT_CONFIG.deviceLedMap[deviceName],
    ...DEVICE_LED_FALLBACK_MAP[deviceName],
  ].filter((value, index, array): value is string => Boolean(value) && array.indexOf(value) === index);

  let lastError: unknown;

  for (const ledName of candidates) {
    try {
      await postJson('/api/device/control', {}, { led: ledName, action });
      return;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error('Device control failed');
}
