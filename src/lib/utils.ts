import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatJson(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

export function getToken(key = 'foldy_token'): string | null {
  return localStorage.getItem(key);
}

export function setToken(token: string, key = 'foldy_token'): void {
  localStorage.setItem(key, token);
}

export function removeToken(key = 'foldy_token'): void {
  localStorage.removeItem(key);
}

export function getAdminToken(): string | null {
  return localStorage.getItem('foldy_admin_token');
}

export function setAdminToken(token: string): void {
  localStorage.setItem('foldy_admin_token', token);
}

/* ── API host override ─────────────────────────────────────────────
 * Empty/unset = default: relative '/api' (Vite dev proxy → localhost:5000).
 * Set to e.g. 'api.foldy.co.in' or 'http://1.2.3.4:5000' to target another
 * server (production). Persisted in localStorage.
 */
const API_HOST_KEY = 'foldy_api_host';

/** Raw stored value, e.g. 'https://api.foldy.co.in' or '' for default. */
export function getApiHost(): string {
  return localStorage.getItem(API_HOST_KEY) ?? '';
}

/** Normalizes and stores the host. Empty clears the override (back to default). */
export function setApiHost(host: string): void {
  const trimmed = host.trim().replace(/\/+$/, '');
  if (!trimmed || trimmed === 'localhost:5000' || trimmed === 'http://localhost:5000') {
    localStorage.removeItem(API_HOST_KEY);
    return;
  }
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
  localStorage.setItem(API_HOST_KEY, withProtocol);
}

/** Origin prefix for API calls: '' (default/proxy) or 'https://host[:port]'. */
export function getApiOrigin(): string {
  return getApiHost();
}
