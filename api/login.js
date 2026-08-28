import { createSession, findDashboardUser, verifyPassword } from './_lib.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const email = String(req.body?.email || '').trim();
  const password = String(req.body?.password || '');
  const user = findDashboardUser(email);
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return res.status(401).json({ error: 'Неверная почта или пароль' });
  }

  try {
    createSession(res, user);
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
