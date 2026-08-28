import {
  getDashboardUsers,
  hashPassword,
  requireDashboardAuth,
  updateDashboardUser,
} from './_lib.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const session = requireDashboardAuth(req, res)
  if (!session) return
  if (!session.recordId) return res.status(400).json({ error: 'Bootstrap user must be moved to Airtable first' })

  const password = String(req.body?.password || '')
  if (password.length < 10) return res.status(400).json({ error: 'Пароль должен содержать минимум 10 символов' })

  try {
    const user = (await getDashboardUsers()).find((item) => item.recordId === session.recordId)
    if (!user) return res.status(404).json({ error: 'User not found' })
    await updateDashboardUser(user.recordId, {
      'Auth Password Hash': await hashPassword(password),
      'Auth Must Change': false,
    })
    return res.status(200).json({ ok: true })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
