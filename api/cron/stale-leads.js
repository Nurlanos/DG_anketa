import { getAirtableToken } from '../_lib.js'
import { mailConfigured, sendMail } from '../_mail.js'
import { ARCHIVE_MARKER } from '../_notes.js'
import { hoursSince, scoreLead } from '../_leads.js'

const BASE_ID = 'appHakMP7mBJhUu7p'
const TABLE_ID = 'tblTU1on0yAcK5RTt'
const MANAGER_CONFIG_COMPANY = '__DG_MANAGER_CONFIG__'
const USER_CONFIG_COMPANY = '__DG_USER_CONFIG__'

async function fetchAllRecords(token) {
  const records = []
  let offset
  do {
    const params = new globalThis.URLSearchParams({ pageSize: '100' })
    if (offset) params.set('offset', offset)
    const response = await fetch(
      `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?${params}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (!response.ok) throw new Error((await response.text()).slice(0, 500))
    const json = await response.json()
    records.push(...(json.records || []))
    offset = json.offset
  } while (offset)
  return records
}

export default async function handler(req, res) {
  if (
    process.env.CRON_SECRET &&
    req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  const token = getAirtableToken()
  if (!token) return res.status(500).json({ error: 'AIRTABLE_TOKEN not set' })
  if (!mailConfigured() && !process.env.RESEND_API_KEY)
    return res.status(200).json({ ok: true, skipped: 'mail not configured' })

  try {
    const records = await fetchAllRecords(token)
    const managerEmailById = new Map()
    records
      .filter((r) => r.fields?.Компания === MANAGER_CONFIG_COMPANY)
      .forEach((r) => {
        let meta = {}
        try {
          meta = JSON.parse(r.fields?.Примечания || '{}')
        } catch (err) {
          console.warn('Invalid manager metadata:', err.message)
        }
        if (r.fields?.manager_id)
          managerEmailById.set(
            r.fields.manager_id,
            meta.email || r.fields?.Email || ''
          )
      })

    const staleByManager = new Map()
    records
      .filter((r) => {
        const company = r.fields?.Компания
        return (
          company !== MANAGER_CONFIG_COMPANY &&
          company !== USER_CONFIG_COMPANY &&
          !String(r.fields?.Примечания || '').includes(ARCHIVE_MARKER)
        )
      })
      .forEach((r) => {
        const f = r.fields || {}
        const status = f['Статус'] || 'Новое'
        const hours = hoursSince(f['Последнее изменение'] || f['Дата'] || '')
        if (hours === null) return
        if (scoreLead(status, hours, f['Бюджет']).priority !== 'Высокий')
          return
        const managerId = f['manager_id'] || ''
        const leads = staleByManager.get(managerId) || []
        leads.push({
          company: f['Компания'] || '—',
          status,
          days: hours === null ? 0 : Math.floor(hours / 24),
        })
        staleByManager.set(managerId, leads)
      })

    const results = []
    for (const [managerId, leads] of staleByManager) {
      const email = managerEmailById.get(managerId)
      if (!email) {
        results.push({ managerId, sent: false, reason: 'no manager email' })
        continue
      }
      leads.sort((a, b) => b.days - a.days)
      const rowsHtml = leads
        .map(
          (lead) =>
            `<tr><td style="padding:6px 10px;border-bottom:1px solid #F1F5F9">${lead.company}</td><td style="padding:6px 10px;border-bottom:1px solid #F1F5F9">${lead.status}</td><td style="padding:6px 10px;border-bottom:1px solid #F1F5F9;text-align:right">${lead.days} дн.</td></tr>`
        )
        .join('')
      const html = `<div style="font-family:-apple-system,sans-serif;max-width:560px;margin:0 auto"><div style="background:#0D1F4E;padding:18px 22px;border-radius:10px 10px 0 0"><div style="color:#fff;font-size:15px;font-weight:700">⚠️ ${leads.length} анкет требуют внимания</div><div style="color:rgba(255,255,255,.45);font-size:11px">Documentolog · d8n.ai — ежедневный дайджест</div></div><div style="background:#fff;border:1px solid #E2E8F0;border-top:none;border-radius:0 0 10px 10px"><table style="width:100%;border-collapse:collapse;font-size:13px">${rowsHtml}</table><div style="padding:12px 20px;font-size:12px;color:#94A3B8">Откройте дашборд, чтобы обновить статус или зафиксировать следующий шаг.</div></div></div>`
      try {
        await sendMail({
          to: email,
          subject: `⚠️ ${leads.length} анкет без движения — d8n Sales`,
          html,
        })
        results.push({ managerId, sent: true, count: leads.length })
      } catch (err) {
        results.push({ managerId, sent: false, reason: err.message })
      }
    }
    return res.status(200).json({ ok: true, results })
  } catch (err) {
    console.error('stale-leads cron error:', err)
    return res.status(500).json({ error: err.message })
  }
}
