import { getAirtableToken } from './_lib.js'
import { mailConfigured, sendMail } from './_mail.js'
import { randomUUID } from 'node:crypto'

const BASE_ID = 'appHakMP7mBJhUu7p'
const TABLE_ID = 'tblTU1on0yAcK5RTt'
const AT_TOKEN = getAirtableToken()
const RESEND_KEY = process.env.RESEND_API_KEY || ''

// Used only when Airtable has no manager-config record for the given id yet.
const FALLBACK_EMAIL = process.env.FALLBACK_MANAGER_EMAIL || ''
const RATE_WINDOW_MS = 15 * 60 * 1000
const RATE_LIMIT = 5
const recentSubmissions = new Map()

function requestIp(req) {
  return String(
    req.headers['x-forwarded-for'] || req.socket?.remoteAddress || ''
  )
    .split(',')[0]
    .trim()
}

function rateLimited(ip) {
  const now = Date.now()
  const attempts = (recentSubmissions.get(ip) || []).filter(
    (timestamp) => now - timestamp < RATE_WINDOW_MS
  )
  attempts.push(now)
  recentSubmissions.set(ip, attempts)
  return attempts.length > RATE_LIMIT
}

export function resolveManagerContact(config, metadata, fallback) {
  const managerEmail = metadata.email || config?.fields?.Email || ''
  const backupEmail = metadata.backupEmail || ''
  const emails = managerEmail
    ? [managerEmail, backupEmail].filter(
        (email, index, emails) => email && (index === 0 || email !== emails[0])
      )
    : fallback
      ? [fallback]
      : []
  return { emails, name: config?.fields?.Менеджер || '' }
}

async function getManagerEmail(id) {
  const fallback = FALLBACK_EMAIL
  if (!id || !AT_TOKEN) return { emails: fallback ? [fallback] : [], name: '' }
  try {
    const params = new globalThis.URLSearchParams({
      filterByFormula: `{Компания}='__DG_MANAGER_CONFIG__'`,
      pageSize: '100',
    })
    const response = await fetch(
      `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?${params}`,
      {
        headers: { Authorization: `Bearer ${AT_TOKEN}` },
      }
    )
    if (!response.ok) return { emails: fallback ? [fallback] : [], name: '' }
    const records = (await response.json()).records || []
    const config = records.find((record) => record.fields?.manager_id === id)
    let metadata = {}
    try {
      metadata = JSON.parse(String(config?.fields?.Примечания || '{}'))
    } catch {
      metadata = {}
    }
    return resolveManagerContact(config, metadata, fallback)
  } catch (err) {
    console.error('Manager email lookup error:', err.message)
    return { emails: fallback ? [fallback] : [], name: '' }
  }
}

const SEG_LABEL = {
  se: 'd8n Standard Edition (SE)',
  aie: 'd8n AI Edition (AIE)',
}

function buildMarkdown(data, prompt) {
  const dt = new Date().toLocaleDateString('ru-RU')
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
`
}

export default async function handler(req, res) {
  const requestId = randomUUID()
  res.setHeader('X-Request-Id', requestId)
  res.setHeader('Access-Control-Allow-Origin', process.env.APP_URL || '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' })

  if (rateLimited(requestIp(req))) {
    console.warn('submit rate limited', { requestId, ip: requestIp(req) })
    return res
      .status(429)
      .json({ error: 'Слишком много попыток. Повторите позже.' })
  }

  try {
    const { data, prompt } = req.body
    if (!data?.company || !data?.consentAt)
      return res.status(400).json({
        error:
          'Заполните обязательные поля и подтвердите согласие на обработку данных',
      })
    if (!AT_TOKEN)
      return res.status(503).json({
        error: 'Сервис сохранения заявок временно недоступен',
        requestId,
      })

    const submissionId = `ANK-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${randomUUID().slice(0, 8).toUpperCase()}`
    const manager = await getManagerEmail(data.managerId)

    const results = { requestId, submissionId, email: null, airtable: null }
    const mdContent = buildMarkdown(data, prompt)
    const mdBase64 = Buffer.from(mdContent, 'utf8').toString('base64')
    const filename = `anketa_${(data.company || 'client').replace(/[^\wа-яёА-ЯЁ]/gi, '_').slice(0, 30)}_${new Date().toISOString().slice(0, 10)}.md`

    // Email
    const recipients = manager.emails
    if (!mailConfigured() && !RESEND_KEY) {
      results.email = 'skipped:no key'
    } else if (!recipients.length) {
      results.email = 'skipped:no recipient email'
    } else {
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
            <tr style="background:#FAFBFC"><td style="padding:8px 20px;color:#94A3B8;font-size:11px;font-weight:600;text-transform:uppercase;border-bottom:1px solid #F8FAFC">Сегмент</td><td style="padding:8px 20px;font-weight:600;color:#2056B8;border-bottom:1px solid #F8FAFC">${SEG_LABEL[data.segment] || data.segment}</td></tr>
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
      </div>`

        const emailInfo = await sendMail({
          to: recipients,
          subject: `Новая анкета: ${data.company} — ${data.usersCount} польз. / ${SEG_LABEL[data.segment] || data.segment}`,
          html,
          attachments: [{ filename, content: mdBase64 }],
        })
        results.email = 'sent:' + (emailInfo.messageId || emailInfo.id || 'ok')
        console.log('Email:', results.email)
      } catch (e) {
        results.email = 'exception:' + e.message
        console.error('Email error:', e.message)
      }
    }

    // Airtable
    if (AT_TOKEN) {
      try {
        const createdAt = new Date().toISOString()
        const analyticsMetadata = {
          segment: data.segment || '',
          source:
            data.source || (data.managerId ? 'Менеджерская ссылка' : 'Сайт'),
          campaign: data.campaign || '',
          statusHistory: [{ status: 'Новое', at: createdAt }],
        }
        const fields = {
          Компания: data.company,
          БИН: data.bin,
          Менеджер: data.managerName,
          manager_id: data.managerId,
          'ID заявки': submissionId,
          Статус: 'Новое',
          Дата: createdAt,
          'Последнее изменение': new Date().toISOString(),
          История: `${new Date().toLocaleString('ru-RU', { timeZone: 'Asia/Almaty' })} — анкета получена, статус «Новое»`,
          Отрасль: data.industry,
          'Вид собственности': data.ownership,
          'Контакт ФИО': data.contactName,
          Должность: data.contactRole,
          Email: data.contactEmail,
          Телефон: data.contactPhone,
          N_full: parseInt(data.usersCount) || 0,
          N_mobile: parseInt(data.mobileCount) || 0,
          'Всего сотрудников': parseInt(data.totalEmployees) || 0,
          'Рост пользователей': data.growth,
          Филиалы: data.branches,
          'Текущая СЭД': data.currentSed,
          'Название СЭД': data.sedName,
          'Цель внедрения': data.goal,
          Боль: data.pain,
          Срочность: data.urgency,
          Модули: data.modules,
          'AI-агенты': data.aiAgents,
          Интеграции: data.integrations,
          Развёртывание: data.deploy,
          'Срок договора': data.contractTerm,
          'Авансовая оплата': data.prepay,
          Бюджет: data.budget,
          'Срок заключения': data.deadline,
          'Economic Buyer': data.economicBuyer,
          Champion: data.champion,
          'Критерии выбора': data.criteria,
          Примечания: `__DG_ANALYTICS__${JSON.stringify(analyticsMetadata)}\n${data.notes || ''}`,
          'Промпт d8n Sales': prompt,
        }
        let atRes = await fetch(
          `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${AT_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ fields, typecast: true }),
          }
        )
        let atJson = await atRes.json()
        if (
          !atRes.ok &&
          atJson.type === 'UNKNOWN_FIELD_NAME' &&
          (atJson.message?.includes('Последнее изменение') ||
            atJson.message?.includes('История'))
        ) {
          console.warn(
            'Airtable history fields are missing; saving submission without history'
          )
          const fallbackFields = { ...fields }
          delete fallbackFields['Последнее изменение']
          delete fallbackFields['История']
          atRes = await fetch(
            `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${AT_TOKEN}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ fields: fallbackFields, typecast: true }),
            }
          )
          atJson = await atRes.json()
        }
        results.airtable = atJson.id
          ? 'saved:' + atJson.id
          : 'error:' + JSON.stringify(atJson).slice(0, 100)
        if (!atRes.ok || !atJson.id) {
          console.error('Airtable save error', {
            requestId,
            submissionId,
            response: atJson,
          })
          return res.status(502).json({
            error: 'Не удалось сохранить заявку',
            requestId,
            ...results,
          })
        }
      } catch (e) {
        results.airtable = 'exception:' + e.message
        console.error('Airtable save exception', {
          requestId,
          submissionId,
          error: e.message,
        })
        return res
          .status(502)
          .json({ error: 'Не удалось сохранить заявку', requestId, ...results })
      }
    }

    return res.status(200).json({ ok: true, ...results })
  } catch (err) {
    console.error('submit handler error', {
      requestId,
      error: err.message,
      stack: err.stack,
    })
    return res
      .status(500)
      .json({ error: 'Внутренняя ошибка сервера', requestId })
  }
}
