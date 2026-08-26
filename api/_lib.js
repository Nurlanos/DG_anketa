// api/_lib.js — shared helpers for API routes.
// Filename starts with "_" so Vercel does not expose it as a route.

export function getAirtableToken() {
  return process.env.AIRTABLE_TOKEN || process.env.Airtable || '';
}

// Server-side Basic Auth guard for the manager dashboard and its data APIs.
// Fails closed: if DASH_USER/DASH_PWD are not configured, access is denied
// rather than falling back to a hardcoded default password.
export function requireDashboardAuth(req, res) {
  const validUser = process.env.DASH_USER;
  const validPwd = process.env.DASH_PWD;

  if (!validUser || !validPwd) {
    res.status(500).json({ error: 'DASH_USER/DASH_PWD not configured on the server' });
    return false;
  }

  const auth = req.headers['authorization'] || '';
  let authed = false;
  if (auth.startsWith('Basic ')) {
    try {
      const decoded = Buffer.from(auth.slice(6), 'base64').toString('utf8');
      const colon = decoded.indexOf(':');
      const user = decoded.slice(0, colon);
      const pwd = decoded.slice(colon + 1);
      authed = user === validUser && pwd === validPwd;
    } catch {
      authed = false;
    }
  }

  if (!authed) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Documentolog Dashboard"');
    res.setHeader('Cache-Control', 'no-store');
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }

  return true;
}
