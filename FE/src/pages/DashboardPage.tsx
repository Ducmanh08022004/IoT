import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Fan, Lightbulb, Snowflake, Thermometer, Waves, SunMedium } from 'lucide-react';
import { ChartCard } from '../components/ChartCard';
import { DeviceControlCard } from '../components/DeviceControlCard';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/StatCard';
import { dashboardSeries, lightSeries } from '../data/mockData';
import { controlDevice, searchDataSensor } from '../services/iotApi';
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

const DEVICE_LABELS: Record<DeviceKey, string> = {
  fan: 'Fan',
  air_condition: 'Air Conditioner',
  light_bulb: 'Light Bulb',
};

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

export function DashboardPage() {
  const [tempHumidityData, setTempHumidityData] = useState<TempHumidityPoint[]>(dashboardSeries);
  const [lightData, setLightData] = useState<LightPoint[]>(lightSeries);
  const [latestValues, setLatestValues] = useState({ temperature: 35, humidity: 54, light: 400 });
  const [deviceState, setDeviceState] = useState<DeviceState>({
    fan: false,
    air_condition: false,
    light_bulb: false,
  });
  const [pending, setPending] = useState<PendingState>({
    fan: false,
    air_condition: false,
    light_bulb: false,
  });
  const [isWsConnected, setIsWsConnected] = useState(false);
  const ackTimeoutRef = useRef<Partial<Record<DeviceKey, number>>>({});
  const pendingActionRef = useRef<Partial<Record<DeviceKey, DeviceAction>>>({});
  const pendingPreviousStateRef = useRef<Partial<Record<DeviceKey, boolean>>>({});

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
      disconnect = connectIotRealtime({
        onConnectionChange: setIsWsConnected,
        onSensor: ({ sensorName, value, time }) => {
          const normalized = normalizeSensorName(sensorName);
          const timeLabel = toTimeLabel(time);

          if (!normalized) {
            return;
          }

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
            [normalized]: Math.round(value * 10) / 10,
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
    };
  }, []);

  useEffect(() => {
    void refreshFromApi();
  }, [refreshFromApi]);

  useEffect(() => {
    if (isWsConnected) {
      return;
    }

    const timer = window.setInterval(() => {
      void refreshFromApi();
    }, 2000);

    return () => {
      window.clearInterval(timer);
    };
  }, [isWsConnected, refreshFromApi]);

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

    const scheduleRollback = () => {
      ackTimeoutRef.current[device] = window.setTimeout(() => {
        const fallbackState = pendingPreviousStateRef.current[device] ?? previousState;

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
      }, DEVICE_ACK_TIMEOUT_MS);
    };

    try {
      await controlDevice(device, nextAction);

      pendingActionRef.current[device] = nextAction;
      scheduleRollback();
    } catch {
      // Keep pending for the same timeout window, then rollback to the previous state.
      scheduleRollback();
    }
  };

  return (
    <section className="page page--dashboard">
      <PageHeader
        title="Dashboard"
        subtitle={`WebSocket: ${isWsConnected ? 'Connected' : 'Disconnected'}`}
      />

      <div className="stats-grid">
        <StatCard title="Temperature" value={`${latestValues.temperature}°C`} accent="temperature" icon={Thermometer} />
        <StatCard title="Humidity" value={`${latestValues.humidity}%`} accent="humidity" icon={Waves} />
        <StatCard title="Light" value={`${latestValues.light} Lux`} accent="light" icon={SunMedium} />
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