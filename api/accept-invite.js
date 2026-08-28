import {
  createSession,
  getDashboardUsers,
  hashInviteToken,
  hashPassword,
  isValidPassword,
  updateDashboardUser,
} from './_lib.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const token = String(req.body?.token || '')
  const password = String(req.body?.password || '')
  if (!isValidPassword(password)) return res.status(400).json({ error: 'Пароль: минимум 8 латинских символов, цифр или знаков' })

  try {
    const user = (await getDashboardUsers()).find((item) => item.inviteHash === hashInviteToken(token) && item.status === 'pending' && item.inviteExpires > Date.now())
    if (!user) return res.status(400).json({ error: 'Ссылка недействительна или уже истекла' })
    await updateDashboardUser(user.recordId, {
      Примечания: JSON.stringify({ email: user.email, name: user.name, managerId: user.managerId, role: user.role, passwordHash: await hashPassword(password), status: 'active', mustChangePassword: false }),
    })
    createSession(res, { ...user, mustChangePassword: false })
    return res.status(200).json({ ok: true })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
