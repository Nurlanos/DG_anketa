const BASE_ID  = 'appHakMP7mBJhUu7p';
const TABLE_ID = 'tblTU1on0yAcK5RTt';
const MANAGER_EMAIL = 'astananur@gmail.com';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const airtableToken = process.env.AIRTABLE_TOKEN;
  // Fallback to hardcoded key if env var not set on Vercel yet
  const resendKey = process.env.RESEND_API_KEY || 're_8UGpHFbF_7jsHzk9qayhwrtVQpYWSHn3a';

  if (!airtableToken) return res.status(500).json({ error: 'AIRTABLE_TOKEN not set' });

  try {
    const { data, prompt } = req.body;
    if (!data?.company) return res.status(400).json({ error: 'Missing data' });

    // 1. Save to Airtable
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
      'N_full':             parseInt(data.usersCount)     || 0,
      'N_mobile':           parseInt(data.mobileCount)    || 0,
      'Всего сотрудников':  parseInt(data.totalEmployees) || 0,
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

    const atRes = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${airtableToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields, typecast: true }),
    });
    if (!atRes.ok) {
      const err = await atRes.text();
      console.error('Airtable error:', err);
      return res.status(500).json({ error: 'Airtable error', details: err });
    }
    const record = await atRes.json();

    // 2. Send email to manager via Resend
    const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff">
      <div style="background:#0B1B3E;padding:24px 28px;border-radius:12px 12px 0 0">
        <div style="display:flex;align-items:center;gap:12px">
          <div style="width:36px;height:36px;background:#2563EB;border-radius:8px;display:flex;align-items:center;justify-content:center">
            <span style="color:#fff;font-size:14px;font-weight:700">DG</span>
          </div>
          <div>
            <div style="color:#fff;font-size:16px;font-weight:700;letter-spacing:-.3px">Documentolog</div>
            <div style="color:rgba(255,255,255,.5);font-size:11px">Новая анкета клиента</div>
          </div>
        </div>
      </div>
      <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-top:none;padding:0;border-radius:0 0 12px 12px;overflow:hidden">
        <div style="background:#fff;padding:20px 24px;border-bottom:1px solid #E2E8F0">
          <div style="font-size:20px;font-weight:700;color:#0B1B3E;margin-bottom:4px">${data.company}</div>
          <div style="font-size:13px;color:#64748B">${data.industry} · ${data.ownership}</div>
        </div>
        <table style="width:100%;border-collapse:collapse">
          <tr style="background:#fff">
            <td style="padding:10px 24px;font-size:12px;color:#94A3B8;text-transform:uppercase;letter-spacing:.5px;font-weight:600;width:40%;border-bottom:1px solid #F1F5F9">Контакт</td>
            <td style="padding:10px 24px;font-size:13px;color:#1E293B;border-bottom:1px solid #F1F5F9">${data.contactName} — ${data.contactRole}</td>
          </tr>
          <tr>
            <td style="padding:10px 24px;font-size:12px;color:#94A3B8;text-transform:uppercase;letter-spacing:.5px;font-weight:600;border-bottom:1px solid #F1F5F9">Email / Тел.</td>
            <td style="padding:10px 24px;font-size:13px;border-bottom:1px solid #F1F5F9"><a href="mailto:${data.contactEmail}" style="color:#2563EB">${data.contactEmail}</a> · ${data.contactPhone}</td>
          </tr>
          <tr style="background:#fff">
            <td style="padding:10px 24px;font-size:12px;color:#94A3B8;text-transform:uppercase;letter-spacing:.5px;font-weight:600;border-bottom:1px solid #F1F5F9">N_full / Deploy</td>
            <td style="padding:10px 24px;font-size:13px;color:#1E293B;font-weight:600;border-bottom:1px solid #F1F5F9">${data.usersCount} пользователей · ${data.deploy}</td>
          </tr>
          <tr>
            <td style="padding:10px 24px;font-size:12px;color:#94A3B8;text-transform:uppercase;letter-spacing:.5px;font-weight:600;border-bottom:1px solid #F1F5F9">Срок / Бюджет</td>
            <td style="padding:10px 24px;font-size:13px;color:#1E293B;border-bottom:1px solid #F1F5F9">${data.contractTerm} · ${data.budget}</td>
          </tr>
          <tr style="background:#fff">
            <td style="padding:10px 24px;font-size:12px;color:#94A3B8;text-transform:uppercase;letter-spacing:.5px;font-weight:600;border-bottom:1px solid #F1F5F9">Модули</td>
            <td style="padding:10px 24px;font-size:13px;color:#1E293B;border-bottom:1px solid #F1F5F9">${data.modules}</td>
          </tr>
          <tr>
            <td style="padding:10px 24px;font-size:12px;color:#94A3B8;text-transform:uppercase;letter-spacing:.5px;font-weight:600;border-bottom:1px solid #F1F5F9">Economic Buyer</td>
            <td style="padding:10px 24px;font-size:13px;color:#1E293B;border-bottom:1px solid #F1F5F9">${data.economicBuyer}</td>
          </tr>
        </table>
        <div style="padding:16px 24px;background:#FEF9EE;border-top:3px solid #2563EB">
          <div style="font-size:11px;color:#2563EB;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Боль клиента</div>
          <div style="font-size:13px;color:#334155;line-height:1.6">${data.pain}</div>
        </div>
        <div style="padding:16px 24px;border-top:1px solid #E2E8F0">
          <div style="font-size:11px;color:#94A3B8;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Промпт для d8n Sales</div>
          <pre style="font-family:'Courier New',monospace;font-size:11px;color:#475569;white-space:pre-wrap;margin:0;background:#F8FAFC;padding:12px;border-radius:6px;line-height:1.6;border:1px solid #E2E8F0">${prompt}</pre>
        </div>
        <div style="padding:14px 24px;border-top:1px solid #E2E8F0;text-align:center">
          <span style="font-size:11px;color:#94A3B8">Менеджер: ${data.managerName} · Documentolog Group · d8n.ai</span>
        </div>
      </div>
    </div>`;

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'DG Анкеты <onboarding@resend.dev>',
        to: [MANAGER_EMAIL],
        subject: `📋 Новая анкета: ${data.company} — ${data.usersCount} польз. · ${data.deploy}`,
        html,
      }),
    });

    const emailResult = await emailRes.json();
    console.log('Email result:', JSON.stringify(emailResult));

    return res.status(200).json({ ok: true, recordId: record.id, emailId: emailResult.id || null });

  } catch (err) {
    console.error('submit error:', err);
    return res.status(500).json({ error: err.message });
  }
}
