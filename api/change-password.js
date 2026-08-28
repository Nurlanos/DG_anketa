import {
  createDashboardUser,
  createSession,
  getDashboardUsers,
  hashPassword,
  isValidPassword,
  requireDashboardAuth,
  updateDashboardUser,
} from './_lib.js'

export default async function handler(req, res) {
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  const session = requireDashboardAuth(req, res)
  if (!session) return
  const password = String(req.body?.password || '')
  if (!isValidPassword(password))
    return res
      .status(400)
      .json({ error: 'Пароль: минимум 8 латинских символов, цифр или знаков' })

  try {
    const user = (await getDashboardUsers()).find(
      (item) =>
        item.recordId === session.recordId ||
        item.email.toLowerCase() === session.email.toLowerCase()
    )
    if (!user) return res.status(404).json({ error: 'User not found' })
    const fields = {
      Примечания: JSON.stringify({
        role: user.role || 'manager',
        passwordHash: await hashPassword(password),
        status: 'active',
        mustChangePassword: false,
      }),
    }
    let recordId = user.recordId
    if (recordId) await updateDashboardUser(recordId, fields)
    else {
      const created = await createDashboardUser({
        Email: user.email,
        Менеджер: user.name || user.email,
        manager_id: user.managerId || '',
        ...fields,
      })
      recordId = created.id
    }
    createSession(res, { ...user, recordId, mustChangePassword: false })
    return res.status(200).json({ ok: true })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
