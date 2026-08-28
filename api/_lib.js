// api/_lib.js — shared helpers for API routes.
// Filename starts with "_" so Vercel does not expose it as a route.

export function getAirtableToken() {
  return process.env.AIRTABLE_TOKEN || process.env.Airtable || '';
}

import { createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);
const SESSION_COOKIE = 'dg_session';
const SESSION_TTL = 60 * 60 * 24 * 7;

function users() {
  try {
    const parsed = JSON.parse(process.env.DASH_USERS_JSON || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function sign(value) {
  return createHmac('sha256', process.env.DASH_SESSION_SECRET || '').update(value).digest('base64url');
}

function getCookie(req, name) {
  const cookies = String(req.headers.cookie || '').split(';');
  const item = cookies.find((cookie) => cookie.trim().startsWith(`${name}=`));
  return item ? decodeURIComponent(item.trim().slice(name.length + 1)) : '';
}

function readSession(req) {
  const token = getCookie(req, SESSION_COOKIE);
  const separator = token.lastIndexOf('.');
  if (!token || separator < 1 || !process.env.DASH_SESSION_SECRET) return null;
  const value = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  const expected = sign(value);
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const session = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
    return session.exp > Math.floor(Date.now() / 1000) ? session : null;
  } catch {
    return null;
  }
}

export async function verifyPassword(password, encoded) {
  const [type, cost, salt, expected] = String(encoded || '').split('$');
  if (type !== 'scrypt' || !cost || !salt || !expected) return false;
  try {
    const derived = await scryptAsync(password, salt, Buffer.from(expected, 'base64url').length, { N: Number(cost), r: 8, p: 1 });
    const actual = Buffer.from(derived);
    const target = Buffer.from(expected, 'base64url');
    return actual.length === target.length && timingSafeEqual(actual, target);
  } catch {
    return false;
  }
}

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('base64url');
  const derived = await scryptAsync(password, salt, 32, { N: 16384, r: 8, p: 1 });
  return `scrypt$16384$${salt}$${Buffer.from(derived).toString('base64url')}`;
}

export function findDashboardUser(email) {
  return users().find((user) => user.email?.toLowerCase() === String(email || '').trim().toLowerCase());
}

export function createSession(res, user) {
  if (!process.env.DASH_SESSION_SECRET) throw new Error('DASH_SESSION_SECRET not configured');
  const session = { email: user.email, role: user.role, managerId: user.managerId || '', exp: Math.floor(Date.now() / 1000) + SESSION_TTL };
  const value = Buffer.from(JSON.stringify(session)).toString('base64url');
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${encodeURIComponent(`${value}.${sign(value)}`)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL}`);
}

export function clearSession(res) {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
}

export function getDashboardUser(req) {
  return readSession(req);
}

export function requireDashboardAuth(req, res) {
  const user = getDashboardUser(req);
  if (!user) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  return user;
}

export function requireAdmin(req, res) {
  const user = requireDashboardAuth(req, res);
  if (!user) return null;
  if (user.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return null;
  }
  return user;
}
