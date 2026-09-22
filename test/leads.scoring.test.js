import { test } from 'node:test'
import assert from 'node:assert/strict'
import { scoreLead } from '../api/_leads.js'

test('new leads are always high priority', () => {
  assert.equal(scoreLead('Новое', 1, '').priority, 'Высокий')
  assert.equal(scoreLead('Новое', 100, '').priority, 'Высокий')
})

test('КП в работе becomes high priority only after 14 days', () => {
  assert.equal(scoreLead('КП в работе', 13 * 24, '').priority, 'Средний')
  assert.equal(scoreLead('КП в работе', 15 * 24, '').priority, 'Высокий')
})

test('КП отправлено is high priority once budget is approved, regardless of days', () => {
  assert.equal(
    scoreLead('КП отправлено', 24, 'Согласован').priority,
    'Высокий'
  )
})

test('closed/archived leads never get a priority', () => {
  assert.equal(scoreLead('Отказ', 1000, '').priority, null)
  assert.equal(scoreLead('Архив', 1000, '').priority, null)
})
