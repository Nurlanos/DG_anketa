// api/dashboard.js — serves the manager dashboard, gated by HTTP Basic Auth.
// dashboard.html itself lives outside /public (in /views) so it is never
// reachable as a static file — this handler is the only way to get it.

import fs from 'fs'
import path from 'path'
import { getDashboardUser } from './_lib.js'

export default async function handler(req, res) {
  const user = getDashboardUser(req)
  if (!user) return res.redirect(302, '/login.html')
  if (user.mustChangePassword) return res.redirect(302, '/change-password.html')

  const filePath = path.join(process.cwd(), 'views', 'dashboard.html')

  let html
  try {
    html = fs.readFileSync(filePath, 'utf8')
  } catch (err) {
    console.error('dashboard.html read error:', err.message)
    return res.status(500).json({ error: 'dashboard.html not found' })
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  return res.status(200).send(html)
}
