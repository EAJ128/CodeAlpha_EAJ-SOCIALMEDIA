/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  darkMode: boolean;
  socket: Socket | null;
  notifications: any[];
  unreadNotificationsCount: number;
  login: (token: string, refreshToken: string, user: User) => void;
  logout: () => void;
  updateCurrentUser: (user: User) => void;
  toggleDarkMode: () => void;
  fetchNotifications: () => Promise<void>;
  markNotificationsAsRead: () => Promise<void>;
  /** Authenticated fetch that silently refreshes expired tokens and retries once. */
  authFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('eaj_token'));
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('eaj_user');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('eaj_dark_theme') === 'true';
  });
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0);

  // Use a ref so authFetch always reads the latest token without stale closures
  const tokenRef = useRef<string | null>(token);
  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  // Sync dark mode class with state
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Socket Connection setup
  useEffect(() => {
    if (token && user) {
      const socketUrl = window.location.origin;
      const newSocket = io(socketUrl, { autoConnect: true });
      setSocket(newSocket);

      newSocket.on('connect', () => {
        newSocket.emit('join', user.id);
      });

      newSocket.on('notification', (notif: any) => {
        setNotifications((prev) => [notif, ...prev]);
        setUnreadNotificationsCount((prev) => prev + 1);
      });

      fetchNotifications();

      return () => {
        newSocket.close();
      };
    } else {
      setSocket(null);
      setNotifications([]);
      setUnreadNotificationsCount(0);
    }
  }, [token, user?.id]);

  // ---------- Silent token refresh ----------
  const isRefreshing = useRef(false);
  const refreshSubscribers = useRef<Array<(newToken: string | null) => void>>([]);

  const notifySubscribers = (newToken: string | null) => {
    refreshSubscribers.current.forEach((cb) => cb(newToken));
    refreshSubscribers.current = [];
  };

  const doRefresh = async (): Promise<string | null> => {
    const storedRefreshToken = localStorage.getItem('eaj_refresh_token');
    if (!storedRefreshToken) return null;

    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: storedRefreshToken }),
      });

      if (!res.ok) return null;

      const data = await res.json();
      const { accessToken, refreshToken: newRefreshToken, user: refreshedUser } = data;

      localStorage.setItem('eaj_token', accessToken);
      localStorage.setItem('eaj_refresh_token', newRefreshToken);
      localStorage.setItem('eaj_user', JSON.stringify(refreshedUser));
      setToken(accessToken);
      tokenRef.current = accessToken;
      setUser(refreshedUser);
      return accessToken;
    } catch {
      return null;
    }
  };

  /**
   * Drop-in replacement for `fetch` that injects the Authorization header
   * and silently refreshes the token once on 401/403 before retrying.
   */
  const authFetch = async (input: RequestInfo, init: RequestInit = {}): Promise<Response> => {
    const currentToken = tokenRef.current;

    const makeRequest = (tok: string | null) =>
      fetch(input, {
        ...init,
        headers: {
          ...(init.headers || {}),
          ...(tok ? { Authorization: `Bearer ${tok}` } : {}),
        },
      });

    const res = await makeRequest(currentToken);

    // If auth failure, try silent refresh once
    if (res.status === 401 || res.status === 403) {
      // If already refreshing, queue up and wait
      if (isRefreshing.current) {
        return new Promise((resolve) => {
          refreshSubscribers.current.push(async (newToken) => {
            resolve(await makeRequest(newToken));
          });
        });
      }

      isRefreshing.current = true;
      const newToken = await doRefresh();
      isRefreshing.current = false;
      notifySubscribers(newToken);

      if (!newToken) {
        // Refresh failed — force logout
        logoutClean();
        return res; // Return the original 401/403 response
      }

      // Retry with fresh token
      return makeRequest(newToken);
    }

    return res;
  };

  // ---------- Auth actions ----------

  const fetchNotifications = async () => {
    if (!tokenRef.current) return;
    try {
      const res = await authFetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
        const unread = data.filter((n: any) => !n.isRead).length;
        setUnreadNotificationsCount(unread);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  const markNotificationsAsRead = async () => {
    if (!tokenRef.current) return;
    try {
      const res = await authFetch('/api/notifications/read', { method: 'PUT' });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadNotificationsCount(0);
      }
    } catch (err) {
      console.error('Failed to mark notifications read:', err);
    }
  };

  const login = (accessToken: string, refreshToken: string, loggedInUser: User) => {
    localStorage.setItem('eaj_token', accessToken);
    localStorage.setItem('eaj_refresh_token', refreshToken);
    localStorage.setItem('eaj_user', JSON.stringify(loggedInUser));
    setToken(accessToken);
    tokenRef.current = accessToken;
    setUser(loggedInUser);
  };

  const logoutClean = () => {
    localStorage.removeItem('eaj_token');
    localStorage.removeItem('eaj_refresh_token');
    localStorage.removeItem('eaj_user');
    setToken(null);
    tokenRef.current = null;
    setUser(null);
    if (socket) socket.disconnect();
  };

  const logout = () => {
    logoutClean();
  };

  const updateCurrentUser = (updatedUser: User) => {
    localStorage.setItem('eaj_user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  const toggleDarkMode = () => {
    const nextMode = !darkMode;
    setDarkMode(nextMode);
    localStorage.setItem('eaj_dark_theme', String(nextMode));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        darkMode,
        socket,
        notifications,
        unreadNotificationsCount,
        login,
        logout,
        updateCurrentUser,
        toggleDarkMode,
        fetchNotifications,
        markNotificationsAsRead,
        authFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }
  return context;
};
