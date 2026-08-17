/**
 * Тонкая обёртка над fetch для работы с API портала.
 *
 * Токен сессии живёт в httpOnly-cookie, поэтому JavaScript его не видит и не
 * хранит — достаточно `credentials: 'include'`, браузер приложит cookie сам.
 */

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let onUnauthorized: (() => void) | undefined;

/** Регистрирует реакцию на истёкшую сессию (обычно — показать экран входа). */
export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Не пытаться обновить сессию при 401 (используется самим refresh-запросом). */
  skipRefresh?: boolean;
}

async function parseResponse(response: Response): Promise<any> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

let refreshInFlight: Promise<boolean> | undefined;

/** Одновременные 401 не должны порождать несколько запросов обновления сессии. */
async function refreshSession(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include'
    })
      .then((response) => response.ok)
      .catch(() => false)
      .finally(() => {
        refreshInFlight = undefined;
      });
  }
  return refreshInFlight;
}

export async function apiRequest<T = any>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, skipRefresh = false } = options;

  const send = () =>
    fetch(path, {
      method,
      credentials: 'include',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body)
    });

  let response = await send();

  if (response.status === 401 && !skipRefresh) {
    const refreshed = await refreshSession();
    if (refreshed) {
      response = await send();
    } else {
      onUnauthorized?.();
      throw new ApiError('Сессия истекла, войдите повторно', 401);
    }
  }

  const payload = await parseResponse(response);

  if (!response.ok) {
    if (response.status === 401) onUnauthorized?.();
    throw new ApiError(
      payload?.message || `Запрос завершился с кодом ${response.status}`,
      response.status
    );
  }

  return payload as T;
}

export const api = {
  get: <T = any>(path: string) => apiRequest<T>(path),
  post: <T = any>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'POST', body }),
  put: <T = any>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'PUT', body }),
  patch: <T = any>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'PATCH', body }),
  delete: <T = any>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'DELETE', body })
};
