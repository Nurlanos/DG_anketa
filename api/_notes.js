// api/_notes.js — shared helpers for the __DG_ANALYTICS__ metadata and
// __DG_ARCHIVED__ marker convention stored in the Примечания field.

export const ARCHIVE_MARKER = '__DG_ARCHIVED__'

export function isArchived(notes) {
  return String(notes || '').includes(ARCHIVE_MARKER)
}

export function withArchiveMarker(notes) {
  const value = String(notes || '')
  return value.startsWith(ARCHIVE_MARKER)
    ? value
    : `${ARCHIVE_MARKER}\n${value}`
}

export function withoutArchiveMarker(notes) {
  const value = String(notes || '')
  return value.startsWith(`${ARCHIVE_MARKER}\n`)
    ? value.slice(ARCHIVE_MARKER.length + 1)
    : value.startsWith(ARCHIVE_MARKER)
      ? value.slice(ARCHIVE_MARKER.length)
      : value
}

export function parseAnalytics(value) {
  try {
    const clean = String(value || '').replace(/^__DG_ARCHIVED__\n?/, '')
    const match = clean.match(/^__DG_ANALYTICS__([^\n]*)/)
    return match ? JSON.parse(match[1]) : {}
  } catch {
    return {}
  }
}

export function updateAnalyticsNotes(notes, statusHistory) {
  const cleanNotes = withoutArchiveMarker(notes)
  const metadata = parseAnalytics(cleanNotes)
  metadata.statusHistory = statusHistory
  const body = cleanNotes.replace(/^__DG_ANALYTICS__[^\n]*\n?/, '')
  return `__DG_ANALYTICS__${JSON.stringify(metadata)}\n${body}`
}
