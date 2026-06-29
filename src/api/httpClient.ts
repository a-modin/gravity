import { apiConfig } from '../config/api.config';
import { getAccessToken } from './session';

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

interface RequestOptionsInterface extends Omit<RequestInit, 'body'> {
  auth?: boolean;
  body?: unknown;
}

export async function apiRequest<T>(path: string, options: RequestOptionsInterface = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');

  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  if (options.auth) {
    const token = getAccessToken();
    if (!token) {
      throw new ApiError('Missing access token', 401);
    }
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${apiConfig.baseUrl}${path}`, {
    ...options,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (!response.ok) {
    let message = response.statusText || 'Request failed';

    try {
      const payload = await response.json() as { message?: string | string[] };
      if (Array.isArray(payload.message)) {
        message = payload.message.join(', ');
      } else if (payload.message) {
        message = payload.message;
      }
    } catch {
      // ignore parse errors
    }

    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
