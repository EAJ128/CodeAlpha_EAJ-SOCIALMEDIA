import bcryptjs from 'bcryptjs';
import { Database } from 'sqlite';

const DEMO_PASSWORD = 'Demo123!';

const DEMO_USERS = [
  {
    username: 'sarah_design',
    email: 'sarah@demo.local',
    fullName: 'Sarah Jenkins',
    bio: 'Product designer · UI systems · Design tokens enthusiast',
    website: 'sarahjenkins.design',
    profilePicture: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah_design',
    coverPicture: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1200&h=400&fit=crop',
  },
  {
    username: 'marcus_dev',
    email: 'marcus@demo.local',
    fullName: 'Marcus Thorne',
    bio: 'Full-stack engineer building social platforms',
    website: 'github.com/marcusdev',
    profilePicture: 'https://api.dicebear.com/7.x/avataaars/svg?seed=marcus_dev',
    coverPicture: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&h=400&fit=crop',
  },
  {
    username: 'elena_writes',
    email: 'elena@demo.local',
    fullName: 'Elena Fisher',
    bio: 'Tech journalist · Opinion pieces · Future of work',
    website: 'elenafisher.io',
    profilePicture: 'https://api.dicebear.com/7.x/avataaars/svg?seed=elena_writes',
    coverPicture: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&h=400&fit=crop',
  },
  {
    username: 'alex_photo',
    email: 'alex@demo.local',
    fullName: 'Alex Rivera',
    bio: 'Street photographer · Travel · Visual storytelling',
    website: 'alexrivera.photo',
    profilePicture: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alex_photo',
    coverPicture: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=400&fit=crop',
  },
  {
    username: 'priya_ai',
    email: 'priya@demo.local',
    fullName: 'Priya Sharma',
    bio: 'ML researcher · Open source · #AI ethics advocate',
    website: 'priyasharma.dev',
    profilePicture: 'https://api.dicebear.com/7.x/avataaars/svg?seed=priya_ai',
    coverPicture: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&h=400&fit=crop',
  },
  {
    username: 'jordan_fitness',
    email: 'jordan@demo.local',
    fullName: 'Jordan Lee',
    bio: 'Coach · Wellness · Morning routines that stick',
    website: null,
    profilePicture: 'https://api.dicebear.com/7.x/avataaars/svg?seed=jordan_fitness',
    coverPicture: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=1200&h=400&fit=crop',
  },
  {
    username: 'nina_music',
    email: 'nina@demo.local',
    fullName: 'Nina Okonkwo',
    bio: 'Producer · Lo-fi beats · Studio sessions',
    website: 'soundcloud.com/ninaok',
    profilePicture: 'https://api.dicebear.com/7.x/avataaars/svg?seed=nina_music',
    coverPicture: 'https://images.unsplash.com/photo-1511379938546-c1f69419868d?w=1200&h=400&fit=crop',
  },
  {
    username: 'david_startup',
    email: 'david@demo.local',
    fullName: 'David Chen',
    bio: 'Founder · SaaS · Building in public #startup',
    website: 'davidchen.co',
    profilePicture: 'https://api.dicebear.com/7.x/avataaars/svg?seed=david_startup',
    coverPicture: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=400&fit=crop',
  },
];

const DEMO_POSTS = [
  { user: 'sarah_design', caption: 'Just shipped a new design system for our team. Consistency wins every time. #design #UX', image: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&h=500&fit=crop' },
  { user: 'marcus_dev', caption: 'Hot take: SQLite is underrated for side projects. Fast, reliable, zero ops. #ReactNodeStack #dev', image: null },
  { user: 'elena_writes', caption: 'The best social products feel human first, algorithm second. What do you think? #EAJSocialRelease', image: null },
  { user: 'alex_photo', caption: 'Golden hour in the city never gets old. #photography #street', image: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&h=500&fit=crop' },
  { user: 'priya_ai', caption: 'Published notes on responsible AI deployment. Link in bio. #AI #tech', image: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&h=500&fit=crop' },
  { user: 'jordan_fitness', caption: '30-day challenge: 10k steps before noon. Day 12 and feeling great. #wellness #motivation', image: null },
  { user: 'nina_music', caption: 'New beat dropping Friday. Preview in stories. #music #creativity', image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&h=500&fit=crop' },
  { user: 'david_startup', caption: 'Week 8 of building in public. MRR crossed $2k. Grateful for this community. #startup #buildinpublic', image: null },
  { user: 'sarah_design', caption: 'Micro-interactions matter more than people think. Small details, big impact. #design', image: null },
  { user: 'marcus_dev', caption: 'Deployed our realtime notification stack today. WebSockets + JWT = chef kiss. #ReactNodeStack', image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&h=500&fit=crop' },
  { user: 'elena_writes', caption: 'Interviewed three founders this week. Common thread: listen to users early. #startup', image: null },
  { user: 'alex_photo', caption: 'Rainy day mood. #photography #mood', image: 'https://images.unsplash.com/photo-1423666639041-f56000c27a9a?w=800&h=500&fit=crop' },
  { user: 'priya_ai', caption: 'Workshop on prompt engineering was packed. Thanks everyone who joined! #AI #learning', image: null },
  { user: 'jordan_fitness', caption: 'Meal prep Sunday. Protein, greens, and good vibes. #wellness', image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&h=500&fit=crop' },
  { user: 'nina_music', caption: 'Collaborating with local artists this month. DM for features. #music', image: null },
  { user: 'david_startup', caption: 'Hiring our first engineer. If you love React + Node, say hi. #startup #hiring', image: null },
  { user: 'sarah_design', caption: 'Dark mode is not an afterthought — design for both from day one. #UX #design', image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&h=500&fit=crop' },
  { user: 'marcus_dev', caption: 'Refactored auth flow this weekend. Refresh tokens are your friend. #dev #security', image: null },
  { user: 'elena_writes', caption: 'Long read: how communities form online in 2026. #EAJSocialRelease #tech', image: null },
  { user: 'alex_photo', caption: 'Minimalism in frame composition. Less is more. #photography #minimal', image: 'https://images.unsplash.com/photo-1499781350541-7783f6c6a3c8?w=800&h=500&fit=crop' },
];

const DEMO_COMMENTS = [
  'This is so true!',
  'Great insight, thanks for sharing.',
  'Love this perspective.',
  'Could not agree more.',
  'Saving this for later.',
  'Well said!',
];

export async function seedDatabase(db: Database): Promise<void> {
  const existing = await db.get('SELECT id FROM users WHERE email = ?', ['sarah@demo.local']);
  if (existing) return;

  const passwordHash = await bcryptjs.hash(DEMO_PASSWORD, 10);
  const userIds = new Map<string, number>();

  for (const user of DEMO_USERS) {
    const result = await db.run(
      `INSERT INTO users (username, email, password_hash, full_name, bio, profile_picture, cover_picture, website)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.username,
        user.email,
        passwordHash,
        user.fullName,
        user.bio,
        user.profilePicture,
        user.coverPicture,
        user.website,
      ],
    );
    userIds.set(user.username, result.lastID!);
  }

  const postIds: number[] = [];
  for (const post of DEMO_POSTS) {
    const userId = userIds.get(post.user);
    if (!userId) continue;
    const result = await db.run(
      'INSERT INTO posts (user_id, caption, image_url) VALUES (?, ?, ?)',
      [userId, post.caption, post.image],
    );
    postIds.push(result.lastID!);
  }

  const usernames = [...userIds.keys()];
  const followPairs: [string, string][] = [
    ['sarah_design', 'marcus_dev'],
    ['sarah_design', 'elena_writes'],
    ['marcus_dev', 'sarah_design'],
    ['marcus_dev', 'priya_ai'],
    ['elena_writes', 'david_startup'],
    ['elena_writes', 'alex_photo'],
    ['alex_photo', 'nina_music'],
    ['priya_ai', 'marcus_dev'],
    ['priya_ai', 'elena_writes'],
    ['jordan_fitness', 'sarah_design'],
    ['nina_music', 'alex_photo'],
    ['david_startup', 'marcus_dev'],
    ['david_startup', 'priya_ai'],
    ['david_startup', 'elena_writes'],
  ];

  for (const [follower, following] of followPairs) {
    const followerId = userIds.get(follower);
    const followingId = userIds.get(following);
    if (followerId && followingId) {
      await db.run(
        'INSERT OR IGNORE INTO followers (follower_id, following_id) VALUES (?, ?)',
        [followerId, followingId],
      );
    }
  }

  for (let i = 0; i < postIds.length; i++) {
    const postId = postIds[i];
    const likerUsername = usernames[(i + 2) % usernames.length];
    const likerId = userIds.get(likerUsername);
    if (likerId) {
      await db.run(
        'INSERT OR IGNORE INTO likes (post_id, user_id) VALUES (?, ?)',
        [postId, likerId],
      );
    }

    if (i % 2 === 0) {
      const commenterUsername = usernames[(i + 4) % usernames.length];
      const commenterId = userIds.get(commenterUsername);
      if (commenterId) {
        await db.run(
          'INSERT INTO comments (post_id, user_id, comment_text) VALUES (?, ?, ?)',
          [postId, commenterId, DEMO_COMMENTS[i % DEMO_COMMENTS.length]],
        );
      }
    }
  }

  console.log('[seed] Demo users, posts, follows, likes, and comments created.');
  console.log('[seed] Demo account password (all demo users): Demo123!');
}
