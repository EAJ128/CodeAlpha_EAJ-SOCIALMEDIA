/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Post, Comment } from '../types';
import { Heart, MessageSquare, Trash2, Edit2, Check, X, Send, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PostCardProps {
  post: Post;
  onPostDeleted?: (postId: number) => void;
}

export const PostCard: React.FC<PostCardProps> = ({ post, onPostDeleted }) => {
  const { token, user, authFetch } = useAuth();
  
  // Like state
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const [isLiked, setIsLiked] = useState(post.isLikedByUser || false);
  const [likeIsLoading, setLikeIsLoading] = useState(false);

  // Comments state
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount);
  const [newComment, setNewComment] = useState('');
  const [commentsAreLoading, setCommentsAreLoading] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  // Edit states
  const [isEditing, setIsEditing] = useState(false);
  const [editedCaption, setEditedCaption] = useState(post.caption);
  const [isUpdatingPost, setIsUpdatingPost] = useState(false);

  // Reset edited caption when editing is closed
  useEffect(() => {
    if (!isEditing) {
      setEditedCaption(post.caption);
    }
  }, [isEditing, post.caption]);

  const isOwner = user?.id === post.userId;

  // Sync isLiked and counts if the post prop changes
  useEffect(() => {
    setLikesCount(post.likesCount);
    setIsLiked(post.isLikedByUser || false);
    setCommentsCount(post.commentsCount);
  }, [post]);

  const handleLikeToggle = async () => {
    if (!token) return;
    if (likeIsLoading) return;

    setLikeIsLoading(true);
    const originalLiked = isLiked;
    const originalCount = likesCount;

    setIsLiked(!originalLiked);
    setLikesCount(originalLiked ? originalCount - 1 : originalCount + 1);

    try {
      const method = originalLiked ? 'DELETE' : 'POST';
      const endpoint = `/api/posts/${post.id}/${originalLiked ? 'unlike' : 'like'}`;

      const res = await authFetch(endpoint, { method });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLikesCount(data.likesCount);
    } catch (err) {
      setIsLiked(originalLiked);
      setLikesCount(originalCount);
    } finally {
      setLikeIsLoading(false);
    }
  };

  const handleToggleComments = async () => {
    const nextShow = !showComments;
    setShowComments(nextShow);
    if (nextShow && comments.length === 0) {
      await fetchComments();
    }
  };

  const fetchComments = async () => {
    setCommentsAreLoading(true);
    setCommentError(null);
    try {
      const res = await fetch(`/api/comments/${post.id}`);
      if (!res.ok) throw new Error('Failed to load comments');
      const data = await res.json();
      setComments(data);
    } catch (err: any) {
      setCommentError(err.message);
    } finally {
      setCommentsAreLoading(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!newComment.trim()) return;

    setCommentError(null);
    try {
      const res = await authFetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post.id, commentText: newComment.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit comment.');

      setComments((prev) => [...prev, data]);
      setCommentsCount((prev) => prev + 1);
      setNewComment('');
    } catch (err: any) {
      setCommentError(err.message);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!token) return;
    try {
      const res = await authFetch(`/api/comments/${commentId}`, { method: 'DELETE' });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error);
      }
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setCommentsCount((prev) => prev - 1);
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  };

  const handleUpdatePost = async () => {
    if (!token) return;
    setIsUpdatingPost(true);
    try {
      const res = await authFetch(`/api/posts/${post.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caption: editedCaption }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      post.caption = editedCaption;
      setIsEditing(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingPost(false);
    }
  };

  const handleDeletePost = async () => {
    if (!token) return;
    if (!window.confirm('Are you sure you want to delete this post? This cannot be undone.')) return;

    try {
      const res = await authFetch(`/api/posts/${post.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      if (onPostDeleted) onPostDeleted(post.id);
    } catch (err) {
      console.error(err);
    }
  };

  const formatCaption = (text: string) => {
    if (!text) return '';
    const parts = text.split(/(\s+)/);
    return parts.map((part, index) => {
      if (part.startsWith('#') && part.length > 1) {
        return (
          <Link
            key={index}
            to={`/search?q=${encodeURIComponent(part)}`}
            className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
          >
            {part}
          </Link>
        );
      }
      return part;
    });
  };

  const timeAgo = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const secs = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (secs < 60) return 'Just now';
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <motion.article
      id={`post-card-${post.id}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="card dark:bg-slate-900 mb-5 overflow-hidden hover:shadow-md transition-shadow duration-200 max-w-full"
    >
      {/* Post Owner Header info */}
      <div className="flex items-center justify-between p-4 sm:p-5 pb-3">
        <Link to={`/profile/${post.userId}`} className="flex items-center gap-3 group outline-none">
          <img
            src={post.profilePicture || `https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=${post.username}`}
            alt={post.username}
            className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700"
            referrerPolicy="no-referrer"
          />
          <div>
            <span className="font-bold text-sm sm:text-base text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 transition truncate block max-w-[150px] sm:max-w-[250px]">
              {post.userFullName}
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500 block">
              @{post.username} • {timeAgo(post.createdAt)}
            </span>
          </div>
        </Link>

        {isOwner && (
          <div className="flex items-center gap-1">
            {!isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800/80 rounded-full transition outline-none"
                  title="Edit Caption"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={handleDeletePost}
                  className="p-2 text-slate-400 hover:text-rose-500 hover:bg-slate-50 dark:hover:bg-slate-800/80 rounded-full transition outline-none"
                  title="Delete Post"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            ) : null}
          </div>
        )}
      </div>

      {/* Post content body */}
      <div className="px-4 sm:px-5 pb-3">
        {isEditing ? (
          <div className="space-y-2 border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-slate-50 dark:bg-slate-950 mt-1">
            <textarea
              value={editedCaption}
              onChange={(e) => setEditedCaption(e.target.value)}
              className="w-full text-sm text-slate-800 dark:text-slate-100 bg-transparent resize-none border-none outline-none focus:ring-0 min-h-[60px]"
            />
            <div className="flex justify-end gap-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setIsEditing(false)}
                disabled={isUpdatingPost}
                className="p-1 px-3 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-full transition"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdatePost}
                disabled={isUpdatingPost}
                className="p-1 px-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-full transition flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save</span>
              </button>
            </div>
          </div>
        ) : (
          <p className="text-slate-800 dark:text-slate-200 leading-relaxed text-sm sm:text-base font-sans break-words whitespace-pre-wrap">
            {formatCaption(post.caption)}
          </p>
        )}
      </div>

      {/* Attached artwork */}
      {post.imageUrl && (
        <div className="relative border-y border-slate-100 dark:border-slate-800/50 bg-slate-50 dark:bg-slate-950/40">
          <img
            src={post.imageUrl}
            alt="Upload visual material"
            className="w-full max-h-[500px] object-cover sm:object-contain mx-auto"
            loading="lazy"
          />
        </div>
      )}

      {/* Actions (Like / Comment metrics) */}
      <div className="flex items-center gap-4 px-4 py-2 bg-slate-50/50 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-800">
        <button
          onClick={handleLikeToggle}
          disabled={!token}
          className={`flex items-center gap-1.5 p-2 text-xs sm:text-sm font-bold transition rounded-full ${
            !token ? 'opacity-50 cursor-not-allowed' : 'hover:bg-rose-50 dark:hover:bg-rose-950/20'
          } ${
            isLiked ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-400'
          }`}
          title={isLiked ? 'Unlike Post' : 'Like Post'}
        >
          <Heart className={`w-5 h-5 transition-transform duration-200 ${isLiked ? 'fill-rose-500 text-rose-500 scale-110 animate-pulse' : ''}`} />
          <span>{likesCount}</span>
        </button>

        <button
          onClick={handleToggleComments}
          className="flex items-center gap-1.5 p-2 text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 rounded-full transition"
          title="Toggle comments"
        >
          <MessageSquare className="w-5 h-5 text-slate-500" />
          <span>{commentsCount}</span>
        </button>
      </div>

      {/* Expandable Comments Drawer Area */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-slate-150 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/15 overflow-hidden"
          >
            <div className="p-4 sm:p-5 space-y-4">
              
              {/* Comment inputs */}
              {token ? (
                <form onSubmit={handleAddComment} className="flex gap-3 items-end">
                  <img
                    src={user?.profilePicture || `https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=${user?.username}`}
                    alt="Current user avatar"
                    className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-800 object-cover hidden sm:block"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      placeholder="Add a friendly / helpful comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 pl-4 pr-11 py-2 rounded-full focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950/40 outline-none text-sm transition"
                    />
                    <button
                      type="submit"
                      disabled={!newComment.trim()}
                      className="absolute right-1.5 top-1.5 p-1 bg-indigo-600 text-white rounded-full disabled:bg-slate-250 dark:disabled:bg-slate-800 disabled:opacity-50 hover:bg-indigo-500 transition cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </form>
              ) : (
                <div className="text-center p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs text-slate-500">
                  Please{' '}
                  <Link to="/login" className="text-indigo-600 hover:underline font-bold">
                    log in
                  </Link>{' '}
                  to add a comment.
                </div>
              )}

              {commentError && (
                <div className="flex gap-2 items-center text-xs text-rose-500 font-semibold p-2 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 rounded-lg">
                  <AlertCircle className="w-4 h-4" />
                  <span>{commentError}</span>
                </div>
              )}

              {/* List Comments */}
              <div className="space-y-3.5 mt-2">
                {commentsAreLoading ? (
                  <div className="flex justify-center py-4">
                    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : comments.length === 0 ? (
                  <p className="text-center text-xs font-medium text-slate-400 py-3">
                    No comments yet. Start the conversation!
                  </p>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3 items-start group/comment max-w-full">
                      <Link to={`/profile/${comment.userId}`}>
                        <img
                          src={comment.profilePicture || `https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=${comment.username}`}
                          alt={comment.username}
                          className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-slate-800"
                          referrerPolicy="no-referrer"
                        />
                      </Link>
                      
                      <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 px-3.5 py-2.5 rounded-2xl shadow-2xs overflow-hidden max-w-full">
                        <div className="flex items-center justify-between gap-2 overflow-hidden">
                          <Link to={`/profile/${comment.userId}`} className="font-bold text-xs hover:underline text-slate-900 dark:text-slate-100 truncate">
                            @{comment.username}
                          </Link>
                          <span className="text-[10px] text-slate-400 block shrink-0">
                            {timeAgo(comment.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 leading-relaxed break-words font-sans">
                          {comment.commentText}
                        </p>
                      </div>

                      {(user?.id === comment.userId || isOwner) && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="opacity-0 group-hover/comment:opacity-100 p-2 text-slate-400 hover:text-rose-500 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition outline-none"
                          title="Delete Comment"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
};
