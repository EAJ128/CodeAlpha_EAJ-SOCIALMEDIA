/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { TrendingUp, UserPlus, UserCheck, Loader2 } from 'lucide-react';

interface SuggestedUser {
  id: number;
  username: string;
  fullName: string;
  profilePicture: string | null;
  bio: string | null;
  isFollowing: boolean;
}

interface TrendingTag {
  tag: string;
  postsCount: number;
}

export const RightSidebar: React.FC = () => {
  const { user, token } = useAuth();
  const [suggestions, setSuggestions] = useState<SuggestedUser[]>([]);
  const [trending, setTrending] = useState<TrendingTag[]>([]);
  const [loadingFollow, setLoadingFollow] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/trending')
      .then((r) => r.json())
      .then(setTrending)
      .catch(() => {});

    loadSuggestions();
  }, [token, user?.id]);

  const loadSuggestions = async () => {
    const headers: HeadersInit = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch('/api/users/suggestions', { headers });
      if (res.ok) setSuggestions(await res.json());
    } catch {
      // ignore
    }
  };

  const handleFollow = async (personId: number, isFollowing: boolean) => {
    if (!token) return;
    setLoadingFollow(personId);

    try {
      const endpoint = `/api/users/${isFollowing ? 'unfollow' : 'follow'}/${personId}`;
      const res = await fetch(endpoint, {
        method: isFollowing ? 'DELETE' : 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      setSuggestions((prev) =>
        prev.map((p) => (p.id === personId ? { ...p, isFollowing: !isFollowing } : p)),
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingFollow(null);
    }
  };

  return (
    <aside
      id="layout-right-sidebar"
      className="hidden lg:flex w-72 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shrink-0 flex-col gap-5 overflow-y-auto"
    >
      {/* Trending */}
      <div className="card p-4 dark:bg-slate-900">
        <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 mb-3 flex items-center justify-between">
          <span>Trending</span>
          <TrendingUp className="w-4 h-4 text-blue-600" />
        </h3>

        <div className="flex flex-col gap-3">
          {trending.length === 0 ? (
            <p className="text-xs text-slate-500">No trends yet — post with a hashtag!</p>
          ) : (
            trending.map((item) => (
              <Link
                key={item.tag}
                to={`/search?q=${encodeURIComponent(item.tag)}`}
                className="group block rounded-lg px-2 py-1.5 -mx-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
              >
                <p className="text-[10px] uppercase font-medium text-slate-400 tracking-wide">Topic</p>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {item.tag}
                </p>
                <p className="text-[11px] text-slate-500">{item.postsCount} posts</p>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Suggested follows */}
      <div className="px-1">
        <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 mb-3">
          People to follow
        </h3>
        <div className="flex flex-col gap-3">
          {suggestions.length === 0 ? (
            <p className="text-xs text-slate-500">Loading suggestions…</p>
          ) : (
            suggestions.map((person) => (
              <div key={person.id} className="flex items-center justify-between gap-2">
                <Link to={`/profile/${person.id}`} className="flex items-center gap-2.5 min-w-0 flex-1">
                  <img
                    src={
                      person.profilePicture ||
                      `https://api.dicebear.com/7.x/avataaars/svg?seed=${person.username}`
                    }
                    alt={person.username}
                    className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                    referrerPolicy="no-referrer"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                      {person.fullName}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">@{person.username}</p>
                  </div>
                </Link>

                {token && user?.id !== person.id ? (
                  <button
                    type="button"
                    onClick={() => handleFollow(person.id, person.isFollowing)}
                    disabled={loadingFollow === person.id}
                    className={`shrink-0 px-3 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1 ${
                      person.isFollowing
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {loadingFollow === person.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : person.isFollowing ? (
                      <>
                        <UserCheck className="w-3 h-3" />
                        Following
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3 h-3" />
                        Follow
                      </>
                    )}
                  </button>
                ) : !token ? (
                  <Link
                    to="/login"
                    className="shrink-0 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[11px] font-semibold"
                  >
                    Follow
                  </Link>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-auto pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap gap-x-2 gap-y-1 text-[10px] text-slate-500">
          <Link to="/settings" className="hover:text-blue-600 hover:underline">
            Settings
          </Link>
          <span>·</span>
          <Link to="/search" className="hover:text-blue-600 hover:underline">
            Search
          </Link>
        </div>
        <p className="text-[10px] text-slate-400 mt-2">© 2026 EAJ Social</p>
      </div>
    </aside>
  );
};
