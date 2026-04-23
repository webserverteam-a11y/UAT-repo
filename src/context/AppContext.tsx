import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Task, AdminOptions, AppUser } from '../types';
import { tasksApi, usersApi, adminOptionsApi, authApi, uploadHistoryApi, UploadRecord } from '../lib/api';

// ── Fallback defaults (used while API loads or if API is unavailable) ────────

const defaultAdminOptions: AdminOptions = {
  clients: [], seoOwners: [], contentOwners: [], webOwners: [],
  seoStages: [], seoQcStatuses: [], contentStatuses: [], webStatuses: [],
};

// ── Context shape ────────────────────────────────────────────────────────────

interface AppContextType {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  adminOptions: AdminOptions;
  setAdminOptions: React.Dispatch<React.SetStateAction<AdminOptions>>;
  users: AppUser[];
  setUsers: React.Dispatch<React.SetStateAction<AppUser[]>>;
  currentUser: AppUser | null;
  login: (name: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAdmin: boolean;
  isLoading: boolean;
  apiError: string | null;
  // Upload history helpers exposed so TaskEntry can use DB-backed history
  uploadHistory: UploadRecord[];
  setUploadHistory: React.Dispatch<React.SetStateAction<UploadRecord[]>>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// ── Provider ─────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [tasks,        setTasksState]  = useState<Task[]>([]);
  const [adminOptions, setAdminOptionsState] = useState<AdminOptions>(defaultAdminOptions);
  const [users,        setUsersState]  = useState<AppUser[]>([]);
  const [uploadHistory, setUploadHistory] = useState<UploadRecord[]>([]);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    try {
      const saved = localStorage.getItem('seo_current_user');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [apiError,  setApiError]  = useState<string | null>(null);

  // ── Initial data load ──────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [fetchedTasks, fetchedUsers, fetchedOptions, fetchedHistory] = await Promise.all([
          tasksApi.getAll(),
          usersApi.getAll(),
          adminOptionsApi.get(),
          uploadHistoryApi.getAll(),
        ]);
        setTasksState(fetchedTasks);
        setUsersState(fetchedUsers);
        setAdminOptionsState(fetchedOptions);
        setUploadHistory(fetchedHistory);
        // Seed the sync baseline so the first real edit is diffed correctly
        lastSyncedRef.current    = fetchedTasks;
        lastSyncedOptions.current = JSON.stringify(fetchedOptions);
      } catch (err: any) {
        console.error('Failed to load initial data from API:', err);
        setApiError(
          'Could not connect to the database server. ' +
          'Make sure the API server is running on port 4000.'
        );
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // ── Persist session to localStorage (lightweight, no sensitive data risk) ──
  useEffect(() => {
    if (currentUser) localStorage.setItem('seo_current_user', JSON.stringify(currentUser));
    else localStorage.removeItem('seo_current_user');
  }, [currentUser]);

  // ─── Debounced task sync ─────────────────────────────────────────────────
  //
  // lastSyncedRef holds the exact Task[] that the database already knows about.
  // It is set once after initial load and updated every time a sync completes.
  //
  // The debounced timer ALWAYS diffs `next` (the latest in-memory state) against
  // lastSyncedRef.current (the DB baseline) — NOT against `prev` from the last
  // individual update.  This ensures that a burst of rapid updates (e.g. the
  // 1-second clock tick in ActionView) still sends every accumulated change.

  const lastSyncedRef = useRef<Task[]>([]);
  const syncTimer     = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Diff two Task arrays and push creates/updates/deletes to the DB. */
  const syncTasks = useCallback((current: Task[], dbBaseline: Task[]) => {
    const baseMap    = new Map(dbBaseline.map(t => [t.id, JSON.stringify(t)]));
    const currentMap = new Map(current.map(t =>  [t.id, JSON.stringify(t)]));

    const toUpsert: Task[]   = [];
    const toDelete: string[] = [];

    for (const [id, json] of currentMap) {
      if (baseMap.get(id) !== json) toUpsert.push(current.find(t => t.id === id)!);
    }
    for (const [id] of baseMap) {
      if (!currentMap.has(id)) toDelete.push(id);
    }

    const syncs: Promise<unknown>[] = [];
    if (toUpsert.length > 0)
      syncs.push(tasksApi.bulkUpsert(toUpsert));
    if (toDelete.length > 0)
      syncs.push(tasksApi.bulkDelete(toDelete));

    if (syncs.length > 0) {
      Promise.all(syncs)
        .then(() => { lastSyncedRef.current = current; })
        .catch(err => console.error('Background task sync failed:', err));
    }
  }, []);

  /** Wrapped setTasks: updates local state and schedules a debounced DB sync. */
  const setTasks: React.Dispatch<React.SetStateAction<Task[]>> = useCallback((value) => {
    setTasksState(prev => {
      const next = typeof value === 'function' ? (value as (p: Task[]) => Task[])(prev) : value;

      // Cancel the previous pending sync; reschedule using the latest in-memory
      // state vs. the last DB baseline (not `prev` — see note above).
      if (syncTimer.current) clearTimeout(syncTimer.current);
      syncTimer.current = setTimeout(() => {
        syncTasks(next, lastSyncedRef.current);
      }, 800);

      return next;
    });
  }, [syncTasks]);

  // ── Admin options sync ────────────────────────────────────────────────────
  // Initialised to empty-string so the first real save always triggers a write.
  const lastSyncedOptions = useRef<string>('');

  const setAdminOptions: React.Dispatch<React.SetStateAction<AdminOptions>> = useCallback((value) => {
    setAdminOptionsState(prev => {
      const next = typeof value === 'function' ? (value as (p: AdminOptions) => AdminOptions)(prev) : value;
      const json = JSON.stringify(next);
      if (json !== lastSyncedOptions.current) {
        lastSyncedOptions.current = json;
        adminOptionsApi.save(next).catch(err =>
          console.error('Admin options sync failed:', err)
        );
      }
      return next;
    });
  }, []);

  // ── Users sync ────────────────────────────────────────────────────────────

  /** Wrapped setUsers: syncs creates/updates/deletes to the DB. */
  const setUsers: React.Dispatch<React.SetStateAction<AppUser[]>> = useCallback((value) => {
    setUsersState(prev => {
      const next = typeof value === 'function' ? (value as (p: AppUser[]) => AppUser[])(prev) : value;

      const prevMap = new Map(prev.map(u => [u.id, JSON.stringify(u)]));
      const nextMap = new Map(next.map(u => [u.id, JSON.stringify(u)]));

      for (const [id, json] of nextMap) {
        if (!prevMap.has(id)) {
          usersApi.create(next.find(u => u.id === id)!).catch(err =>
            console.error('User create sync failed:', err)
          );
        } else if (prevMap.get(id) !== json) {
          usersApi.update(next.find(u => u.id === id)!).catch(err =>
            console.error('User update sync failed:', err)
          );
        }
      }
      for (const [id] of prevMap) {
        if (!nextMap.has(id)) {
          usersApi.delete(id).catch(err =>
            console.error('User delete sync failed:', err)
          );
        }
      }

      return next;
    });
  }, []);

  // ── Auth ──────────────────────────────────────────────────────────────────

  const login = useCallback(async (name: string, password: string): Promise<boolean> => {
    try {
      const user = await authApi.login(name, password);
      setCurrentUser(user);
      return true;
    } catch {
      return false;
    }
  }, []);

  const logout = useCallback(() => setCurrentUser(null), []);
  const isAdmin = currentUser?.role === 'admin';

  return (
    <AppContext.Provider value={{
      tasks, setTasks,
      adminOptions, setAdminOptions,
      users, setUsers,
      currentUser, login, logout, isAdmin,
      isLoading, apiError,
      uploadHistory, setUploadHistory,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
}
