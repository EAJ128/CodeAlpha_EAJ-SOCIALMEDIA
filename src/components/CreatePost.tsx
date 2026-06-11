/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Image as ImageIcon, X, Send, AlertCircle, Sparkles } from 'lucide-react';
import { Post } from '../types';

interface CreatePostProps {
  onPostCreated: (newPost: Post) => void;
}

export const CreatePost: React.FC<CreatePostProps> = ({ onPostCreated }) => {
  const { token, user } = useAuth();
  const [caption, setCaption] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drag and drop states
  const [isDragging, setIsDragging] = useState(false);

  if (!user) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        setErrorMsg('Image size must be smaller than 5MB.');
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setErrorMsg(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (!file.type.match('image.*')) {
        setErrorMsg('Only image uploads are supported here.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setErrorMsg('Image size must be smaller than 5MB.');
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setErrorMsg(null);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caption.trim() && !imageFile) {
      setErrorMsg('Please enter a caption or select an image file to post.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const formData = new FormData();
    formData.append('caption', caption);
    if (imageFile) {
      formData.append('image', imageFile);
    }

    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to publish post.');
      }

      setCaption('');
      handleRemoveImage();
      onPostCreated(data.post);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <article
      id="create-post-card"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`bg-white dark:bg-slate-900 border ${
        isDragging 
          ? 'border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/15' 
          : 'border-slate-200 dark:border-slate-800'
      } rounded-2xl p-4 sm:p-5 shadow-sm transition-all duration-200 relative mb-6 overflow-hidden`}
    >
      <div className="flex gap-4 items-start">
        <img
          src={user.profilePicture || `https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=${user.username}`}
          alt={user.username}
          className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover border border-slate-200 dark:border-slate-700"
          referrerPolicy="no-referrer"
        />

        <form onSubmit={handleSubmit} className="flex-1 space-y-3.5">
          <textarea
            id="post-caption-textarea"
            placeholder="Share your latest thoughts, projects, or creative photos here..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="w-full min-h-[90px] text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 border-none outline-hidden resize-none bg-transparent font-sans text-sm sm:text-base leading-relaxed focus:ring-0 focus:outline-hidden"
          />

          {/* Visual preview attached */}
          {imagePreview && (
            <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 group bg-slate-50 dark:bg-slate-950">
              <img
                src={imagePreview}
                alt="Upload preview"
                className="max-h-[350px] w-full object-contain mx-auto"
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute top-2 right-2 bg-slate-900/75 hover:bg-rose-600 text-white p-1.5 rounded-full backdrop-blur-xs transition duration-150 shadow-md outline-none"
                title="Remove attached photo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {errorMsg && (
            <div className="flex gap-2 items-center text-xs text-rose-500 font-bold bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 p-2.5 rounded-lg animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3.5 mt-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition duration-150 outline-none"
                title="Attach photo (JPEG/PNG/GIF)"
              >
                <ImageIcon className="w-4.5 h-4.5 text-indigo-500" />
                <span className="hidden sm:inline">Attach Photo</span>
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
              <span className="hidden lg:inline text-[11px] text-slate-400 font-medium">
                (Drag & drop photos supported)
              </span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || (!caption.trim() && !imageFile)}
              className="px-5 py-2 hover:opacity-95 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-250 dark:disabled:bg-slate-800 disabled:opacity-50 text-white text-xs sm:text-sm font-bold rounded-full shadow-lg hover:shadow-indigo-500/20 transition duration-150 outline-none flex items-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4.5 h-4.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Publishing...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Post to Feed</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </article>
  );
};
