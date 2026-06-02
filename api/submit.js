// api/submit.js — Vercel serverless function
// POST /api/submit → создаёт запись в Airtable

const BASE_ID = 'appHakMP7mBJhUu7p';
const TABLE_ID = 'tblTU1on0yAcK5RTt';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = process.env.AIRTABLE_TOKEN;
  if (!token) return res.status(500).json({ error: 'AIRTABLE_TOKEN not set' });

  try {
    const { data, prompt } = req.body;
    if (!data || !data.company) return res.status(400).json({ error: 'Missing data' });

    const fields = {
      'Компания':            data.company,
      'БИН':                 data.bin,
      'Менеджер':            data.managerName,
      'manager_id':          data.managerId,
      'Статус':              'Новое',
      'Дата':                new Date().toISOString(),
      'Отрасль':             data.industry,
      'Вид собственности':   data.ownership,
      'Контакт ФИО':         data.contactName,
      'Должность':           data.contactRole,
      'Email':               data.contactEmail,
      'Телефон':             data.contactPhone,
      'N_full':              parseInt(data.usersCount) || 0,
      'N_mobile':            parseInt(data.mobileCount) || 0,
      'Всего сотрудников':   parseInt(data.totalEmployees) || 0,
      'Рост пользователей':  data.growth,
      'Филиалы':             data.branches,
      'Текущая СЭД':         data.currentSed,
      'Название СЭД':        data.sedName,
      'Цель внедрения':      data.goal,
      'Боль':                data.pain,
      'Срочность':           data.urgency,
      'Модули':              data.modules,
      'AI-агенты':           data.aiAgents,
      'Интеграции':          data.integrations,
      'Развёртывание':       data.deploy,
      'Срок договора':       data.contractTerm,
      'Авансовая оплата':    data.prepay,
      'Бюджет':              data.budget,
      'Срок заключения':     data.deadline,
      'Economic Buyer':      data.economicBuyer,
      'Champion':            data.champion,
      'Критерии выбора':     data.criteria,
      'Примечания':          data.notes,
      'Промпт d8n Sales':    prompt,
    };

    const atRes = await fetch(
      `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fields, typecast: true }),
      }
    );

    if (!atRes.ok) {
      const err = await atRes.text();
      console.error('Airtable error:', err);
      return res.status(500).json({ error: 'Airtable error', details: err });
    }

    const record = await atRes.json();
    return res.status(200).json({ ok: true, recordId: record.id });

  } catch (err) {
    console.error('submit error:', err);
    return res.status(500).json({ error: err.message });
  }
}
