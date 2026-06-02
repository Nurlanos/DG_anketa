// api/submit.js — сохраняет в Airtable + шлёт email менеджеру

const BASE_ID  = 'appHakMP7mBJhUu7p';
const TABLE_ID = 'tblTU1on0yAcK5RTt';

// email менеджера — получает уведомление при каждой новой анкете
const MANAGER_EMAIL = 'astananur@gmail.com';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const airtableToken = process.env.AIRTABLE_TOKEN;
  const resendKey     = process.env.RESEND_API_KEY;
  if (!airtableToken) return res.status(500).json({ error: 'AIRTABLE_TOKEN not set' });

  try {
    const { data, prompt } = req.body;
    if (!data?.company) return res.status(400).json({ error: 'Missing data' });

    // ── 1. Сохранить в Airtable ──────────────────────────────────────────────
    const fields = {
      'Компания':           data.company,
      'БИН':                data.bin,
      'Менеджер':           data.managerName,
      'manager_id':         data.managerId,
      'Статус':             'Новое',
      'Дата':               new Date().toISOString(),
      'Отрасль':            data.industry,
      'Вид собственности':  data.ownership,
      'Контакт ФИО':        data.contactName,
      'Должность':          data.contactRole,
      'Email':              data.contactEmail,
      'Телефон':            data.contactPhone,
      'N_full':             parseInt(data.usersCount)    || 0,
      'N_mobile':           parseInt(data.mobileCount)   || 0,
      'Всего сотрудников':  parseInt(data.totalEmployees)|| 0,
      'Рост пользователей': data.growth,
      'Филиалы':            data.branches,
      'Текущая СЭД':        data.currentSed,
      'Название СЭД':       data.sedName,
      'Цель внедрения':     data.goal,
      'Боль':               data.pain,
      'Срочность':          data.urgency,
      'Модули':             data.modules,
      'AI-агенты':          data.aiAgents,
      'Интеграции':         data.integrations,
      'Развёртывание':      data.deploy,
      'Срок договора':      data.contractTerm,
      'Авансовая оплата':   data.prepay,
      'Бюджет':             data.budget,
      'Срок заключения':    data.deadline,
      'Economic Buyer':     data.economicBuyer,
      'Champion':           data.champion,
      'Критерии выбора':    data.criteria,
      'Примечания':         data.notes,
      'Промпт d8n Sales':   prompt,
    };

    const atRes = await fetch(
      `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`,
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${airtableToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields, typecast: true }),
      }
    );
    if (!atRes.ok) {
      const err = await atRes.text();
      console.error('Airtable error:', err);
      return res.status(500).json({ error: 'Airtable error', details: err });
    }
    const record = await atRes.json();

    // ── 2. Отправить email менеджеру через Resend ────────────────────────────
    if (resendKey) {
      const htmlEmail = `
<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;color:#1A1A1A">
  <div style="background:#E05A1B;padding:20px 24px;border-radius:10px 10px 0 0">
    <span style="color:#fff;font-size:18px;font-weight:600">📋 Новая анкета клиента</span>
  </div>
  <div style="background:#fff;border:1px solid #E0DDD8;border-top:none;padding:24px;border-radius:0 0 10px 10px">
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
      <tr><td style="padding:6px 0;color:#888;font-size:13px;width:40%">Компания</td><td style="padding:6px 0;font-size:13px;font-weight:600">${data.company}</td></tr>
      <tr><td style="padding:6px 0;color:#888;font-size:13px">БИН</td><td style="padding:6px 0;font-size:13px">${data.bin}</td></tr>
      <tr><td style="padding:6px 0;color:#888;font-size:13px">Контакт</td><td style="padding:6px 0;font-size:13px">${data.contactName}, ${data.contactRole}</td></tr>
      <tr><td style="padding:6px 0;color:#888;font-size:13px">Email клиента</td><td style="padding:6px 0;font-size:13px"><a href="mailto:${data.contactEmail}" style="color:#E05A1B">${data.contactEmail}</a></td></tr>
      <tr><td style="padding:6px 0;color:#888;font-size:13px">Телефон</td><td style="padding:6px 0;font-size:13px">${data.contactPhone}</td></tr>
      <tr><td style="padding:6px 0;color:#888;font-size:13px">N_full</td><td style="padding:6px 0;font-size:13px;font-weight:600">${data.usersCount} пользователей</td></tr>
      <tr><td style="padding:6px 0;color:#888;font-size:13px">Отрасль</td><td style="padding:6px 0;font-size:13px">${data.industry}</td></tr>
      <tr><td style="padding:6px 0;color:#888;font-size:13px">Развёртывание</td><td style="padding:6px 0;font-size:13px">${data.deploy}</td></tr>
      <tr><td style="padding:6px 0;color:#888;font-size:13px">Срок договора</td><td style="padding:6px 0;font-size:13px">${data.contractTerm}</td></tr>
      <tr><td style="padding:6px 0;color:#888;font-size:13px">Бюджет</td><td style="padding:6px 0;font-size:13px">${data.budget}</td></tr>
      <tr><td style="padding:6px 0;color:#888;font-size:13px">Срок заключения</td><td style="padding:6px 0;font-size:13px">${data.deadline}</td></tr>
      <tr><td style="padding:6px 0;color:#888;font-size:13px">Economic Buyer</td><td style="padding:6px 0;font-size:13px">${data.economicBuyer}</td></tr>
    </table>

    <div style="background:#FDF0E8;border-left:3px solid #E05A1B;padding:12px 16px;border-radius:0 6px 6px 0;margin-bottom:20px">
      <div style="font-size:11px;color:#E05A1B;font-weight:600;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Боль клиента</div>
      <div style="font-size:13px;color:#333">${data.pain}</div>
    </div>

    <div style="background:#F8F8F8;border-radius:8px;padding:16px;margin-bottom:20px">
      <div style="font-size:11px;color:#888;font-weight:600;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Промпт для d8n Sales</div>
      <pre style="font-family:'Courier New',monospace;font-size:11px;color:#333;white-space:pre-wrap;margin:0;line-height:1.6">${prompt}</pre>
    </div>

    <div style="text-align:center;padding-top:8px;border-top:1px solid #E0DDD8">
      <span style="font-size:11px;color:#aaa">Documentolog Group · Управление №9 · Менеджер: ${data.managerName}</span>
    </div>
  </div>
</div>`;

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'DG Анкеты <onboarding@resend.dev>',
          to:   [MANAGER_EMAIL],
          subject: `📋 Новая анкета: ${data.company} — ${data.usersCount} польз. (${data.deploy})`,
          html:  htmlEmail,
        }),
      }).catch(e => console.warn('email send error:', e));
    } else {
      console.warn('RESEND_API_KEY not set — email skipped');
    }

    return res.status(200).json({ ok: true, recordId: record.id });

  } catch (err) {
    console.error('submit error:', err);
    return res.status(500).json({ error: err.message });
  }
}
