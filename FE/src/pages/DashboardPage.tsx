import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Fan, Lightbulb, Snowflake, Thermometer, Waves, SunMedium } from 'lucide-react';
import { ChartCard } from '../components/ChartCard';
import { DeviceControlCard } from '../components/DeviceControlCard';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/StatCard';
import { IOT_CONFIG } from '../config/iot';
import { dashboardSeries, lightSeries } from '../data/mockData';
import { controlDevice, searchActionHistory, searchDataSensor } from '../services/iotApi';
import { connectIotRealtime } from '../services/iotRealtime';
import { DeviceAction, DeviceKey } from '../types/iot';

type DeviceState = Record<DeviceKey, boolean>;
type PendingState = Record<DeviceKey, boolean>;

type TempHumidityPoint = {
  time: string;
  temperature?: number;
  humidity?: number;
};

type LightPoint = {
  time: string;
  light: number;
};

type MetricKey = 'temperature' | 'humidity' | 'light';
type GradientStop = { at: number; color: string };
type ControlStatus = 'SUCCESS' | 'FAILED';
type ControlNotice = {
  id: number;
  device: DeviceKey;
  action: DeviceAction;
  status: ControlStatus;
  reason: string;
  time: string;
};

const TEMP_THRESHOLDS = { low: 20, mid: 30, high: 40 } as const;
const HUMIDITY_THRESHOLDS = { low: 40, mid: 60, high: 80 } as const;
const LIGHT_THRESHOLDS = { low: 100, midLow: 400, midHigh: 1500, high: 3000 } as const;

const DEVICE_LABELS: Record<DeviceKey, string> = {
  fan: 'Fan',
  air_condition: 'Air Conditioner',
  light_bulb: 'Light Bulb',
};

const DEFAULT_DEVICE_STATE: DeviceState = {
  fan: false,
  air_condition: false,
  light_bulb: false,
};

function normalizeDeviceName(deviceName: string): DeviceKey | null {
  const normalized = deviceName.trim().toLowerCase().replace(/[-\s]+/g, '_');
  const aliases: Record<string, DeviceKey> = {
    fan: 'fan',
    vang: 'fan',
    air_condition: 'air_condition',
    aircondition: 'air_condition',
    xanh: 'air_condition',
    light_bulb: 'light_bulb',
    lightbulb: 'light_bulb',
    do: 'light_bulb',
  };

  return aliases[normalized] ?? null;
}

const SENSOR_NAME_MAP: Record<string, 'temperature' | 'humidity' | 'light' | null> = {
  temperature: 'temperature',
  humidity: 'humidity',
  light: 'light',
  nhiet_do: 'temperature',
  'nhiệt_độ': 'temperature',
  'nhiệt độ': 'temperature',
  do_am: 'humidity',
  'độ_ẩm': 'humidity',
  'độ ẩm': 'humidity',
  anh_sang: 'light',
  'ánh_sáng': 'light',
  'ánh sáng': 'light',
  lm35_livingroom: 'temperature',
  dht22_livingroom: 'humidity',
  g100_livingroom: 'light',
};

const DEVICE_ACK_TIMEOUT_MS = 5000;
const CONTROL_NOTICE_TIMEOUT_MS = 2000;
const TEMP_MOCK_BANDS: Array<[number, number]> = [[18, 21.5], [22, 29.5], [30, 35.5], [36, 42]];
const HUMIDITY_MOCK_BANDS: Array<[number, number]> = [[20, 39], [40, 59], [60, 79], [80, 95]];
const LIGHT_MOCK_BANDS: Array<[number, number]> = [[20, 95], [100, 380], [400, 1450], [1500, 2950], [3000, 12000]];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function toRatio(value: number, min: number, max: number): number {
  if (max <= min) {
    return 0;
  }
  return clamp((value - min) / (max - min), 0, 1);
}

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace('#', '');
  const full = normalized.length === 3
    ? normalized.split('').map((char) => `${char}${char}`).join('')
    : normalized;
  return [
    Number.parseInt(full.slice(0, 2), 16),
    Number.parseInt(full.slice(2, 4), 16),
    Number.parseInt(full.slice(4, 6), 16),
  ];
}

function interpolateColor(fromHex: string, toHex: string, ratio: number): string {
  const [fr, fg, fb] = hexToRgb(fromHex);
  const [tr, tg, tb] = hexToRgb(toHex);
  const r = Math.round(fr + (tr - fr) * ratio);
  const g = Math.round(fg + (tg - fg) * ratio);
  const b = Math.round(fb + (tb - fb) * ratio);
  return `rgb(${r}, ${g}, ${b})`;
}

function interpolateGradient(ratio: number, stops: GradientStop[]): string {
  if (stops.length === 0) {
    return 'rgb(255, 255, 255)';
  }

  const safeRatio = clamp(ratio, 0, 1);
  const sortedStops = [...stops].sort((a, b) => a.at - b.at);

  if (safeRatio <= sortedStops[0].at) {
    return sortedStops[0].color;
  }

  for (let index = 1; index < sortedStops.length; index += 1) {
    const left = sortedStops[index - 1];
    const right = sortedStops[index];

    if (safeRatio <= right.at) {
      const range = right.at - left.at;
      const localRatio = range <= 0 ? 0 : (safeRatio - left.at) / range;
      return interpolateColor(left.color, right.color, localRatio);
    }
  }

  return sortedStops[sortedStops.length - 1].color;
}

function stopAt(value: number, min: number, max: number): number {
  return toRatio(value, min, max);
}

function temperatureIconColor(value: number): string {
  const ratio = toRatio(value, TEMP_THRESHOLDS.low, TEMP_THRESHOLDS.high);
  return interpolateGradient(ratio, [
    { at: 0, color: '#64d8ff' },
    { at: stopAt(TEMP_THRESHOLDS.mid, TEMP_THRESHOLDS.low, TEMP_THRESHOLDS.high), color: '#ffb54a' },
    { at: 1, color: '#b11212' },
  ]);
}

function humidityIconColor(value: number): string {
  const ratio = toRatio(value, HUMIDITY_THRESHOLDS.low, HUMIDITY_THRESHOLDS.high);
  return interpolateGradient(ratio, [
    { at: 0, color: '#d58a2f' },
    { at: stopAt(HUMIDITY_THRESHOLDS.mid, HUMIDITY_THRESHOLDS.low, HUMIDITY_THRESHOLDS.high), color: '#38c9d6' },
    { at: 1, color: '#1949a8' },
  ]);
}

function lightIconColor(value: number): string {
  const ratio = toRatio(value, LIGHT_THRESHOLDS.low, LIGHT_THRESHOLDS.high);
  return interpolateGradient(ratio, [
    { at: 0, color: '#6b4f2b' },
    { at: stopAt(LIGHT_THRESHOLDS.midLow, LIGHT_THRESHOLDS.low, LIGHT_THRESHOLDS.high), color: '#c08b3e' },
    { at: stopAt(LIGHT_THRESHOLDS.midHigh, LIGHT_THRESHOLDS.low, LIGHT_THRESHOLDS.high), color: '#ffd259' },
    { at: 1, color: '#fff7d6' },
  ]);
}

function normalizeSensorName(sensorName: string): 'temperature' | 'humidity' | 'light' | null {
  const normalized = sensorName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');

  return SENSOR_NAME_MAP[normalized] ?? null;
}

function toTimeLabel(input: string): string {
  if (!input || input === '-') {
    return '--:--';
  }

  const trimmed = input.trim();

  const normalized = trimmed.replace('T', ' ');
  const directSeconds = normalized.match(/(\d{2}:\d{2}:\d{2})/);
  if (directSeconds) {
    return directSeconds[1];
  }

  const directMinutes = normalized.match(/(\d{2}:\d{2})/);
  if (directMinutes) {
    return `${directMinutes[1]}:00`;
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${pad(parsed.getHours())}:${pad(parsed.getMinutes())}:${pad(parsed.getSeconds())}`;
  }

  return normalized;
}

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function toNowLabel(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

function nowTimeLabel(): string {
  return new Date().toLocaleTimeString('vi-VN', { hour12: false });
}

function pickBandValue(bands: Array<[number, number]>, cycleIndex: number): number {
  const [min, max] = bands[cycleIndex % bands.length];
  return min + Math.random() * (max - min);
}

function generateMockNextAcrossThresholds(
  previous: { temperature: number; humidity: number; light: number },
  cycleIndex: number,
) {
  const tempTarget = pickBandValue(TEMP_MOCK_BANDS, cycleIndex);
  const humidityTarget = pickBandValue(HUMIDITY_MOCK_BANDS, cycleIndex + 1);
  const lightTarget = pickBandValue(LIGHT_MOCK_BANDS, cycleIndex + 2);

  const blendFactor = cycleIndex % 2 === 0 ? 0.78 : 0.62;

  const nextTemperature = previous.temperature + (tempTarget - previous.temperature) * blendFactor + (Math.random() - 0.5) * 1.1;
  const nextHumidity = previous.humidity + (humidityTarget - previous.humidity) * blendFactor + (Math.random() - 0.5) * 2.8;
  const nextLight = previous.light + (lightTarget - previous.light) * (blendFactor + 0.08) + (Math.random() - 0.5) * 360;

  return {
    temperature: roundToOneDecimal(clamp(nextTemperature, 18, 42)),
    humidity: roundToOneDecimal(clamp(nextHumidity, 20, 95)),
    light: Math.round(clamp(nextLight, 20, 12000)),
  };
}

export function DashboardPage() {
  const [tempHumidityData, setTempHumidityData] = useState<TempHumidityPoint[]>(dashboardSeries);
  const [lightData, setLightData] = useState<LightPoint[]>(lightSeries);
  const [latestValues, setLatestValues] = useState({ temperature: 35, humidity: 54, light: 400 });
  const [deviceState, setDeviceState] = useState<DeviceState>(DEFAULT_DEVICE_STATE);
  const [pending, setPending] = useState<PendingState>(DEFAULT_DEVICE_STATE);
  const [isWsConnected, setIsWsConnected] = useState(false);
  const [controlNotice, setControlNotice] = useState<ControlNotice | null>(null);
  const [liveMetric, setLiveMetric] = useState<Record<MetricKey, boolean>>({
    temperature: false,
    humidity: false,
    light: false,
  });
  const ackTimeoutRef = useRef<Partial<Record<DeviceKey, number>>>({});
  const pendingActionRef = useRef<Partial<Record<DeviceKey, DeviceAction>>>({});
  const pendingPreviousStateRef = useRef<Partial<Record<DeviceKey, boolean>>>({});
  const liveMetricTimeoutRef = useRef<Partial<Record<MetricKey, number>>>({});
  const mockTickRef = useRef<number | null>(null);
  const mockCycleRef = useRef(0);
  const controlNoticeTimeoutRef = useRef<number | null>(null);

  const pushControlNotice = useCallback((notice: Omit<ControlNotice, 'id' | 'time'>) => {
    if (controlNoticeTimeoutRef.current !== null) {
      window.clearTimeout(controlNoticeTimeoutRef.current);
    }

    setControlNotice({
      ...notice,
      id: Date.now(),
      time: nowTimeLabel(),
    });

    controlNoticeTimeoutRef.current = window.setTimeout(() => {
      setControlNotice(null);
      controlNoticeTimeoutRef.current = null;
    }, CONTROL_NOTICE_TIMEOUT_MS);
  }, []);

  const pulseMetric = useCallback((metric: MetricKey) => {
    const timeoutId = liveMetricTimeoutRef.current[metric];
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
    }

    setLiveMetric((previous) => ({
      ...previous,
      [metric]: true,
    }));

    liveMetricTimeoutRef.current[metric] = window.setTimeout(() => {
      setLiveMetric((previous) => ({
        ...previous,
        [metric]: false,
      }));
      delete liveMetricTimeoutRef.current[metric];
    }, 900);
  }, []);

  const clearDeviceControlTracking = useCallback(() => {
    (Object.keys(ackTimeoutRef.current) as DeviceKey[]).forEach((deviceName) => {
      const timeoutId = ackTimeoutRef.current[deviceName];
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    });

    ackTimeoutRef.current = {};
    pendingActionRef.current = {};
    pendingPreviousStateRef.current = {};
    setPending(DEFAULT_DEVICE_STATE);
  }, []);

  const refreshDeviceStateFromApi = useCallback(async () => {
    try {
      const result = await searchActionHistory({}, { page: 0, size: 50, sortBy: 'dateTime', direction: 'desc' });
      const nextState: DeviceState = { ...DEFAULT_DEVICE_STATE };
      const resolvedDevices = new Set<DeviceKey>();

      for (const row of result.rows) {
        const deviceName = normalizeDeviceName(row.deviceName);
        if (!deviceName || resolvedDevices.has(deviceName)) {
          continue;
        }

        if (row.status === 'SUCCESS') {
          nextState[deviceName] = row.action === 'ON';
          resolvedDevices.add(deviceName);
        }
      }

      clearDeviceControlTracking();
      setDeviceState(nextState);
    } catch {
      clearDeviceControlTracking();
    }
  }, [clearDeviceControlTracking]);

  const refreshFromApi = useCallback(async () => {
    try {
      const result = await searchDataSensor({}, { page: 0, size: 30, sortBy: 'dateTime', direction: 'desc' });
      const sourceRows = [...result.rows].reverse();

      const tempHumidityMap = new Map<string, TempHumidityPoint>();
      const nextLightData: LightPoint[] = [];
      const latest = { temperature: 35, humidity: 54, light: 400 };

      sourceRows.forEach((row) => {
        const normalized = normalizeSensorName(row.sensorName);
        if (!normalized || row.numericValue === undefined) {
          return;
        }

        const timeLabel = toTimeLabel(row.time);

        if (normalized === 'light') {
          nextLightData.push({ time: timeLabel, light: row.numericValue });
        }

        if (normalized === 'temperature' || normalized === 'humidity') {
          const existing = tempHumidityMap.get(timeLabel) ?? { time: timeLabel };
          tempHumidityMap.set(timeLabel, {
            ...existing,
            [normalized]: row.numericValue,
          });
        }

        latest[normalized] = row.numericValue;
      });

      if (tempHumidityMap.size > 0) {
        setTempHumidityData(Array.from(tempHumidityMap.values()).slice(-12));
      }
      if (nextLightData.length > 0) {
        setLightData(nextLightData.slice(-12));
      }
      setLatestValues(latest);
    } catch {
    }
  }, []);

  useEffect(() => {
    let disconnect: () => void = () => {};

    const clearDeviceTimeout = (deviceName: DeviceKey) => {
      const timeoutId = ackTimeoutRef.current[deviceName];
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
      delete ackTimeoutRef.current[deviceName];
      delete pendingActionRef.current[deviceName];
      delete pendingPreviousStateRef.current[deviceName];
    };

    try {
      if (IOT_CONFIG.useMockSensorData) {
        setIsWsConnected(true);
        return () => {
          (Object.keys(liveMetricTimeoutRef.current) as MetricKey[]).forEach((metric) => {
            const timeoutId = liveMetricTimeoutRef.current[metric];
            if (timeoutId !== undefined) {
              window.clearTimeout(timeoutId);
            }
          });
          liveMetricTimeoutRef.current = {};
        };
      }

      disconnect = connectIotRealtime({
        onConnectionChange: setIsWsConnected,
        onReconnect: () => {
          void refreshDeviceStateFromApi();
        },
        onSensor: ({ sensorName, value, time }) => {
          const normalized = normalizeSensorName(sensorName);
          const timeLabel = toTimeLabel(time);

          if (!normalized) {
            return;
          }

          pulseMetric(normalized);

          if (normalized === 'temperature' || normalized === 'humidity') {
            setTempHumidityData((previous) => {
              const next = [...previous];
              const sameTimeIndex = next.findIndex((item) => item.time === timeLabel);
              if (sameTimeIndex >= 0) {
                next[sameTimeIndex] = {
                  ...next[sameTimeIndex],
                  [normalized]: value,
                };
              } else {
                next.push({ time: timeLabel, [normalized]: value });
              }

              return next.slice(-12);
            });
          }

          if (normalized === 'light') {
            setLightData((previous) => [...previous, { time: timeLabel, light: value }].slice(-12));
          }

          setLatestValues((previous) => ({
            ...previous,
            [normalized]: roundToOneDecimal(value),
          }));
        },
        onDeviceStatus: ({ deviceName, action, status }) => {
          const previousState = pendingPreviousStateRef.current[deviceName];
          clearDeviceTimeout(deviceName);
          const isFailedStatus = typeof status === 'string' && status.toLowerCase().includes('fail');

          setDeviceState((previous) => ({
            ...previous,
            [deviceName]: isFailedStatus ? (previousState ?? previous[deviceName]) : action === 'on',
          }));
          setPending((previous) => ({
            ...previous,
            [deviceName]: false,
          }));

          pushControlNotice({
            device: deviceName,
            action,
            status: isFailedStatus ? 'FAILED' : 'SUCCESS',
            reason: typeof status === 'string' && status.trim() ? status.toUpperCase() : 'ACK',
          });
        },
      });
    } catch {
      setIsWsConnected(false);
    }

    return () => {
      disconnect();
      (Object.keys(ackTimeoutRef.current) as DeviceKey[]).forEach((deviceName) => {
        const timeoutId = ackTimeoutRef.current[deviceName];
        if (timeoutId !== undefined) {
          window.clearTimeout(timeoutId);
        }
      });
      ackTimeoutRef.current = {};
      pendingActionRef.current = {};
      pendingPreviousStateRef.current = {};
      (Object.keys(liveMetricTimeoutRef.current) as MetricKey[]).forEach((metric) => {
        const timeoutId = liveMetricTimeoutRef.current[metric];
        if (timeoutId !== undefined) {
          window.clearTimeout(timeoutId);
        }
      });
      liveMetricTimeoutRef.current = {};
      if (controlNoticeTimeoutRef.current !== null) {
        window.clearTimeout(controlNoticeTimeoutRef.current);
        controlNoticeTimeoutRef.current = null;
      }
    };
  }, [pushControlNotice]);

  const temperatureColor = temperatureIconColor(latestValues.temperature);
  const humidityColor = humidityIconColor(latestValues.humidity);
  const lightColor = lightIconColor(latestValues.light);

  useEffect(() => {
    if (IOT_CONFIG.useMockSensorData) {
      return;
    }

    void refreshFromApi();
  }, [refreshFromApi]);

  useEffect(() => {
    if (IOT_CONFIG.useMockSensorData) {
      return;
    }

    if (isWsConnected) {
      return;
    }

    const timer = window.setInterval(() => {
      void refreshFromApi();
      void refreshDeviceStateFromApi();
    }, 2000);

    return () => {
      window.clearInterval(timer);
    };
  }, [isWsConnected, refreshDeviceStateFromApi, refreshFromApi]);

  useEffect(() => {
    if (!IOT_CONFIG.useMockSensorData) {
      if (mockTickRef.current !== null) {
        window.clearInterval(mockTickRef.current);
        mockTickRef.current = null;
      }
      return;
    }

    const tick = () => {
      setLatestValues((previous) => {
        mockCycleRef.current += 1;
        const next = generateMockNextAcrossThresholds(previous, mockCycleRef.current);
        const timeLabel = toNowLabel();

        setTempHumidityData((tempPrevious) => [
          ...tempPrevious,
          { time: timeLabel, temperature: next.temperature, humidity: next.humidity },
        ].slice(-12));

        setLightData((lightPrevious) => [
          ...lightPrevious,
          { time: timeLabel, light: next.light },
        ].slice(-12));

        pulseMetric('temperature');
        pulseMetric('humidity');
        pulseMetric('light');

        return next;
      });
    };

    tick();
    mockTickRef.current = window.setInterval(tick, 1700);

    return () => {
      if (mockTickRef.current !== null) {
        window.clearInterval(mockTickRef.current);
        mockTickRef.current = null;
      }
    };
  }, [pulseMetric]);

  const deviceCards = useMemo(
    () => [
      { key: 'fan' as DeviceKey, icon: Fan, accent: '#ff6079' },
      { key: 'air_condition' as DeviceKey, icon: Snowflake, accent: '#58abc6' },
      { key: 'light_bulb' as DeviceKey, icon: Lightbulb, accent: '#e7b340' },
    ],
    [],
  );

  const handleToggleDevice = async (device: DeviceKey) => {
    const previousState = deviceState[device];
    const nextAction: DeviceAction = previousState ? 'off' : 'on';

    const previousTimeout = ackTimeoutRef.current[device];
    if (previousTimeout !== undefined) {
      window.clearTimeout(previousTimeout);
    }

    setPending((previous) => ({
      ...previous,
      [device]: true,
    }));
    pendingPreviousStateRef.current[device] = previousState;
    pendingActionRef.current[device] = nextAction;

    ackTimeoutRef.current[device] = window.setTimeout(() => {
      const fallbackState = pendingPreviousStateRef.current[device] ?? previousState;
      const intendedAction = pendingActionRef.current[device] ?? nextAction;

      setPending((previous) => ({
        ...previous,
        [device]: false,
      }));

      setDeviceState((previous) => ({
        ...previous,
        [device]: fallbackState,
      }));

      delete ackTimeoutRef.current[device];
      delete pendingActionRef.current[device];
      delete pendingPreviousStateRef.current[device];

      pushControlNotice({
        device,
        action: intendedAction,
        status: 'FAILED',
        reason: 'TIMEOUT',
      });
    }, DEVICE_ACK_TIMEOUT_MS);

    try {
      await controlDevice(device, nextAction);
    } catch {
      // Keep pending until the same timeout window expires, then rollback to the previous state.
    }
  };

  return (
    <section className="page page--dashboard">
      <PageHeader
        title="Dashboard"
        subtitle={IOT_CONFIG.useMockSensorData
          ? 'Mock Mode: Simulating realtime sensor stream'
          : `WebSocket: ${isWsConnected ? 'Connected' : 'Disconnected'}`}
      />

      {controlNotice ? (
        <div
          className={
            controlNotice.status === 'SUCCESS'
              ? 'control-toast control-toast--success'
              : 'control-toast control-toast--failed'
          }
        >
          <strong>{controlNotice.status}</strong>
          <span>
            {DEVICE_LABELS[controlNotice.device]} {controlNotice.action.toUpperCase()} ({controlNotice.reason})
          </span>
          <em>{controlNotice.time}</em>
        </div>
      ) : null}

      <div className="stats-grid">
        <StatCard
          title="Temperature"
          value={`${latestValues.temperature}°C`}
          accent="temperature"
          icon={Thermometer}
          isLive={liveMetric.temperature}
          iconColor={temperatureColor}
        />
        <StatCard
          title="Humidity"
          value={`${latestValues.humidity}%`}
          accent="humidity"
          icon={Waves}
          isLive={liveMetric.humidity}
          iconColor={humidityColor}
        />
        <StatCard
          title="Light"
          value={`${latestValues.light} Lux`}
          accent="light"
          icon={SunMedium}
          isLive={liveMetric.light}
          iconColor={lightColor}
        />
      </div>

      <div className="charts-grid">
        <ChartCard
          title="Temperature & Humidity"
          data={tempHumidityData}
          series={[
            { key: 'temperature', name: 'Temperature', color: '#ff6f6b' },
            { key: 'humidity', name: 'Humidity', color: '#5b86ff' },
          ]}
        />
        <ChartCard
          title="Light"
          data={lightData}
          series={[{ key: 'light', name: 'Light', color: '#f4b63d' }]}
        />
      </div>

      <section className="device-section">
        <h2>Device Control</h2>
        <div className="device-grid">
          {deviceCards.map((item) => (
            <DeviceControlCard
              key={item.key}
              deviceKey={item.key}
              name={DEVICE_LABELS[item.key]}
              icon={item.icon}
              active={deviceState[item.key]}
              pending={pending[item.key]}
              onToggle={() => {
                void handleToggleDevice(item.key);
              }}
              accent={item.accent}
            />
          ))}
        </div>
      </section>
    </section>
  );
}