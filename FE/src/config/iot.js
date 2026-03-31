export const IOT_CONFIG = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080',
  wsUrl: import.meta.env.VITE_WS_URL ?? 'ws://localhost:8080/ws',
  useSockJs: String(import.meta.env.VITE_WS_USE_SOCKJS ?? 'true').toLowerCase() === 'true',
  useMockSensorData: String(import.meta.env.VITE_USE_MOCK_SENSOR_DATA ?? 'false').toLowerCase() === 'true',
  deviceLedMap: {
    fan: import.meta.env.VITE_DEVICE_LED_FAN ?? 'fan',
    air_condition: import.meta.env.VITE_DEVICE_LED_AIR_CONDITION ?? 'air_condition',
    light_bulb: import.meta.env.VITE_DEVICE_LED_LIGHT_BULB ?? 'light_bulb',
  },
  deviceControlFailedPath:
    import.meta.env.VITE_DEVICE_CONTROL_FAILED_PATH ?? '/api/device/control/failed',
};