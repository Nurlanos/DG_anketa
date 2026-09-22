import {
  createSession,
  createDashboardUser,
  getDashboardUsers,
  hashInviteToken,
  hashPassword,
  isValidPassword,
  readPasswordResetToken,
  updateDashboardUser,
} from './_lib.js'

export default async function handler(req, res) {
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  const token = String(req.body?.token || '')
  const password = String(req.body?.password || '')
  if (!isValidPassword(password))
    return res
      .status(400)
      .json({ error: 'Пароль: минимум 8 латинских символов, цифр или знаков' })

  try {
    const users = await getDashboardUsers()
    let user = users.find(
      (item) =>
        item.resetHash === hashInviteToken(token) &&
        item.status === 'active' &&
        item.resetExpires > Date.now()
    )
    const inviteUser = users.find(
      (item) =>
        item.inviteHash === hashInviteToken(token) &&
        item.status === 'pending' &&
        item.inviteExpires > Date.now()
    )
    const signedToken = readPasswordResetToken(token)
    if (!user && signedToken) {
      user = users.find(
        (item) =>
          !item.recordId &&
          item.status === 'active' &&
          item.email.toLowerCase() === signedToken.email.toLowerCase()
      )
    }
    if (!user) user = inviteUser
    if (!user)
      return res
        .status(400)
        .json({ error: 'Ссылка недействительна или уже истекла' })

    const fields = {
      Примечания: JSON.stringify({
        email: user.email,
        name: user.name,
        managerId: user.managerId,
        role: user.role,
        passwordHash: await hashPassword(password),
        status: 'active',
        mustChangePassword: false,
      }),
    }
    let recordId = user.recordId
    if (recordId) await updateDashboardUser(recordId, fields)
    else recordId = (await createDashboardUser(fields)).id
    createSession(res, { ...user, recordId, mustChangePassword: false })
    return res.status(200).json({ ok: true })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
