import { test } from 'node:test'
import assert from 'node:assert/strict'
import { encodeAttachmentsForSmtp } from '../api/_mail.js'

test('SMTP attachments get base64 encoding so nodemailer decodes them', () => {
  const mdBase64 = Buffer.from('# Анкета клиента', 'utf8').toString('base64')
  const [attachment] = encodeAttachmentsForSmtp([
    { filename: 'anketa.md', content: mdBase64 },
  ])

  assert.equal(attachment.encoding, 'base64')
  assert.equal(attachment.filename, 'anketa.md')
  assert.equal(
    Buffer.from(attachment.content, 'base64').toString('utf8'),
    '# Анкета клиента'
  )
})

test('encoding attachments does not mutate the input array', () => {
  const original = [{ filename: 'a.md', content: 'YQ==' }]
  encodeAttachmentsForSmtp(original)
  assert.equal(original[0].encoding, undefined)
})
