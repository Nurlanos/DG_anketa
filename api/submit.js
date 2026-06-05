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

const SEG_LABEL = { biz: 'Business', se: 'd8n SE', aie: 'd8n AIE' };

// ── Generate DOCX via raw XML (no npm deps) ───────────────────────────────
function buildDocxBuffer(data, prompt) {
  const JSZip = require('jszip');

  function esc(s) {
    return String(s || '—')
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;');
  }

  function row(label, value, shade) {
    const bg = shade ? 'EBF2FF' : 'FFFFFF';
    const labelBg = shade ? 'D0E4FF' : 'F0F4FF';
    return `<w:tr>
      <w:tc><w:tcPr><w:tcW w:w="3000" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="${labelBg}"/></w:tcPr>
        <w:p><w:r><w:rPr><w:b/><w:color w:val="1E3A6E"/><w:sz w:val="18"/></w:rPr><w:t>${esc(label)}</w:t></w:r></w:p></w:tc>
      <w:tc><w:tcPr><w:tcW w:w="6360" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="${bg}"/></w:tcPr>
        <w:p><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t xml:space="preserve">${esc(value)}</w:t></w:r></w:p></w:tc>
    </w:tr>`;
  }

  function section(title, rows) {
    return `
    <w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:color="2056B8"/></w:pBdr><w:spacing w:before="240" w:after="120"/></w:pPr>
      <w:r><w:rPr><w:b/><w:color w:val="0D1F4E"/><w:sz w:val="24"/></w:rPr><w:t>${esc(title)}</w:t></w:r></w:p>
    <w:tbl>
      <w:tblPr><w:tblW w:w="9360" w:type="dxa"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="2" w:color="DDEEFF"/>
          <w:left w:val="single" w:sz="2" w:color="DDEEFF"/>
          <w:bottom w:val="single" w:sz="2" w:color="DDEEFF"/>
          <w:right w:val="single" w:sz="2" w:color="DDEEFF"/>
          <w:insideH w:val="single" w:sz="2" w:color="DDEEFF"/>
          <w:insideV w:val="single" w:sz="2" w:color="DDEEFF"/>
        </w:tblBorders>
      </w:tblPr>
      <w:tblGrid><w:gridCol w:w="3000"/><w:gridCol w:w="6360"/></w:tblGrid>
      ${rows}
    </w:tbl>`;
  }

  const dt = new Date().toLocaleDateString('ru-RU');
  const seg = SEG_LABEL[data.segment] || data.segment;

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<w:body>

  <w:p><w:pPr><w:jc w:val="center"/><w:shd w:val="clear" w:fill="0D1F4E"/></w:pPr>
    <w:r><w:rPr><w:b/><w:color w:val="FFFFFF"/><w:sz w:val="32"/></w:rPr>
      <w:t>Анкета клиента Documentolog</w:t></w:r></w:p>

  <w:p><w:pPr><w:jc w:val="center"/><w:shd w:val="clear" w:fill="0D1F4E"/><w:spacing w:after="200"/></w:pPr>
    <w:r><w:rPr><w:color w:val="99BBFF"/><w:sz w:val="18"/></w:rPr>
      <w:t>${esc(data.company)} · ${esc(dt)} · Менеджер: ${esc(data.managerName)}</w:t></w:r></w:p>

  <w:p><w:pPr><w:shd w:val="clear" w:fill="EBF2FF"/><w:spacing w:before="120" w:after="200"/>
    <w:ind w:left="200"/><w:pBdr><w:left w:val="single" w:sz="12" w:color="2056B8"/></w:pBdr></w:pPr>
    <w:r><w:rPr><w:color w:val="475569"/><w:sz w:val="20"/></w:rPr><w:t xml:space="preserve">Рекомендованный сегмент: </w:t></w:r>
    <w:r><w:rPr><w:b/><w:color w:val="2056B8"/><w:sz w:val="20"/></w:rPr><w:t>${esc(seg)}</w:t></w:r></w:p>

  ${section('1. Организация', [
    row('Компания', data.company, false),
    row('БИН / ИИН', data.bin, true),
    row('Собственность', data.ownership, false),
    row('Отрасль', data.industry, true),
    row('Холдинг / ЮЛ', `${data.holding} / ${data.legalEntities} юр. лиц`, false),
    row('Контактное лицо', `${data.contactName}, ${data.contactRole}`, true),
    row('Email', data.contactEmail, false),
    row('Телефон', data.contactPhone, true),
    row('Economic Buyer', data.economicBuyer, false),
    row('Champion', data.champion, true),
  ].join(''))}

  ${section('2. Масштаб', [
    row('N_full (офисные)', data.usersCount, false),
    row('N_mobile (линейные)', data.mobileCount, true),
    row('Всего сотрудников', data.totalEmployees, false),
    row('Филиалы', data.branches, true),
    row('Рост штата', data.growth, false),
  ].join(''))}

  ${section('3. Бизнес-задача', [
    row('Текущая СЭД', data.currentSed + (data.sedName && data.sedName !== '—' ? ' — ' + data.sedName : ''), false),
    row('Цель внедрения', data.goal, true),
    row('Боль', data.pain, false),
    row('Видение (12 мес.)', data.vision12, true),
    row('Срочность', data.urgency, false),
  ].join(''))}

  ${section('4. Модули и AI', [
    row('BPM-модули', data.modules, false),
    row('Коммуникации dg', data.comms, true),
    row('AI-агенты', data.aiAgents, false),
    row('Custom AI', data.customAi, true),
    row('Развёртывание', data.deploy, false),
    row('GPU', data.gpu, true),
    row('Интеграции', data.integrations, false),
    row('Безопасность', data.security, true),
    row('Модель услуг', data.serviceModel, false),
  ].join(''))}

  ${section('5. Коммерческие условия', [
    row('Срок договора', data.contractTerm, false),
    row('Авансовая оплата', data.prepay, true),
    row('OPEX / CAPEX', data.opex, false),
    row('Статус бюджета', data.budget, true),
    row('Дедлайн', data.deadline, false),
    row('Тендер (ПГЗ)', data.tender, true),
    row('Критерии выбора', data.criteria, false),
    row('Примечания', data.notes, true),
  ].join(''))}

  <w:p><w:pPr><w:spacing w:before="280" w:after="120"/>
    <w:pBdr><w:bottom w:val="single" w:sz="6" w:color="2056B8"/></w:pBdr></w:pPr>
    <w:r><w:rPr><w:b/><w:color w:val="0D1F4E"/><w:sz w:val="24"/></w:rPr>
      <w:t>Промпт для d8n Sales</w:t></w:r></w:p>
  <w:p><w:pPr><w:shd w:val="clear" w:fill="F8FAFC"/></w:pPr>
    <w:r><w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New"/><w:sz w:val="16"/><w:color w:val="334155"/></w:rPr>
      <w:t xml:space="preserve">${esc(prompt)}</w:t></w:r></w:p>

  <w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="400"/></w:pPr>
    <w:r><w:rPr><w:color w:val="94A3B8"/><w:sz w:val="16"/></w:rPr>
      <w:t>Documentolog Group · d8n.ai · ${esc(dt)}</w:t></w:r></w:p>

  <w:sectPr>
    <w:pgSz w:w="11906" w:h="16838"/>
    <w:pgMar w:top="1000" w:right="1000" w:bottom="1000" w:left="1000"/>
  </w:sectPr>
</w:body>
</w:document>`;

  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults><w:rPrDefault><w:rPr>
    <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
    <w:sz w:val="20"/>
  </w:rPr></w:rPrDefault></w:docDefaults>
</w:styles>`;

  const appXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">
  <Application>Documentolog Anketa</Application>
</Properties>`;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;

  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const zip = new JSZip();
  zip.file('[Content_Types].xml', contentTypes);
  zip.file('_rels/.rels', rootRels);
  zip.file('word/document.xml', documentXml);
  zip.file('word/styles.xml', stylesXml);
  zip.file('word/_rels/document.xml.rels', relsXml);
  zip.file('docProps/app.xml', appXml);

  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
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
      const buf = await buildDocxBuffer(data, prompt);
      docxBase64 = buf.toString('base64');
      console.log('DOCX built, size:', buf.length);
    } catch(e) {
      console.warn('DOCX error:', e.message);
    }

    // 2. Email
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
          ${docxBase64 ? '<div style="padding:12px 20px;background:#F0FDF4;border-top:1px solid #BBF7D0;font-size:12px;color:#166534">📎 Полная анкета во вложении (.docx)</div>' : ''}
          <div style="padding:12px 20px;border-top:1px solid #E2E8F0;text-align:center;font-size:11px;color:#94A3B8">Менеджер: ${data.managerName} · Documentolog Group</div>
        </div>
      </div>`;

      const filename = `anketa_${(data.company||'client').replace(/[^\w\u0400-\u04FF]/g,'_').slice(0,30)}_${new Date().toISOString().slice(0,10)}.docx`;
      const emailPayload = {
        from:    'DG Anketa <onboarding@resend.dev>',
        to:      [getManagerEmail(data.managerId)],
        subject: `Новая анкета: ${data.company} — ${data.usersCount} польз. / ${SEG_LABEL[data.segment]||data.segment}`,
        html,
        ...(docxBase64 ? { attachments: [{ filename, content: docxBase64 }] } : {}),
      };

      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(emailPayload),
      });
      const emailJson = await emailRes.json();
      results.email = emailJson.id ? 'sent:' + emailJson.id : 'error:' + JSON.stringify(emailJson);
      console.log('Email:', results.email);
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
