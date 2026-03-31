import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client/dist/sockjs';
import { IOT_CONFIG } from '../config/iot';

function toLocalDateTimeString(date) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function parseJson(message) {
  let current = message.body;

  for (let index = 0; index < 2; index += 1) {
    if (typeof current !== 'string') {
      break;
    }

    const trimmed = current.trim();
    const looksLikeJson =
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
      (trimmed.startsWith('"{') && trimmed.endsWith('}"'));

    if (!looksLikeJson) {
      break;
    }

    try {
      current = JSON.parse(trimmed);
    } catch {
      break;
    }
  }

  return current;
}

function parseNumeric(input) {
  if (typeof input === 'number' && Number.isFinite(input)) {
    return input;
  }

  if (typeof input === 'string') {
    const direct = Number(input);
    if (Number.isFinite(direct)) {
      return direct;
    }

    const extracted = input.match(/-?\d+(?:\.\d+)?/);
    if (extracted) {
      const parsed = Number(extracted[0]);
      return Number.isFinite(parsed) ? parsed : null;
    }
  }

  return null;
}

function toWsHttpUrl(wsUrl) {
  if (wsUrl.startsWith('ws://')) {
    return `http://${wsUrl.slice('ws://'.length)}`;
  }
  if (wsUrl.startsWith('wss://')) {
    return `https://${wsUrl.slice('wss://'.length)}`;
  }
  return wsUrl;
}

function collectObjects(payload) {
  if (!payload) {
    return [];
  }

  if (Array.isArray(payload)) {
    return payload.flatMap((item) => collectObjects(item));
  }

  if (typeof payload !== 'object') {
    return [];
  }

  const current = payload;
  const nestedKeys = ['data', 'payload', 'body', 'result', 'message'];
  const nested = nestedKeys.flatMap((key) => collectObjects(current[key]));

  return [current, ...nested];
}

function isDeviceKey(value) {
  return value === 'air_condition' || value === 'light_bulb' || value === 'fan';
}

function normalizeDeviceKey(input) {
  if (typeof input !== 'string') {
    return null;
  }

  const normalized = input.trim().toLowerCase().replace(/[-\s]+/g, '_');
  const aliases = {
    do: 'light_bulb',
    xanh: 'air_condition',
    vang: 'fan',
    aircondition: 'air_condition',
    lightbulb: 'light_bulb',
  };

  if (aliases[normalized]) {
    return aliases[normalized];
  }

  return isDeviceKey(normalized) ? normalized : null;
}

function toDeviceAction(input) {
  if (typeof input !== 'string') {
    return null;
  }

  const normalized = input.toLowerCase();
  if (normalized === 'on' || normalized === 'off') {
    return normalized;
  }

  return null;
}

function parseSensorMessage(payload) {
  const now = toLocalDateTimeString(new Date());

  if (typeof payload === 'string') {
    const inlinePairs = payload.match(/(temperature|humidity|light|windspeed|wind[_\s-]?speed|temp|humid|lux|wind)\s*[:=]\s*(-?\d+(?:\.\d+)?)/gi);
    if (!inlinePairs) {
      return [];
    }

    const mapped = inlinePairs
      .map((pair) => {
        const parts = pair.split(/[:=]/);
        if (parts.length < 2) {
          return null;
        }

        const key = parts[0].trim().toLowerCase();
        const value = parseNumeric(parts[1]);
        if (value === null) {
          return null;
        }

        if (key === 'temperature' || key === 'temp') {
          return { sensorName: 'Temperature', value, time: now };
        }
        if (key === 'humidity' || key === 'humid') {
          return { sensorName: 'Humidity', value, time: now };
        }
        if (key === 'windspeed' || key === 'wind_speed' || key === 'wind-speed' || key === 'wind') {
          return { sensorName: 'Wind Speed', value, time: now };
        }
        return { sensorName: 'Light', value, time: now };
      })
      .filter((item) => item !== null);

    return mapped;
  }

  const objects = collectObjects(payload);
  const parsed = [];

  for (const data of objects) {
    const singleSensorName =
      typeof data.nameSensor === 'string'
        ? data.nameSensor
        : typeof data.name_sensor === 'string'
          ? data.name_sensor
          : typeof data.sensorName === 'string'
            ? data.sensorName
            : null;
    const hasSingleShape = singleSensorName !== null && typeof data.value !== 'undefined';
    if (hasSingleShape && singleSensorName) {
      const value = parseNumeric(data.value);
      if (value !== null) {
        parsed.push({
          sensorName: singleSensorName,
          value,
          time:
            typeof data.dateTime === 'string'
              ? data.dateTime
              : typeof data.time === 'string'
                ? data.time
                : typeof data.timestamp === 'string'
                  ? data.timestamp
                  : now,
        });
      }
    }

    const compoundCandidates = [
      ['Temperature', 'temperature'],
      ['Temperature', 'temp'],
      ['Humidity', 'humidity'],
      ['Humidity', 'humid'],
      ['Light', 'light'],
      ['Light', 'lux'],
      ['Wind Speed', 'windspeed'],
      ['Wind Speed', 'wind_speed'],
      ['Wind Speed', 'wind-speed'],
      ['Wind Speed', 'wind'],
    ];

    for (const [label, key] of compoundCandidates) {
      const rawValue = data[key];
      const numericValue = parseNumeric(rawValue);
      if (numericValue !== null) {
        parsed.push({
          sensorName: label,
          value: numericValue,
          time:
            typeof data.dateTime === 'string'
              ? data.dateTime
              : typeof data.time === 'string'
                ? data.time
                : typeof data.timestamp === 'string'
                  ? data.timestamp
                  : now,
        });
      }
    }
  }

  const deduped = new Map();
  parsed.forEach((item) => {
    deduped.set(`${item.sensorName}-${item.time}`, item);
  });

  return Array.from(deduped.values());
}

function parseDeviceMessage(payload) {
  const parseStringMessage = (text) => {
    const normalized = text.toLowerCase();
    const match = normalized.match(/(do|xanh|vang|fan|air[_\s-]?condition|light[_\s-]?bulb)\s+(on|off)(?:\s+(\w+))?/);
    if (match) {
      const mappedDevice = normalizeDeviceKey(match[1]);
      if (!mappedDevice) {
        return null;
      }

      return {
        deviceName: mappedDevice,
        action: match[2],
        status: match[3],
      };
    }
    return null;
  };

  if (typeof payload === 'string') {
    return parseStringMessage(payload);
  }

  const objects = collectObjects(payload);
  for (const data of objects) {
    if (typeof data.message === 'string') {
      const parsedFromMessage = parseStringMessage(data.message);
      if (parsedFromMessage) {
        return parsedFromMessage;
      }
    }

    const device = normalizeDeviceKey(data.nameDevice ?? data.deviceName ?? data.led ?? data.device);
    const action = toDeviceAction(data.action ?? data.state ?? data.command);

    const fallbackActionFromStatus = toDeviceAction(data.status);
    const resolvedAction = action ?? fallbackActionFromStatus;

    if (device && resolvedAction) {
      return {
        deviceName: device,
        action: resolvedAction,
        status: typeof data.status === 'string' ? data.status : undefined,
      };
    }
  }

  return null;
}

function isReconnectSignal(payload) {
  const message = (() => {
    if (typeof payload === 'string') {
      return payload;
    }

    if (typeof payload === 'object' && payload !== null && 'message' in payload) {
      const candidate = payload.message;
      if (typeof candidate === 'string') {
        return candidate;
      }
    }

    return '';
  })();

  const normalized = message.trim().toLowerCase();
  return normalized === 'online'
    || normalized === 'reconnect'
    || normalized === 'boot'
    || normalized === 'device online'
    || normalized === 'esp32 online';
}

export function connectIotRealtime(handlers) {
  const sockJsHttpUrl = toWsHttpUrl(IOT_CONFIG.wsUrl);
  const subscriptions = [
    '/topic/sensor',
    'topic/sensor',
    '/topic/device-status',
    'topic/device-status',
  ];

  const client = new Client({
    webSocketFactory: () => {
      if (IOT_CONFIG.useSockJs) {
        return new SockJS(sockJsHttpUrl);
      }

      return new WebSocket(IOT_CONFIG.wsUrl);
    },
    reconnectDelay: 5000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    onConnect: () => {
      handlers.onConnectionChange?.(true);

      subscriptions.forEach((destination) => {
        client.subscribe(destination, (message) => {
          const payload = parseJson(message);
          if (destination.includes('sensor')) {
            const sensors = parseSensorMessage(payload);
            sensors.forEach((sensor) => handlers.onSensor(sensor));
            return;
          }

          if (isReconnectSignal(payload)) {
            handlers.onReconnect?.();
            return;
          }

          const device = parseDeviceMessage(payload);
          if (device) {
            handlers.onDeviceStatus(device);
          }
        });
      });
    },
    onStompError: () => {
      handlers.onConnectionChange?.(false);
    },
    onWebSocketClose: () => {
      handlers.onConnectionChange?.(false);
    },
    onWebSocketError: () => {
      handlers.onConnectionChange?.(false);
    },
  });

  client.activate();

  return () => {
    void client.deactivate();
  };
}