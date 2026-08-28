import { requireDashboardAuth } from './_lib.js'

export default function handler(req, res) {
  if (req.method !== 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  const user = requireDashboardAuth(req, res)
  if (!user) return
  return res
    .status(200)
    .json({
      email: user.email,
      role: user.role,
      managerId: user.managerId || '',
    })
}
