/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Settings, ShieldAlert, CheckCircle, Users, Mail, Lock, Sun, Moon, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export const SettingsPage: React.FC = () => {
  const { user, token, logout, darkMode, toggleDarkMode, updateCurrentUser, authFetch } = useAuth();
  const navigate = useNavigate();

  // Settings states
  const [email, setEmail] = useState(user?.email || '');
  const [username, setUsername] = useState(user?.username || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Sync inputs when context user changes or loads
  React.useEffect(() => {
    if (user) {
      setEmail(user.email || '');
      setUsername(user.username || '');
    }
  }, [user]);

  const isUnchanged = email === (user?.email || '') && username === (user?.username || '') && !newPassword;

  // Deletion states
  const [showDeletionBlock, setShowDeletionBlock] = useState(false);
  const [deletionPassword, setDeletionPassword] = useState('');
  const [deletionError, setDeletionError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!currentPassword) {
      setUpdateError('Your current password is required to save setting changes.');
      return;
    }

    setIsUpdating(true);
    setUpdateError(null);
    setUpdateSuccess(null);

    try {
      const res = await authFetch('/api/settings/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          username,
          currentPassword,
          newPassword: newPassword || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update credentials.');
      }

      // Update auth context profile locally
      if (user) {
        updateCurrentUser({
          ...user,
          email,
          username,
        });
      }

      setUpdateSuccess('Your user account credentials have been successfully updated!');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      setUpdateError(err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!deletionPassword) {
      setDeletionError('Password is required to confirm deleting your account.');
      return;
    }

    if (!window.confirm('CRITICAL ACTION: Are you sure you verify deleting your entire EAJ Social account? All your posts, likes and notifications will be wiped and cannot be recovered.')) {
      return;
    }

    setIsDeleting(true);
    setDeletionError(null);

    try {
      const res = await authFetch('/api/settings/delete-account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: deletionPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete account.');
      }

      logout();
      navigate('/register');
    } catch (err: any) {
      setDeletionError(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!user) {
    return (
      <div id="settings-forbidden-alert" className="max-w-xl mx-auto py-12 px-4 text-center">
        <Settings className="w-12 h-12 text-slate-350 mx-auto mb-3" />
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Settings Restricted</h3>
        <p className="text-sm text-slate-550 dark:text-slate-400 mt-2">Create an account or login to customize setting options.</p>
        <Link to="/login" className="inline-block mt-4 px-6 py-2 bg-indigo-600 text-white font-bold rounded-full text-xs shadow hover:bg-slate-500 transition">
          Log In
        </Link>
      </div>
    );
  }

  return (
    <div id="settings-page" className="max-w-2xl mx-auto py-6 px-4 space-y-6">
      
      {/* Settings Title */}
      <div className="flex items-center gap-2 mb-2">
        <Settings className="text-indigo-505 w-6 h-6 text-indigo-500 shrink-0" />
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">
          Account Settings Panel
        </h1>
      </div>

      {/* A. Theme Customizer */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1">
          Interface Appearance Mode
        </h2>
        <p className="text-xs text-slate-400 font-semibold mb-4">
          Adjust the visual theme settings of your EAJ Social interface.
        </p>

        <button
          onClick={toggleDarkMode}
          className="flex items-center justify-between w-full p-4 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-850/80 border border-slate-200 dark:border-slate-800 rounded-2xl transition duration-150"
        >
          <div className="flex items-center gap-3.5">
            {darkMode ? <Moon className="w-5.5 h-5.5 text-indigo-400" /> : <Sun className="w-5.5 h-5.5 text-amber-500" />}
            <div className="text-left">
              <span className="font-bold text-sm block text-slate-800 dark:text-slate-100">
                {darkMode ? 'Dark Appearance' : 'Light Appearance'}
              </span>
              <span className="text-[11px] text-slate-400 block font-medium">Click to swop styles</span>
            </div>
          </div>

          <span className="text-xs font-bold uppercase tracking-widest bg-white dark:bg-slate-905 px-2.5 py-1 rounded-sm border dark:border-slate-800 shadow-xs text-slate-500">
            {darkMode ? 'DARK' : 'LIGHT'}
          </span>
        </button>
      </div>

      {/* B. Update credentials credentials block */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1">
          Security & Personal Information
        </h2>
        <p className="text-xs text-slate-400 font-semibold mb-5">
          Change your public username, private email address, or update your password.
        </p>

        <form onSubmit={handleUpdateSettings} className="space-y-4">
          {updateSuccess && (
            <div className="flex gap-2.5 items-center text-xs text-indigo-650 font-bold bg-indigo-50/50 dark:bg-indigo-950/20 p-3.5 rounded-xl border border-indigo-150/40">
              <CheckCircle className="w-5 h-5 shrink-0" />
              <span>{updateSuccess}</span>
            </div>
          )}

          {updateError && (
            <div className="flex gap-2.5 items-center text-xs text-rose-500/90 font-bold bg-rose-50 dark:bg-rose-950/20 p-3.5 rounded-xl border border-rose-200">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <span>{updateError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Username */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-550 dark:text-slate-400 block uppercase">Username</label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 pl-10 pr-4 py-2.5 rounded-xl focus:border-indigo-500 focus:ring-1 outline-none text-sm transition font-semibold"
                  required
                />
                <Users className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-550 dark:text-slate-400 block uppercase">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 pl-10 pr-4 py-2.5 rounded-xl focus:border-indigo-500 focus:ring-1 outline-none text-sm transition font-semibold"
                  required
                />
                <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Current Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-indigo-600 block uppercase tracking-wide">Current Password *</label>
                <div className="relative">
                  <input
                    type="password"
                    placeholder="REQUIRED"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 text-slate-900 dark:text-slate-10s pl-10 pr-4 py-2.5 rounded-xl focus:border-indigo-500 focus:ring-1 outline-none text-sm transition font-semibold placeholder:text-indigo-400/80"
                    required
                  />
                  <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-550 dark:text-slate-400 block uppercase">New Password (Optional)</label>
                <div className="relative">
                  <input
                    type="password"
                    placeholder="Leave blank to hold current"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 pl-10 pr-4 py-2.5 rounded-xl focus:border-indigo-500 focus:ring-1 outline-none text-sm transition font-semibold"
                  />
                  <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="submit"
              disabled={isUpdating || isUnchanged}
              className="px-6 py-2.5 hover:opacity-95 bg-linear-to-r from-indigo-600 to-purple-600 text-white font-bold text-xs sm:text-sm rounded-xl hover:shadow-lg transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUpdating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving Configuration...</span>
                </>
              ) : (
                'Save Security Settings'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* C. Danger deletion blocks */}
      <div className="bg-rose-50/20 dark:bg-rose-955/5 border border-rose-200 dark:border-rose-950/40 rounded-3xl p-5 sm:p-6 shadow-xs">
        <h2 className="text-base font-bold text-rose-600 block mb-1">
          Danger Zone
        </h2>
        <p className="text-xs text-rose-500/80 font-bold mb-4">
          Irreversible user profile deletions. Take extreme caution before committing actions.
        </p>

        {!showDeletionBlock ? (
          <button
            onClick={() => setShowDeletionBlock(true)}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-505 bg-gradient-to-r from-rose-600 to-rose-700 text-white font-bold text-xs rounded-xl shadow-xs hover:shadow-lg transition cursor-pointer"
          >
            Initiate Deletion Action
          </button>
        ) : (
          <form onSubmit={handleDeleteAccount} className="space-y-4 border-t border-rose-100 dark:border-rose-900/40 pt-4 animate-fade-in">
            <div className="flex items-center gap-2 p-3.5 bg-rose-50 dark:bg-rose-950/35 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-750 dark:text-rose-400 text-xs font-bold leading-normal">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-505" />
              <span>Please declare your current password to confirm permanent user account deletion.</span>
            </div>

            {deletionError && (
              <p className="text-xs font-bold text-rose-620 bg-rose-50 dark:bg-rose-950/20 border border-rose-220 rounded-lg p-2.5">{deletionError}</p>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-rose-700 block uppercase">Enter Account Password</label>
              <input
                type="password"
                placeholder="Password confirmation"
                value={deletionPassword}
                onChange={(e) => setDeletionPassword(e.target.value)}
                className="w-full bg-white dark:bg-slate-950 border border-rose-250 dark:border-rose-900 text-slate-900 pl-4 pr-4 py-2.5 rounded-xl focus:border-rose-500 focus:ring-1 outline-none text-sm transition font-semibold"
                required
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeletionBlock(false);
                  setDeletionPassword('');
                  setDeletionError(null);
                }}
                className="px-4 py-2 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-505 dark:text-slate-400 font-bold rounded-xl text-xs sm:text-sm"
              >
                Cancel Deletion
              </button>
              <button
                type="submit"
                disabled={isDeleting}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs sm:text-sm shadow flex items-center gap-1 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <div className="w-4.5 h-4.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Processing deletion...</span>
                  </>
                ) : (
                  'Permanently Delete My Account'
                )}
              </button>
            </div>
          </form>
        )}
      </div>

    </div>
  );
};
