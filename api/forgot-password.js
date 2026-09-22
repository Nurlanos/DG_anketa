import {
  createInviteToken,
  createPasswordResetToken,
  findDashboardUser,
  getAppUrl,
  updateDashboardUser,
} from './_lib.js'
import { sendMail } from './_mail.js'

export default async function handler(req, res) {
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' })

  const email = String(req.body?.email || '')
    .trim()
    .toLowerCase()
  const genericResponse = {
    ok: true,
    message:
      'Если такой аккаунт существует, ссылка для восстановления отправлена на почту.',
  }
  if (!email) return res.status(200).json(genericResponse)

  try {
    const user = await findDashboardUser(email)
    if (!user || user.status !== 'active')
      return res.status(200).json(genericResponse)

    const reset = user.recordId ? createInviteToken() : null
    if (reset) {
      await updateDashboardUser(user.recordId, {
        Примечания: JSON.stringify({
          email: user.email,
          name: user.name,
          managerId: user.managerId,
          role: user.role,
          passwordHash: user.passwordHash,
          status: user.status,
          mustChangePassword: user.mustChangePassword,
          resetHash: reset.hash,
          resetExpires: Date.now() + 60 * 60 * 1000,
        }),
      })
    }
    const token = reset?.token || createPasswordResetToken(user.email)
    const resetUrl = `${getAppUrl()}/reset-password.html?token=${encodeURIComponent(token)}`
    await sendMail({
      to: user.email,
      subject: 'Восстановление пароля для дашборда',
      html: `<p>Здравствуйте, ${user.name || ''}!</p><p>Чтобы создать новый пароль, перейдите по ссылке:</p><p><a href="${resetUrl}">Восстановить пароль</a></p><p>Ссылка действует 1 час.</p>`,
    })
    return res.status(200).json(genericResponse)
  } catch (err) {
    console.error('forgot-password error:', err)
    return res.status(502).json({
      error: 'Не удалось отправить письмо. Проверьте настройки почты.',
    })
  }
}
