import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';
import cors from 'cors';
import helmet from 'helmet';
import multer from 'multer';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { config, ensureRuntimeDirs } from './server/config';
import { getDb } from './server/db';
import { seedDatabase } from './server/seed';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

const { port: PORT, jwtSecret: JWT_SECRET, refreshSecret: REFRESH_SECRET, uploadsDir, nodeEnv } = config;

ensureRuntimeDirs();

// Multer photo upload storage setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only standard images are allowed!'));
    }
  },
});

// Middleware
app.use(cors());
app.use(helmet({
  contentSecurityPolicy: false, // Turned off for Vite HMR/preview capability
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

// Keep track of active users socket.io links
const userSockets = new Map<number, string>(); // userId -> socketId

io.on('connection', (socket) => {
  socket.on('join', (userId: number) => {
    userSockets.set(userId, socket.id);
  });

  socket.on('disconnect', () => {
    for (const [userId, socketId] of userSockets.entries()) {
      if (socketId === socket.id) {
        userSockets.delete(userId);
        break;
      }
    }
  });
});

// Helper to push notification
async function createAndSendNotification(
  receiverId: number,
  senderId: number,
  type: 'follow' | 'like' | 'comment',
  referenceId: number
) {
  if (receiverId === senderId) return; // Don't notify yourself

  const db = await getDb();
  await db.run(
    `INSERT INTO notifications (receiver_id, sender_id, type, reference_id)
     VALUES (?, ?, ?, ?)`,
    [receiverId, senderId, type, referenceId]
  );

  // Fetch fully hydrated notification object
  const senderInfo = await db.get(
    `SELECT username, profile_picture FROM users WHERE id = ?`,
    [senderId]
  );

  const notificationPayload = {
    id: Date.now(), // Fallback temporary ID or fetch lastInsertRowId
    receiverId,
    senderId,
    senderUsername: senderInfo?.username || 'user',
    senderProfilePicture: senderInfo?.profile_picture || null,
    type,
    referenceId,
    isRead: false,
    createdAt: new Date().toISOString(),
  };

  const socketId = userSockets.get(receiverId);
  if (socketId) {
    io.to(socketId).emit('notification', notificationPayload);
  }
}

// Rate limiter / security middleware
const rateLimiterMap = new Map<string, { count: number; expires: number }>();
function simpleRateLimiter(req: any, res: any, next: any) {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const userData = rateLimiterMap.get(ip);

  if (userData && now < userData.expires) {
    if (userData.count >= 100) {
      return res.status(429).json({ error: 'Too many requests. Please try again in 1 minute.' });
    }
    userData.count++;
  } else {
    rateLimiterMap.set(ip, { count: 1, expires: now + 60000 });
  }
  next();
}

app.use(simpleRateLimiter);

// Auth Middleware
function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication token required.' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: 'Access token expired or invalid.' });
    }
    req.user = user;
    next();
  });
}

// ---------------- API ENDPOINTS ----------------

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Authorization Ends
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password, confirmPassword, fullName } = req.body;

    if (!username || !email || !password || !confirmPassword || !fullName) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email address.' });
    }

    const db = await getDb();
    
    // Check duplication
    const existingUser = await db.get('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);
    if (existingUser) {
      return res.status(400).json({ error: 'Username or Email is already taken.' });
    }

    const passwordHash = await bcryptjs.hash(password, 10);
    const result = await db.run(
      `INSERT INTO users (username, email, password_hash, full_name, profile_picture)
       VALUES (?, ?, ?, ?, ?)`,
      [username.trim(), email.trim().toLowerCase(), passwordHash, fullName.trim(), null]
    );

    const userId = result.lastID;
    const accessToken = jwt.sign({ id: userId, username, email }, JWT_SECRET, { expiresIn: '1d' });
    const refreshToken = jwt.sign({ id: userId }, REFRESH_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'Registration successful!',
      userId,
      accessToken,
      refreshToken,
      user: { id: userId, username, email, fullName },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { loginIdentifier, password } = req.body; // supports email or username

    if (!loginIdentifier || !password) {
      return res.status(400).json({ error: 'Login identity and password are required.' });
    }

    const db = await getDb();
    const user = await db.get(
      'SELECT * FROM users WHERE username = ? OR email = ?',
      [loginIdentifier.trim(), loginIdentifier.trim().toLowerCase()]
    );

    if (!user) {
      return res.status(400).json({ error: 'Invalid login details.' });
    }

    const isMatch = await bcryptjs.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid password.' });
    }

    const accessToken = jwt.sign({ id: user.id, username: user.username, email: user.email }, JWT_SECRET, { expiresIn: '1d' });
    const refreshToken = jwt.sign({ id: user.id }, REFRESH_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Login successful!',
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        profilePicture: user.profile_picture,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.json({ message: 'Logged out successfully.' });
});

// Token Refresh Endpoint
app.post('/api/auth/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token required.' });
  }

  try {
    const payload: any = jwt.verify(refreshToken, REFRESH_SECRET);
    const db = await getDb();
    const user = await db.get(
      `SELECT id, username, email, full_name as fullName, profile_picture as profilePicture FROM users WHERE id = ?`,
      [payload.id]
    );

    if (!user) {
      return res.status(401).json({ error: 'User not found.' });
    }

    const newAccessToken = jwt.sign(
      { id: user.id, username: user.username, email: user.email },
      JWT_SECRET,
      { expiresIn: '1d' }
    );
    const newRefreshToken = jwt.sign({ id: user.id }, REFRESH_SECRET, { expiresIn: '7d' });

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user,
    });
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired refresh token. Please log in again.' });
  }
});

// USERS MODULE

// Suggested users to follow (must be before /:id route)
app.get('/api/users/suggestions', async (req: any, res) => {
  try {
    const db = await getDb();
    let currentUserId: number | null = null;
    const authHeader = req.headers['authorization'];
    if (authHeader?.split(' ')[1]) {
      try {
        const payload: any = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
        currentUserId = payload.id;
      } catch {
        // anonymous
      }
    }

    let suggestions;
    if (currentUserId) {
      suggestions = await db.all(
        `SELECT u.id, u.username, u.full_name as fullName, u.profile_picture as profilePicture, u.bio,
                CASE WHEN f.id IS NOT NULL THEN 1 ELSE 0 END as isFollowing
         FROM users u
         LEFT JOIN followers f ON f.following_id = u.id AND f.follower_id = ?
         WHERE u.id != ?
           AND f.id IS NULL
           AND u.email LIKE '%@demo.local'
         ORDER BY RANDOM()
         LIMIT 5`,
        [currentUserId, currentUserId],
      );
    } else {
      suggestions = await db.all(
        `SELECT u.id, u.username, u.full_name as fullName, u.profile_picture as profilePicture, u.bio,
                0 as isFollowing
         FROM users u
         WHERE u.email LIKE '%@demo.local'
         ORDER BY RANDOM()
         LIMIT 5`,
      );
    }

    res.json(
      suggestions.map((s: any) => ({
        ...s,
        isFollowing: s.isFollowing > 0,
      })),
    );
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/trending', async (_req, res) => {
  try {
    const db = await getDb();
    const rows = await db.all('SELECT caption FROM posts WHERE caption LIKE ?', ['%#%']);
    const tagCounts = new Map<string, number>();

    for (const row of rows) {
      if (!row.caption) continue;
      const matches = row.caption.match(/#[a-zA-Z0-9_]+/g);
      if (matches) {
        for (const tag of matches) {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        }
      }
    }

    const trending = [...tagCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([tag, count]) => ({ tag, postsCount: count }));

    res.json(trending);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const db = await getDb();

    const user = await db.get(
      `SELECT id, username, email, full_name as fullName, bio, profile_picture as profilePicture,
              cover_picture as coverPicture, website, created_at as joinDate FROM users WHERE id = ?`,
      [userId]
    );

    if (!user) {
      return res.status(404).json({ error: 'User profile not found.' });
    }

    // Counts
    const postsCountRow = await db.get('SELECT COUNT(*) as count FROM posts WHERE user_id = ?', [userId]);
    const followersCountRow = await db.get('SELECT COUNT(*) as count FROM followers WHERE following_id = ?', [userId]);
    const followingCountRow = await db.get('SELECT COUNT(*) as count FROM followers WHERE follower_id = ?', [userId]);

    res.json({
      ...user,
      postsCount: postsCountRow?.count || 0,
      followersCount: followersCountRow?.count || 0,
      followingCount: followingCountRow?.count || 0,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update Profile
app.put('/api/users/:id', authenticateToken, upload.fields([
  { name: 'profilePicture', maxCount: 1 },
  { name: 'coverPicture', maxCount: 1 }
]), async (req: any, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (req.user.id !== userId) {
      return res.status(403).json({ error: 'You are unauthorized to update this profile.' });
    }

    const { fullName, bio, website, email, username } = req.body;
    const db = await getDb();

    // Check credentials if changed
    if (email || username) {
      const existing = await db.get(
        'SELECT id FROM users WHERE (username = ? OR email = ?) AND id != ?',
        [username || '', email || '', userId]
      );
      if (existing) {
        return res.status(400).json({ error: 'Username or Email is already taken by another account.' });
      }
    }

    // Handle files
    let profilePictureUrl: string | undefined = undefined;
    let coverPictureUrl: string | undefined = undefined;

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    if (files) {
      if (files['profilePicture'] && files['profilePicture'][0]) {
        profilePictureUrl = `/uploads/${files['profilePicture'][0].filename}`;
      }
      if (files['coverPicture'] && files['coverPicture'][0]) {
        coverPictureUrl = `/uploads/${files['coverPicture'][0].filename}`;
      }
    }

    // Dynamic Updates
    await db.run(
      `UPDATE users
       SET full_name = COALESCE(?, full_name),
           bio = COALESCE(?, bio),
           website = COALESCE(?, website),
           email = COALESCE(?, email),
           username = COALESCE(?, username),
           profile_picture = COALESCE(?, profile_picture),
           cover_picture = COALESCE(?, cover_picture)
       WHERE id = ?`,
      [
        fullName || null,
        bio !== undefined ? bio : null,
        website !== undefined ? website : null,
        email || null,
        username || null,
        profilePictureUrl || null,
        coverPictureUrl || null,
        userId,
      ]
    );

    const updatedUser = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
    res.json({
      message: 'Profile updated success!',
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        fullName: updatedUser.full_name,
        profilePicture: updatedUser.profile_picture,
        coverPicture: updatedUser.cover_picture,
        bio: updatedUser.bio,
        website: updatedUser.website,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Follow User
app.post('/api/users/follow/:id', authenticateToken, async (req: any, res) => {
  try {
    const followingId = parseInt(req.params.id);
    const followerId = req.user.id;

    if (followerId === followingId) {
      return res.status(400).json({ error: "You cannot follow yourself." });
    }

    const db = await getDb();

    // Check if exists
    const userExist = await db.get('SELECT id FROM users WHERE id = ?', [followingId]);
    if (!userExist) {
      return res.status(404).json({ error: 'User does not exist.' });
    }

    await db.run(
      'INSERT OR IGNORE INTO followers (follower_id, following_id) VALUES (?, ?)',
      [followerId, followingId]
    );

    // Send Realtime Notification
    await createAndSendNotification(followingId, followerId, 'follow', followerId);

    res.json({ message: 'Successfully followed user.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Unfollow User
app.delete('/api/users/unfollow/:id', authenticateToken, async (req: any, res) => {
  try {
    const followingId = parseInt(req.params.id);
    const followerId = req.user.id;

    const db = await getDb();
    await db.run(
      'DELETE FROM followers WHERE follower_id = ? AND following_id = ?',
      [followerId, followingId]
    );

    res.json({ message: 'Successfully unfollowed user.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Followers List
app.get('/api/users/:id/followers', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const db = await getDb();
    const followers = await db.all(
      `SELECT u.id, u.username, u.full_name as fullName, u.profile_picture as profilePicture, u.bio
       FROM followers f
       JOIN users u ON f.follower_id = u.id
       WHERE f.following_id = ?`,
      [userId]
    );
    res.json(followers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users/:id/following', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const db = await getDb();
    const following = await db.all(
      `SELECT u.id, u.username, u.full_name as fullName, u.profile_picture as profilePicture, u.bio
       FROM followers f
       JOIN users u ON f.following_id = u.id
       WHERE f.follower_id = ?`,
      [userId]
    );
    res.json(following);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST METHOD
app.post('/api/posts', authenticateToken, upload.single('image'), async (req: any, res) => {
  try {
    const { caption } = req.body;
    const userId = req.user.id;

    let imageUrl: string | null = null;
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    }

    if (!caption && !imageUrl) {
      return res.status(400).json({ error: 'Post must contain either text caption or image.' });
    }

    const db = await getDb();
    const result = await db.run(
      `INSERT INTO posts (user_id, caption, image_url) VALUES (?, ?, ?)`,
      [userId, caption || null, imageUrl]
    );

    const newPostId = result.lastID;
    const postDetails = await db.get(
      `SELECT p.id, p.user_id as userId, u.username, u.full_name as userFullName, u.profile_picture as profilePicture,
              p.caption, p.image_url as imageUrl, p.created_at as createdAt, p.updated_at as updatedAt
       FROM posts p
       JOIN users u ON p.user_id = u.id
       WHERE p.id = ?`,
      [newPostId]
    );

    res.status(201).json({
      message: 'Post created successfully!',
      post: {
        ...postDetails,
        likesCount: 0,
        commentsCount: 0,
        isLikedByUser: false,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Global Feed (or personal + following)
app.get('/api/posts', async (req: any, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    const authHeader = req.headers['authorization'];
    let loggedInUserId: number | null = null;

    if (authHeader && authHeader.split(' ')[1]) {
      try {
        const tokenToken = authHeader.split(' ')[1];
        const payload: any = jwt.verify(tokenToken, JWT_SECRET);
        loggedInUserId = payload.id;
      } catch (err) {
        // Just keep as anonymous
      }
    }

    const db = await getDb();

    let posts;
    if (loggedInUserId) {
      // Show followed posts + user posts + general public fallback posts
      posts = await db.all(
        `SELECT p.id, p.user_id as userId, u.username, u.full_name as userFullName, u.profile_picture as profilePicture,
                p.caption, p.image_url as imageUrl, p.created_at as createdAt, p.updated_at as updatedAt,
                (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likesCount,
                (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as commentsCount,
                (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = ?) as isLikedByUser
         FROM posts p
         JOIN users u ON p.user_id = u.id
         LEFT JOIN followers f ON f.following_id = p.user_id AND f.follower_id = ?
         ORDER BY (p.user_id = ? OR f.follower_id IS NOT NULL) DESC, p.created_at DESC
         LIMIT ? OFFSET ?`,
        [loggedInUserId, loggedInUserId, loggedInUserId, limit, offset]
      );
    } else {
      posts = await db.all(
        `SELECT p.id, p.user_id as userId, u.username, u.full_name as userFullName, u.profile_picture as profilePicture,
                p.caption, p.image_url as imageUrl, p.created_at as createdAt, p.updated_at as updatedAt,
                (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likesCount,
                (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as commentsCount,
                0 as isLikedByUser
         FROM posts p
         JOIN users u ON p.user_id = u.id
         ORDER BY p.created_at DESC
         LIMIT ? OFFSET ?`,
        [limit, offset]
      );
    }

    // Map `isLikedByUser` is boolean
    const hydratedPosts = posts.map((p) => ({
      ...p,
      isLikedByUser: p.isLikedByUser > 0,
    }));

    res.json(hydratedPosts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get User Specific Posts
app.get('/api/users/:id/posts', async (req, res) => {
  try {
    const profileId = parseInt(req.params.id);
    const db = await getDb();

    const posts = await db.all(
      `SELECT p.id, p.user_id as userId, u.username, u.full_name as userFullName, u.profile_picture as profilePicture,
              p.caption, p.image_url as imageUrl, p.created_at as createdAt, p.updated_at as updatedAt,
              (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likesCount,
              (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as commentsCount,
              0 as isLikedByUser
       FROM posts p
       JOIN users u ON p.user_id = u.id
       WHERE p.user_id = ?
       ORDER BY p.created_at DESC`,
      [profileId]
    );

    res.json(posts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Single Post view
app.get('/api/posts/:id', async (req: any, res) => {
  try {
    const postId = parseInt(req.params.id);
    const db = await getDb();

    const post = await db.get(
      `SELECT p.id, p.user_id as userId, u.username, u.full_name as userFullName, u.profile_picture as profilePicture,
              p.caption, p.image_url as imageUrl, p.created_at as createdAt, p.updated_at as updatedAt,
              (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likesCount,
              (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as commentsCount
       FROM posts p
       JOIN users u ON p.user_id = u.id
       WHERE p.id = ?`,
      [postId]
    );

    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    res.json({
      ...post,
      isLikedByUser: false,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Put modify specific post
app.put('/api/posts/:id', authenticateToken, async (req: any, res) => {
  try {
    const postId = parseInt(req.params.id);
    const { caption } = req.body;
    const db = await getDb();

    const post = await db.get('SELECT user_id FROM posts WHERE id = ?', [postId]);
    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    if (post.user_id !== req.user.id) {
      return res.status(403).json({ error: 'You do not have permission to modify this post.' });
    }

    await db.run(
      'UPDATE posts SET caption = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [caption, postId]
    );

    res.json({ message: 'Post updated successfully!' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete specific post
app.delete('/api/posts/:id', authenticateToken, async (req: any, res) => {
  try {
    const postId = parseInt(req.params.id);
    const db = await getDb();

    const post = await db.get('SELECT user_id FROM posts WHERE id = ?', [postId]);
    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    if (post.user_id !== req.user.id) {
      return res.status(403).json({ error: 'You do not have permission to delete this post.' });
    }

    await db.run('DELETE FROM posts WHERE id = ?', [postId]);
    res.json({ message: 'Post deleted successfully!' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// LIKES SYSTEM
app.post('/api/posts/:id/like', authenticateToken, async (req: any, res) => {
  try {
    const postId = parseInt(req.params.id);
    const userId = req.user.id;

    const db = await getDb();
    const post = await db.get('SELECT user_id FROM posts WHERE id = ?', [postId]);
    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    await db.run(
      'INSERT OR IGNORE INTO likes (post_id, user_id) VALUES (?, ?)',
      [postId, userId]
    );

    // Realtime notification
    await createAndSendNotification(post.user_id, userId, 'like', postId);

    const countRow = await db.get('SELECT COUNT(*) as count FROM likes WHERE post_id = ?', [postId]);

    res.json({ message: 'Logged Like.', likesCount: countRow?.count || 0 });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/posts/:id/unlike', authenticateToken, async (req: any, res) => {
  try {
    const postId = parseInt(req.params.id);
    const userId = req.user.id;

    const db = await getDb();
    await db.run(
      'DELETE FROM likes WHERE post_id = ? AND user_id = ?',
      [postId, userId]
    );

    const countRow = await db.get('SELECT COUNT(*) as count FROM likes WHERE post_id = ?', [postId]);

    res.json({ message: 'Logged Unlike.', likesCount: countRow?.count || 0 });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// COMMENTS SYSTEM
app.post('/api/comments', authenticateToken, async (req: any, res) => {
  try {
    const { postId, commentText } = req.body;
    const userId = req.user.id;

    if (!postId || !commentText) {
      return res.status(400).json({ error: 'Post ID and comment content are required.' });
    }

    const db = await getDb();
    const post = await db.get('SELECT user_id FROM posts WHERE id = ?', [postId]);
    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    const result = await db.run(
      'INSERT INTO comments (post_id, user_id, comment_text) VALUES (?, ?, ?)',
      [postId, userId, commentText.trim()]
    );

    const newCommentId = result.lastID;

    // Send notification
    await createAndSendNotification(post.user_id, userId, 'comment', postId);

    const commentInfo = await db.get(
      `SELECT c.id, c.post_id as postId, c.user_id as userId, c.comment_text as commentText, c.created_at as createdAt,
              u.username, u.profile_picture as profilePicture
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.id = ?`,
      [newCommentId]
    );

    res.status(201).json(commentInfo);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/comments/:postId', async (req, res) => {
  try {
    const postId = parseInt(req.params.postId);
    const db = await getDb();
    const comments = await db.all(
      `SELECT c.id, c.post_id as postId, c.user_id as userId, c.comment_text as commentText, c.created_at as createdAt,
              u.username, u.profile_picture as profilePicture
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.post_id = ?
       ORDER BY c.created_at ASC`,
      [postId]
    );
    res.json(comments);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/comments/:id', authenticateToken, async (req: any, res) => {
  try {
    const commentId = parseInt(req.params.id);
    const db = await getDb();

    const comment = await db.get('SELECT user_id FROM comments WHERE id = ?', [commentId]);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found.' });
    }

    if (comment.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied to delete comment.' });
    }

    await db.run('DELETE FROM comments WHERE id = ?', [commentId]);
    res.json({ message: 'Comment deleted successfully.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// NOTIFICATION MODULE
app.get('/api/notifications', authenticateToken, async (req: any, res) => {
  try {
    const receiverId = req.user.id;
    const db = await getDb();

    const list = await db.all(
      `SELECT n.id, n.receiver_id as receiverId, n.sender_id as senderId, n.type, n.reference_id as referenceId,
              n.is_read as isRead, n.created_at as createdAt, u.username as senderUsername,
              u.profile_picture as senderProfilePicture
       FROM notifications n
       JOIN users u ON n.sender_id = u.id
       WHERE n.receiver_id = ?
       ORDER BY n.created_at DESC`,
      [receiverId]
    );

    // Map database 0/1 to boolean
    const notifications = list.map((n) => ({
      ...n,
      isRead: n.isRead > 0,
    }));

    res.json(notifications);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/notifications/read', authenticateToken, async (req: any, res) => {
  try {
    const receiverId = req.user.id;
    const db = await getDb();

    await db.run(
      'UPDATE notifications SET is_read = 1 WHERE receiver_id = ?',
      [receiverId]
    );

    res.json({ message: 'All notifications marked read.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GLOBAL SEARCH
app.get('/api/search', async (req, res) => {
  try {
    const query = req.query.q ? String(req.query.q).trim() : '';
    if (!query) {
      return res.json({ users: [], posts: [], hashtags: [] });
    }

    const db = await getDb();

    const userResults = await db.all(
      `SELECT id, username, full_name as fullName, profile_picture as profilePicture, bio
       FROM users
       WHERE username LIKE ? OR full_name LIKE ?
       LIMIT 10`,
      [`%${query}%`, `%${query}%`]
    );

    const postResults = await db.all(
      `SELECT p.id, p.user_id as userId, u.username, u.full_name as userFullName, u.profile_picture as profilePicture,
              p.caption, p.image_url as imageUrl, p.created_at as createdAt, p.updated_at as updatedAt,
              (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likesCount,
              (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as commentsCount
       FROM posts p
       JOIN users u ON p.user_id = u.id
       WHERE p.caption LIKE ?
       ORDER BY p.created_at DESC
       LIMIT 10`,
      [`%${query}%`]
    );

    // Simple parser for matching hash tags within the captions database wide
    const hashtagsSet = new Set<string>();
    const postsWithHashtags = await db.all('SELECT caption FROM posts WHERE caption LIKE ?', [`%#${query}%`]);
    postsWithHashtags.forEach((row) => {
      if (row.caption) {
        const matches = row.caption.match(/#[a-zA-Z0-9_]+/g);
        if (matches) {
          matches.forEach((m: string) => {
            if (m.toLowerCase().includes(query.toLowerCase())) {
              hashtagsSet.add(m);
            }
          });
        }
      }
    });

    res.json({
      users: userResults,
      posts: postResults.map((p) => ({ ...p, isLikedByUser: false })),
      hashtags: Array.from(hashtagsSet),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Settings Management: Password Change, Email update, Account deletion
app.put('/api/settings/update', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { email, username, currentPassword, newPassword } = req.body;
    const db = await getDb();

    // Check user info
    const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Verify current password first
    const isMatch = await bcryptjs.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Incorrect current password.' });
    }

    if (username && username !== user.username) {
      const existUser = await db.get('SELECT id FROM users WHERE username = ?', [username]);
      if (existUser) {
        return res.status(400).json({ error: 'Username is already taken.' });
      }
      await db.run('UPDATE users SET username = ? WHERE id = ?', [username, userId]);
    }

    if (email && email !== user.email) {
      const existUser = await db.get('SELECT id FROM users WHERE email = ?', [email]);
      if (existUser) {
        return res.status(400).json({ error: 'Email is already taken.' });
      }
      await db.run('UPDATE users SET email = ? WHERE id = ?', [email, userId]);
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
      }
      const newHash = await bcryptjs.hash(newPassword, 10);
      await db.run('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, userId]);
    }

    res.json({ message: 'Settings changed successfully!' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete account
app.delete('/api/settings/delete-account', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword } = req.body;
    const db = await getDb();

    const user = await db.get('SELECT password_hash FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const isMatch = await bcryptjs.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Incorrect password supplied. Action cancelled.' });
    }

    await db.run('DELETE FROM users WHERE id = ?', [userId]);
    res.json({ message: 'Account successfully deleted.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// VITE MIDDLEWARE INTERPOLATION
async function start() {
  const db = await getDb();
  await seedDatabase(db);

  if (nodeEnv !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Fire up HTTP Server
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[SERVER] EAJ Social running at http://0.0.0.0:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Fatal initialization error:', err);
});
