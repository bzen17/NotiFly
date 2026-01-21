import { Request, Response } from 'express';
import {
  createUser,
  findUserByEmail,
  verifyUserPassword,
  generateAccessToken,
  generateRefreshToken,
  saveRefreshToken,
  verifyRefreshTokenForUser,
  revokeRefreshToken,
} from '../services/auth.service';
import { ERRORS, ROLES } from '../constants';

export async function signupController(req: Request, res: Response) {
  const { email, password, name, tenantId } = req.body;
  if (!email || !password || !name)
    return res.status(400).json({ error: ERRORS.EMAIL_PASSWORD_NAME_REQUIRED });
  const coll = (require('mongodb').MongoClient as any).prototype; // placeholder
  const mongo = require('../config/db').getMongo();
  const db = mongo.db ? mongo.db() : mongo;
  const exists = await db.collection('users').findOne({ email });
  if (exists) return res.status(409).json({ error: 'user_exists' });

  // If no users exist, make this first user an admin
  const userCount = await db.collection('users').countDocuments();
  const role = userCount === 0 ? ROLES.ADMIN : ROLES.TENANT;

  const user = await createUser(email, password, name, role, tenantId, { name });
  const access = generateAccessToken({ ...user });
  const refresh = generateRefreshToken();
  await saveRefreshToken(user.id, refresh);
  return res.json({ accessToken: access, refreshToken: refresh, user });
}

export async function loginController(req: Request, res: Response) {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: ERRORS.EMAIL_AND_PASSWORD_REQUIRED });
  const user = await findUserByEmail(email);
  if (!user) return res.status(401).json({ error: ERRORS.INVALID_CREDENTIALS });
  const ok = await verifyUserPassword(user, password);
  if (!ok) return res.status(401).json({ error: ERRORS.INVALID_CREDENTIALS });
  const access = generateAccessToken(user);
  const refresh = generateRefreshToken();
  await saveRefreshToken(user._id, refresh);
  return res.json({
    accessToken: access,
    refreshToken: refresh,
    user: {
      id: String(user._id),
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      name: user.name,
    },
  });
}

export async function refreshController(req: Request, res: Response) {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: ERRORS.REFRESH_REQUIRED });
  // Try to find user with this refresh token
  const userColl = (require('mongodb').MongoClient as any).prototype; // placeholder to satisfy types
  const mongo = require('../config/db').getMongo();
  const db = mongo.db ? mongo.db() : mongo;
  const found = await db.collection('users').findOne({ refreshToken });
  if (!found) return res.status(401).json({ error: ERRORS.INVALID_REFRESH });
  const ok = await verifyRefreshTokenForUser(found._id, refreshToken);
  if (!ok) return res.status(401).json({ error: ERRORS.INVALID_REFRESH });
  const access = generateAccessToken(found);
  const refresh = generateRefreshToken();
  await saveRefreshToken(found._id, refresh);
  return res.json({ accessToken: access, refreshToken: refresh });
}

export async function logoutController(req: Request, res: Response) {
  const { user } = req as any;
  if (!user) return res.status(200).json({ ok: true });
  await revokeRefreshToken(user.id || user._id);
  return res.json({ ok: true });
}

export async function createUserController(req: Request, res: Response) {
  // Admin-only: create a new user and allow setting role
  const actor = (req as any).user;
  if (!actor || actor.role !== ROLES.ADMIN)
    return res.status(403).json({ error: ERRORS.FORBIDDEN });
  const { email, password, name, role = 'tenant', tenantId } = req.body;
  if (!email || !password || !name)
    return res.status(400).json({ error: ERRORS.EMAIL_PASSWORD_NAME_REQUIRED });
  const mongo = require('../config/db').getMongo();
  const db = mongo.db ? mongo.db() : mongo;
  const exists = await db.collection('users').findOne({ email });
  if (exists) return res.status(409).json({ error: 'user_exists' });
  const user = await createUser(email, password, name, role, tenantId, { name });
  return res.json({ user });
}
