// api/rows.js — читает анкеты из Airtable для дашборда

import { getAirtableToken, requireDashboardAuth } from './_lib.js'
import { ARCHIVE_MARKER, parseAnalytics } from './_notes.js'
import { hoursSince, scoreLead } from './_leads.js'

const BASE_ID = 'appHakMP7mBJhUu7p'
const TABLE_ID = 'tblTU1on0yAcK5RTt'

export default async function handler(req, res) {
  try {
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    if (req.method === 'OPTIONS') return res.status(200).end()
    if (req.method !== 'GET')
      return res.status(405).json({ error: 'Method not allowed' })
    const user = requireDashboardAuth(req, res)
    if (!user) return

    const token = getAirtableToken()
    if (!token) return res.status(500).json({ error: 'AIRTABLE_TOKEN not set' })

    const requestedMgr = (req.query && req.query.mgr) || ''
    const mgr = user.role === 'admin' ? requestedMgr : user.managerId
    if (user.role !== 'admin' && !mgr)
      return res.status(403).json({ error: 'Manager account is not linked' })
    const archived = (req.query && req.query.archived) === '1'

    const params = new globalThis.URLSearchParams()
    params.set('sort[0][field]', 'Дата')
    params.set('sort[0][direction]', 'desc')
    params.set('pageSize', '50')
    const filters = [
      `{Компания}!='__DG_MANAGER_CONFIG__'`,
      `{Компания}!='__DG_USER_CONFIG__'`,
      `${archived ? '' : 'NOT('}FIND('${ARCHIVE_MARKER}',{Примечания})${archived ? '' : ')'}`,
    ]
    if (mgr) filters.push(`{manager_id}='${mgr}'`)
    params.set('filterByFormula', `AND(${filters.join(',')})`)

    const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?${params.toString()}`

    const atRes = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!atRes.ok) {
      const err = await atRes.text()
      return res
        .status(500)
        .json({ error: 'Airtable read error', details: err.slice(0, 500) })
    }

    const json = await atRes.json()
    const rows = (json.records || []).map((r) => {
      const f = r.fields || {}
      const notes = String(f['Примечания'] || '')
      const analytics = parseAnalytics(notes)
      let date = '—'
      if (f['Дата']) {
        try {
          date = new Date(f['Дата']).toLocaleString('ru-RU', {
            timeZone: 'Asia/Almaty',
          })
        } catch {
          date = String(f['Дата'])
        }
      }
      const status = notes.includes(ARCHIVE_MARKER)
        ? 'Архив'
        : f['Статус'] || 'Новое'
      const lastTouchIso = f['Последнее изменение'] || f['Дата'] || ''
      const { priority, days, nextAction } = scoreLead(
        status,
        hoursSince(lastTouchIso),
        f['Бюджет']
      )
      return {
        id: r.id,
        applicationId: f['ID заявки'] || r.id,
        createdAt: f['Дата'] || r.createdTime || '',
        date,
        manager: f['Менеджер'] || '—',
        mgr: f['manager_id'] || '',
        company: f['Компания'] || '—',
        bin: f['БИН'] || '',
        industry: f['Отрасль'] || '',
        segment: analytics?.segment || f['Сегмент'] || '',
        source:
          analytics?.source ||
          f['Источник'] ||
          (f['manager_id'] ? 'Менеджерская ссылка' : 'Сайт'),
        campaign: analytics?.campaign || f['Кампания'] || '',
        email: f['Email'] || '',
        users: f['N_full'] || 0,
        budget: f['Бюджет'] || '—',
        deploy: f['Развёртывание'] || '—',
        deadline: f['Срок заключения'] || '—',
        status,
        days,
        priority,
        nextAction,
        history: f['История'] || '',
        prompt: f['Промпт d8n Sales'] || '',
        statusHistory: analytics?.statusHistory || [],
        ebEmail: f['EB Email'] || '',
        ebPhone: f['EB Телефон'] || '',
        marketingCase: f['Маркетинг кейс'] || '',
      }
    })

    return res.status(200).json({ rows })
  } catch (err) {
    console.error('rows error:', err)
    return res.status(500).json({ error: err?.message || String(err) })
  }
}
