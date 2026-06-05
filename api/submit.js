// Маппинг менеджер → email
// Добавляйте новых менеджеров сюда
const MANAGER_EMAILS = {
  'n.omarov': 'astananur@gmail.com',
  'a.kuz':    'astananur@gmail.com',   // заменить на реальный email Азизы
  'manager3': 'astananur@gmail.com',   // заменить на реальный email
};
const FALLBACK_EMAIL = 'astananur@gmail.com';

// Email получателя = почта менеджера или fallback
function getManagerEmail(managerId) {
  return MANAGER_EMAILS[managerId] || FALLBACK_EMAIL;
}
const RESEND_KEY     = process.env.RESEND_API_KEY || 're_8UGpHFbF_7jsHzk9qayhwrtVQpYWSHn3a';
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN || null;
const BASE_ID        = 'appHakMP7mBJhUu7p';
const TABLE_ID       = 'tblTU1on0yAcK5RTt';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { data, prompt } = req.body;
    if (!data?.company) return res.status(400).json({ error: 'Missing data' });

    const results = { email: null, airtable: null };

    // 1. EMAIL — always, independent of Airtable
    try {
      const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#0D1F4E;padding:20px 24px;border-radius:10px 10px 0 0;display:flex;align-items:center;gap:12px">
          <div style="background:#2056B8;width:32px;height:32px;border-radius:6px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:11px;flex-shrink:0">DG</div>
          <div>
            <div style="color:#fff;font-size:15px;font-weight:700">Новая анкета клиента</div>
            <div style="color:rgba(255,255,255,.45);font-size:11px">Documentolog &middot; d8n.ai</div>
          </div>
        </div>
        <div style="background:#fff;border:1px solid #E2E8F0;border-top:none;border-radius:0 0 10px 10px;overflow:hidden">
          <div style="padding:16px 20px;border-bottom:1px solid #F1F5F9">
            <div style="font-size:18px;font-weight:700;color:#0D1F4E">${data.company}</div>
            <div style="font-size:12px;color:#64748B;margin-top:2px">${data.industry} &middot; ${data.ownership} &middot; БИН: ${data.bin}</div>
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:13px">
            <tr><td style="padding:8px 20px;color:#94A3B8;width:38%;border-bottom:1px solid #F8FAFC;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.4px">Контакт</td><td style="padding:8px 20px;color:#1E293B;border-bottom:1px solid #F8FAFC">${data.contactName}, ${data.contactRole}</td></tr>
            <tr style="background:#FAFBFC"><td style="padding:8px 20px;color:#94A3B8;border-bottom:1px solid #F8FAFC;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.4px">Email / Тел.</td><td style="padding:8px 20px;border-bottom:1px solid #F8FAFC"><a href="mailto:${data.contactEmail}" style="color:#2056B8">${data.contactEmail}</a> &middot; ${data.contactPhone}</td></tr>
            <tr><td style="padding:8px 20px;color:#94A3B8;border-bottom:1px solid #F8FAFC;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.4px">N_full / Deploy</td><td style="padding:8px 20px;color:#1E293B;font-weight:600;border-bottom:1px solid #F8FAFC">${data.usersCount} польз. &middot; ${data.deploy}</td></tr>
            <tr style="background:#FAFBFC"><td style="padding:8px 20px;color:#94A3B8;border-bottom:1px solid #F8FAFC;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.4px">Бюджет / Срок</td><td style="padding:8px 20px;color:#1E293B;border-bottom:1px solid #F8FAFC">${data.budget} &middot; ${data.contractTerm} &middot; до ${data.deadline}</td></tr>
            <tr><td style="padding:8px 20px;color:#94A3B8;border-bottom:1px solid #F8FAFC;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.4px">Модули</td><td style="padding:8px 20px;color:#1E293B;border-bottom:1px solid #F8FAFC">${data.modules}</td></tr>
            <tr style="background:#FAFBFC"><td style="padding:8px 20px;color:#94A3B8;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.4px">Economic Buyer</td><td style="padding:8px 20px;color:#1E293B">${data.economicBuyer}</td></tr>
          </table>
          <div style="margin:16px 20px;background:#EBF2FF;border-left:3px solid #2056B8;padding:10px 14px;border-radius:0 6px 6px 0">
            <div style="font-size:10px;color:#2056B8;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px">Боль клиента</div>
            <div style="font-size:13px;color:#334155;line-height:1.5">${data.pain}</div>
          </div>
          <div style="margin:0 20px 20px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:6px;padding:12px">
            <div style="font-size:10px;color:#94A3B8;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Промпт для d8n Sales</div>
            <pre style="font-family:'Courier New',monospace;font-size:10px;color:#475569;white-space:pre-wrap;margin:0;line-height:1.6">${prompt}</pre>
          </div>
          <div style="padding:12px 20px;border-top:1px solid #E2E8F0;text-align:center;font-size:11px;color:#94A3B8">
            Менеджер: ${data.managerName} &middot; Documentolog Group
          </div>
        </div>
      </div>`;

      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'DG Anketa <onboarding@resend.dev>',
          to: [getManagerEmail(data.managerId)],
          subject: `Новая анкета: ${data.company} — ${data.usersCount} польз. / ${data.deploy} / ${data.budget}`,
          html,
        }),
      });
      const emailJson = await emailRes.json();
      results.email = emailJson.id ? 'sent:' + emailJson.id : 'error:' + JSON.stringify(emailJson);
      console.log('Email result:', results.email);
    } catch(e) {
      results.email = 'exception:' + e.message;
      console.error('Email error:', e.message);
    }

    // 2. AIRTABLE — only if token present
    if (AIRTABLE_TOKEN) {
      try {
        const fields = {
          'Компания': data.company, 'БИН': data.bin,
          'Менеджер': data.managerName, 'manager_id': data.managerId,
          'Статус': 'Новое', 'Дата': new Date().toISOString(),
          'Отрасль': data.industry, 'Вид собственности': data.ownership,
          'Контакт ФИО': data.contactName, 'Должность': data.contactRole,
          'Email': data.contactEmail, 'Телефон': data.contactPhone,
          'N_full': parseInt(data.usersCount)||0,
          'N_mobile': parseInt(data.mobileCount)||0,
          'Всего сотрудников': parseInt(data.totalEmployees)||0,
          'Рост пользователей': data.growth, 'Филиалы': data.branches,
          'Текущая СЭД': data.currentSed, 'Название СЭД': data.sedName,
          'Цель внедрения': data.goal, 'Боль': data.pain, 'Срочность': data.urgency,
          'Модули': data.modules, 'AI-агенты': data.aiAgents,
          'Интеграции': data.integrations, 'Развёртывание': data.deploy,
          'Срок договора': data.contractTerm, 'Авансовая оплата': data.prepay,
          'Бюджет': data.budget, 'Срок заключения': data.deadline,
          'Economic Buyer': data.economicBuyer, 'Champion': data.champion,
          'Критерии выбора': data.criteria, 'Примечания': data.notes,
          'Промпт d8n Sales': prompt,
        };
        const atRes = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields, typecast: true }),
        });
        const atJson = await atRes.json();
        results.airtable = atJson.id ? 'saved:' + atJson.id : 'error:' + JSON.stringify(atJson).slice(0, 100);
        console.log('Airtable:', results.airtable);
      } catch(e) {
        results.airtable = 'exception:' + e.message;
      }
    } else {
      results.airtable = 'skipped:no AIRTABLE_TOKEN';
      console.log('Airtable skipped');
    }

    return res.status(200).json({ ok: true, ...results });

  } catch (err) {
    console.error('handler error:', err);
    return res.status(500).json({ error: err.message });
  }
}
