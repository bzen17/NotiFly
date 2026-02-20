import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getMongo } from '../config/db';
import { ROLES, JWT_DEFAULTS } from '../constants';

const JWT_SECRET = JWT_DEFAULTS.JWT_SECRET;
const ACCESS_EXP = JWT_DEFAULTS.ACCESS_EXP;
const REFRESH_EXP = JWT_DEFAULTS.REFRESH_EXP;

export interface UserRecord {
  _id?: string;
  email: string;
  passwordHash: string;
  role: string;
  refreshToken?: string;
}

function usersColl() {
  const mongo = getMongo();
  const db = (mongo as any).db ? (mongo as any).db() : mongo;
  return db.collection('users');
}

export async function createUser(
  email: string,
  password: string,
  name: string,
  role = ROLES.TENANT,
  tenantId?: string,
  extra: any = {},
) {
  const hashed = await bcrypt.hash(password, 10);
  const doc: UserRecord = { email, passwordHash: hashed, role } as any;
  (doc as any).name = name;
  if (tenantId) (doc as any).tenantId = tenantId;
  Object.assign(doc, extra);
  const coll = usersColl();
  const res = await coll.insertOne(doc as any);
  return { id: res.insertedId.toString(), email, role, name };
}

export async function findUserByEmail(email: string) {
  const coll = usersColl();
  return await coll.findOne({ email });
}

export async function verifyUserPassword(user: any, password: string) {
  if (!user) return false;
  return bcrypt.compare(password, user.passwordHash || user.password);
}

export function generateAccessToken(user: any) {
  const payload: any = {
    tenantId: String(user._id || user.id),
    email: user.email,
    role: user.role,
  };
  return jwt.sign(
    payload,
    JWT_SECRET as any,
    { subject: String(user._id || user.id), expiresIn: ACCESS_EXP } as any,
  );
}

export function generateRefreshToken() {
  return jwt.sign({ t: 'r' } as any, JWT_SECRET as any, { expiresIn: REFRESH_EXP } as any);
}

export async function saveRefreshToken(userId: any, refreshToken: string) {
  const coll = usersColl();
  await coll.updateOne(
    { _id: typeof userId === 'string' ? new (require('mongodb').ObjectId)(userId) : userId },
    { $set: { refreshToken } },
  );
}

export async function verifyRefreshTokenForUser(userId: any, token: string) {
  try {
    jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return false;
  }
  const coll = usersColl();
  const u = await coll.findOne({
    _id: typeof userId === 'string' ? new (require('mongodb').ObjectId)(userId) : userId,
    refreshToken: token,
  });
  return !!u;
}

export async function revokeRefreshToken(userId: any) {
  const coll = usersColl();
  await coll.updateOne(
    { _id: typeof userId === 'string' ? new (require('mongodb').ObjectId)(userId) : userId },
    { $unset: { refreshToken: '' } },
  );
}
