/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Home, User, Search, Bell, Settings, Sun, Moon, LogOut, Compass } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, logout, darkMode, toggleDarkMode, unreadNotificationsCount } = useAuth();

  const navItems = [
    { name: 'Home', path: '/', icon: <Home className="w-[18px] h-[18px]" /> },
    { name: 'Explore', path: '/search', icon: <Compass className="w-[18px] h-[18px]" /> },
    {
      name: 'Notifications',
      path: '/notifications',
      icon: (
        <div className="relative">
          <Bell className="w-[18px] h-[18px]" />
          {unreadNotificationsCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white">
              {unreadNotificationsCount}
            </span>
          )}
        </div>
      ),
    },
    ...(user ? [{ name: 'Profile', path: `/profile/${user.id}`, icon: <User className="w-[18px] h-[18px]" /> }] : []),
    { name: 'Settings', path: '/settings', icon: <Settings className="w-[18px] h-[18px]" /> },
  ];

  return (
    <>
      {isOpen && (
        <div
          id="sidebar-overlay"
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/50 md:hidden z-40"
        />
      )}

      <aside
        id="sidebar"
        className={`fixed md:sticky top-[57px] h-[calc(100vh-57px)] w-60 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-transform duration-200 z-40 flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-3 flex-1 overflow-y-auto">
          {user && (
            <Link
              to={`/profile/${user.id}`}
              onClick={onClose}
              className="mb-4 p-3 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
            >
              <img
                src={
                  user.profilePicture ||
                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`
                }
                alt=""
                className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                referrerPolicy="no-referrer"
              />
              <div className="overflow-hidden">
                <span className="font-semibold text-sm block truncate text-slate-900 dark:text-slate-100">
                  {user.fullName}
                </span>
                <span className="text-xs text-slate-500 block truncate">@{user.username}</span>
              </div>
            </Link>
          )}

          <nav className="space-y-0.5">
            {navItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                  }`
                }
              >
                {item.icon}
                <span>{item.name}</span>
              </NavLink>
            ))}
          </nav>

          <div className="mt-6 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">Discover creators</p>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              Find people to follow and grow your network.
            </p>
            <Link
              to="/search"
              onClick={onClose}
              className="mt-3 block w-full text-center py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold transition"
            >
              Explore people
            </Link>
          </div>
        </div>

        <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-1">
          <button
            type="button"
            onClick={toggleDarkMode}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <span className="flex items-center gap-3">
              {darkMode ? <Sun className="w-[18px] h-[18px] text-amber-500" /> : <Moon className="w-[18px] h-[18px]" />}
              {darkMode ? 'Light mode' : 'Dark mode'}
            </span>
          </button>

          {user && (
            <button
              type="button"
              onClick={() => {
                logout();
                onClose();
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition"
            >
              <LogOut className="w-[18px] h-[18px]" />
              Log out
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
