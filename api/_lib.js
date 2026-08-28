// api/_lib.js — shared helpers for API routes.
// Filename starts with "_" so Vercel does not expose it as a route.

export function getAirtableToken() {
  return process.env.AIRTABLE_TOKEN || process.env.Airtable || ''
}

const BASE_ID = 'appHakMP7mBJhUu7p'
const TABLE_ID = 'tblTU1on0yAcK5RTt'
const USER_CONFIG_COMPANY = '__DG_USER_CONFIG__'

function airtableUrl(query = '') {
  return `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}${query}`
}

function airtableHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

async function getAirtableUserRecords() {
  const token = getAirtableToken()
  if (!token) return []
  const params = new globalThis.URLSearchParams({
    filterByFormula: `{Компания}='${USER_CONFIG_COMPANY}'`,
    pageSize: '100',
  })
  const response = await fetch(airtableUrl(`?${params}`), {
    headers: airtableHeaders(token),
  })
  if (!response.ok) throw new Error((await response.text()).slice(0, 500))
  return (await response.json()).records || []
}

function envUsers() {
  try {
    const parsed = JSON.parse(process.env.DASH_USERS_JSON || '[]')
    return Array.isArray(parsed)
      ? parsed.map((user) => ({
          ...user,
          status: user.status || 'active',
          mustChangePassword: user.mustChangePassword !== false,
        }))
      : []
  } catch {
    return []
  }
}

function normalizeAirtableUser(record) {
  const fields = record.fields || {}
  const metadata = (() => {
    try {
      return JSON.parse(String(fields.Примечания || '{}'))
    } catch {
      return {}
    }
  })()
  return {
    recordId: record.id,
    email: fields.Email || '',
    name: fields.Менеджер || '',
    role: metadata.role || 'manager',
    managerId: fields.manager_id || '',
    passwordHash: metadata.passwordHash || '',
    status: metadata.status || 'active',
    mustChangePassword: metadata.mustChangePassword === true,
  }
}

export async function getDashboardUsers() {
  const records = await getAirtableUserRecords()
  const stored = records.map(normalizeAirtableUser)
  const byEmail = new Map(
    stored.map((user) => [user.email.toLowerCase(), user])
  )
  envUsers().forEach((user) => {
    if (!byEmail.has(String(user.email || '').toLowerCase()))
      byEmail.set(user.email.toLowerCase(), user)
  })
  return [...byEmail.values()]
}

export async function updateDashboardUser(recordId, fields) {
  const token = getAirtableToken()
  if (!token) throw new Error('AIRTABLE_TOKEN not set')
  const response = await fetch(airtableUrl(`/${recordId}`), {
    method: 'PATCH',
    headers: airtableHeaders(token),
    body: JSON.stringify({ fields }),
  })
  if (!response.ok) throw new Error((await response.text()).slice(0, 500))
  return response.json()
}

export async function createDashboardUser(fields) {
  const token = getAirtableToken()
  if (!token) throw new Error('AIRTABLE_TOKEN not set')
  const response = await fetch(airtableUrl(), {
    method: 'POST',
    headers: airtableHeaders(token),
    body: JSON.stringify({
      fields: { Компания: USER_CONFIG_COMPANY, ...fields },
    }),
  })
  if (!response.ok) throw new Error((await response.text()).slice(0, 500))
  return response.json()
}

export async function deleteDashboardUser(recordId) {
  const token = getAirtableToken()
  if (!token) throw new Error('AIRTABLE_TOKEN not set')
  const response = await fetch(airtableUrl(`/${recordId}`), {
    method: 'DELETE',
    headers: airtableHeaders(token),
  })
  if (!response.ok) throw new Error((await response.text()).slice(0, 500))
}

import { createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scryptAsync = promisify(scrypt)
const SESSION_COOKIE = 'dg_session'
const SESSION_TTL = 60 * 60 * 24 * 7

function sign(value) {
  return createHmac('sha256', process.env.DASH_SESSION_SECRET || '')
    .update(value)
    .digest('base64url')
}

function getCookie(req, name) {
  const cookies = String(req.headers.cookie || '').split(';')
  const item = cookies.find((cookie) => cookie.trim().startsWith(`${name}=`))
  return item ? decodeURIComponent(item.trim().slice(name.length + 1)) : ''
}

function readSession(req) {
  const token = getCookie(req, SESSION_COOKIE)
  const separator = token.lastIndexOf('.')
  if (!token || separator < 1 || !process.env.DASH_SESSION_SECRET) return null
  const value = token.slice(0, separator)
  const signature = token.slice(separator + 1)
  const expected = sign(value)
  if (
    signature.length !== expected.length ||
    !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  )
    return null
  try {
    const session = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'))
    return session.exp > Math.floor(Date.now() / 1000) ? session : null
  } catch {
    return null
  }
}

export async function verifyPassword(password, encoded) {
  const [type, cost, salt, expected] = String(encoded || '').split('$')
  if (type !== 'scrypt' || !cost || !salt || !expected) return false
  try {
    const derived = await scryptAsync(
      password,
      salt,
      Buffer.from(expected, 'base64url').length,
      { N: Number(cost), r: 8, p: 1 }
    )
    const actual = Buffer.from(derived)
    const target = Buffer.from(expected, 'base64url')
    return actual.length === target.length && timingSafeEqual(actual, target)
  } catch {
    return false
  }
}

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('base64url')
  const derived = await scryptAsync(password, salt, 32, {
    N: 16384,
    r: 8,
    p: 1,
  })
  return `scrypt$16384$${salt}$${Buffer.from(derived).toString('base64url')}`
}

export async function findDashboardUser(email) {
  const normalizedEmail = String(email || '')
    .trim()
    .toLowerCase()
  return (await getDashboardUsers()).find(
    (user) => user.email?.toLowerCase() === normalizedEmail
  )
}

export function createSession(res, user) {
  if (!process.env.DASH_SESSION_SECRET)
    throw new Error('DASH_SESSION_SECRET not configured')
  const session = {
    email: user.email,
    role: user.role,
    managerId: user.managerId || '',
    recordId: user.recordId || '',
    mustChangePassword: Boolean(user.mustChangePassword),
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL,
  }
  const value = Buffer.from(JSON.stringify(session)).toString('base64url')
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=${encodeURIComponent(`${value}.${sign(value)}`)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL}`
  )
}

export function clearSession(res) {
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`
  )
}

export function getDashboardUser(req) {
  return readSession(req)
}

export function requireDashboardAuth(req, res) {
  const user = getDashboardUser(req)
  if (!user) {
    res.setHeader('Cache-Control', 'no-store')
    res.status(401).json({ error: 'Unauthorized' })
    return null
  }
  return user
}

export function requireAdmin(req, res) {
  const user = requireDashboardAuth(req, res)
  if (!user) return null
  if (user.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' })
    return null
  }
  return user
}
