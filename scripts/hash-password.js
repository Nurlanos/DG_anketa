import { hashPassword } from '../api/_lib.js'

const chunks = []
for await (const chunk of process.stdin) chunks.push(chunk)
const password = Buffer.concat(chunks).toString('utf8').trim()
if (!password) throw new Error('Pass a password through stdin')
console.log(await hashPassword(password))
