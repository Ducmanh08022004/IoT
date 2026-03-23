import { IOT_CONFIG } from '../config/iot';

const LIGHT_NAME_HINTS = ['light', 'anh sang', 'ánh sáng', 'g100'];

export function isLightSensorName(sensorName: string): boolean {
  const normalized = sensorName.trim().toLowerCase();
  return LIGHT_NAME_HINTS.some((hint) => normalized.includes(hint));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function toAdc(value: number): number {
  const { adcMax, vRef } = IOT_CONFIG.lightSensor;

  // If value is in voltage range, convert to ADC. Otherwise treat it as ADC directly.
  if (value >= 0 && value <= vRef + 0.000001) {
    const adc = Math.round((value / vRef) * adcMax);
    return clamp(adc, 1, adcMax);
  }

  return clamp(Math.round(value), 1, adcMax);
}

export function toLuxFromLightRaw(rawValue: number): number {
  const { adcMax, k, r, gamma, maxLux } = IOT_CONFIG.lightSensor;

  if (!Number.isFinite(rawValue) || rawValue <= 0) {
    return 0;
  }

  // If value is already too large to be ADC/voltage, keep it as lux.
  if (rawValue > adcMax) {
    return Math.round(rawValue);
  }

  const adc = toAdc(rawValue);
  const inside = r * (adcMax / adc - 1);
  if (!Number.isFinite(inside) || inside <= 0) {
    return Math.round(maxLux);
  }

  const lux = k * Math.pow(inside, -gamma);
  const boundedLux = clamp(lux, 0, maxLux);

  return Math.round(boundedLux);
}
