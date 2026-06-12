/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Post } from '../types';
import { PostCard } from '../components/PostCard';
import { Camera, Calendar, Link as LinkIcon, UserPlus, UserMinus, FileText, CheckCircle, Upload, Check, AlertCircle, Edit3 } from 'lucide-react';

export const Profile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const parsedUserId = parseInt(id || '0');
  
  const { user: currentUser, token, updateCurrentUser, authFetch } = useAuth();
  
  const [profile, setProfile] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [followers, setFollowers] = useState<any[]>([]);
  const [following, setFollowing] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'posts' | 'followers' | 'following'>('posts');
  
  // Follow/Unfollow states
  const [isFollowing, setIsFollowing] = useState(false);
  const [followIsLoading, setFollowIsLoading] = useState(false);

  // Edit in-place or modal states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null);

  // Reset profile edit states to stored defaults when editing is closed
  useEffect(() => {
    if (!isEditingProfile && profile) {
      setEditFullName(profile.fullName);
      setEditBio(profile.bio || '');
      setEditWebsite(profile.website || '');
    }
  }, [isEditingProfile, profile]);

  // Hidden file inputs
  const profilePicInputRef = useRef<HTMLInputElement>(null);
  const coverPicInputRef = useRef<HTMLInputElement>(null);

  const isOwnProfile = currentUser?.id === parsedUserId;

  useEffect(() => {
    setActiveTab('posts');
    loadProfileAndContent();
  }, [id, currentUser]);

  const loadProfileAndContent = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      // 1. Load User Profile
      const userRes = await fetch(`/api/users/${parsedUserId}`);
      if (!userRes.ok) {
        throw new Error('User profile request failed. Profile might not exist.');
      }
      const userData: User = await userRes.json();
      setProfile(userData);

      // Inplace values
      setEditFullName(userData.fullName);
      setEditBio(userData.bio || '');
      setEditWebsite(userData.website || '');

      // 2. Load User Posts
      const postsRes = await fetch(`/api/users/${parsedUserId}/posts`);
      if (postsRes.ok) {
        const postsData = await postsRes.json();
        setPosts(postsData);
      }

      // 3. Load Followers List
      const followersRes = await fetch(`/api/users/${parsedUserId}/followers`);
      if (followersRes.ok) {
        const followersData = await followersRes.json();
        setFollowers(followersData);
        
        // Is current user following this profile?
        if (currentUser) {
          const matching = followersData.some((f: any) => f.id === currentUser.id);
          setIsFollowing(matching);
        }
      }

      // 4. Load Following List
      const followingRes = await fetch(`/api/users/${parsedUserId}/following`);
      if (followingRes.ok) {
        const followingData = await followingRes.json();
        setFollowing(followingData);
      }

    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollowToggle = async () => {
    if (!token || !profile) return;
    setFollowIsLoading(true);

    try {
      const endpoint = `/api/users/${isFollowing ? 'unfollow' : 'follow'}/${profile.id}`;
      const method = isFollowing ? 'DELETE' : 'POST';

      const res = await authFetch(endpoint, { method });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error);
      }

      setIsFollowing(!isFollowing);
      // Increment or decrement follower count dynamically
      setProfile((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          followersCount: isFollowing 
            ? (prev.followersCount || 1) - 1 
            : (prev.followersCount || 0) + 1,
        } as User;
      });

      // Refetch connections
      const followersRes = await fetch(`/api/users/${parsedUserId}/followers`);
      if (followersRes.ok) {
        const followersData = await followersRes.json();
        setFollowers(followersData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFollowIsLoading(false);
    }
  };

  // Upload Photo directly (Profile picture or Cover picture)
  const handlePhotoUpload = async (file: File, type: 'profilePicture' | 'coverPicture') => {
    if (!token || !currentUser) return;
    const formData = new FormData();
    formData.append(type, file);

    try {
      const res = await authFetch(`/api/users/${currentUser.id}`, {
        method: 'PUT',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload photo.');
      }

      // Update contexts and state
      updateCurrentUser(data.user);
      setProfile((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          profilePicture: type === 'profilePicture' ? data.user.profilePicture : prev.profilePicture,
          coverPicture: type === 'coverPicture' ? data.user.coverPicture : prev.coverPicture,
        };
      });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleProfileUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !currentUser) return;

    setIsSavingProfile(true);
    setProfileSaveError(null);

    try {
      const res = await authFetch(`/api/users/${currentUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: editFullName,
          bio: editBio,
          website: editWebsite,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update profile.');
      }

      updateCurrentUser(data.user);
      setProfile((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          fullName: data.user.fullName,
          bio: data.user.bio,
          website: data.user.website,
        };
      });
      setIsEditingProfile(false);
    } catch (err: any) {
      setProfileSaveError(err.message);
    } finally {
      setIsSavingProfile(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 flex justify-center items-center">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (errorMsg || !profile) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Profile Not Found</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{errorMsg || 'User is empty'}</p>
        <Link to="/" className="inline-block mt-4 text-indigo-600 dark:text-indigo-400 font-bold hover:underline">
          Go back to Timeline
        </Link>
      </div>
    );
  }

  return (
    <div id="user-profile-page" className="max-w-3xl mx-auto py-6 px-4">
      
      {/* 1. Header Hero Banner (Cover Picture + Profile Pic) */}
      <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs mb-6">
        
        {/* Cover Photo */}
        <div className="h-44 sm:h-56 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-sky-500/20 relative group overflow-hidden bg-slate-100 dark:bg-slate-950">
          {profile.coverPicture ? (
            <img
              src={profile.coverPicture}
              alt="Cover backdrop"
              className="w-full h-full object-cover"
            />
          ) : null}
          
          {isOwnProfile && (
            <button
              onClick={() => coverPicInputRef.current?.click()}
              className="absolute bottom-3 right-3 bg-slate-900/70 hover:bg-slate-900/95 text-white text-xs font-bold py-1.5 px-3 rounded-full backdrop-blur-xs transition duration-150 flex items-center gap-1.5 shadow-md outline-none"
              title="Change Backdrop"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Change Cover</span>
            </button>
          )}
          <input
            type="file"
            ref={coverPicInputRef}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handlePhotoUpload(e.target.files[0], 'coverPicture');
              }
            }}
            accept="image/*"
            className="hidden"
          />
        </div>

        {/* Profile Card Bottom Info */}
        <div className="px-6 pb-6 pt-1">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 -mt-16 sm:-mt-20">
            
            {/* Profile Avatar */}
            <div className="relative group rounded-full border-4 border-white dark:border-slate-900 shadow-xl bg-slate-100 dark:bg-slate-950 overflow-hidden w-28 h-28 sm:w-32 sm:h-32">
              <img
                src={profile.profilePicture || `https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=${profile.username}`}
                alt={profile.username}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              
              {isOwnProfile && (
                <button
                  onClick={() => profilePicInputRef.current?.click()}
                  className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition duration-150 rounded-full"
                  title="Upload profile picture"
                >
                  <Camera className="w-6 h-6" />
                </button>
              )}
              <input
                type="file"
                ref={profilePicInputRef}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handlePhotoUpload(e.target.files[0], 'profilePicture');
                  }
                }}
                accept="image/*"
                className="hidden"
              />
            </div>

            {/* Profile Buttons actions */}
            <div className="flex items-center gap-2 mb-2 w-full sm:w-auto justify-end">
              {isOwnProfile ? (
                <button
                  onClick={() => setIsEditingProfile(!isEditingProfile)}
                  className="px-4.5 py-2 hover:opacity-95 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-205 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-bold rounded-full transition duration-150 outline-none flex items-center gap-2 cursor-pointer ml-auto"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>{isEditingProfile ? 'Cancel Editing' : 'Edit Profile'}</span>
                </button>
              ) : token ? (
                <button
                  onClick={handleFollowToggle}
                  disabled={followIsLoading}
                  className={`px-5 py-2 text-xs sm:text-sm font-bold rounded-full shadow hover:shadow-lg transition flex items-center gap-2 outline-none cursor-pointer ml-auto ${
                    isFollowing
                      ? 'bg-slate-150 dark:bg-slate-800 text-slate-705 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {isFollowing ? (
                    <>
                      <UserMinus className="w-4 h-4" />
                      <span>Unfollow</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Follow</span>
                    </>
                  )}
                </button>
              ) : null}
            </div>
          </div>

          {/* User Bio Information */}
          <div className="mt-4 space-y-1.5 max-w-2xl">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">
              {profile.fullName}
            </h2>
            <span className="text-sm font-semibold text-slate-400 dark:text-slate-500 block">
              @{profile.username}
            </span>

            {profile.bio ? (
              <p className="text-slate-700 dark:text-slate-300 text-sm sm:text-base leading-relaxed break-words whitespace-pre-wrap">
                {profile.bio}
              </p>
            ) : (
              <p className="text-slate-400 dark:text-slate-500 italic text-xs py-1">
                No bio information provided.
              </p>
            )}

            {/* Icons indicators */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-400 font-semibold pt-1.5">
              {profile.website && (
                <a
                  href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                  <span>{profile.website}</span>
                </a>
              )}
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>Joined {new Date(profile.joinDate).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</span>
              </div>
            </div>

            {/* Counts summaries */}
            <div className="flex gap-4 sm:gap-6 pt-3.5 border-t border-slate-100 dark:border-slate-800/80 mt-4 text-sm font-semibold">
              <button onClick={() => setActiveTab('posts')} className="hover:text-indigo-600 transition">
                <span className="font-extrabold text-slate-800 dark:text-slate-100">{profile.postsCount || posts.length}</span>{' '}
                <span className="text-slate-400 text-xs">Posts</span>
              </button>
              <button onClick={() => setActiveTab('followers')} className="hover:text-indigo-600 transition">
                <span className="font-extrabold text-slate-800 dark:text-slate-100">{profile.followersCount || followers.length}</span>{' '}
                <span className="text-slate-400 text-xs">Followers</span>
              </button>
              <button onClick={() => setActiveTab('following')} className="hover:text-indigo-600 transition">
                <span className="font-extrabold text-slate-800 dark:text-slate-100">{profile.followingCount || following.length}</span>{' '}
                <span className="text-slate-400 text-xs">Following</span>
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* 2. In-place Update Profile details form */}
      {isEditingProfile && (
        <div id="profile-editing-card" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm mb-6 animate-fade-in">
          <h3 className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
            <Upload className="w-5 h-5 text-indigo-500" />
            <span>Update Profile Details</span>
          </h3>

          <form onSubmit={handleProfileUpdateSubmit} className="space-y-4">
            {profileSaveError && (
              <div className="flex gap-2 items-center text-xs text-rose-500 font-bold bg-rose-50 dark:bg-rose-950/20 p-2.5 rounded-lg border border-rose-200">
                <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                <span>{profileSaveError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-550 dark:text-slate-400 block uppercase">Full Name</label>
              <input
                type="text"
                value={editFullName}
                onChange={(e) => setEditFullName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 px-4 py-2 rounded-xl focus:border-indigo-500 focus:ring-1 outline-none text-sm font-semibold transition"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-550 dark:text-slate-400 block uppercase">Bio Description</label>
              <textarea
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                placeholder="Write a tiny introduction for your visitors..."
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 px-4 py-2 rounded-xl focus:border-indigo-500 focus:ring-1 outline-none text-sm h-24 resize-none transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-550 dark:text-slate-400 block uppercase">Website / External Links</label>
              <input
                type="text"
                value={editWebsite}
                onChange={(e) => setEditWebsite(e.target.value)}
                placeholder="github.com/my-profile"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 px-4 py-2 rounded-xl focus:border-indigo-500 focus:ring-1 outline-none text-sm transition"
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => setIsEditingProfile(false)}
                className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400"
              >
                Discard
              </button>
              <button
                type="submit"
                disabled={isSavingProfile}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-505 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-xs sm:text-sm rounded-xl hover:shadow-lg transition cursor-pointer flex items-center gap-1.5"
              >
                {isSavingProfile ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3. Navigation Tabs Content list */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6">
        <button
          onClick={() => setActiveTab('posts')}
          className={`flex-1 py-3 text-sm font-bold border-b-2 transition ${
            activeTab === 'posts'
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Posts ({posts.length})
        </button>
        <button
          onClick={() => setActiveTab('followers')}
          className={`flex-1 py-3 text-sm font-bold border-b-2 transition ${
            activeTab === 'followers'
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Followers ({followers.length})
        </button>
        <button
          onClick={() => setActiveTab('following')}
          className={`flex-1 py-3 text-sm font-bold border-b-2 transition ${
            activeTab === 'following'
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Following ({following.length})
        </button>
      </div>

      {/* Primary tab lists */}
      <div>
        {activeTab === 'posts' && (
          <div className="space-y-4">
            {posts.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
                <FileText className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                <p className="text-xs sm:text-sm text-slate-500 font-medium">No posts compiled yet.</p>
              </div>
            ) : (
              posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onPostDeleted={(id) => setPosts((prev) => prev.filter((p) => p.id !== id))}
                />
              ))
            )}
          </div>
        )}

        {/* Followers List View */}
        {activeTab === 'followers' && (
          <div className="space-y-3">
            {followers.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
                <p className="text-xs sm:text-sm text-slate-550 font-medium">No followers to show.</p>
              </div>
            ) : (
              followers.map((person) => (
                <Link
                  key={person.id}
                  to={`/profile/${person.id}`}
                  className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850/60 border border-slate-200 dark:border-slate-800 rounded-2xl transition"
                >
                  <img
                    src={person.profilePicture || `https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=${person.username}`}
                    alt={person.username}
                    className="w-10 h-10 rounded-full object-cover border"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                      {person.fullName}
                    </h4>
                    <span className="text-xs text-slate-455 dark:text-slate-500">@{person.username}</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        )}

        {/* Following List View */}
        {activeTab === 'following' && (
          <div className="space-y-3">
            {following.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
                <p className="text-xs sm:text-sm text-slate-550 font-medium">Not following anyone yet.</p>
              </div>
            ) : (
              following.map((person) => (
                <Link
                  key={person.id}
                  to={`/profile/${person.id}`}
                  className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850/60 border border-slate-200 dark:border-slate-800 rounded-2xl transition"
                >
                  <img
                    src={person.profilePicture || `https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=${person.username}`}
                    alt={person.username}
                    className="w-10 h-10 rounded-full object-cover border"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                      {person.fullName}
                    </h4>
                    <span className="text-xs text-slate-455 dark:text-slate-500">@{person.username}</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        )}
      </div>

    </div>
  );
};
