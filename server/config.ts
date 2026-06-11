import crypto from 'crypto';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();

dotenv.config({ path: path.join(rootDir, '.env.local') });
dotenv.config({ path: path.join(rootDir, '.env') });

function requireSecret(name: 'JWT_SECRET' | 'REFRESH_SECRET'): string {
  const value = process.env[name]?.trim();
  if (value) return value;

  if (process.env.NODE_ENV === 'production') {
    console.error(
      `[config] Missing required environment variable: ${name}. ` +
        'Set it in your hosting provider before starting the server.',
    );
    process.exit(1);
  }

  const generated = crypto.randomBytes(32).toString('hex');
  console.warn(
    `[config] ${name} is not set. Using a temporary development secret for this session only.`,
  );
  return generated;
}

const dataDir = process.env.DATA_DIR?.trim() || rootDir;

export const config = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: requireSecret('JWT_SECRET'),
  refreshSecret: requireSecret('REFRESH_SECRET'),
  dataDir,
  uploadsDir: path.join(dataDir, 'public', 'uploads'),
  dbPath: path.join(dataDir, 'database.sqlite'),
} as const;

export function ensureRuntimeDirs(): void {
  if (!fs.existsSync(config.dataDir)) {
    fs.mkdirSync(config.dataDir, { recursive: true });
  }
  if (!fs.existsSync(config.uploadsDir)) {
    fs.mkdirSync(config.uploadsDir, { recursive: true });
  }
}
