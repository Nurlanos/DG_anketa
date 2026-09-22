import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  parseAnalytics,
  updateAnalyticsNotes,
  withArchiveMarker,
  withoutArchiveMarker,
} from '../api/_notes.js'

test('archiving a lead keeps analytics metadata readable', () => {
  const notes =
    '__DG_ANALYTICS__{"segment":"aie","source":"Сайт","campaign":"","statusHistory":[{"status":"Новое","at":"2026-01-01T00:00:00.000Z"}]}\nсвободный текст'

  const archived = withArchiveMarker(notes)
  assert.match(archived, /^__DG_ARCHIVED__\n/)

  const analytics = parseAnalytics(archived)
  assert.equal(analytics.segment, 'aie')
  assert.equal(analytics.statusHistory.length, 1)
})

test('archiving is idempotent (does not double-prefix)', () => {
  const notes = '__DG_ANALYTICS__{}\ntext'
  const once = withArchiveMarker(notes)
  const twice = withArchiveMarker(once)
  assert.equal(once, twice)
})

test('un-archiving preserves status history collected while archived', () => {
  const archivedNotes =
    '__DG_ARCHIVED__\n__DG_ANALYTICS__{"segment":"se","statusHistory":[{"status":"Новое","at":"2026-01-01T00:00:00.000Z"},{"status":"КП в работе","at":"2026-01-02T00:00:00.000Z"}]}\nтекст'

  const priorHistory = parseAnalytics(archivedNotes).statusHistory || []
  assert.equal(priorHistory.length, 2)

  const restoredNotes = withoutArchiveMarker(archivedNotes)
  priorHistory.push({ status: 'Договор', at: '2026-01-03T00:00:00.000Z' })
  const finalNotes = updateAnalyticsNotes(restoredNotes, priorHistory)

  const finalAnalytics = parseAnalytics(finalNotes)
  assert.equal(finalAnalytics.segment, 'se')
  assert.equal(finalAnalytics.statusHistory.length, 3)
  assert.equal(finalAnalytics.statusHistory[2].status, 'Договор')
})
