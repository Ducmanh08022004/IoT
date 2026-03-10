import { IOT_CONFIG } from '../config/iot';

type QueryValue = string | number | boolean | undefined | null;

function toQueryString(query?: Record<string, QueryValue>): string {
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

export async function postJson<TResponse>(
  path: string,
  body: unknown,
  query?: Record<string, QueryValue>,
): Promise<TResponse> {
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
    return undefined as TResponse;
  }

  const raw = await response.text();
  if (!raw.trim()) {
    return undefined as TResponse;
  }

  try {
    return JSON.parse(raw) as TResponse;
  } catch {
    return raw as TResponse;
  }
}
