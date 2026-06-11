/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CreatePost } from '../components/CreatePost';
import { PostCard } from '../components/PostCard';
import { Post } from '../types';
import { LogIn, Compass } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Feed: React.FC = () => {
  const { token, user } = useAuth();
  const location = useLocation();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Pagination states
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const LIMIT = 10;

  // Fetch feed posts on mount or offset alteration
  useEffect(() => {
    fetchFeed(0, true);
  }, [token]);

  useEffect(() => {
    if (location.hash.startsWith('#post-') && posts.length > 0) {
      const el = document.querySelector(location.hash);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [location.hash, posts]);

  const fetchFeed = async (newOffset: number, replace = false) => {
    if (replace) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }
    setErrorMsg(null);

    try {
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`/api/posts?limit=${LIMIT}&offset=${newOffset}`, {
        headers,
      });

      if (!res.ok) {
        throw new Error('Failed to download feed. Please log in or refresh.');
      }

      const data: Post[] = await res.json();
      
      if (data.length < LIMIT) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }

      if (replace) {
        setPosts(data);
      } else {
        setPosts((prev) => [...prev, ...data]);
      }
      setOffset(newOffset);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const handlePostCreated = (newPost: Post) => {
    // Add to top of local timeline immediately
    setPosts((prev) => [newPost, ...prev]);
  };

  const handlePostDeleted = (postId: number) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  const handleLoadMore = () => {
    const nextOffset = offset + LIMIT;
    fetchFeed(nextOffset, false);
  };

  return (
    <div id="home-feed-page" className="max-w-2xl mx-auto py-6 px-4">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Home feed</h1>
        <span className="text-xs font-medium text-slate-500 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 py-1 px-2.5 rounded-md">
          Latest posts
        </span>
      </div>

      {!user && (
        <div id="guest-register-banner" className="mb-5 p-5 card dark:bg-slate-900 border-blue-200 dark:border-blue-900/50 bg-blue-50/30 dark:bg-blue-950/20">
          <p className="text-base font-semibold text-slate-900 dark:text-slate-100">Join EAJ Social</p>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Create an account to post, follow creators, and get realtime notifications.
          </p>
          <div className="mt-4 flex gap-3">
            <Link to="/register" className="btn-primary rounded-md text-sm">
              Sign up free
            </Link>
            <Link to="/login" className="btn-secondary rounded-md text-sm flex items-center gap-1.5">
              <LogIn className="w-4 h-4" />
              Log in
            </Link>
          </div>
        </div>
      )}

      {/* Post creator block (for users only) */}
      {user && <CreatePost onPostCreated={handlePostCreated} />}

      {/* Listing Timeline */}
      <div id="posts-list-timeline" className="space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 animate-pulse">
                <div className="flex gap-3 items-center mb-4">
                  <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-1/3 bg-slate-200 dark:bg-slate-800 rounded" />
                    <div className="h-3 w-1/4 bg-slate-200 dark:bg-slate-800 rounded" />
                  </div>
                </div>
                <div className="h-16 w-full bg-slate-200 dark:bg-slate-800 rounded-xl mb-3" />
                <div className="h-40 w-full bg-slate-100 dark:bg-slate-950 rounded-xl" />
              </div>
            ))}
          </div>
        ) : errorMsg ? (
          <div className="text-center py-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <p className="text-rose-500 font-bold mb-2">{errorMsg}</p>
            <button
              onClick={() => fetchFeed(0, true)}
              className="btn-primary rounded-md text-xs"
            >
              Try Loading Again
            </button>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="max-w-sm mx-auto space-y-3">
              <Compass className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
              <h3 className="font-bold text-slate-700 dark:text-slate-350">Your timeline is empty</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Looks like nobody has published any posts yet. Be the first to share your thoughts!
              </p>
            </div>
          </div>
        ) : (
          <>
            {posts.map((post) => (
              <div key={post.id} id={`post-${post.id}`}>
                <PostCard post={post} onPostDeleted={handlePostDeleted} />
              </div>
            ))}

            {/* Pagination trigger button */}
            {hasMore ? (
              <div className="text-center pt-4 pb-8">
                <button
                  id="load-more-posts-btn"
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="btn-secondary rounded-md text-sm disabled:opacity-50"
                >
                  {isLoadingMore ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-slate-400 border-t-indigo-500 rounded-full animate-spin" />
                      Loading more...
                    </span>
                  ) : (
                    'Load Older Posts'
                  )}
                </button>
              </div>
            ) : (
              <p className="text-center text-xs font-semibold text-slate-405 dark:text-slate-500 py-6">
                You've reached the very end of EAJ Social. 🎉
              </p>
            )}
          </>
        )}
      </div>

    </div>
  );
};
