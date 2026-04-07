import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { computeCooldownUntil } from './upstreamHealth';

type BetterSqlite3Database = any;

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  role: 'ADMIN' | 'USER';
  createdAt: string;
}

export interface Invite {
  id: string;
  codeHash: string;
  status: 'ACTIVE' | 'USED' | 'REVOKED';
  note: string | null;
  expiresAt: string | null;
  createdAt: string;
  createdByUserId: string;
  usedAt: string | null;
  usedByUserId: string | null;
  revokedAt: string | null;
  revokedByUserId: string | null;
}

export interface UserToken {
  id: string;
  userId: string;
  name: string;
  tokenHash: string;
  tokenEnc: string;
  tokenPreview: string;
  createdAt: string;
}

export interface UpstreamKey {
  id: string;
  name: string;
  keyEnc: string;
  keyPreview: string;
  isActive: boolean;
  weight: number;
  errorCount: number;
  consecutiveFailures: number;
  cooldownUntil: string | null;
  lastUsedAt: string | null;
  lastErrorAt: string | null;
  lastSuccessAt: string | null;
  createdAt: string;
}

export interface RequestLog {
  id: string;
  requestId: string | null;
  userId: string | null;
  tokenId: string | null;
  upstreamKeyId: string | null;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  durationMs: number;
  status: number;
  upstreamAttempts: number;
  isStream: boolean;
  createdAt: string;
}

function getDataDir() {
  return path.join(__dirname, '../../data');
}

function getDbPath() {
  return process.env.DB_PATH || path.join(getDataDir(), 'agora.sqlite');
}

function getLegacyJsonPath() {
  return path.join(__dirname, '../../db.json');
}

function getSecretsPath() {
  return path.join(getDataDir(), 'secrets.json');
}

function ensureDir(dirPath: string) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function sha256Hex(input: string) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

type SecretsFile = {
  encryptionSecret: string;
};

let cachedKey: Buffer | null = null;
function getEncryptionKey(): Buffer {
  if (cachedKey) return cachedKey;

  const envSecret = process.env.ENCRYPTION_SECRET;
  if (envSecret && envSecret.trim()) {
    cachedKey = crypto.createHash('sha256').update(envSecret).digest();
    return cachedKey;
  }

  ensureDir(getDataDir());
  const secretsPath = getSecretsPath();

  let secrets: SecretsFile | null = null;
  if (fs.existsSync(secretsPath)) {
    try {
      secrets = JSON.parse(fs.readFileSync(secretsPath, 'utf8'));
    } catch (e) {
      // ignore and re-generate
      secrets = null;
    }
  }

  if (!secrets?.encryptionSecret) {
    const generated = crypto.randomBytes(32).toString('base64');
    secrets = { encryptionSecret: generated };
    fs.writeFileSync(secretsPath, JSON.stringify(secrets, null, 2), { mode: 0o600 });
  }

  cachedKey = crypto.createHash('sha256').update(secrets.encryptionSecret).digest();
  return cachedKey;
}

function encryptString(plaintext: string) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString('base64')}.${tag.toString('base64')}.${ciphertext.toString('base64')}`;
}

function decryptString(encrypted: string) {
  const [v, ivB64, tagB64, ctB64] = String(encrypted || '').split('.');
  if (v !== 'v1' || !ivB64 || !tagB64 || !ctB64) {
    throw new Error('Invalid encrypted payload');
  }
  const key = getEncryptionKey();
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const ciphertext = Buffer.from(ctB64, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString('utf8');
}

function previewSecret(value: string, head = 10, tail = 4) {
  const v = String(value || '');
  if (v.length <= head + tail) return v;
  return `${v.slice(0, head)}...${v.slice(-tail)}`;
}

let sqlite: BetterSqlite3Database | null = null;
function openDb(): BetterSqlite3Database {
  if (sqlite) return sqlite;

  // Use require() to avoid TS type dependency.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Database = require('better-sqlite3');

  const dbPath = getDbPath();
  ensureDir(path.dirname(dbPath));

  sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  sqlite.pragma('busy_timeout = 5000');

  return sqlite;
}

function createTables(db: BetterSqlite3Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS invites (
      id TEXT PRIMARY KEY,
      code_hash TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL,
      note TEXT,
      expires_at TEXT,
      created_at TEXT NOT NULL,
      created_by_user_id TEXT NOT NULL,
      used_at TEXT,
      used_by_user_id TEXT,
      revoked_at TEXT,
      revoked_by_user_id TEXT
    );

    CREATE TABLE IF NOT EXISTS user_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      token_enc TEXT NOT NULL,
      token_preview TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS upstream_keys (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      key_enc TEXT NOT NULL,
      key_preview TEXT NOT NULL,
      is_active INTEGER NOT NULL,
      weight INTEGER NOT NULL,
      error_count INTEGER NOT NULL,
      consecutive_failures INTEGER NOT NULL,
      cooldown_until TEXT,
      last_used_at TEXT,
      last_error_at TEXT,
      last_success_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS request_logs (
      id TEXT PRIMARY KEY,
      request_id TEXT,
      user_id TEXT,
      token_id TEXT,
      upstream_key_id TEXT,
      model TEXT NOT NULL,
      prompt_tokens INTEGER NOT NULL,
      completion_tokens INTEGER NOT NULL,
      total_tokens INTEGER NOT NULL,
      duration_ms INTEGER NOT NULL,
      status INTEGER NOT NULL,
      upstream_attempts INTEGER NOT NULL,
      is_stream INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_request_logs_user_created ON request_logs(user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_request_logs_created ON request_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_user_tokens_user ON user_tokens(user_id);
    CREATE INDEX IF NOT EXISTS idx_upstream_active_cooldown ON upstream_keys(is_active, cooldown_until);
  `);
}

function normalizeIso(value: any): string | null {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  if (!s) return null;
  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}

function migrateFromLegacyJsonIfNeeded(db: BetterSqlite3Database) {
  const dbPath = getDbPath();
  const legacyPath = getLegacyJsonPath();
  const hasUsers = db.prepare('SELECT COUNT(1) as c FROM users').get().c as number;

  if (hasUsers > 0) return;
  if (!fs.existsSync(legacyPath)) return;

  let legacy: any;
  try {
    legacy = JSON.parse(fs.readFileSync(legacyPath, 'utf8'));
  } catch (e) {
    return;
  }

  const users: any[] = Array.isArray(legacy?.users) ? legacy.users : [];
  const invites: any[] = Array.isArray(legacy?.invites) ? legacy.invites : [];
  const userTokens: any[] = Array.isArray(legacy?.userTokens) ? legacy.userTokens : [];
  const upstreamKeys: any[] = Array.isArray(legacy?.upstreamKeys) ? legacy.upstreamKeys : [];
  const requestLogs: any[] = Array.isArray(legacy?.requestLogs) ? legacy.requestLogs : [];

  const insertUser = db.prepare(
    'INSERT INTO users (id, username, password_hash, role, created_at) VALUES (@id, @username, @passwordHash, @role, @createdAt)'
  );
  const insertInvite = db.prepare(
    `INSERT INTO invites (
        id, code_hash, status, note, expires_at, created_at, created_by_user_id,
        used_at, used_by_user_id, revoked_at, revoked_by_user_id
      ) VALUES (
        @id, @codeHash, @status, @note, @expiresAt, @createdAt, @createdByUserId,
        @usedAt, @usedByUserId, @revokedAt, @revokedByUserId
      )`
  );
  const insertUserToken = db.prepare(
    `INSERT INTO user_tokens (id, user_id, name, token_hash, token_enc, token_preview, created_at)
     VALUES (@id, @userId, @name, @tokenHash, @tokenEnc, @tokenPreview, @createdAt)`
  );
  const insertUpstream = db.prepare(
    `INSERT INTO upstream_keys (
        id, name, key_enc, key_preview, is_active, weight, error_count,
        consecutive_failures, cooldown_until, last_used_at, last_error_at, last_success_at, created_at
      ) VALUES (
        @id, @name, @keyEnc, @keyPreview, @isActive, @weight, @errorCount,
        @consecutiveFailures, @cooldownUntil, @lastUsedAt, @lastErrorAt, @lastSuccessAt, @createdAt
      )`
  );
  const insertLog = db.prepare(
    `INSERT INTO request_logs (
        id, request_id, user_id, token_id, upstream_key_id, model,
        prompt_tokens, completion_tokens, total_tokens, duration_ms, status, upstream_attempts, is_stream, created_at
      ) VALUES (
        @id, @requestId, @userId, @tokenId, @upstreamKeyId, @model,
        @promptTokens, @completionTokens, @totalTokens, @durationMs, @status, @upstreamAttempts, @isStream, @createdAt
      )`
  );

  const run = db.transaction(() => {
    for (const u of users) {
      if (!u?.id || !u?.username || !u?.passwordHash || !u?.role || !u?.createdAt) continue;
      insertUser.run({
        id: String(u.id),
        username: String(u.username),
        passwordHash: String(u.passwordHash),
        role: String(u.role),
        createdAt: String(u.createdAt)
      });
    }

    for (const i of invites) {
      if (!i?.id || !i?.codeHash || !i?.status || !i?.createdAt || !i?.createdByUserId) continue;
      insertInvite.run({
        id: String(i.id),
        codeHash: String(i.codeHash),
        status: String(i.status),
        note: typeof i.note === 'string' ? i.note : i.note ?? null,
        expiresAt: normalizeIso(i.expiresAt),
        createdAt: String(i.createdAt),
        createdByUserId: String(i.createdByUserId),
        usedAt: normalizeIso(i.usedAt),
        usedByUserId: i.usedByUserId ?? null,
        revokedAt: normalizeIso(i.revokedAt),
        revokedByUserId: i.revokedByUserId ?? null
      });
    }

    for (const t of userTokens) {
      const rawToken = t?.token ? String(t.token) : null;
      if (!t?.id || !t?.userId || !t?.name || !t?.createdAt || !rawToken) continue;
      insertUserToken.run({
        id: String(t.id),
        userId: String(t.userId),
        name: String(t.name),
        tokenHash: sha256Hex(rawToken),
        tokenEnc: encryptString(rawToken),
        tokenPreview: previewSecret(rawToken, 12, 4),
        createdAt: String(t.createdAt)
      });
    }

    for (const k of upstreamKeys) {
      const rawKey = k?.key ? String(k.key) : null;
      if (!k?.id || !k?.name || !k?.createdAt || !rawKey) continue;
      insertUpstream.run({
        id: String(k.id),
        name: String(k.name),
        keyEnc: encryptString(rawKey),
        keyPreview: previewSecret(rawKey, 10, 6),
        isActive: k.isActive ? 1 : 0,
        weight: typeof k.weight === 'number' && Number.isFinite(k.weight) ? Math.max(0, Math.floor(k.weight)) : 1,
        errorCount: typeof k.errorCount === 'number' && Number.isFinite(k.errorCount) ? Math.max(0, Math.floor(k.errorCount)) : 0,
        consecutiveFailures:
          typeof k.consecutiveFailures === 'number' && Number.isFinite(k.consecutiveFailures) ? Math.max(0, Math.floor(k.consecutiveFailures)) : 0,
        cooldownUntil: normalizeIso(k.cooldownUntil),
        lastUsedAt: normalizeIso(k.lastUsedAt),
        lastErrorAt: normalizeIso(k.lastErrorAt),
        lastSuccessAt: normalizeIso(k.lastSuccessAt),
        createdAt: String(k.createdAt)
      });
    }

    for (const l of requestLogs) {
      if (!l?.id || !l?.model || !l?.createdAt) continue;
      insertLog.run({
        id: String(l.id),
        requestId: l.requestId ?? null,
        userId: l.userId ?? null,
        tokenId: l.tokenId ?? null,
        upstreamKeyId: l.upstreamKeyId ?? null,
        model: String(l.model),
        promptTokens: typeof l.promptTokens === 'number' ? l.promptTokens : 0,
        completionTokens: typeof l.completionTokens === 'number' ? l.completionTokens : 0,
        totalTokens: typeof l.totalTokens === 'number' ? l.totalTokens : 0,
        durationMs: typeof l.durationMs === 'number' ? l.durationMs : 0,
        status: typeof l.status === 'number' ? l.status : 0,
        upstreamAttempts: typeof l.upstreamAttempts === 'number' ? l.upstreamAttempts : 1,
        isStream: l.isStream ? 1 : 0,
        createdAt: String(l.createdAt)
      });
    }
  });

  run();

  try {
    const backupPath = `${legacyPath}.bak`;
    if (!fs.existsSync(backupPath)) {
      fs.renameSync(legacyPath, backupPath);
      fs.chmodSync(backupPath, 0o600);
    }
  } catch (e) {
    // ignore
  }

  console.log(`Migrated legacy JSON database -> SQLite at ${dbPath}`);
}

function ensureDefaultAdmin(db: BetterSqlite3Database) {
  const row = db.prepare('SELECT COUNT(1) as c FROM users').get() as any;
  const count = Number(row?.c) || 0;
  if (count > 0) return;

  const password = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';
  const adminHash = bcrypt.hashSync(password, 10);
  const now = new Date().toISOString();

  db.prepare('INSERT INTO users (id, username, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)').run(
    'usr_admin',
    'admin',
    adminHash,
    'ADMIN',
    now
  );

  console.log('Database initialized with default admin.');
}

export async function initDb() {
  const db = openDb();
  createTables(db);
  migrateFromLegacyJsonIfNeeded(db);
  ensureDefaultAdmin(db);
}

export function findUserByUsername(username: string): User | null {
  const db = openDb();
  const row = db.prepare('SELECT id, username, password_hash, role, created_at FROM users WHERE username = ?').get(username) as any;
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    passwordHash: row.password_hash,
    role: row.role,
    createdAt: row.created_at
  };
}

export function findUserById(id: string): User | null {
  const db = openDb();
  const row = db.prepare('SELECT id, username, password_hash, role, created_at FROM users WHERE id = ?').get(id) as any;
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    passwordHash: row.password_hash,
    role: row.role,
    createdAt: row.created_at
  };
}

export function listUsers(): Array<Pick<User, 'id' | 'username' | 'role' | 'createdAt'>> {
  const db = openDb();
  const rows = db.prepare('SELECT id, username, role, created_at FROM users ORDER BY created_at DESC').all() as any[];
  return rows.map((r) => ({ id: r.id, username: r.username, role: r.role, createdAt: r.created_at }));
}

export function createUser(user: User) {
  const db = openDb();
  db.prepare('INSERT INTO users (id, username, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)').run(
    user.id,
    user.username,
    user.passwordHash,
    user.role,
    user.createdAt
  );
}

export function findInviteByCodeHash(codeHash: string): Invite | null {
  const db = openDb();
  const row = db
    .prepare(
      `SELECT
        id, code_hash, status, note, expires_at, created_at, created_by_user_id,
        used_at, used_by_user_id, revoked_at, revoked_by_user_id
      FROM invites WHERE code_hash = ?`
    )
    .get(codeHash) as any;
  if (!row) return null;
  return {
    id: row.id,
    codeHash: row.code_hash,
    status: row.status,
    note: row.note ?? null,
    expiresAt: row.expires_at ?? null,
    createdAt: row.created_at,
    createdByUserId: row.created_by_user_id,
    usedAt: row.used_at ?? null,
    usedByUserId: row.used_by_user_id ?? null,
    revokedAt: row.revoked_at ?? null,
    revokedByUserId: row.revoked_by_user_id ?? null
  };
}

export function listInvites(status?: 'ACTIVE' | 'USED' | 'REVOKED') {
  const db = openDb();
  const rows = status
    ? (db
        .prepare(
          `SELECT
            id, status, note, expires_at, created_at, created_by_user_id,
            used_at, used_by_user_id, revoked_at, revoked_by_user_id
          FROM invites WHERE status = ? ORDER BY created_at DESC`
        )
        .all(status) as any[])
    : (db
        .prepare(
          `SELECT
            id, status, note, expires_at, created_at, created_by_user_id,
            used_at, used_by_user_id, revoked_at, revoked_by_user_id
          FROM invites ORDER BY created_at DESC`
        )
        .all() as any[]);

  return rows.map((r) => ({
    id: r.id,
    status: r.status,
    note: r.note ?? null,
    expiresAt: r.expires_at ?? null,
    createdAt: r.created_at,
    createdByUserId: r.created_by_user_id,
    usedAt: r.used_at ?? null,
    usedByUserId: r.used_by_user_id ?? null,
    revokedAt: r.revoked_at ?? null,
    revokedByUserId: r.revoked_by_user_id ?? null
  }));
}

export function createInvite(invite: Invite) {
  const db = openDb();
  db.prepare(
    `INSERT INTO invites (
        id, code_hash, status, note, expires_at, created_at, created_by_user_id,
        used_at, used_by_user_id, revoked_at, revoked_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    invite.id,
    invite.codeHash,
    invite.status,
    invite.note,
    invite.expiresAt,
    invite.createdAt,
    invite.createdByUserId,
    invite.usedAt,
    invite.usedByUserId,
    invite.revokedAt,
    invite.revokedByUserId
  );
}

export function markInviteUsed(inviteId: string, usedByUserId: string, usedAt: string) {
  const db = openDb();
  db.prepare(
    'UPDATE invites SET status = ?, used_at = ?, used_by_user_id = ? WHERE id = ?'
  ).run('USED', usedAt, usedByUserId, inviteId);
}

export function revokeInvite(inviteId: string, revokedByUserId: string, revokedAt: string) {
  const db = openDb();
  db.prepare(
    'UPDATE invites SET status = ?, revoked_at = ?, revoked_by_user_id = ? WHERE id = ?'
  ).run('REVOKED', revokedAt, revokedByUserId, inviteId);
}

export function listUserTokensByUserId(userId: string) {
  const db = openDb();
  const rows = db
    .prepare('SELECT id, user_id, name, token_enc, token_preview, created_at FROM user_tokens WHERE user_id = ? ORDER BY created_at DESC')
    .all(userId) as any[];
  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    name: r.name,
    token: decryptString(r.token_enc),
    tokenPreview: r.token_preview,
    createdAt: r.created_at
  }));
}

export function listUserTokensPreviewByUserId(userId: string) {
  const db = openDb();
  const rows = db
    .prepare('SELECT id, user_id, name, token_preview, created_at FROM user_tokens WHERE user_id = ? ORDER BY created_at DESC')
    .all(userId) as any[];
  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    name: r.name,
    tokenPreview: r.token_preview,
    createdAt: r.created_at
  }));
}

export function revealUserTokenByIdForUser(id: string, userId: string): string | null {
  const db = openDb();
  const row = db.prepare('SELECT token_enc FROM user_tokens WHERE id = ? AND user_id = ?').get(id, userId) as any;
  if (!row?.token_enc) return null;
  return decryptString(row.token_enc);
}

export function createUserTokenForUser(userId: string, name: string) {
  const db = openDb();
  const rawToken = 'sk-' + crypto.randomBytes(24).toString('hex');
  const id = 'tkn_' + crypto.randomBytes(8).toString('hex');
  const now = new Date().toISOString();
  const tokenHash = sha256Hex(rawToken);
  const tokenEnc = encryptString(rawToken);
  const tokenPreview = previewSecret(rawToken, 12, 4);

  db.prepare(
    'INSERT INTO user_tokens (id, user_id, name, token_hash, token_enc, token_preview, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(id, userId, name, tokenHash, tokenEnc, tokenPreview, now);

  return {
    id,
    userId,
    name,
    token: rawToken,
    tokenPreview,
    createdAt: now
  };
}

export function deleteUserToken(id: string, userId: string) {
  const db = openDb();
  db.prepare('DELETE FROM user_tokens WHERE id = ? AND user_id = ?').run(id, userId);
}

export function findUserTokenByRawToken(rawToken: string): UserToken | null {
  const db = openDb();
  const tokenHash = sha256Hex(rawToken);
  const row = db
    .prepare(
      'SELECT id, user_id, name, token_hash, token_enc, token_preview, created_at FROM user_tokens WHERE token_hash = ?'
    )
    .get(tokenHash) as any;
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    tokenHash: row.token_hash,
    tokenEnc: row.token_enc,
    tokenPreview: row.token_preview,
    createdAt: row.created_at
  };
}

export function listUpstreamKeys() {
  const db = openDb();
  const rows = db
    .prepare(
      `SELECT
        id, name, key_enc, key_preview, is_active, weight, error_count, consecutive_failures, cooldown_until,
        last_used_at, last_error_at, last_success_at, created_at
      FROM upstream_keys ORDER BY created_at DESC`
    )
    .all() as any[];

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    key: decryptString(r.key_enc),
    keyPreview: r.key_preview,
    isActive: !!r.is_active,
    weight: r.weight,
    errorCount: r.error_count,
    consecutiveFailures: r.consecutive_failures,
    cooldownUntil: r.cooldown_until ?? null,
    lastUsedAt: r.last_used_at ?? null,
    lastErrorAt: r.last_error_at ?? null,
    lastSuccessAt: r.last_success_at ?? null,
    createdAt: r.created_at
  }));
}

export function listUpstreamKeysPreview() {
  const db = openDb();
  const rows = db
    .prepare(
      `SELECT
        id, name, key_preview, is_active, weight, error_count, consecutive_failures, cooldown_until,
        last_used_at, last_error_at, last_success_at, created_at
      FROM upstream_keys ORDER BY created_at DESC`
    )
    .all() as any[];

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    keyPreview: r.key_preview,
    isActive: !!r.is_active,
    weight: r.weight,
    errorCount: r.error_count,
    consecutiveFailures: r.consecutive_failures,
    cooldownUntil: r.cooldown_until ?? null,
    lastUsedAt: r.last_used_at ?? null,
    lastErrorAt: r.last_error_at ?? null,
    lastSuccessAt: r.last_success_at ?? null,
    createdAt: r.created_at
  }));
}

export function revealUpstreamKeyById(id: string): string | null {
  const db = openDb();
  const row = db.prepare('SELECT key_enc FROM upstream_keys WHERE id = ?').get(id) as any;
  if (!row?.key_enc) return null;
  return decryptString(row.key_enc);
}

export function listActiveUpstreamKeys() {
  const db = openDb();
  const rows = db
    .prepare(
      `SELECT
        id, name, key_enc, key_preview, is_active, weight, error_count, consecutive_failures, cooldown_until,
        last_used_at, last_error_at, last_success_at, created_at
      FROM upstream_keys WHERE is_active = 1`
    )
    .all() as any[];

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    key: decryptString(r.key_enc),
    keyPreview: r.key_preview,
    isActive: !!r.is_active,
    weight: r.weight,
    errorCount: r.error_count,
    consecutiveFailures: r.consecutive_failures,
    cooldownUntil: r.cooldown_until ?? null,
    lastUsedAt: r.last_used_at ?? null,
    lastErrorAt: r.last_error_at ?? null,
    lastSuccessAt: r.last_success_at ?? null,
    createdAt: r.created_at
  }));
}

export function listEligibleUpstreamKeys(nowIso = new Date().toISOString()) {
  const db = openDb();
  const rows = db
    .prepare(
      `SELECT
        id, name, key_enc, key_preview, is_active, weight, error_count, consecutive_failures, cooldown_until,
        last_used_at, last_error_at, last_success_at, created_at
      FROM upstream_keys
      WHERE is_active = 1
        AND weight > 0
        AND (cooldown_until IS NULL OR cooldown_until <= ?)`
    )
    .all(nowIso) as any[];

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    key: decryptString(r.key_enc),
    keyPreview: r.key_preview,
    isActive: !!r.is_active,
    weight: r.weight,
    errorCount: r.error_count,
    consecutiveFailures: r.consecutive_failures,
    cooldownUntil: r.cooldown_until ?? null,
    lastUsedAt: r.last_used_at ?? null,
    lastErrorAt: r.last_error_at ?? null,
    lastSuccessAt: r.last_success_at ?? null,
    createdAt: r.created_at
  }));
}

export function getNextUpstreamAvailableAt(nowIso = new Date().toISOString()): string | null {
  const db = openDb();
  const row = db
    .prepare('SELECT MIN(cooldown_until) as next FROM upstream_keys WHERE is_active = 1 AND cooldown_until IS NOT NULL AND cooldown_until > ?')
    .get(nowIso) as any;
  return row?.next ?? null;
}

export function findUpstreamKeyById(id: string) {
  const db = openDb();
  const row = db
    .prepare(
      `SELECT
        id, name, key_enc, key_preview, is_active, weight, error_count, consecutive_failures, cooldown_until,
        last_used_at, last_error_at, last_success_at, created_at
      FROM upstream_keys WHERE id = ?`
    )
    .get(id) as any;
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    key: decryptString(row.key_enc),
    keyPreview: row.key_preview,
    isActive: !!row.is_active,
    weight: row.weight,
    errorCount: row.error_count,
    consecutiveFailures: row.consecutive_failures,
    cooldownUntil: row.cooldown_until ?? null,
    lastUsedAt: row.last_used_at ?? null,
    lastErrorAt: row.last_error_at ?? null,
    lastSuccessAt: row.last_success_at ?? null,
    createdAt: row.created_at
  };
}

export function resetUpstreamHealth(id: string) {
  const db = openDb();
  db.prepare('UPDATE upstream_keys SET consecutive_failures = 0, cooldown_until = NULL WHERE id = ?').run(id);
}

export function deactivateUpstreamKey(id: string, isoTime: string) {
  const db = openDb();
  db.prepare('UPDATE upstream_keys SET is_active = 0, last_error_at = ? WHERE id = ?').run(isoTime, id);
}

export function createUpstreamKey(name: string, key: string) {
  const db = openDb();
  const id = 'upk_' + crypto.randomBytes(8).toString('hex');
  const now = new Date().toISOString();
  const keyEnc = encryptString(key);
  const keyPreview = previewSecret(key, 10, 6);

  db.prepare(
    `INSERT INTO upstream_keys (
        id, name, key_enc, key_preview, is_active, weight, error_count,
        consecutive_failures, cooldown_until, last_used_at, last_error_at, last_success_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, name, keyEnc, keyPreview, 1, 1, 0, 0, null, null, null, null, now);

  return {
    id,
    name,
    key,
    keyPreview,
    isActive: true,
    weight: 1,
    errorCount: 0,
    consecutiveFailures: 0,
    cooldownUntil: null,
    lastUsedAt: null,
    lastErrorAt: null,
    lastSuccessAt: null,
    createdAt: now
  };
}

export function updateUpstreamKey(id: string, update: Partial<{ isActive: boolean; name: string; weight: number; key: string }>) {
  const db = openDb();
  const fields: string[] = [];
  const values: any[] = [];
  if (update.isActive !== undefined) {
    fields.push('is_active = ?');
    values.push(update.isActive ? 1 : 0);
  }
  if (update.name !== undefined) {
    fields.push('name = ?');
    values.push(update.name);
  }
  if (update.weight !== undefined) {
    fields.push('weight = ?');
    values.push(Math.max(0, Math.floor(update.weight)));
  }
  if (update.key !== undefined) {
    const rawKey = String(update.key || '').trim();
    fields.push('key_enc = ?');
    values.push(encryptString(rawKey));
    fields.push('key_preview = ?');
    values.push(previewSecret(rawKey, 10, 6));
  }
  if (fields.length === 0) return;
  values.push(id);
  db.prepare(`UPDATE upstream_keys SET ${fields.join(', ')} WHERE id = ?`).run(...values);
}

export function deleteUpstreamKey(id: string) {
  const db = openDb();
  db.prepare('DELETE FROM upstream_keys WHERE id = ?').run(id);
}

export function markUpstreamLastUsed(id: string, isoTime: string) {
  const db = openDb();
  db.prepare('UPDATE upstream_keys SET last_used_at = ? WHERE id = ?').run(isoTime, id);
}

export function markUpstreamSuccess(id: string, isoTime: string) {
  const db = openDb();
  db.prepare(
    'UPDATE upstream_keys SET last_success_at = ?, consecutive_failures = 0, cooldown_until = NULL WHERE id = ?'
  ).run(isoTime, id);
}

export function markUpstreamError(id: string, isoTime: string, statusCode: number) {
  const db = openDb();
  const current = db
    .prepare('SELECT error_count, consecutive_failures FROM upstream_keys WHERE id = ?')
    .get(id) as any;
  const errorCount = (Number(current?.error_count) || 0) + 1;
  const consecutiveFailures = (Number(current?.consecutive_failures) || 0) + 1;

  const cooldownUntil = computeCooldownUntil(new Date(isoTime), consecutiveFailures, statusCode);
  db.prepare(
    'UPDATE upstream_keys SET error_count = ?, consecutive_failures = ?, last_error_at = ?, cooldown_until = ? WHERE id = ?'
  ).run(errorCount, consecutiveFailures, isoTime, cooldownUntil, id);

  return { errorCount, consecutiveFailures, cooldownUntil };
}

export function insertRequestLog(log: RequestLog) {
  const db = openDb();
  db.prepare(
    `INSERT INTO request_logs (
        id, request_id, user_id, token_id, upstream_key_id, model,
        prompt_tokens, completion_tokens, total_tokens, duration_ms, status, upstream_attempts, is_stream, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    log.id,
    log.requestId,
    log.userId,
    log.tokenId,
    log.upstreamKeyId,
    log.model,
    log.promptTokens,
    log.completionTokens,
    log.totalTokens,
    log.durationMs,
    log.status,
    log.upstreamAttempts,
    log.isStream ? 1 : 0,
    log.createdAt
  );
}

export function listRequestLogsByUserId(userId: string, limit = 100) {
  const db = openDb();
  const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 500);
  const rows = db
    .prepare(
      `SELECT
        id, request_id, user_id, token_id, upstream_key_id, model,
        prompt_tokens, completion_tokens, total_tokens, duration_ms, status, upstream_attempts, is_stream, created_at
      FROM request_logs
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?`
    )
    .all(userId, safeLimit) as any[];

  return rows.map((r) => ({
    id: r.id,
    requestId: r.request_id ?? null,
    userId: r.user_id ?? null,
    tokenId: r.token_id ?? null,
    upstreamKeyId: r.upstream_key_id ?? null,
    model: r.model,
    promptTokens: r.prompt_tokens,
    completionTokens: r.completion_tokens,
    totalTokens: r.total_tokens,
    durationMs: r.duration_ms,
    status: r.status,
    upstreamAttempts: r.upstream_attempts,
    isStream: !!r.is_stream,
    createdAt: r.created_at
  }));
}

export function listRequestLogsGlobal(limit = 200) {
  const db = openDb();
  const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 1000);
  const rows = db
    .prepare(
      `SELECT
        id, request_id, user_id, token_id, upstream_key_id, model,
        prompt_tokens, completion_tokens, total_tokens, duration_ms, status, upstream_attempts, is_stream, created_at
      FROM request_logs
      ORDER BY created_at DESC
      LIMIT ?`
    )
    .all(safeLimit) as any[];

  return rows.map((r) => ({
    id: r.id,
    requestId: r.request_id ?? null,
    userId: r.user_id ?? null,
    tokenId: r.token_id ?? null,
    upstreamKeyId: r.upstream_key_id ?? null,
    model: r.model,
    promptTokens: r.prompt_tokens,
    completionTokens: r.completion_tokens,
    totalTokens: r.total_tokens,
    durationMs: r.duration_ms,
    status: r.status,
    upstreamAttempts: r.upstream_attempts,
    isStream: !!r.is_stream,
    createdAt: r.created_at
  }));
}
