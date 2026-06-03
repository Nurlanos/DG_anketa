const BASE_ID  = 'appHakMP7mBJhUu7p';
const TABLE_ID = 'tblTU1on0yAcK5RTt';
const AT_TOKEN = process.env.AIRTABLE_TOKEN;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' });

  const { recordId, status } = req.body;
  if (!recordId || !status) return res.status(400).json({ error: 'Missing recordId or status' });

  const VALID = ['Новое','КП в работе','КП отправлено','Договор','Отказ'];
  if (!VALID.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  try {
    const atRes = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}/${recordId}`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${AT_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: { 'Статус': status } }),
    });
    if (!atRes.ok) { const e = await atRes.text(); return res.status(500).json({ error: e }); }
    const data = await atRes.json();
    return res.status(200).json({ ok: true, status: data.fields['Статус'] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
