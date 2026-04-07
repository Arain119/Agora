import low from 'lowdb';
import FileSync from 'lowdb/adapters/FileSync';
import path from 'path';
import bcrypt from 'bcryptjs';

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  role: 'ADMIN' | 'USER';
  createdAt: string;
}

export interface UserToken {
  id: string;
  userId: string;
  name: string;
  token: string;
  createdAt: string;
}

export interface UpstreamKey {
  id: string;
  key: string;
  name: string;
  isActive: boolean;
  errorCount: number;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface RequestLog {
  id: string;
  userId: string | null;
  tokenId: string | null;
  upstreamKeyId: string | null;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  durationMs: number;
  status: number;
  createdAt: string;
}

export interface CommunityPost {
  id: string;
  authorId: string;
  authorName: string;
  type: string;
  content: string;
  likes: number;
  createdAt: string;
}

export interface Schema {
  users: User[];
  userTokens: UserToken[];
  upstreamKeys: UpstreamKey[];
  requestLogs: RequestLog[];
  community_posts: CommunityPost[];
}

const adapter = new FileSync<Schema>(path.join(__dirname, '../../db.json'));
export const db = low(adapter);

export async function initDb() {
  db.defaults({
    users: [],
    userTokens: [],
    upstreamKeys: [],
    requestLogs: [],
    community_posts: []
  }).write();

  // Create default admin if no users exist
  const users = db.get('users').value();
  if (users.length === 0) {
    const adminHash = bcrypt.hashSync('admin123', 10);
    db.get('users').push({
      id: 'usr_admin',
      username: 'admin',
      passwordHash: adminHash,
      role: 'ADMIN',
      createdAt: new Date().toISOString()
    }).write();

    // Pre-seed NVIDIA keys provided by user
    const initialKeys = [
      "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",
      "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",
      "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",
      "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",
      "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"
    ];

    initialKeys.forEach((key, index) => {
      db.get('upstreamKeys').push({
        id: `upk_${index + 1}`,
        key: key,
        name: `NVIDIA Initial Key ${index + 1}`,
        isActive: true,
        errorCount: 0,
        lastUsedAt: null,
        createdAt: new Date().toISOString()
      }).write();
    });
    console.log('Database initialized with default admin and NVIDIA keys.');
  }
}
