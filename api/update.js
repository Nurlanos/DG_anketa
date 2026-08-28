import { getAirtableToken, requireDashboardAuth } from './_lib.js';

const BASE_ID  = 'appHakMP7mBJhUu7p';
const TABLE_ID = 'tblTU1on0yAcK5RTt';
const ARCHIVE_MARKER = '__DG_ARCHIVED__';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' });
  const user = requireDashboardAuth(req, res);
  if (!user) return;

  const AT_TOKEN = getAirtableToken();
  if (!AT_TOKEN) return res.status(500).json({ error: 'AIRTABLE_TOKEN not set' });

  const { recordId, status } = req.body;
  if (!recordId || !status) return res.status(400).json({ error: 'Missing recordId or status' });

  const VALID = ['Новое','КП в работе','КП отправлено','Договор','Отказ','Архив'];
  if (!VALID.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  try {
    const recordRes = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}/${recordId}`, {
      headers: { 'Authorization': `Bearer ${AT_TOKEN}` },
    });
    if (!recordRes.ok) { const e = await recordRes.text(); return res.status(500).json({ error: e }); }
    const record = await recordRes.json();
    if (user.role !== 'admin' && record.fields?.manager_id !== user.managerId) {
      return res.status(403).json({ error: 'You cannot update this record' });
    }
    const currentNotes = String(record.fields?.Примечания || '');
    const fields = {};

    if (status === 'Архив') {
      fields['Примечания'] = currentNotes.startsWith(ARCHIVE_MARKER)
        ? currentNotes
        : `${ARCHIVE_MARKER}\n${currentNotes}`;
    } else {
      fields['Статус'] = status;
      fields['Примечания'] = currentNotes.startsWith(`${ARCHIVE_MARKER}\n`)
        ? currentNotes.slice(ARCHIVE_MARKER.length + 1)
        : currentNotes.startsWith(ARCHIVE_MARKER) ? currentNotes.slice(ARCHIVE_MARKER.length) : currentNotes;
    }

    const atRes = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}/${recordId}`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${AT_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
    });
    if (!atRes.ok) { const e = await atRes.text(); return res.status(500).json({ error: e }); }
    const data = await atRes.json();
    return res.status(200).json({ ok: true, status: status === 'Архив' ? 'Архив' : data.fields['Статус'] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
