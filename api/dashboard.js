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

  // Serve dashboard.html
  const fs   = (await import('fs')).default;
  const path = (await import('path')).default;
  const filePath = path.join(process.cwd(), 'public', 'dashboard.html');
  const html = fs.readFileSync(filePath, 'utf8');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).send(html);
}
