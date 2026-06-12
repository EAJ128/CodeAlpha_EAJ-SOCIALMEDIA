/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { RightSidebar } from './components/RightSidebar';
import { Feed } from './pages/Feed';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Profile } from './pages/Profile';
import { SearchPage } from './pages/Search';
import { Notifications } from './pages/Notifications';
import { SettingsPage } from './pages/Settings';
import { Bell } from 'lucide-react';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, token } = useAuth();
  return token && user ? <>{children}</> : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, token } = useAuth();
  return token && user ? <Navigate to="/" replace /> : <>{children}</>;
};

function AppLayout() {
  const [sidebarIsOpen, setSidebarIsOpen] = useState(false);
  const { user, notifications } = useAuth();
  const location = useLocation();

  const toggleSidebar = () => {
    setSidebarIsOpen(!sidebarIsOpen);
  };

  const closeSidebar = () => {
    setSidebarIsOpen(false);
  };

  // Determine if right sidebar should be visible
  const isAuthPage = ['/login', '/register'].includes(location.pathname);
  const showRightSidebar = !isAuthPage;

  // Reactively calculate the latest notification message
  const unreadNotifs = notifications.filter(n => !n.isRead);
  const latestNotif = unreadNotifs.length > 0 
    ? unreadNotifs[0] 
    : (notifications.length > 0 ? notifications[0] : null);

  let statusNotificationText = 'No new notifications';
  if (latestNotif) {
    if (latestNotif.type === 'follow') {
      statusNotificationText = `@${latestNotif.senderUsername} started following you.`;
    } else if (latestNotif.type === 'like') {
      statusNotificationText = `@${latestNotif.senderUsername} liked your thought.`;
    } else if (latestNotif.type === 'comment') {
      statusNotificationText = `@${latestNotif.senderUsername} commented on your post.`;
    }
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased flex flex-col">
      
      {/* Structural Header Section (fixed height 16) */}
      <Header onToggleSidebar={toggleSidebar} />
      
      {/* Main Grid Viewport - independent pan scroll containers */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Left Sidebar Pane */}
        <Sidebar isOpen={sidebarIsOpen} onClose={closeSidebar} />
        
        {/* Main Stage Panel containing custom routed pages */}
        <main id="app-main-content" className="flex-1 overflow-y-auto min-w-0 bg-slate-100 dark:bg-slate-950">
          <Routes>
            {/* Feeds */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Feed />
                </ProtectedRoute>
              }
            />

            {/* Authentication Gates */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicRoute>
                  <Register />
                </PublicRoute>
              }
            />

            {/* Users Profiles */}
            <Route path="/profile/:id" element={<Profile />} />

            {/* Search */}
            <Route path="/search" element={<SearchPage />} />

            {/* Notifications Deck */}
            <Route path="/notifications" element={<Notifications />} />

            {/* Settings Hub */}
            <Route path="/settings" element={<SettingsPage />} />

            {/* Fallback route redirection */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        {/* Right Sidebar - hidden on mobile & authentication screens */}
        {showRightSidebar && (
          <RightSidebar />
        )}
      </div>

      {/* High Density Bottom Status Bar */}
      <footer className="h-9 shrink-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 z-30">
        <div className="flex gap-3 items-center">
          <span className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-400">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
            Online
          </span>
        </div>
        <div className="flex items-center gap-1.5 truncate max-w-[55%]">
          <Bell className="w-3 h-3 text-blue-600 shrink-0" />
          <span className="truncate">{statusNotificationText}</span>
        </div>
      </footer>

    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppLayout />
      </Router>
    </AuthProvider>
  );
}
