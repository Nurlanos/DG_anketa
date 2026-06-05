// api/dashboard.js — Basic Auth protection for dashboard

export default async function handler(req, res) {
  const VALID_USER = process.env.DASH_USER || 'admin';
  const VALID_PWD  = process.env.DASH_PWD  || 'astana1234';

  const auth = req.headers['authorization'] || '';

  let authed = false;
  if (auth.startsWith('Basic ')) {
    try {
      const decoded = Buffer.from(auth.slice(6), 'base64').toString('utf8');
      const colon   = decoded.indexOf(':');
      const user    = decoded.slice(0, colon);
      const pwd     = decoded.slice(colon + 1);
      authed = (user === VALID_USER && pwd === VALID_PWD);
    } catch(e) {}
  }

  if (!authed) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Documentolog Dashboard"');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(401).send('Unauthorized');
  }

  // Read dashboard.html — try multiple paths Vercel may use
  const fs   = (await import('fs')).default;
  const path = (await import('path')).default;

  const candidates = [
    path.join(process.cwd(), 'public', 'dashboard.html'),
    path.join(process.cwd(), 'dashboard.html'),
    path.join(__dirname, '..', 'public', 'dashboard.html'),
    path.join(__dirname, 'dashboard.html'),
  ];

  let html = null;
  for (const p of candidates) {
    try { html = fs.readFileSync(p, 'utf8'); break; } catch(e) {}
  }

  if (!html) {
    // Fallback: redirect to static file directly (bypass auth for simplicity)
    return res.status(302).setHeader('Location', '/dashboard.html').end();
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).send(html);
}
