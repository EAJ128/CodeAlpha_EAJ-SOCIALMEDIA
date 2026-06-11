/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, Lock, User, Mail, UserCheck, Sparkles } from 'lucide-react';

export const Register: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !email || !fullName || !password || !confirmPassword) {
      setErrorMsg('All registration fields are required.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Provided passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Select a strong password of at least 6 characters.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, fullName, password, confirmPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to register account.');
      }

      login(data.accessToken, data.refreshToken, data.user);
      navigate('/');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="register-page-container" className="min-h-[calc(100vh-69px)] flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 font-sans">
      <div id="register-card" className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative transition-all duration-300">
        
        {/* Brand Banner */}
        <div className="bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 p-6 sm:p-8 text-white relative">
          <div className="absolute right-6 top-6 bg-white/10 backdrop-blur-md p-2 rounded-full">
            <Sparkles className="w-6 h-6 text-indigo-100" />
          </div>
          <h2 className="text-3xl font-black tracking-tight">Create Account</h2>
          <p className="text-indigo-100 text-xs sm:text-sm font-medium mt-1">
            Join EAJ Social to create posts, connect with friends, and customize your feed.
          </p>
        </div>

        {/* Content body */}
        <div className="p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {errorMsg && (
              <div className="flex gap-2.5 items-center text-xs text-rose-500 font-bold bg-rose-55/10 dark:bg-rose-950/20 border border-rose-250/20 dark:border-rose-900/40 p-3.5 rounded-xl">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">
                  Full Name
                </label>
                <div className="relative">
                  <input
                    id="register-fullname-input"
                    type="text"
                    placeholder="E.g., Jane Done"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 pl-10 pr-4 py-2.5 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950/40 outline-none text-sm transition"
                    required
                  />
                  <UserCheck className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-slate-400" />
                </div>
              </div>

              {/* Username */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">
                  Unique Username
                </label>
                <div className="relative">
                  <input
                    id="register-username-input"
                    type="text"
                    placeholder="E.g., janedoe"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 pl-10 pr-4 py-2.5 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950/40 outline-none text-sm transition"
                    required
                  />
                  <User className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-slate-400" />
                </div>
              </div>
            </div>

            {/* Email Address */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <input
                  id="register-email-input"
                  type="email"
                  placeholder="jane@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 pl-10 pr-4 py-2.5 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950/40 outline-none text-sm transition"
                  required
                />
                <Mail className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-slate-400" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">
                  Choose Password
                </label>
                <div className="relative">
                  <input
                    id="register-password-input"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 pl-10 pr-4 py-2.5 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950/40 outline-none text-sm transition"
                    required
                  />
                  <Lock className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-slate-400" />
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="register-confirm-input"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 pl-10 pr-4 py-2.5 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950/40 outline-none text-sm transition"
                    required
                  />
                  <Lock className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-slate-400" />
                </div>
              </div>
            </div>

            {/* Submission triggers */}
            <button
              id="register-submit-btn"
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-505 bg-linear-to-r from-indigo-600 to-purple-600 hover:opacity-95 text-white font-bold rounded-xl shadow-lg hover:shadow-indigo-500/20 active:scale-[0.98] transition mt-2 cursor-pointer flex justify-center items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Registering...</span>
                </>
              ) : (
                'Create Secure Account'
              )}
            </button>
          </form>

          {/* Login Redirection */}
          <div className="mt-6 text-center border-t border-slate-100 dark:border-slate-800 pt-6">
            <p className="text-xs sm:text-sm text-slate-550 dark:text-slate-400">
              Already have an account?{' '}
              <Link to="/login" className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline">
                Sign in securely
              </Link>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
