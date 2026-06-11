import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const envLocalPath = path.join(rootDir, '.env.local');

if (fs.existsSync(envLocalPath)) {
  console.log('.env.local already exists — nothing to do.');
  process.exit(0);
}

const jwtSecret = crypto.randomBytes(32).toString('hex');
const refreshSecret = crypto.randomBytes(32).toString('hex');

const envContent = `# Local environment — do not commit this file
PORT=3000
JWT_SECRET=${jwtSecret}
REFRESH_SECRET=${refreshSecret}
`;

fs.writeFileSync(envLocalPath, envContent, 'utf8');
console.log('Created .env.local with secure random secrets.');
console.log('Run "npm run dev" to start the app.');
