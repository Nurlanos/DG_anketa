import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolveManagerContact } from '../api/submit.js'

const FALLBACK = 'sales-fallback@example.com'

test('uses manager email from config when present', () => {
  const config = { fields: { Менеджер: 'Иван', Email: 'ivan@example.com' } }
  const result = resolveManagerContact(config, {}, FALLBACK)
  assert.deepEqual(result.emails, ['ivan@example.com'])
  assert.equal(result.name, 'Иван')
})

test('falls back when manager config record does not exist yet', () => {
  const result = resolveManagerContact(undefined, {}, FALLBACK)
  assert.deepEqual(result.emails, [FALLBACK])
})

test('falls back when config exists but has no email', () => {
  const config = { fields: { Менеджер: 'Иван' } }
  const result = resolveManagerContact(config, {}, FALLBACK)
  assert.deepEqual(result.emails, [FALLBACK])
  assert.equal(result.name, 'Иван')
})

test('returns no recipients when there is no fallback configured either', () => {
  const result = resolveManagerContact(undefined, {}, '')
  assert.deepEqual(result.emails, [])
})

test('includes backup email from metadata without duplicating the primary', () => {
  const config = { fields: { Менеджер: 'Иван', Email: 'ivan@example.com' } }
  const metadata = { backupEmail: 'ivan@example.com' }
  const result = resolveManagerContact(config, metadata, FALLBACK)
  assert.deepEqual(result.emails, ['ivan@example.com'])
})
