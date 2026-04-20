import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Fan, Lightbulb, Snowflake, Thermometer, Waves, SunMedium, Wind } from 'lucide-react';
import { ChartCard } from '../components/ChartCard';
import { DeviceControlCard } from '../components/DeviceControlCard';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/StatCard';
import { IOT_CONFIG } from '../config/iot';
import { dashboardSeries, lightSeries } from '../data/mockData';
import { controlDevice, searchActionHistory, searchDataSensor } from '../services/iotApi';
import { connectIotRealtime } from '../services/iotRealtime';

const TEMP_THRESHOLDS = { low: 20, mid: 30, high: 40 };
const HUMIDITY_THRESHOLDS = { low: 40, mid: 60, high: 80 };
const LIGHT_THRESHOLDS = { low: 100, midLow: 400, midHigh: 1500, high: 3000 };
const WIND_THRESHOLDS = { low: 20, mid: 60, high: 100 };

const DEVICE_LABELS = {
  fan: 'Fan',
  air_condition: 'Air Conditioner',
  light_bulb: 'Light Bulb',
};

const DEFAULT_DEVICE_STATE = {
  fan: false,
  air_condition: false,
  light_bulb: false,
};

function normalizeDeviceName(deviceName) {
  const normalized = deviceName.trim().toLowerCase().replace(/[-\s]+/g, '_');
  const aliases = {
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

const SENSOR_NAME_MAP = {
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
  wind_speed: 'windspeed',
  windspeed: 'windspeed',
  gio: 'windspeed',
  gió: 'windspeed',
};

const DEVICE_ACK_TIMEOUT_MS = 5000;
const CONTROL_NOTICE_TIMEOUT_MS = 2000;
const TEMP_MOCK_BANDS = [[18, 21.5], [22, 29.5], [30, 35.5], [36, 42]];
const HUMIDITY_MOCK_BANDS = [[20, 39], [40, 59], [60, 79], [80, 95]];
const LIGHT_MOCK_BANDS = [[20, 95], [100, 380], [400, 1450], [1500, 2950], [3000, 12000]];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function toRatio(value, min, max) {
  if (max <= min) {
    return 0;
  }
  return clamp((value - min) / (max - min), 0, 1);
}

function hexToRgb(hex) {
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

function interpolateColor(fromHex, toHex, ratio) {
  const [fr, fg, fb] = hexToRgb(fromHex);
  const [tr, tg, tb] = hexToRgb(toHex);
  const r = Math.round(fr + (tr - fr) * ratio);
  const g = Math.round(fg + (tg - fg) * ratio);
  const b = Math.round(fb + (tb - fb) * ratio);
  return `rgb(${r}, ${g}, ${b})`;
}

function interpolateGradient(ratio, stops) {
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

function stopAt(value, min, max) {
  return toRatio(value, min, max);
}

function temperatureIconColor(value) {
  const ratio = toRatio(value, TEMP_THRESHOLDS.low, TEMP_THRESHOLDS.high);
  return interpolateGradient(ratio, [
    { at: 0, color: '#64d8ff' },
    { at: stopAt(TEMP_THRESHOLDS.mid, TEMP_THRESHOLDS.low, TEMP_THRESHOLDS.high), color: '#ffb54a' },
    { at: 1, color: '#b11212' },
  ]);
}

function humidityIconColor(value) {
  const ratio = toRatio(value, HUMIDITY_THRESHOLDS.low, HUMIDITY_THRESHOLDS.high);
  return interpolateGradient(ratio, [
    { at: 0, color: '#d58a2f' },
    { at: stopAt(HUMIDITY_THRESHOLDS.mid, HUMIDITY_THRESHOLDS.low, HUMIDITY_THRESHOLDS.high), color: '#38c9d6' },
    { at: 1, color: '#1949a8' },
  ]);
}

function lightIconColor(value) {
  const ratio = toRatio(value, LIGHT_THRESHOLDS.low, LIGHT_THRESHOLDS.high);
  return interpolateGradient(ratio, [
    { at: 0, color: '#6b4f2b' },
    { at: stopAt(LIGHT_THRESHOLDS.midLow, LIGHT_THRESHOLDS.low, LIGHT_THRESHOLDS.high), color: '#c08b3e' },
    { at: stopAt(LIGHT_THRESHOLDS.midHigh, LIGHT_THRESHOLDS.low, LIGHT_THRESHOLDS.high), color: '#ffd259' },
    { at: 1, color: '#fff7d6' },
  ]);
}

function windspeedIconColor(value) {
  const ratio = toRatio(value, WIND_THRESHOLDS.low, WIND_THRESHOLDS.high);
  return interpolateGradient(ratio, [
    { at: 0, color: '#64c4ff' },
    { at: stopAt(WIND_THRESHOLDS.mid, WIND_THRESHOLDS.low, WIND_THRESHOLDS.high), color: '#f59a3d' },
    { at: 1, color: '#d83535' },
  ]);
}

function normalizeSensorName(sensorName) {
  const normalized = sensorName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');

  return SENSOR_NAME_MAP[normalized] ?? null;
}

function toTimeLabel(input) {
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
    const pad = (value) => String(value).padStart(2, '0');
    return `${pad(parsed.getHours())}:${pad(parsed.getMinutes())}:${pad(parsed.getSeconds())}`;
  }

  return normalized;
}

function roundToOneDecimal(value) {
  return Math.round(value * 10) / 10;
}

function toNowLabel() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

function nowTimeLabel() {
  return new Date().toLocaleTimeString('vi-VN', { hour12: false });
}

function pickBandValue(bands, cycleIndex) {
  const [min, max] = bands[cycleIndex % bands.length];
  return min + Math.random() * (max - min);
}

function generateMockNextAcrossThresholds(previous, cycleIndex) {
  const tempTarget = pickBandValue(TEMP_MOCK_BANDS, cycleIndex);
  const humidityTarget = pickBandValue(HUMIDITY_MOCK_BANDS, cycleIndex + 1);
  const lightTarget = pickBandValue(LIGHT_MOCK_BANDS, cycleIndex + 2);
  const windBands = [[12, 28], [30, 46], [48, 68], [70, 92]];
  const windTarget = pickBandValue(windBands, cycleIndex + 3);

  const blendFactor = cycleIndex % 2 === 0 ? 0.78 : 0.62;

  const nextTemperature = previous.temperature + (tempTarget - previous.temperature) * blendFactor + (Math.random() - 0.5) * 1.1;
  const nextHumidity = previous.humidity + (humidityTarget - previous.humidity) * blendFactor + (Math.random() - 0.5) * 2.8;
  const nextLight = previous.light + (lightTarget - previous.light) * (blendFactor + 0.08) + (Math.random() - 0.5) * 360;
  const nextWindSpeed = previous.windspeed + (windTarget - previous.windspeed) * (blendFactor + 0.04) + (Math.random() - 0.5) * 4.5;

  return {
    temperature: roundToOneDecimal(clamp(nextTemperature, 18, 42)),
    humidity: roundToOneDecimal(clamp(nextHumidity, 20, 95)),
    light: Math.round(clamp(nextLight, 20, 12000)),
    windspeed: roundToOneDecimal(clamp(nextWindSpeed, 8, 100)),
  };
}

export function DashboardPage() {
  const [environmentData, setEnvironmentData] = useState(dashboardSeries);
  const [lightData, setLightData] = useState(lightSeries);
  const [latestValues, setLatestValues] = useState({ temperature: 35, humidity: 54, light: 400, windspeed: 38 });
  const [deviceState, setDeviceState] = useState(DEFAULT_DEVICE_STATE);
  const [pending, setPending] = useState(DEFAULT_DEVICE_STATE);
  const [isWsConnected, setIsWsConnected] = useState(false);
  const [controlNotice, setControlNotice] = useState(null);
  const [liveMetric, setLiveMetric] = useState({
    temperature: false,
    humidity: false,
    light: false,
    windspeed: false,
  });
  const ackTimeoutRef = useRef({});
  const pendingActionRef = useRef({});
  const pendingPreviousStateRef = useRef({});
  const liveMetricTimeoutRef = useRef({});
  const mockTickRef = useRef(null);
  const mockCycleRef = useRef(0);
  const controlNoticeTimeoutRef = useRef(null);

  const pushControlNotice = useCallback((notice) => {
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

  const pulseMetric = useCallback((metric) => {
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
    Object.keys(ackTimeoutRef.current).forEach((deviceName) => {
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
      const nextState = { ...DEFAULT_DEVICE_STATE };
      const resolvedDevices = new Set();

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

      const environmentMap = new Map();
      const nextLightData = [];
      const latest = { temperature: 35, humidity: 54, light: 400, windspeed: 38 };

      sourceRows.forEach((row) => {
        const normalized = normalizeSensorName(row.sensorName);
        if (!normalized || row.numericValue === undefined) {
          return;
        }

        const timeLabel = toTimeLabel(row.time);

        if (normalized === 'light') {
          nextLightData.push({ time: timeLabel, light: row.numericValue });
        }

        if (normalized === 'temperature' || normalized === 'humidity' || normalized === 'windspeed') {
          const existing = environmentMap.get(timeLabel) ?? { time: timeLabel };
          environmentMap.set(timeLabel, {
            ...existing,
            [normalized]: row.numericValue,
          });
        }

        latest[normalized] = row.numericValue;
      });

      if (environmentMap.size > 0) {
        setEnvironmentData(Array.from(environmentMap.values()).slice(-12));
      }
      if (nextLightData.length > 0) {
        setLightData(nextLightData.slice(-12));
      }
      setLatestValues(latest);
    } catch {
    }
  }, []);

  useEffect(() => {
    let disconnect = () => {};

    const clearDeviceTimeout = (deviceName) => {
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
          Object.keys(liveMetricTimeoutRef.current).forEach((metric) => {
            const timeoutId = liveMetricTimeoutRef.current[metric];
            if (timeoutId !== undefined) {
              window.clearTimeout(timeoutId);
            }
          });
          liveMetricTimeoutRef.current = {};
        };
      }

      disconnect = connectIotRealtime({
        onConnectionChange: (connected) => {
          setIsWsConnected(connected);
          if (connected) {
            void refreshDeviceStateFromApi();
          }
        },
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

          if (normalized === 'temperature' || normalized === 'humidity' || normalized === 'windspeed') {
            setEnvironmentData((previous) => {
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
      Object.keys(ackTimeoutRef.current).forEach((deviceName) => {
        const timeoutId = ackTimeoutRef.current[deviceName];
        if (timeoutId !== undefined) {
          window.clearTimeout(timeoutId);
        }
      });
      ackTimeoutRef.current = {};
      pendingActionRef.current = {};
      pendingPreviousStateRef.current = {};
      Object.keys(liveMetricTimeoutRef.current).forEach((metric) => {
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
  }, [pushControlNotice, pulseMetric, refreshDeviceStateFromApi]);

  const temperatureColor = temperatureIconColor(latestValues.temperature);
  const humidityColor = humidityIconColor(latestValues.humidity);
  const lightColor = lightIconColor(latestValues.light);

  useEffect(() => {
    if (IOT_CONFIG.useMockSensorData) {
      return;
    }

    void refreshFromApi();
    void refreshDeviceStateFromApi();
  }, [refreshDeviceStateFromApi, refreshFromApi]);

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

        setEnvironmentData((environmentPrevious) => [
          ...environmentPrevious,
          {
            time: timeLabel,
            temperature: next.temperature,
            humidity: next.humidity,
            windspeed: next.windspeed,
          },
        ].slice(-12));

        setLightData((lightPrevious) => [
          ...lightPrevious,
          { time: timeLabel, light: next.light },
        ].slice(-12));

        pulseMetric('temperature');
        pulseMetric('humidity');
        pulseMetric('light');
        pulseMetric('windspeed');

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
      { key: 'fan', icon: Fan, accent: '#ff6079' },
      { key: 'air_condition', icon: Snowflake, accent: '#58abc6' },
      { key: 'light_bulb', icon: Lightbulb, accent: '#e7b340' },
    ],
    [],
  );

  const isWindWarning = latestValues.windspeed > 60;
  const windspeedSeries = useMemo(
    () => [
      { key: 'temperature', name: 'Temperature', color: '#ff6f6b' },
      { key: 'humidity', name: 'Humidity', color: '#5b86ff' },
      { key: 'windspeed', name: 'Wind Speed', color: '#e4522d' },
    ],
    [],
  );

  const handleToggleDevice = async (device) => {
    const previousState = deviceState[device];
    const nextAction = previousState ? 'off' : 'on';

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

      {isWindWarning ? (
        <div className="control-toast control-toast--warning" role="alert">
          <strong>WARNING</strong>
          <span>
            Wind speed is {latestValues.windspeed} m/s. LED 4 is blinking and the backend stores status WARNING.
          </span>
          <em>Live</em>
        </div>
      ) : null}

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
        <StatCard
          title="Wind Speed"
          value={`${latestValues.windspeed} m/s`}
          accent="wind"
          icon={Wind}
          isLive={liveMetric.windspeed}
          iconColor={windspeedIconColor(latestValues.windspeed)}
        />
      </div>

      <div className="charts-grid">
        <ChartCard
          title="Temperature, Humidity & Wind Speed"
          data={environmentData}
          series={windspeedSeries}
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