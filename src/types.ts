/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  bio: string | null;
  profilePicture: string | null;
  coverPicture: string | null;
  website: string | null;
  joinDate: string;
  followersCount?: number;
  followingCount?: number;
  postsCount?: number;
}

export interface Post {
  id: number;
  userId: number;
  username: string;
  userFullName: string;
  profilePicture: string | null;
  caption: string;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
  likesCount: number;
  commentsCount: number;
  isLikedByUser?: boolean;
}

export interface Comment {
  id: number;
  postId: number;
  userId: number;
  username: string;
  profilePicture: string | null;
  commentText: string;
  createdAt: string;
}

export interface Notification {
  id: number;
  receiverId: number;
  senderId: number;
  senderUsername: string;
  senderProfilePicture: string | null;
  type: 'follow' | 'like' | 'comment';
  referenceId: number;
  isRead: boolean;
  createdAt: string;
}

export interface SearchResults {
  users: User[];
  posts: Post[];
  hashtags: string[];
}
