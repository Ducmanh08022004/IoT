import { IOT_CONFIG } from '../config/iot';

function toQueryString(query) {
  if (!query) {
    return '';
  }

  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, String(value));
    }
  });

  const serialized = params.toString();
  return serialized ? `?${serialized}` : '';
}

export async function postJson(path, body, query) {
  const response = await fetch(`${IOT_CONFIG.apiBaseUrl}${path}${toQueryString(query)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return undefined;
  }

  const raw = await response.text();
  if (!raw.trim()) {
    return undefined;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

export async function getJson(path, query) {
  const response = await fetch(`${IOT_CONFIG.apiBaseUrl}${path}${toQueryString(query)}`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return undefined;
  }

  const raw = await response.text();
  if (!raw.trim()) {
    return undefined;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}