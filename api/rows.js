// api/rows.js — читает анкеты из Airtable для дашборда

const BASE_ID = 'appHakMP7mBJhUu7p';
const TABLE_ID = 'tblTU1on0yAcK5RTt';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const token = process.env.AIRTABLE_TOKEN;
  if (!token) return res.status(500).json({ error: 'AIRTABLE_TOKEN not set' });

  const mgr = req.query.mgr || '';
  const filterFormula = mgr
    ? `encodeURIComponent("{manager_id}='" + mgr + "'")`
    : '';

  try {
    let url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?sort[0][field]=Дата&sort[0][direction]=desc&pageSize=50`;
    if (mgr) url += `&filterByFormula=${encodeURIComponent(`{manager_id}='${mgr}'`)}`;

    const atRes = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!atRes.ok) {
      const err = await atRes.text();
      return res.status(500).json({ error: 'Airtable read error', details: err });
    }

    const json = await atRes.json();
    const rows = (json.records || []).map(r => ({
      id:          r.id,
      date:        r.fields['Дата'] ? new Date(r.fields['Дата']).toLocaleString('ru-RU', {timeZone:'Asia/Almaty'}) : '—',
      manager:     r.fields['Менеджер'] || '—',
      mgr:         r.fields['manager_id'] || '',
      company:     r.fields['Компания'] || '—',
      bin:         r.fields['БИН'] || '',
      industry:    r.fields['Отрасль'] || '',
      email:       r.fields['Email'] || '',
      users:       r.fields['N_full'] || 0,
      budget:      r.fields['Бюджет'] || '—',
      deploy:      r.fields['Развёртывание'] || '—',
      deadline:    r.fields['Срок заключения'] || '—',
      status:      r.fields['Статус'] || 'Новое',
      prompt:      r.fields['Промпт d8n Sales'] || '',
    }));

    return res.status(200).json({ rows });

  } catch (err) {
    console.error('rows error:', err);
    return res.status(500).json({ error: err.message });
  }
}
