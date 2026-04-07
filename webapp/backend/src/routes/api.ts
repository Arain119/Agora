import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db, UserToken, UpstreamKey } from '../db';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'agora_secret_key_123';

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
  const user = db.get('users').find({ id: (req as any).user.userId }).value();
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ id: user.id, username: user.username, role: user.role });
});

// Tokens Management
router.get('/tokens', (req, res) => {
  const tokens = db.get('userTokens').filter({ userId: (req as any).user.userId }).value();
  res.json(tokens);
});

router.post('/tokens', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const rawToken = 'sk-' + crypto.randomBytes(24).toString('hex');
  const newToken: UserToken = {
    id: 'tkn_' + crypto.randomBytes(8).toString('hex'),
    userId: (req as any).user.userId,
    name,
    token: rawToken,
    createdAt: new Date().toISOString()
  };

  db.get('userTokens').push(newToken).write();
  res.json(newToken);
});

router.delete('/tokens/:id', (req, res) => {
  const { id } = req.params;
  db.get('userTokens').remove({ id, userId: (req as any).user.userId }).write();
  res.json({ success: true });
});

// User Logs
router.get('/logs', (req, res) => {
  const logs = db.get('requestLogs').filter({ userId: (req as any).user.userId }).orderBy(['createdAt'], ['desc']).take(100).value();
  res.json(logs);
});

// Analytics Dashboard Endpoint
router.get('/analytics', (req, res) => {
  const userId = (req as any).user.userId;
  const logs = db.get('requestLogs').filter({ userId }).value();

  const days = Array.from({length: 7}, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
  }).reverse();

  const groupedData = days.map(day => {
      const dayLogs = logs.filter((l: any) => l.createdAt && l.createdAt.startsWith(day));
      return {
          date: day,
          requests: dayLogs.length,
          latency: Math.round(dayLogs.reduce((acc: number, l: any) => acc + (l.durationMs || 0), 0) / (dayLogs.length || 1)),
          tokens: dayLogs.reduce((acc: number, l: any) => acc + (l.totalTokens || 0), 0)
      };
  });

  res.json(groupedData);
});

// Community Endpoints
router.get('/community/posts', (req, res) => {
  const posts = db.get('community_posts').orderBy(['createdAt'], ['desc']).take(50).value();
  res.json(posts);
});

router.post('/community/posts', (req, res) => {
  const { type, content } = req.body;
  if (!content) return res.status(400).json({ error: 'Content is required' });

  const userId = (req as any).user.userId;
  const user = db.get('users').find({ id: userId }).value();

  const newPost = {
      id: 'post_' + crypto.randomBytes(8).toString('hex'),
      authorId: userId,
      authorName: user?.username || 'Unknown',
      type: type || 'prompt',
      content,
      likes: 0,
      createdAt: new Date().toISOString()
  };

  db.get('community_posts').push(newPost).write();
  res.json(newPost);
});

// Models (NVIDIA models hardcoded or fetched, just return a static list for now)
router.get('/models', (req, res) => {
  res.json({
    object: "list",
    data: [
      { id: "meta/llama3-70b-instruct", object: "model", created: 1714521600, owned_by: "meta" },
      { id: "meta/llama3-8b-instruct", object: "model", created: 1714521600, owned_by: "meta" },
      { id: "google/gemma-7b", object: "model", created: 1708473600, owned_by: "google" },
      { id: "mistralai/mistral-large", object: "model", created: 1708992000, owned_by: "mistralai" },
      { id: "microsoft/phi-3-mini-128k-instruct", object: "model", created: 1713830400, owned_by: "microsoft" }
    ]
  });
});


// ==========================================
// Admin Routes
// ==========================================

router.use('/admin', adminMiddleware);

// Upstream Keys Management
router.get('/admin/upstreams', (req, res) => {
  const keys = db.get('upstreamKeys').value();
  res.json(keys);
});

router.post('/admin/upstreams', (req, res) => {
  const { key, name } = req.body;
  if (!key || !name) return res.status(400).json({ error: 'Key and name required' });

  const newKey: UpstreamKey = {
    id: 'upk_' + crypto.randomBytes(8).toString('hex'),
    key,
    name,
    isActive: true,
    errorCount: 0,
    lastUsedAt: null,
    createdAt: new Date().toISOString()
  };
  db.get('upstreamKeys').push(newKey).write();
  res.json(newKey);
});

router.patch('/admin/upstreams/:id', (req, res) => {
  const { id } = req.params;
  const { isActive, name } = req.body;
  const upstream = db.get('upstreamKeys').find({ id });

  if (!upstream.value()) return res.status(404).json({ error: 'Not found' });

  const updateData: any = {};
  if (isActive !== undefined) updateData.isActive = isActive;
  if (name !== undefined) updateData.name = name;

  upstream.assign(updateData).write();
  res.json(upstream.value());
});

router.delete('/admin/upstreams/:id', (req, res) => {
  db.get('upstreamKeys').remove({ id: req.params.id }).write();
  res.json({ success: true });
});

// Global Logs
router.get('/admin/logs', (req, res) => {
  const logs = db.get('requestLogs').orderBy(['createdAt'], ['desc']).take(200).value();
  res.json(logs);
});

// Users Management
router.get('/admin/users', (req, res) => {
  const users = db.get('users').map((u: any) => ({ id: u.id, username: u.username, role: u.role, createdAt: u.createdAt })).value();
  res.json(users);
});

export default router;
