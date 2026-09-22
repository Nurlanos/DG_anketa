import nodemailer from 'nodemailer'

export function mailConfigured() {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS)
}

// Attachment `content` is always a base64 string (the convention every
// caller uses); nodemailer needs `encoding: 'base64'` set explicitly to
// decode it, unlike Resend's API which expects base64 content as-is.
export function encodeAttachmentsForSmtp(attachments = []) {
  return attachments.map((attachment) => ({
    ...attachment,
    encoding: 'base64',
  }))
}

export async function sendMail({ to, subject, html, attachments = [] }) {
  if (mailConfigured()) {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT || 465),
      secure: true,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
    return transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      html,
      attachments: encodeAttachmentsForSmtp(attachments),
    })
  }

  const resendKey = process.env.RESEND_API_KEY || ''
  if (!resendKey) throw new Error('SMTP_USER/SMTP_PASS or RESEND_API_KEY not configured')
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      attachments: attachments.map((attachment) => ({ filename: attachment.filename, content: attachment.content })),
    }),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.message || `Resend error ${response.status}`)
  return { messageId: data.id }
}
