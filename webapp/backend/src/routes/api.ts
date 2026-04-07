import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import {
  createInvite,
  createUpstreamKey,
  createUserTokenForUser,
  deleteUpstreamKey,
  deleteUserToken,
  findUserById,
  listInvites,
  listRequestLogsByUserId,
  listRequestLogsGlobal,
  listUpstreamKeysPreview,
  listUserTokensPreviewByUserId,
  listUsers,
  resetUpstreamHealth,
  revealUpstreamKeyById,
  revealUserTokenByIdForUser,
  revokeInvite,
  updateUpstreamKey
} from '../store';
import { getAllowedModels } from '../models';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'agora_secret_key_123';

function sha256Hex(input: string) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

// Auth Middleware
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    (req as any).user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const adminMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if ((req as any).user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};

router.use(authMiddleware);

// ==========================================
// User Routes
// ==========================================

// Get current user info
router.get('/me', (req, res) => {
  const user = findUserById((req as any).user.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ id: user.id, username: user.username, role: user.role });
});

// Tokens Management
router.get('/tokens', (req, res) => {
  const tokens = listUserTokensPreviewByUserId((req as any).user.userId);
  res.json(tokens);
});

router.post('/tokens', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const newToken = createUserTokenForUser((req as any).user.userId, String(name));
  res.json(newToken);
});

router.get('/tokens/:id/reveal', (req, res) => {
  const { id } = req.params;
  const token = revealUserTokenByIdForUser(id, (req as any).user.userId);
  if (!token) return res.status(404).json({ error: 'Not found' });
  res.json({ token });
});

router.delete('/tokens/:id', (req, res) => {
  const { id } = req.params;
  deleteUserToken(id, (req as any).user.userId);
  res.json({ success: true });
});

// User Logs
router.get('/logs', (req, res) => {
  const logs = listRequestLogsByUserId((req as any).user.userId, 100);
  res.json(logs);
});

// Models (curated allowlist for UI convenience)
router.get('/models', (req, res) => {
  const nowUnix = Math.floor(Date.now() / 1000);
  res.json({
    object: "list",
    data: getAllowedModels().map((id) => ({
      id,
      object: "model",
      created: nowUnix,
      owned_by: id.split('/')[0] || 'unknown'
    }))
  });
});


// ==========================================
// Admin Routes
// ==========================================

router.use('/admin', adminMiddleware);

// Upstream Keys Management
router.get('/admin/upstreams', (req, res) => {
  const keys = listUpstreamKeysPreview();
  res.json(keys);
});

router.post('/admin/upstreams', (req, res) => {
  const { key, name } = req.body;
  if (!key || !name) return res.status(400).json({ error: 'Key and name required' });
  const newKey = createUpstreamKey(String(name), String(key));
  res.json(newKey);
});

router.get('/admin/upstreams/:id/reveal', (req, res) => {
  const { id } = req.params;
  const key = revealUpstreamKeyById(id);
  if (!key) return res.status(404).json({ error: 'Not found' });
  res.json({ key });
});

router.post('/admin/upstreams/:id/reset-health', (req, res) => {
  const { id } = req.params;
  const exists = listUpstreamKeysPreview().some((k) => k.id === id);
  if (!exists) return res.status(404).json({ error: 'Not found' });
  resetUpstreamHealth(id);
  res.json(listUpstreamKeysPreview().find((k) => k.id === id));
});

router.patch('/admin/upstreams/:id', (req, res) => {
  const { id } = req.params;
  const { isActive, name, weight, key } = req.body ?? {};

  const exists = listUpstreamKeysPreview().some((k) => k.id === id);
  if (!exists) return res.status(404).json({ error: 'Not found' });

  const nextName = name === undefined ? undefined : String(name).trim().slice(0, 80);
  if (nextName !== undefined && !nextName) return res.status(400).json({ error: 'Name is required' });

  const nextWeight = weight === undefined ? undefined : Number(weight);
  if (nextWeight !== undefined && !Number.isFinite(nextWeight)) return res.status(400).json({ error: 'Invalid weight' });

  const nextKey = key === undefined ? undefined : String(key).trim();
  if (nextKey !== undefined && !nextKey) return res.status(400).json({ error: 'Key is required' });

  updateUpstreamKey(id, {
    isActive: isActive === undefined ? undefined : !!isActive,
    name: nextName,
    weight: nextWeight,
    key: nextKey
  });

  res.json(listUpstreamKeysPreview().find((k) => k.id === id));
});

router.delete('/admin/upstreams/:id', (req, res) => {
  deleteUpstreamKey(req.params.id);
  res.json({ success: true });
});

// Global Logs
router.get('/admin/logs', (req, res) => {
  const logs = listRequestLogsGlobal(200);
  res.json(logs);
});

// Users Management
router.get('/admin/users', (req, res) => {
  const users = listUsers();
  res.json(users);
});

// Invite Codes Management
router.get('/admin/invites', (req, res) => {
  const statusRaw = typeof req.query.status === 'string' ? req.query.status : undefined;
  const status = statusRaw ? String(statusRaw).toUpperCase() : undefined;
  const filterStatus = status === 'ACTIVE' || status === 'USED' || status === 'REVOKED' ? (status as any) : undefined;
  res.json(listInvites(filterStatus));
});

router.post('/admin/invites', (req, res) => {
  const countRaw = Number(req.body?.count ?? 1);
  const count = Number.isFinite(countRaw) ? Math.min(Math.max(Math.floor(countRaw), 1), 50) : 1;

  const expiresInDaysRaw = req.body?.expiresInDays;
  const expiresInDays = expiresInDaysRaw === undefined || expiresInDaysRaw === null ? null : Number(expiresInDaysRaw);

  const note = typeof req.body?.note === 'string' ? req.body.note.trim().slice(0, 200) : null;

  const now = new Date();
  const expiresAt =
    expiresInDays && Number.isFinite(expiresInDays) && expiresInDays > 0
      ? new Date(now.getTime() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

  const createdByUserId = (req as any).user.userId as string;

  const created: Array<{ id: string; code: string; expiresAt: string | null }> = [];

  for (let i = 0; i < count; i++) {
    const code = `AGORA-${crypto.randomBytes(12).toString('base64url')}`;
    const id = 'inv_' + crypto.randomBytes(8).toString('hex');

    createInvite({
      id,
      codeHash: sha256Hex(code),
      status: 'ACTIVE',
      note,
      expiresAt,
      createdAt: now.toISOString(),
      createdByUserId,
      usedAt: null,
      usedByUserId: null,
      revokedAt: null,
      revokedByUserId: null
    });

    created.push({ id, code, expiresAt });
  }

  res.status(201).json({ invites: created });
});

router.post('/admin/invites/:id/revoke', (req, res) => {
  const { id } = req.params;
  const invite = listInvites().find((i: any) => i.id === id) as any;
  if (!invite) return res.status(404).json({ error: 'Not found' });

  if (invite.status !== 'ACTIVE') {
    return res.status(409).json({ error: 'Invite is not active' });
  }

  const now = new Date();
  revokeInvite(id, (req as any).user.userId, now.toISOString());

  res.json({ success: true });
});

export default router;
