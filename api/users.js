import {
  createDashboardUser,
  createInviteToken,
  deleteDashboardUser,
  getDashboardUsers,
  getAppUrl,
  hashPassword,
  isValidPassword,
  requireAdmin,
  updateDashboardUser,
} from './_lib.js'

function publicUser(user) {
  return {
    id: user.recordId || '',
    email: user.email,
    name: user.name || '',
    role: user.role,
    managerId: user.managerId || '',
    status: user.status,
    mustChangePassword: Boolean(user.mustChangePassword),
    managed: Boolean(user.recordId),
  }
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export default async function handler(req, res) {
  const admin = requireAdmin(req, res)
  if (!admin) return
  if (!['GET', 'POST', 'PATCH', 'DELETE'].includes(req.method)) {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const users = await getDashboardUsers()
    if (req.method === 'GET')
      return res.status(200).json({ users: users.map(publicUser) })

    if (req.method === 'POST') {
      const email = String(req.body?.email || '')
        .trim()
        .toLowerCase()
      const name = String(req.body?.name || '').trim()
      const role = req.body?.role === 'admin' ? 'admin' : 'manager'
      const managerId = String(req.body?.managerId || '').trim()
      const password = String(req.body?.password || '')
      if (
        !validEmail(email) ||
        !name ||
        (password && !isValidPassword(password))
      ) {
        return res.status(400).json({
          error: 'Нужны корректные почта, имя и пароль от 8 латинских символов',
        })
      }
      if (role === 'manager' && !managerId) {
        return res.status(400).json({ error: 'Для менеджера нужен managerId' })
      }
      if (users.some((user) => user.email.toLowerCase() === email)) {
        return res
          .status(409)
          .json({ error: 'Пользователь с такой почтой уже есть' })
      }
      const invite = password ? null : createInviteToken()
      const metadata = {
        email,
        name,
        managerId,
        role,
        passwordHash: password ? await hashPassword(password) : '',
        status: password ? 'active' : 'pending',
        mustChangePassword: Boolean(password),
        ...(invite
          ? {
              inviteHash: invite.hash,
              inviteExpires: Date.now() + 24 * 60 * 60 * 1000,
            }
          : {}),
      }
      const created = await createDashboardUser({
        Примечания: JSON.stringify(metadata),
      })
      if (invite) {
        const inviteUrl = `${getAppUrl()}/invite.html?token=${encodeURIComponent(invite.token)}`
        const resendKey = process.env.RESEND_API_KEY || ''
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
        if (!resendKey)
          return res.status(500).json({ error: 'RESEND_API_KEY not configured' })
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [email],
            subject: 'Приглашение в дашборд Documentolog',
            html: `<p>Здравствуйте, ${name}!</p><p>Вас пригласили в дашборд Documentolog.</p><p><a href="${inviteUrl}">Создать пароль и войти</a></p><p>Ссылка действует 24 часа и используется один раз.</p>`,
          }),
        })
        if (!emailResponse.ok) {
          await deleteDashboardUser(created.id)
          const details = await emailResponse.text()
          let message = 'Не удалось отправить приглашение на email'
          try {
            message = JSON.parse(details).message || message
          } catch {
            message = `${message}: ${details.slice(0, 200)}`
          }
          return res.status(502).json({ error: message })
        }
        return res
          .status(201)
          .json({
            user: publicUser({ ...metadata, recordId: created.id }),
            inviteSent: true,
          })
      }
      return res.status(201).json({
        user: publicUser({
          ...created.fields,
          recordId: created.id,
          email,
          name,
          role,
          managerId,
          status: 'active',
          mustChangePassword: true,
        }),
      })
    }

    const recordId = String(req.body?.id || '')
    const target = users.find((user) => user.recordId === recordId)
    if (!target)
      return res
        .status(404)
        .json({ error: 'Пользователь не найден или управляется через env' })

    if (req.method === 'DELETE') {
      if (target.email.toLowerCase() === admin.email.toLowerCase())
        return res.status(400).json({ error: 'Нельзя удалить свой аккаунт' })
      if (
        target.role === 'admin' &&
        users.filter(
          (user) => user.role === 'admin' && user.status === 'active'
        ).length <= 1
      ) {
        return res
          .status(400)
          .json({ error: 'Нельзя удалить последнего активного администратора' })
      }
      await deleteDashboardUser(recordId)
      return res.status(200).json({ ok: true })
    }

    const action = req.body?.action
    if (action === 'block' || action === 'unblock') {
      if (
        target.email.toLowerCase() === admin.email.toLowerCase() &&
        action === 'block'
      ) {
        return res
          .status(400)
          .json({ error: 'Нельзя заблокировать свой аккаунт' })
      }
      await updateDashboardUser(recordId, {
        Примечания: JSON.stringify({
          role: target.role,
          passwordHash: target.passwordHash,
          status: action === 'block' ? 'blocked' : 'active',
          mustChangePassword: target.mustChangePassword,
        }),
      })
      return res.status(200).json({ ok: true })
    }
    if (action === 'reset-password') {
      const password = String(req.body?.password || '')
      if (!isValidPassword(password))
        return res.status(400).json({
          error: 'Пароль: минимум 8 латинских символов, цифр или знаков',
        })
      await updateDashboardUser(recordId, {
        Примечания: JSON.stringify({
          role: target.role,
          passwordHash: await hashPassword(password),
          status: target.status,
          mustChangePassword: true,
        }),
      })
      return res.status(200).json({ ok: true })
    }
    return res.status(400).json({ error: 'Unknown action' })
  } catch (err) {
    console.error('users error:', err)
    return res.status(500).json({ error: err.message })
  }
}
