/**
 * Centralised API client for the SEO Dashboard.
 * All fetch calls target the Express backend at /api/* (proxied by Vite in dev).
 */

import { Task, AppUser, AdminOptions } from '../types';

const BASE = '/api';

// ─── Generic helpers ────────────────────────────────────────

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let message = `API error ${res.status}`;
    try {
      const err = await res.json();
      message = err.error || message;
    } catch {
      // ignore JSON parse errors
    }
    throw new Error(message);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

const get  = <T>(path: string)                   => request<T>('GET',    path);
const post = <T>(path: string, body?: unknown)   => request<T>('POST',   path, body);
const put  = <T>(path: string, body?: unknown)   => request<T>('PUT',    path, body);
const del  = <T>(path: string, body?: unknown)   => request<T>('DELETE', path, body);

// ─── Auth ────────────────────────────────────────────────────

export const authApi = {
  login: (name: string, password: string) =>
    post<AppUser>('/auth/login', { name, password }),
};

// ─── Tasks ───────────────────────────────────────────────────

export const tasksApi = {
  getAll: () =>
    get<Task[]>('/tasks'),

  getOne: (id: string) =>
    get<Task>(`/tasks/${id}`),

  create: (task: Task) =>
    post<Task>('/tasks', task),

  update: (task: Task) =>
    put<Task>(`/tasks/${task.id}`, task),

  /** Delete a single task. */
  delete: (id: string) =>
    del<{ success: boolean }>(`/tasks/${id}`),

  /** Delete multiple tasks in one call. */
  bulkDelete: (ids: string[]) =>
    post<{ success: boolean; deleted: number }>('/tasks/bulk-delete', { ids }),

  /** Create or update many tasks at once (CSV import). */
  bulkUpsert: (tasks: Task[]) =>
    post<{ success: boolean; count: number }>('/tasks/bulk-upsert', tasks),
};

// ─── Users ───────────────────────────────────────────────────

export const usersApi = {
  getAll: () =>
    get<AppUser[]>('/users'),

  create: (user: AppUser) =>
    post<AppUser>('/users', user),

  update: (user: AppUser) =>
    put<AppUser>(`/users/${user.id}`, user),

  delete: (id: string) =>
    del<{ success: boolean }>(`/users/${id}`),
};

// ─── Admin Options ───────────────────────────────────────────

export const adminOptionsApi = {
  get: () =>
    get<AdminOptions>('/admin-options'),

  save: (options: AdminOptions) =>
    put<{ success: boolean }>('/admin-options', options),
};

// ─── Upload History ──────────────────────────────────────────

export interface UploadRecord {
  id: string;
  uploadedBy: string;
  timestamp: string;
  taskCount: number;
  taskIds: string[];
}

export const uploadHistoryApi = {
  getAll: () =>
    get<UploadRecord[]>('/upload-history'),

  save: (record: UploadRecord) =>
    post<{ success: boolean }>('/upload-history', record),

  delete: (id: string) =>
    del<{ success: boolean }>(`/upload-history/${id}`),
};
