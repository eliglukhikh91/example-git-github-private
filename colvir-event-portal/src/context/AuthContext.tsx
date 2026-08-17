import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, ApiError, setUnauthorizedHandler } from '../api/client';
import type { DirectoryStatus, UserProfile } from '../types';

export type AuthStatus = 'checking' | 'authenticated' | 'anonymous';

interface AuthContextValue {
  status: AuthStatus;
  user: UserProfile | null;
  isAdmin: boolean;
  directoryStatus: DirectoryStatus | null;
  /** Вход по доменному логину и паролю. Пароль никуда не сохраняется. */
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  /** Сквозной вход через корпоративный шлюз (Kerberos/NTLM). */
  loginWithSso: () => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  /** Перечитывает профиль и группы доступа из Active Directory. */
  syncWithDirectory: () => Promise<{ success: boolean; message: string }>;
  /** Обновляет поля, которые сотрудник редактирует сам. */
  updateOwnProfile: (fields: {
    telegram?: string;
    phone?: string;
    interests?: string[];
    avatarUrl?: string | null;
  }) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<AuthStatus>('checking');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [directoryStatus, setDirectoryStatus] = useState<DirectoryStatus | null>(null);

  // Сессия определяется исключительно сервером: клиент не может «назначить»
  // себя администратором, как это было с PIN-кодом в localStorage.
  const loadSession = useCallback(async () => {
    try {
      const response = await api.get<{ user: UserProfile }>('/api/auth/me');
      setUser(response.user);
      setStatus('authenticated');
    } catch {
      setUser(null);
      setStatus('anonymous');
    }
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      setStatus('anonymous');
    });
    void loadSession();

    api
      .get<DirectoryStatus>('/api/auth/ad/status')
      .then(setDirectoryStatus)
      .catch(() => setDirectoryStatus(null));
  }, [loadSession]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await api.post<{ user: UserProfile; message: string }>(
        '/api/auth/ad/login',
        { email, password }
      );
      setUser(response.user);
      setStatus('authenticated');
      return { success: true, message: response.message };
    } catch (error) {
      return {
        success: false,
        message: errorMessage(error, 'Не удалось выполнить вход в Active Directory')
      };
    }
  }, []);

  const loginWithSso = useCallback(async () => {
    try {
      const response = await api.post<{ user: UserProfile; message: string }>('/api/auth/ad/sso');
      setUser(response.user);
      setStatus('authenticated');
      return { success: true, message: response.message };
    } catch (error) {
      return {
        success: false,
        message: errorMessage(
          error,
          'Сквозная авторизация недоступна. Войдите по доменному логину и паролю.'
        )
      };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/api/auth/logout');
    } finally {
      setUser(null);
      setStatus('anonymous');
    }
  }, []);

  const syncWithDirectory = useCallback(async () => {
    try {
      const response = await api.post<{ user: UserProfile; message: string }>('/api/auth/ad/sync');
      setUser(response.user);
      return { success: true, message: response.message };
    } catch (error) {
      return {
        success: false,
        message: errorMessage(error, 'Не удалось синхронизировать данные с Active Directory')
      };
    }
  }, []);

  const updateOwnProfile = useCallback(
    async (fields: {
      telegram?: string;
      phone?: string;
      interests?: string[];
      avatarUrl?: string | null;
    }) => {
      const response = await api.patch<{ user: UserProfile }>('/api/profile', fields);
      setUser(response.user);
    },
    []
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      isAdmin: user?.role === 'admin',
      directoryStatus,
      login,
      loginWithSso,
      logout,
      syncWithDirectory,
      updateOwnProfile
    }),
    [status, user, directoryStatus, login, loginWithSso, logout, syncWithDirectory, updateOwnProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth должен использоваться внутри AuthProvider');
  }
  return context;
};
