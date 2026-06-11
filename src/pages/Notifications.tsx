/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Bell, Check, UserPlus, Heart, MessageSquare, AlertCircle } from 'lucide-react';

export const Notifications: React.FC = () => {
  const { token, user, notifications, unreadNotificationsCount, markNotificationsAsRead, fetchNotifications } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      fetchNotifications();
    }
  }, [token]);

  const handleMarkAllRead = async () => {
    await markNotificationsAsRead();
  };

  if (!user) {
    return (
      <div id="notifications-forbidden-alert" className="max-w-xl mx-auto py-12 px-4 text-center">
        <AlertCircle className="w-12 h-12 text-indigo-500 mx-auto mb-3" />
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Access Denied</h3>
        <p className="text-sm text-slate-500 mt-2">Please register or log in to check notifications database in real time.</p>
        <Link to="/login" className="inline-block mt-4 px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-full text-xs shadow hover:bg-indigo-500 transition">
          Log In Securely
        </Link>
      </div>
    );
  }

  return (
    <div id="notifications-page" className="max-w-2xl mx-auto py-6 px-4">
      
      {/* Notifications Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Bell className="text-indigo-505 w-6 h-6 text-indigo-500" />
          <span>My Notifications Hub</span>
        </h1>

        {unreadNotificationsCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 px-4 py-2 hover:opacity-95 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl border border-transparent transition cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Mark all read</span>
          </button>
        )}
      </div>

      {/* Notifications listing */}
      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs">
            <Bell className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
            <h3 className="font-bold text-slate-700 dark:text-slate-350">You're all caught up!</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              Any social engagements like follows, likes, or post comments will be reflected here in real time.
            </p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              className={`flex items-start justify-between gap-4 p-4 bg-white dark:bg-slate-900 border border-slate-20o border-slate-200 dark:border-slate-800/80 rounded-2xl transition hover:shadow-2xs ${
                !notif.isRead ? 'border-indigo-400/60 dark:border-indigo-805 bg-indigo-50/20 dark:bg-indigo-950/5' : ''
              }`}
            >
              <div className="flex items-start gap-3.5 flex-1 min-w-0">
                <Link to={`/profile/${notif.senderId}`} className="shrink-0">
                  <img
                    src={notif.senderProfilePicture || `https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=${notif.senderUsername}`}
                    alt={notif.senderUsername}
                    className="w-10 h-10 rounded-full border border-slate-200 object-cover"
                    referrerPolicy="no-referrer"
                  />
                </Link>

                <div className="min-w-0">
                  <p className="text-sm text-slate-705 dark:text-slate-300 leading-normal">
                    <span className="font-bold text-slate-900 dark:text-slate-100 hover:underline">
                      <Link to={`/profile/${notif.senderId}`}>
                        @{notif.senderUsername}
                      </Link>
                    </span>
                    {notif.type === 'follow' && ' started following your updates.'}
                    {notif.type === 'like' && ' liked a photo / thought you shared.'}
                    {notif.type === 'comment' && ' added a feedback comment to your post.'}
                  </p>
                  
                  <div className="flex gap-2 items-center mt-1.5">
                    {notif.type === 'follow' && <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100/50 px-2 py-0.5 rounded font-bold uppercase tracking-wider flex items-center gap-1"><UserPlus className="w-3 h-3" /> Follower</span>}
                    {notif.type === 'like' && <span className="text-[10px] bg-rose-50 dark:bg-rose-950/10 text-rose-600 dark:text-rose-405 border border-rose-100/50 px-2 py-0.5 rounded font-bold uppercase tracking-wider flex items-center gap-1"><Heart className="w-3 h-3 fill-rose-500" /> Like</span>}
                    {notif.type === 'comment' && <span className="text-[10px] bg-sky-50 dark:bg-sky-950/10 text-sky-600 dark:text-sky-400 border border-sky-100/50 px-2 py-0.5 rounded font-bold uppercase tracking-wider flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" /> Comment</span>}

                    <span className="text-[11px] text-slate-400 block font-medium">
                      {new Date(notif.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Detail redirection action */}
              {notif.type !== 'follow' && (
                <Link
                  to={`/#post-${notif.referenceId}`}
                  className="px-3 py-1.5 text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline shrink-0"
                >
                  View post
                </Link>
              )}
            </div>
          ))
        )}
      </div>

    </div>
  );
};
