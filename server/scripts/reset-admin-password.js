import 'dotenv/config'
import { pool, one } from '../db.js'
import { comparePassword, hashPassword } from '../lib/auth.js'

const email = process.argv[2]?.toLowerCase()
const password = process.argv[3]
if (!email || !password) {
  console.error('Usage: node scripts/reset-admin-password.js <email> <password>')
  process.exit(1)
}

const user = await one('select id, email, role from sts_users where email=$1', [email])
if (!user) {
  console.error('User not found:', email)
  process.exit(1)
}

const hash = await hashPassword(password)
await pool.query(
  `update sts_users set password_hash=$1, password_enc=$2 where id=$3`,
  [hash, JSON.stringify({ p: password }), user.id],
)
console.log(`Password updated for ${user.email} (${user.role})`)
await pool.end()
