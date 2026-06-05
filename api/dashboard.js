// api/dashboard.js
// Serves /dashboard with HTTP Basic Auth protection

export default async function handler(req, res) {
  const auth = req.headers['authorization'];

  if (auth) {
    const [scheme, encoded] = (auth || '').split(' ');
    if (scheme === 'Basic' && encoded) {
      try {
        const decoded = Buffer.from(encoded, 'base64').toString('utf8');
        const colon = decoded.indexOf(':');
        const user = decoded.slice(0, colon);
        const pwd  = decoded.slice(colon + 1);
        if (user === process.env.DASH_USER && pwd === process.env.DASH_PWD) {
          // Auth OK — serve the dashboard HTML
          const fs = await import('fs');
          const path = await import('path');
          const filePath = path.join(process.cwd(), 'public', 'dashboard.html');
          const html = fs.readFileSync(filePath, 'utf8');
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.setHeader('Cache-Control', 'no-store');
          return res.status(200).send(html);
        }
      } catch(e) { /* fall through */ }
    }
  }

  // Not authenticated
  res.setHeader('WWW-Authenticate', 'Basic realm="Documentolog Dashboard"');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(401).send('Unauthorized');
}
