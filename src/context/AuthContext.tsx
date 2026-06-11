/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0);

  // Initialize Auth State on Mount
  useEffect(() => {
    const savedToken = localStorage.getItem('eaj_token');
    const savedUser = localStorage.getItem('eaj_user');
    const savedTheme = localStorage.getItem('eaj_dark_theme');

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }

    if (savedTheme === 'true') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Socket Connection setup
  useEffect(() => {
    if (token && user) {
      const socketUrl = window.location.origin; // Same origin
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
  }, [token, user]);

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/notifications', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
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
    if (!token) return;
    try {
      const res = await fetch('/api/notifications/read', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, isRead: true }))
        );
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
    setUser(loggedInUser);
  };

  const logout = () => {
    localStorage.removeItem('eaj_token');
    localStorage.removeItem('eaj_refresh_token');
    localStorage.removeItem('eaj_user');
    setToken(null);
    setUser(null);
    if (socket) {
      socket.disconnect();
    }
  };

  const updateCurrentUser = (updatedUser: User) => {
    localStorage.setItem('eaj_user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  const toggleDarkMode = () => {
    const nextMode = !darkMode;
    setDarkMode(nextMode);
    localStorage.setItem('eaj_dark_theme', String(nextMode));
    if (nextMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
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
