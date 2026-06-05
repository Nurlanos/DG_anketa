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

function getManagerEmail(id) {
  return MANAGER_EMAILS[id] || FALLBACK_EMAIL;
}

// ── Generate DOCX as Buffer ───────────────────────────────────────────────
async function buildDocx(data, prompt) {
  const {
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
    HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
    PageOrientation
  } = await import('docx');

  const NAVY  = '0D1F4E';
  const BLUE  = '2056B8';
  const GRAY  = 'F3F6FB';
  const WHITE = 'FFFFFF';
  const cellBorder = { style: BorderStyle.SINGLE, size: 1, color: 'DDEEFF' };
  const borders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };

  function heading(text) {
    return new Paragraph({
      children: [new TextRun({ text, bold: true, size: 26, color: NAVY, font: 'Calibri' })],
      spacing: { before: 280, after: 120 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: BLUE } },
    });
  }

  function tableRow(label, value, shade = false) {
    return new TableRow({
      children: [
        new TableCell({
          borders, width: { size: 3600, type: WidthType.DXA },
          shading: { fill: shade ? 'EBF2FF' : WHITE, type: ShadingType.CLEAR },
          margins: { top: 60, bottom: 60, left: 100, right: 100 },
          children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 20, color: '334155', font: 'Calibri' })] })]
        }),
        new TableCell({
          borders, width: { size: 5760, type: WidthType.DXA },
          shading: { fill: shade ? 'F8FBFF' : WHITE, type: ShadingType.CLEAR },
          margins: { top: 60, bottom: 60, left: 100, right: 100 },
          children: [new Paragraph({ children: [new TextRun({ text: String(value||'—'), size: 20, font: 'Calibri' })] })]
        }),
      ]
    });
  }

  function mkTable(rows) {
    return new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [3600, 5760],
      rows,
    });
  }

  const SEG = { biz: 'Documentolog Business', se: 'd8n Standard Edition (SE)', aie: 'd8n AI Edition (AIE)' };
  const dt = new Date().toLocaleDateString('ru-RU');

  const doc = new Document({
    sections: [{
      properties: {
        page: { size: { width: 11906, height: 16838 }, margin: { top: 1000, right: 1000, bottom: 1000, left: 1000 } }
      },
      children: [
        // Title
        new Paragraph({
          children: [new TextRun({ text: 'Анкета клиента Documentolog', bold: true, size: 36, color: WHITE, font: 'Calibri' })],
          alignment: AlignmentType.CENTER,
          shading: { fill: NAVY, type: ShadingType.CLEAR },
          spacing: { before: 0, after: 0 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BLUE } },
        }),
        new Paragraph({
          children: [new TextRun({ text: `${data.company}  ·  ${dt}  ·  Менеджер: ${data.managerName}`, size: 20, color: 'CCDDFF', font: 'Calibri' })],
          alignment: AlignmentType.CENTER,
          shading: { fill: NAVY, type: ShadingType.CLEAR },
          spacing: { before: 0, after: 300 },
        }),

        // Segment
        new Paragraph({
          children: [
            new TextRun({ text: 'Рекомендованный сегмент: ', size: 22, color: '334155', font: 'Calibri' }),
            new TextRun({ text: SEG[data.segment] || data.segment, bold: true, size: 22, color: BLUE, font: 'Calibri' }),
          ],
          spacing: { before: 160, after: 200 },
          shading: { fill: 'EBF2FF', type: ShadingType.CLEAR },
          border: { left: { style: BorderStyle.SINGLE, size: 12, color: BLUE } },
          indent: { left: 200 },
        }),

        // 1. Организация
        heading('1. Организация'),
        mkTable([
          tableRow('Компания', data.company, false),
          tableRow('БИН / ИИН', data.bin, true),
          tableRow('Собственность', data.ownership, false),
          tableRow('Отрасль', data.industry, true),
          tableRow('Холдинг / ЮЛ', `${data.holding} / ${data.legalEntities} юр. лиц`, false),
          tableRow('Контактное лицо', `${data.contactName}, ${data.contactRole}`, true),
          tableRow('Email', data.contactEmail, false),
          tableRow('Телефон', data.contactPhone, true),
          tableRow('Economic Buyer', data.economicBuyer, false),
          tableRow('Champion', data.champion, true),
        ]),

        // 2. Масштаб
        heading('2. Масштаб'),
        mkTable([
          tableRow('N_full (офисные)', data.usersCount, false),
          tableRow('N_mobile (линейные)', data.mobileCount, true),
          tableRow('Всего сотрудников', data.totalEmployees, false),
          tableRow('Филиалы', data.branches, true),
          tableRow('Рост штата', data.growth, false),
        ]),

        // 3. Боль и видение
        heading('3. Бизнес-задача'),
        mkTable([
          tableRow('Текущая СЭД', data.currentSed + (data.sedName !== '—' ? ' — ' + data.sedName : ''), false),
          tableRow('Цель внедрения', data.goal, true),
          tableRow('Боль', data.pain, false),
          tableRow('Видение (12 мес.)', data.vision12, true),
          tableRow('Срочность', data.urgency, false),
        ]),

        // 4. Решение
        heading('4. Модули и AI'),
        mkTable([
          tableRow('BPM-модули', data.modules, false),
          tableRow('Коммуникации dg', data.comms, true),
          tableRow('AI-агенты', data.aiAgents, false),
          tableRow('Custom AI', data.customAi, true),
          tableRow('Развёртывание', data.deploy, false),
          tableRow('GPU', data.gpu, true),
          tableRow('Интеграции', data.integrations, false),
          tableRow('Безопасность', data.security, true),
          tableRow('Модель услуг', data.serviceModel, false),
        ]),

        // 5. Коммерческие
        heading('5. Коммерческие условия'),
        mkTable([
          tableRow('Срок договора', data.contractTerm, false),
          tableRow('Авансовая оплата', data.prepay, true),
          tableRow('OPEX / CAPEX', data.opex, false),
          tableRow('Статус бюджета', data.budget, true),
          tableRow('Дедлайн', data.deadline, false),
          tableRow('Тендер (ПГЗ)', data.tender, true),
          tableRow('Критерии выбора', data.criteria, false),
          tableRow('Примечания', data.notes, true),
        ]),

        // Prompt section
        heading('Промпт для d8n Sales'),
        new Paragraph({
          children: [new TextRun({ text: prompt, size: 16, font: 'Courier New', color: '334155' })],
          shading: { fill: 'F8FAFC', type: ShadingType.CLEAR },
          border: { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder },
          spacing: { before: 0, after: 0 },
        }),

        // Footer
        new Paragraph({
          children: [new TextRun({ text: `Documentolog Group  ·  d8n.ai  ·  Сформировано: ${dt}`, size: 16, color: '94A3B8', font: 'Calibri' })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 400 },
        }),
      ]
    }]
  });

  return await Packer.toBuffer(doc);
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

    // 1. Build DOCX
    let docxBase64 = null;
    try {
      const buf = await buildDocx(data, prompt);
      docxBase64 = buf.toString('base64');
    } catch(e) {
      console.warn('DOCX build error:', e.message);
    }

    // 2. Send email with attachment
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
            <tr><td style="padding:8px 20px;color:#94A3B8;width:38%;border-bottom:1px solid #F8FAFC;font-size:11px;font-weight:600;text-transform:uppercase">Контакт</td><td style="padding:8px 20px;color:#1E293B;border-bottom:1px solid #F8FAFC">${data.contactName}, ${data.contactRole}</td></tr>
            <tr style="background:#FAFBFC"><td style="padding:8px 20px;color:#94A3B8;border-bottom:1px solid #F8FAFC;font-size:11px;font-weight:600;text-transform:uppercase">Email / Тел.</td><td style="padding:8px 20px;border-bottom:1px solid #F8FAFC"><a href="mailto:${data.contactEmail}" style="color:#2056B8">${data.contactEmail}</a> &middot; ${data.contactPhone}</td></tr>
            <tr><td style="padding:8px 20px;color:#94A3B8;border-bottom:1px solid #F8FAFC;font-size:11px;font-weight:600;text-transform:uppercase">N_full / Deploy</td><td style="padding:8px 20px;color:#1E293B;font-weight:600;border-bottom:1px solid #F8FAFC">${data.usersCount} польз. &middot; ${data.deploy}</td></tr>
            <tr style="background:#FAFBFC"><td style="padding:8px 20px;color:#94A3B8;border-bottom:1px solid #F8FAFC;font-size:11px;font-weight:600;text-transform:uppercase">Сегмент</td><td style="padding:8px 20px;font-weight:600;border-bottom:1px solid #F8FAFC;color:#2056B8">${{biz:'Business',se:'d8n SE',aie:'d8n AIE'}[data.segment]||data.segment}</td></tr>
            <tr><td style="padding:8px 20px;color:#94A3B8;border-bottom:1px solid #F8FAFC;font-size:11px;font-weight:600;text-transform:uppercase">Бюджет / Срок</td><td style="padding:8px 20px;color:#1E293B;border-bottom:1px solid #F8FAFC">${data.budget} &middot; ${data.contractTerm} &middot; до ${data.deadline}</td></tr>
          </table>
          <div style="margin:16px 20px;background:#EBF2FF;border-left:3px solid #2056B8;padding:10px 14px;border-radius:0 6px 6px 0">
            <div style="font-size:10px;color:#2056B8;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px">Боль клиента</div>
            <div style="font-size:13px;color:#334155;line-height:1.5">${data.pain}</div>
          </div>
          <div style="margin:0 20px 20px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:6px;padding:12px">
            <div style="font-size:10px;color:#94A3B8;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Промпт для d8n Sales</div>
            <pre style="font-family:'Courier New',monospace;font-size:10px;color:#475569;white-space:pre-wrap;margin:0;line-height:1.6">${prompt}</pre>
          </div>
          ${docxBase64 ? '<div style="padding:12px 20px;background:#F0FDF4;border-top:1px solid #BBF7D0;font-size:12px;color:#166534">📎 Анкета во вложении — файл .docx</div>' : ''}
          <div style="padding:12px 20px;border-top:1px solid #E2E8F0;text-align:center;font-size:11px;color:#94A3B8">
            Менеджер: ${data.managerName} &middot; Documentolog Group
          </div>
        </div>
      </div>`;

      const emailPayload = {
        from:    'DG Anketa <onboarding@resend.dev>',
        to:      [getManagerEmail(data.managerId)],
        subject: `Новая анкета: ${data.company} — ${data.usersCount} польз. / ${data.deploy} / ${data.budget}`,
        html,
      };

      if (docxBase64) {
        const filename = `anketa_${data.company.replace(/[^a-zA-Zа-яёА-ЯЁ0-9]/g,'_')}_${new Date().toISOString().slice(0,10)}.docx`;
        emailPayload.attachments = [{
          filename,
          content: docxBase64,
        }];
      }

      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(emailPayload),
      });
      const emailJson = await emailRes.json();
      results.email = emailJson.id ? 'sent:' + emailJson.id : 'error:' + JSON.stringify(emailJson);
      console.log('Email result:', results.email);
    } catch(e) {
      results.email = 'exception:' + e.message;
      console.error('Email error:', e.message);
    }

    // 3. Airtable
    if (AT_TOKEN) {
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
          headers: { 'Authorization': `Bearer ${AT_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields, typecast: true }),
        });
        const atJson = await atRes.json();
        results.airtable = atJson.id ? 'saved:' + atJson.id : 'error:' + JSON.stringify(atJson).slice(0,100);
      } catch(e) {
        results.airtable = 'exception:' + e.message;
      }
    } else {
      results.airtable = 'skipped:no AIRTABLE_TOKEN';
    }

    return res.status(200).json({ ok: true, ...results });

  } catch (err) {
    console.error('handler error:', err);
    return res.status(500).json({ error: err.message });
  }
}
