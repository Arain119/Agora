import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { createUser, findInviteByCodeHash, findUserById, findUserByUsername, markInviteUsed } from '../store';
import { authMiddleware } from './api';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'agora_secret_key_123';

function sha256Hex(input: string) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function createJwtToken(user: { id: string; username: string; role: string }) {
  return jwt.sign({ userId: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
}

router.post('/login', (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const user = findUserByUsername(username);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  if (!user.passwordHash || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = createJwtToken(user);

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role
    }
  });
});

router.post('/register', (req: Request, res: Response) => {
  const { inviteCode, username, password } = req.body;

  if (!inviteCode || !username || !password) {
    return res.status(400).json({ error: 'Invite code, username and password are required' });
  }

  if (findUserByUsername(username)) {
    return res.status(400).json({ error: 'Username already exists' });
  }

  const normalizedInvite = String(inviteCode).trim();
  if (!normalizedInvite) {
    return res.status(400).json({ error: 'Invite code is required' });
  }

  const inviteHash = sha256Hex(normalizedInvite);
  const invite = findInviteByCodeHash(inviteHash);
  if (!invite) {
    return res.status(403).json({ error: 'Invalid invite code' });
  }

  if (invite.status !== 'ACTIVE') {
    return res.status(403).json({ error: 'Invite code is no longer valid' });
  }

  const now = new Date();
  if (invite.expiresAt) {
    const expiresAt = new Date(invite.expiresAt);
    if (Number.isFinite(expiresAt.getTime()) && now > expiresAt) {
      return res.status(403).json({ error: 'Invite code is expired' });
    }
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const newUser = {
    id: 'usr_' + crypto.randomBytes(8).toString('hex'),
    username,
    passwordHash,
    role: 'USER' as const,
    createdAt: now.toISOString()
  };

  createUser(newUser);
  markInviteUsed(invite.id, newUser.id, now.toISOString());

  const token = createJwtToken(newUser);
  res.status(201).json({
    token,
    user: {
      id: newUser.id,
      username: newUser.username,
      role: newUser.role
    }
  });
});

router.get('/me', authMiddleware, (req: Request, res: Response) => {
  const user = findUserById((req as any).user.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  res.json({ id: user.id, username: user.username, role: user.role });
});

// Ensure /api/auth/* unknown routes return 404 (and don't fall through to /api router)
router.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

export default router;
