/**
 * Create or update the platform admin email + password.
 * Also marks them as PLATFORM_ADMIN_EMAIL owner of orphan tenants.
 *
 * Usage:
 *   node scripts/set-admin.js <email> <password> [display name]
 *
 * Example:
 *   node scripts/set-admin.js ops@stsq8.com 'NewSecurePass!' "STS Admin"
 */
import 'dotenv/config'
import { pool, one } from '../db.js'
import { hashPassword } from '../lib/auth.js'
import { encryptJSON } from '../lib/crypto.js'

const email = process.argv[2]?.toLowerCase()?.trim()
const password = process.argv[3]
const name = process.argv[4] || 'STS Admin'

if (!email || !password) {
  console.error('Usage: node scripts/set-admin.js <email> <password> [name]')
  process.exit(1)
}
if (password.length < 6) {
  console.error('Password must be at least 6 characters')
  process.exit(1)
}

const hash = await hashPassword(password)
const enc = encryptJSON({ p: password })

let user = await one(`select id, email, business_id from sts_users where lower(email)=$1`, [email])
if (!user) {
  // Prefer renaming the oldest admin if changing identity
  const old = await one(`select id, email, business_id from sts_users where role='admin' order by created_at asc limit 1`)
  if (old) {
    await pool.query(
      `update sts_users set email=$2, name=$3, password_hash=$4, password_enc=$5, role='admin',
              email_verified_at=now(), email_verify_token=null
        where id=$1`,
      [old.id, email, name, hash, enc],
    )
    user = { id: old.id, email, business_id: old.business_id }
    console.log(`✓ renamed admin ${old.email} → ${email}`)
  } else {
    const biz = await one(
      `insert into sts_businesses (name, plan_code, status) values ('STS Official','free','paid') returning id`,
    )
    const row = await one(
      `insert into sts_users (email, name, role, business_id, password_hash, password_enc, email_verified_at)
       values ($1,$2,'admin',$3,$4,$5,now()) returning id, business_id`,
      [email, name, biz.id, hash, enc],
    )
    await pool.query(`update sts_businesses set owner_user_id=$1 where id=$2`, [row.id, biz.id])
    user = row
    console.log('✓ created new admin', email)
  }
} else {
  await pool.query(
    `update sts_users set name=$2, password_hash=$3, password_enc=$4, role='admin',
            email_verified_at=coalesce(email_verified_at, now()), email_verify_token=null
      where id=$1`,
    [user.id, name, hash, enc],
  )
  console.log('✓ updated admin', email)
}

// Attach orphan customer tenants to this admin
await pool.query(
  `update sts_businesses set owner_user_id=$1 where owner_user_id is null
     and id not in (select business_id from sts_users where role='admin' and business_id is not null)`,
  [user.id],
)

console.log('')
console.log('Admin login:')
console.log('  email   :', email)
console.log('  password:', password)
console.log('')
console.log('Also set on Railway / .env:')
console.log(`  ADMIN_EMAIL=${email}`)
console.log(`  ADMIN_PASSWORD=${password}`)
console.log(`  PLATFORM_ADMIN_EMAIL=${email}`)
await pool.end()
