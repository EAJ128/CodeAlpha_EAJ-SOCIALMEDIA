/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Search, Bell, LogOut, Menu } from 'lucide-react';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { user, logout, notifications, unreadNotificationsCount, markNotificationsAsRead } = useAuth();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [showNotifications, setShowNotifications] = React.useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifications]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header
      id="app-header"
      className="sticky top-0 z-40 w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            id="sidebar-toggle-btn"
            onClick={onToggleSidebar}
            className="md:hidden p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            aria-label="Toggle navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link id="brand-logo" to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center group-hover:bg-blue-700 transition-colors">
              <span className="text-white font-bold text-sm">E</span>
            </div>
            <span className="text-lg font-bold text-slate-900 dark:text-white tracking-tight hidden sm:block">
              EAJ Social
            </span>
          </Link>
        </div>

        <form
          id="global-search-form"
          onSubmit={handleSearch}
          className="flex-1 max-w-md relative hidden sm:block"
        >
          <input
            id="search-input-box"
            type="text"
            placeholder="Search users, posts, hashtags…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-10 py-2 rounded-full bg-slate-50 dark:bg-slate-950"
          />
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
        </form>

        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => navigate('/search')}
            className="sm:hidden p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            aria-label="Search"
          >
            <Search className="w-5 h-5" />
          </button>

          {user ? (
            <>
              <div id="notifications-hub" className="relative" ref={notifRef}>
                <button
                  id="notifications-bell-btn"
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                  aria-label="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {unreadNotificationsCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                      {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div
                    id="notifications-dropdown-menu"
                    className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] card dark:bg-slate-900 shadow-lg z-50 overflow-hidden"
                  >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
                      <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                        Notifications
                      </span>
                      {unreadNotificationsCount > 0 && (
                        <button
                          type="button"
                          onClick={() => markNotificationsAsRead()}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>

                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-8 text-center text-slate-500 text-sm">
                          No notifications yet.
                        </div>
                      ) : (
                        notifications.slice(0, 8).map((notif) => (
                          <div
                            key={notif.id}
                            className={`flex items-start gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                              !notif.isRead ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
                            }`}
                          >
                            <img
                              src={
                                notif.senderProfilePicture ||
                                `https://api.dicebear.com/7.x/avataaars/svg?seed=${notif.senderUsername}`
                              }
                              alt=""
                              className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 object-cover"
                              referrerPolicy="no-referrer"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-slate-700 dark:text-slate-300">
                                <Link
                                  to={`/profile/${notif.senderId}`}
                                  onClick={() => setShowNotifications(false)}
                                  className="font-semibold text-slate-900 dark:text-slate-100 hover:underline"
                                >
                                  @{notif.senderUsername}
                                </Link>
                                {notif.type === 'follow' && ' followed you'}
                                {notif.type === 'like' && ' liked your post'}
                                {notif.type === 'comment' && ' commented on your post'}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    {notifications.length > 0 && (
                      <Link
                        to="/notifications"
                        onClick={() => setShowNotifications(false)}
                        className="block text-center py-2.5 text-xs font-semibold text-blue-600 hover:bg-slate-50 dark:hover:bg-slate-800 border-t border-slate-200 dark:border-slate-800"
                      >
                        View all
                      </Link>
                    )}
                  </div>
                )}
              </div>

              <Link
                id="header-profile-avatar"
                to={`/profile/${user.id}`}
                className="flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 rounded-lg transition"
              >
                <img
                  src={
                    user.profilePicture ||
                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`
                  }
                  alt=""
                  className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                  referrerPolicy="no-referrer"
                />
                <span className="hidden lg:inline text-xs font-semibold text-slate-700 dark:text-slate-300">
                  @{user.username}
                </span>
              </Link>

              <button
                id="header-logout-btn"
                type="button"
                onClick={logout}
                className="p-2 text-slate-500 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                title="Log out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                id="header-login-btn"
                to="/login"
                className="px-3 py-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600"
              >
                Log in
              </Link>
              <Link id="header-signup-btn" to="/register" className="btn-primary text-sm py-1.5 px-4 rounded-lg">
                Sign up
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
