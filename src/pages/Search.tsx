/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PostCard } from '../components/PostCard';
import { User, Post, SearchResults } from '../types';
import { Search, Sparkles, UserCheck, MessageSquare, Tag, Compass } from 'lucide-react';

export const SearchPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResults>({ users: [], posts: [], hashtags: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialQuery) {
      setSearchQuery(initialQuery);
      performQuery(initialQuery);
    }
  }, [initialQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      performQuery(searchQuery.trim());
    }
  };

  const performQuery = async (term: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`);
      if (!res.ok) throw new Error('Search request failed. Please check network.');
      const data = await res.json();
      setResults(data);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="search-page-container" className="max-w-3xl mx-auto py-6 px-4">
      
      {/* Search Input block */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm mb-6">
        <h1 className="text-lg sm:text-xl font-black text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
          <Search className="w-5.5 h-5.5 text-indigo-500" />
          <span>Global Search Deck</span>
        </h1>

        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            placeholder="Type username, full name, post keywords or hashtags (e.g. #nature)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-450 dark:placeholder-slate-500 pl-11 pr-24 py-3 rounded-2xl focus:border-indigo-500 focus:ring-1 outline-none text-sm font-semibold transition"
          />
          <button
            type="submit"
            className="absolute right-2 top-2 px-5 py-2 hover:opacity-95 bg-linear-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Search
          </button>
        </form>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : errorMsg ? (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-center text-xs text-rose-500 font-bold">
          {errorMsg}
        </div>
      ) : searchQuery ? (
        <div className="space-y-6">
          
          {/* A. User Matches */}
          {results.users.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 block uppercase tracking-wider flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-indigo-500" />
                <span>Users ({results.users.length})</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {results.users.map((person) => (
                  <Link
                    key={person.id}
                    to={`/profile/${person.id}`}
                    className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-850 transition"
                  >
                    <img
                      src={person.profilePicture || `https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=${person.username}`}
                      alt={person.username}
                      className="w-10 h-10 rounded-full object-cover border"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">
                        {person.fullName}
                      </h4>
                      <span className="text-xs text-slate-400">@{person.username}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* B. Hashtag Tags matched */}
          {results.hashtags.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 block uppercase tracking-wider flex items-center gap-2">
                <Tag className="w-4 h-4 text-indigo-500" />
                <span>Trending Tags ({results.hashtags.length})</span>
              </h3>
              <div className="flex flex-wrap gap-2">
                {results.hashtags.map((tag) => (
                  <Link
                    key={tag}
                    to={`/search?q=${encodeURIComponent(tag)}`}
                    className="px-3 py-1.5 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 font-bold rounded-lg border border-indigo-100/30 text-xs transition"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* C. Post content matched */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 block uppercase tracking-wider mb-3.5 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-500" />
              <span>Posts ({results.posts.length})</span>
            </h3>
            {results.posts.length === 0 ? (
              <div className="text-center py-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
                <p className="text-xs text-slate-405 font-semibold">No matching posts or content found.</p>
              </div>
            ) : (
              results.posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                />
              ))
            )}
          </div>

        </div>
      ) : (
        <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs">
          <Compass className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
          <h3 className="font-bold text-slate-700 dark:text-slate-350">Platform Explorer</h3>
          <p className="text-xs text-slate-400 mx-auto mt-1 max-w-sm">
            Discover creative postings, popular tags like #tech, #design, or find profile directories instantly.
          </p>
        </div>
      )}

    </div>
  );
};
