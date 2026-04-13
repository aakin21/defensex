import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getDb } from '../db';

export const authRouter = Router();

const JWT_SECRET  = process.env.JWT_SECRET ?? 'fortress-fantasy-dev-secret';
const SALT_ROUNDS = 10;

// ─── POST /api/auth/register ──────────────────────────────────────────────

authRouter.post('/register', async (req: Request, res: Response) => {
  const { username, password } = req.body as { username?: string; password?: string };

  if (!username || !password) {
    res.status(400).json({ error: 'username ve password gerekli' });
    return;
  }
  if (username.length < 3) {
    res.status(400).json({ error: 'Kullanıcı adı en az 3 karakter olmalı' });
    return;
  }

  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    res.status(409).json({ error: 'Bu kullanıcı adı zaten alınmış' });
    return;
  }

  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  const result = db
    .prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)')
    .run(username, hash);

  const token = jwt.sign({ userId: result.lastInsertRowid, username }, JWT_SECRET, { expiresIn: '7d' });
  res.status(201).json({ token, username });
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────

authRouter.post('/login', async (req: Request, res: Response) => {
  const { username, password } = req.body as { username?: string; password?: string };

  if (!username || !password) {
    res.status(400).json({ error: 'username ve password gerekli' });
    return;
  }

  const db = getDb();
  const user = db
    .prepare('SELECT id, username, password_hash FROM users WHERE username = ?')
    .get(username) as { id: number; username: string; password_hash: string } | undefined;

  if (!user) {
    res.status(401).json({ error: 'Geçersiz kullanıcı adı veya şifre' });
    return;
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    res.status(401).json({ error: 'Geçersiz kullanıcı adı veya şifre' });
    return;
  }

  const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, username: user.username });
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────

authRouter.get('/me', (req: Request, res: Response) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token gerekli' });
    return;
  }

  const token = auth.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: number; username: string };
    res.json({ userId: payload.userId, username: payload.username });
  } catch {
    res.status(401).json({ error: 'Geçersiz token' });
  }
});

// ─── POST /api/auth/stats ─────────────────────────────────────────────────

authRouter.post('/stats', (req: Request, res: Response) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token gerekli' });
    return;
  }

  const token = auth.slice(7);
  let userId: number;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: number };
    userId = payload.userId;
  } catch {
    res.status(401).json({ error: 'Geçersiz token' });
    return;
  }

  const { wave, kills, deaths, damageDealt } = req.body as {
    wave?: number; kills?: number; deaths?: number; damageDealt?: number;
  };

  const db = getDb();
  db.prepare(
    'INSERT INTO stats (user_id, wave, kills, deaths, damage_dealt, played_at) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(userId, wave ?? 0, kills ?? 0, deaths ?? 0, damageDealt ?? 0, Date.now());

  res.json({ ok: true });
});
