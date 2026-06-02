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
