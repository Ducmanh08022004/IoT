const envNumber = (raw: string | undefined, fallback: number): number => {
  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const IOT_CONFIG = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080',
  wsUrl: import.meta.env.VITE_WS_URL ?? 'ws://localhost:8080/ws',
  useSockJs: String(import.meta.env.VITE_WS_USE_SOCKJS ?? 'true').toLowerCase() === 'true',
  // ESP32 callback handles these names directly on topic device/control.
  deviceLedMap: {
    fan: import.meta.env.VITE_DEVICE_LED_FAN ?? 'fan',
    air_condition: import.meta.env.VITE_DEVICE_LED_AIR_CONDITION ?? 'air_condition',
    light_bulb: import.meta.env.VITE_DEVICE_LED_LIGHT_BULB ?? 'light_bulb',
  },
  deviceControlFailedPath:
    import.meta.env.VITE_DEVICE_CONTROL_FAILED_PATH ?? '/api/device/control/failed',
  lightSensor: {
    // lux = K * [R * (ADCmax / ADC - 1)]^(-gamma)
    adcMax: 4095,
    vRef: envNumber(import.meta.env.VITE_LIGHT_VREF, 3.3),
    k: envNumber(import.meta.env.VITE_LIGHT_K, 12518931),
    r: envNumber(import.meta.env.VITE_LIGHT_R, 10000),
    gamma: envNumber(import.meta.env.VITE_LIGHT_GAMMA, 1.405),
    maxLux: envNumber(import.meta.env.VITE_LIGHT_MAX_LUX, 100000),
  },
} as const;
