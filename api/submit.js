const BASE_ID  = 'appHakMP7mBJhUu7p';
const TABLE_ID = 'tblTU1on0yAcK5RTt';
const AT_TOKEN = process.env.AIRTABLE_TOKEN;
const RESEND_KEY = process.env.RESEND_API_KEY || 're_8UGpHFbF_7jsHzk9qayhwrtVQpYWSHn3a';

const MANAGER_EMAILS = {
  'n.omarov': 'astananur@gmail.com',
  'a.kuz':    'astananur@gmail.com',
  'manager3': 'astananur@gmail.com',
};
const FALLBACK_EMAIL = 'astananur@gmail.com';
function getManagerEmail(id) { return MANAGER_EMAILS[id] || FALLBACK_EMAIL; }

const SEG_LABEL = { se: 'd8n Standard Edition (SE)', aie: 'd8n AI Edition (AIE)' };

function buildMarkdown(data, prompt) {
  const dt = new Date().toLocaleDateString('ru-RU');
  return `# Анкета клиента — ${data.company}

**Дата:** ${dt}
**Менеджер:** ${data.managerName}
**Сегмент:** ${SEG_LABEL[data.segment] || data.segment}

---

## 1. Организация

| Поле | Значение |
|---|---|
| Компания | ${data.company} |
| БИН / ИИН | ${data.bin} |
| Собственность | ${data.ownership} |
| Отрасль | ${data.industry} |
| Холдинг / ЮЛ | ${data.holding} / ${data.legalEntities} юр. лиц |
| Контактное лицо | ${data.contactName}, ${data.contactRole} |
| Email | ${data.contactEmail} |
| Телефон | ${data.contactPhone} |
| Economic Buyer | ${data.economicBuyer} |
| Champion | ${data.champion} |

## 2. Масштаб

| Параметр | Значение |
|---|---|
| N_full (офисные) | ${data.usersCount} |
| N_mobile (линейные) | ${data.mobileCount} |
| Всего сотрудников | ${data.totalEmployees} |
| Филиалы | ${data.branches} |
| Рост штата | ${data.growth} |

## 3. Бизнес-задача

| Параметр | Значение |
|---|---|
| Текущая СЭД | ${data.currentSed}${data.sedName && data.sedName !== '—' ? ' — ' + data.sedName : ''} |
| Цель внедрения | ${data.goal} |
| Срочность | ${data.urgency} |

**Боль:**
${data.pain}

**Видение через 12 месяцев:**
${data.vision12}

## 4. Модули и AI

| Параметр | Значение |
|---|---|
| BPM-модули | ${data.modules} |
| Коммуникации dg | ${data.comms} |
| AI-агенты | ${data.aiAgents} |
| Custom AI | ${data.customAi} |
| Развёртывание | ${data.deploy} |
| GPU | ${data.gpu} |
| Интеграции | ${data.integrations} |
| Безопасность | ${data.security} |
| Модель услуг | ${data.serviceModel} |

## 5. Коммерческие условия

| Параметр | Значение |
|---|---|
| Срок договора | ${data.contractTerm} |
| Авансовая оплата | ${data.prepay} |
| OPEX / CAPEX | ${data.opex} |
| Статус бюджета | ${data.budget} |
| Дедлайн | ${data.deadline} |
| Тендер (ПГЗ) | ${data.tender} |
| Критерии выбора | ${data.criteria} |
| Примечания | ${data.notes} |

---

## Промпт для d8n Sales

${prompt}
`;
}

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
    const mdContent = buildMarkdown(data, prompt);
    const mdBase64  = Buffer.from(mdContent, 'utf8').toString('base64');
    const filename  = `anketa_${(data.company||'client').replace(/[^\wа-яёА-ЯЁ]/gi,'_').slice(0,30)}_${new Date().toISOString().slice(0,10)}.md`;

    // Email
    try {
      const html = `<div style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#0D1F4E;padding:20px 24px;border-radius:10px 10px 0 0">
          <div style="color:#fff;font-size:15px;font-weight:700">Новая анкета клиента</div>
          <div style="color:rgba(255,255,255,.45);font-size:11px">Documentolog · d8n.ai</div>
        </div>
        <div style="background:#fff;border:1px solid #E2E8F0;border-top:none;border-radius:0 0 10px 10px;overflow:hidden">
          <div style="padding:16px 20px;border-bottom:1px solid #F1F5F9">
            <div style="font-size:18px;font-weight:700;color:#0D1F4E">${data.company}</div>
            <div style="font-size:12px;color:#64748B">${data.industry} · ${data.ownership} · БИН: ${data.bin}</div>
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:13px">
            <tr><td style="padding:8px 20px;color:#94A3B8;width:38%;font-size:11px;font-weight:600;text-transform:uppercase;border-bottom:1px solid #F8FAFC">Контакт</td><td style="padding:8px 20px;color:#1E293B;border-bottom:1px solid #F8FAFC">${data.contactName}, ${data.contactRole}</td></tr>
            <tr style="background:#FAFBFC"><td style="padding:8px 20px;color:#94A3B8;font-size:11px;font-weight:600;text-transform:uppercase;border-bottom:1px solid #F8FAFC">Email / Тел.</td><td style="padding:8px 20px;border-bottom:1px solid #F8FAFC"><a href="mailto:${data.contactEmail}" style="color:#2056B8">${data.contactEmail}</a> · ${data.contactPhone}</td></tr>
            <tr><td style="padding:8px 20px;color:#94A3B8;font-size:11px;font-weight:600;text-transform:uppercase;border-bottom:1px solid #F8FAFC">N_full / Deploy</td><td style="padding:8px 20px;font-weight:600;border-bottom:1px solid #F8FAFC">${data.usersCount} польз. · ${data.deploy}</td></tr>
            <tr style="background:#FAFBFC"><td style="padding:8px 20px;color:#94A3B8;font-size:11px;font-weight:600;text-transform:uppercase;border-bottom:1px solid #F8FAFC">Сегмент</td><td style="padding:8px 20px;font-weight:600;color:#2056B8;border-bottom:1px solid #F8FAFC">${SEG_LABEL[data.segment]||data.segment}</td></tr>
            <tr><td style="padding:8px 20px;color:#94A3B8;font-size:11px;font-weight:600;text-transform:uppercase;border-bottom:1px solid #F8FAFC">Бюджет</td><td style="padding:8px 20px;border-bottom:1px solid #F8FAFC">${data.budget} · ${data.contractTerm} · до ${data.deadline}</td></tr>
          </table>
          <div style="margin:16px 20px;background:#EBF2FF;border-left:3px solid #2056B8;padding:10px 14px;border-radius:0 6px 6px 0">
            <div style="font-size:10px;color:#2056B8;font-weight:700;text-transform:uppercase;margin-bottom:5px">Боль клиента</div>
            <div style="font-size:13px;color:#334155">${data.pain}</div>
          </div>
          <div style="margin:0 20px 20px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:6px;padding:12px">
            <div style="font-size:10px;color:#94A3B8;font-weight:700;text-transform:uppercase;margin-bottom:8px">Промпт для d8n Sales</div>
            <pre style="font-family:'Courier New',monospace;font-size:10px;color:#475569;white-space:pre-wrap;margin:0;line-height:1.6">${prompt}</pre>
          </div>
          <div style="padding:12px 20px;background:#F0FDF4;border-top:1px solid #BBF7D0;font-size:12px;color:#166534">
            📎 Полная анкета во вложении (.md)
          </div>
          <div style="padding:12px 20px;border-top:1px solid #E2E8F0;text-align:center;font-size:11px;color:#94A3B8">
            Менеджер: ${data.managerName} · Documentolog Group
          </div>
        </div>
      </div>`;

      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from:        'DG Anketa <onboarding@resend.dev>',
          to:          [getManagerEmail(data.managerId)],
          subject:     `Новая анкета: ${data.company} — ${data.usersCount} польз. / ${SEG_LABEL[data.segment]||data.segment}`,
          html,
          attachments: [{ filename, content: mdBase64 }],
        }),
      });
      const emailJson = await emailRes.json();
      results.email = emailJson.id ? 'sent:' + emailJson.id : 'error:' + JSON.stringify(emailJson);
      console.log('Email:', results.email);
    } catch(e) {
      results.email = 'exception:' + e.message;
      console.error('Email error:', e.message);
    }

    // Airtable
    if (AT_TOKEN) {
      try {
        const fields = {
          'Компания': data.company, 'БИН': data.bin,
          'Менеджер': data.managerName, 'manager_id': data.managerId,
          'Статус': 'Новое', 'Дата': new Date().toISOString(),
          'Отрасль': data.industry, 'Вид собственности': data.ownership,
          'Контакт ФИО': data.contactName, 'Должность': data.contactRole,
          'Email': data.contactEmail, 'Телефон': data.contactPhone,
          'N_full': parseInt(data.usersCount)||0, 'N_mobile': parseInt(data.mobileCount)||0,
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
          headers: { 'Authorization': `Bearer ${AT_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields, typecast: true }),
        });
        const atJson = await atRes.json();
        results.airtable = atJson.id ? 'saved:' + atJson.id : 'error:' + JSON.stringify(atJson).slice(0,100);
      } catch(e) { results.airtable = 'exception:' + e.message; }
    } else {
      results.airtable = 'skipped:no token';
    }

    return res.status(200).json({ ok: true, ...results });

  } catch (err) {
    console.error('handler error:', err);
    return res.status(500).json({ error: err.message });
  }
}
