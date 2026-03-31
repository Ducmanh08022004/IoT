import { getJson, postJson } from './http';
import { IOT_CONFIG } from '../config/iot';

const DEVICE_LED_FALLBACK_MAP = {
  fan: ['fan', 'vang'],
  air_condition: ['air_condition', 'xanh'],
  light_bulb: ['light_bulb', 'do'],
};

function extractRows(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const objectPayload = payload;

  if (Array.isArray(objectPayload.content)) {
    return objectPayload.content;
  }

  if (Array.isArray(objectPayload.data)) {
    return objectPayload.data;
  }

  if (objectPayload.data && typeof objectPayload.data === 'object') {
    const nestedData = objectPayload.data;
    if (Array.isArray(nestedData.content)) {
      return nestedData.content;
    }
  }

  return [];
}

function extractTotal(payload, rowCount) {
  if (!payload || typeof payload !== 'object') {
    return rowCount;
  }

  const objectPayload = payload;

  const candidates = [objectPayload.totalElements, objectPayload.total, objectPayload.count];
  for (const candidate of candidates) {
    if (typeof candidate === 'number') {
      return candidate;
    }
  }

  if (objectPayload.data && typeof objectPayload.data === 'object') {
    const nestedData = objectPayload.data;
    if (typeof nestedData.totalElements === 'number') {
      return nestedData.totalElements;
    }
  }

  return rowCount;
}

function formatDateTime(input) {
  if (typeof input !== 'string' || !input.trim()) {
    return '-';
  }

  return input.replace('T', ' ');
}

function parseNumber(input) {
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

function sensorUnit(sensorName) {
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
  if (normalized.includes('wind') || normalized.includes('gio') || normalized.includes('gió')) {
    return ' m/s';
  }
  return '';
}

function mapSensorRow(raw, fallbackId) {
  const objectRow = raw && typeof raw === 'object' ? raw : {};
  const name =
    typeof objectRow.nameSensor === 'string'
      ? objectRow.nameSensor
      : typeof objectRow.sensorName === 'string'
        ? objectRow.sensorName
        : 'Unknown';
  const numericValue = parseNumber(objectRow.value);
  const normalizedValue =
    numericValue !== undefined
      ? `${numericValue}${sensorUnit(name)}`
      : typeof objectRow.value === 'string'
        ? objectRow.value
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

function normalizeAction(input) {
  if (typeof input !== 'string') {
    return '-';
  }

  return input.toUpperCase();
}

function mapActionRow(raw, fallbackId) {
  const objectRow = raw && typeof raw === 'object' ? raw : {};

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

export async function searchDataSensor(body, options) {
  const response = await getJson('/api/data-sensor/search', {
    nameSensor: body.nameSensor,
    value: body.value,
    sensorId: body.sensorId,
    dateTime: body.dateTime,
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

export async function searchActionHistory(body, options) {
  const response = await getJson('/api/action-history/search', {
    nameDevice: body.nameDevice,
    status: body.status,
    action: body.action,
    date: body.dateTime ?? body.date,
    dateTime: body.dateTime,
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

export async function controlDevice(deviceName, action) {
  const candidates = [
    IOT_CONFIG.deviceLedMap[deviceName],
    ...DEVICE_LED_FALLBACK_MAP[deviceName],
  ].filter((value, index, array) => Boolean(value) && array.indexOf(value) === index);

  let lastError;

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