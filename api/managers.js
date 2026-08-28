import { getAirtableToken, requireAdmin } from './_lib.js';

const BASE_ID = 'appHakMP7mBJhUu7p';
const TABLE_ID = 'tblTU1on0yAcK5RTt';
const CONFIG_COMPANY = '__DG_MANAGER_CONFIG__';

function getAirtableUrl(query = '') {
  return `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}${query}`;
}

function headers(token) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function getConfigRecords(token) {
  const params = new globalThis.URLSearchParams({ filterByFormula: `{Компания}='${CONFIG_COMPANY}'`, pageSize: '100' });
  const response = await fetch(getAirtableUrl(`?${params}`), { headers: headers(token) });
  if (!response.ok) throw new Error((await response.text()).slice(0, 500));
  return (await response.json()).records || [];
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });
  if (!requireAdmin(req, res)) return;

  const token = getAirtableToken();
  if (!token) return res.status(500).json({ error: 'AIRTABLE_TOKEN not set' });

  try {
    const records = await getConfigRecords(token);
    if (req.method === 'GET') {
      const managers = records.map((record) => {
        const fields = record.fields || {};
        return { id: fields.manager_id, name: fields.Менеджер, email: fields.Email, backupEmail: fields.Примечания || '' };
      }).filter((manager) => manager.id && manager.email);
      return res.status(200).json({ managers });
    }

    const managers = Array.isArray(req.body?.managers) ? req.body.managers : [];
    const validManagers = managers.filter((manager) =>
      manager && /^[a-z0-9._-]+$/i.test(manager.id || '') &&
      manager.name && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(manager.email || '')
    );
    if (!validManagers.length) return res.status(400).json({ error: 'No valid managers provided' });

    const existing = new Map(records.map((record) => [record.fields?.manager_id, record.id]));
    const updates = validManagers.filter((manager) => existing.has(manager.id)).map((manager) => ({
      id: existing.get(manager.id),
      fields: { Компания: CONFIG_COMPANY, manager_id: manager.id, Менеджер: manager.name, Email: manager.email, Примечания: manager.backupEmail || '' },
    }));
    const creates = validManagers.filter((manager) => !existing.has(manager.id)).map((manager) => ({
      fields: { Компания: CONFIG_COMPANY, manager_id: manager.id, Менеджер: manager.name, Email: manager.email, Примечания: manager.backupEmail || '' },
    }));

    if (updates.length) {
      const response = await fetch(getAirtableUrl(), { method: 'PATCH', headers: headers(token), body: JSON.stringify({ records: updates }) });
      if (!response.ok) throw new Error((await response.text()).slice(0, 500));
    }
    if (creates.length) {
      const response = await fetch(getAirtableUrl(), { method: 'POST', headers: headers(token), body: JSON.stringify({ records: creates, typecast: true }) });
      if (!response.ok) throw new Error((await response.text()).slice(0, 500));
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('managers error:', err);
    return res.status(500).json({ error: err.message });
  }
}