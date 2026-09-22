import { getAirtableToken, requireDashboardAuth } from './_lib.js'
import {
  parseAnalytics,
  updateAnalyticsNotes,
  withArchiveMarker,
  withoutArchiveMarker,
} from './_notes.js'

const BASE_ID = 'appHakMP7mBJhUu7p'
const TABLE_ID = 'tblTU1on0yAcK5RTt'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'PATCH, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'PATCH')
    return res.status(405).json({ error: 'Method not allowed' })
  const user = requireDashboardAuth(req, res)
  if (!user) return

  const AT_TOKEN = getAirtableToken()
  if (!AT_TOKEN)
    return res.status(500).json({ error: 'AIRTABLE_TOKEN not set' })

  const { recordId, status } = req.body
  if (!recordId || !status)
    return res.status(400).json({ error: 'Missing recordId or status' })

  const VALID = [
    'Новое',
    'КП в работе',
    'КП отправлено',
    'Договор',
    'Отказ',
    'Архив',
  ]
  if (!VALID.includes(status))
    return res.status(400).json({ error: 'Invalid status' })

  try {
    const recordRes = await fetch(
      `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}/${recordId}`,
      {
        headers: { Authorization: `Bearer ${AT_TOKEN}` },
      }
    )
    if (!recordRes.ok) {
      const e = await recordRes.text()
      return res.status(500).json({ error: e })
    }
    const record = await recordRes.json()
    if (user.role !== 'admin' && record.fields?.manager_id !== user.managerId) {
      return res.status(403).json({ error: 'You cannot update this record' })
    }
    const currentNotes = String(record.fields?.Примечания || '')
    const currentHistory = String(record.fields?.История || '')
    const now = new Date()
    const stamp = now.toLocaleString('ru-RU', { timeZone: 'Asia/Almaty' })
    const appendHistory = (line) =>
      currentHistory
        ? `${currentHistory}\n${stamp} — ${line}`
        : `${stamp} — ${line}`
    const fields = { 'Последнее изменение': now.toISOString() }
    const statusHistory = parseAnalytics(currentNotes).statusHistory || []

    if (status === 'Архив') {
      fields['Примечания'] = withArchiveMarker(currentNotes)
      fields['История'] = appendHistory('перенесено в архив')
    } else {
      fields['Статус'] = status
      if (record.fields?.Статус !== status) {
        statusHistory.push({ status, at: new Date().toISOString() })
      }
      fields['История'] = appendHistory(`статус → «${status}»`)
      fields['Примечания'] = updateAnalyticsNotes(
        withoutArchiveMarker(currentNotes),
        statusHistory
      )
    }

    const atRes = await fetch(
      `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}/${recordId}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${AT_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fields }),
      }
    )
    if (!atRes.ok) {
      const e = await atRes.text()
      if (
        e.includes('UNKNOWN_FIELD_NAME') &&
        (e.includes('Последнее изменение') || e.includes('История'))
      ) {
        console.warn(
          'Airtable history fields are missing; updating status without history'
        )
        const fallbackFields = { ...fields }
        delete fallbackFields['Последнее изменение']
        delete fallbackFields['История']
        const fallbackRes = await fetch(
          `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}/${recordId}`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${AT_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ fields: fallbackFields }),
          }
        )
        if (!fallbackRes.ok) return res.status(500).json({ error: e })
        const fallbackData = await fallbackRes.json()
        return res.status(200).json({
          ok: true,
          status: status === 'Архив' ? 'Архив' : fallbackData.fields['Статус'],
          historySkipped: true,
        })
      }
      return res.status(500).json({ error: e })
    }
    const data = await atRes.json()
    return res.status(200).json({
      ok: true,
      status: status === 'Архив' ? 'Архив' : data.fields['Статус'],
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
