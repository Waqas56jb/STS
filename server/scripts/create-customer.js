import 'dotenv/config'
import { pool, one } from '../db.js'
import { hashPassword } from '../lib/auth.js'
import { encryptJSON } from '../lib/crypto.js'

const EMAIL = 'customer@gmail.com'
const PASSWORD = 'admin@123!'
const BIZ_NAME = 'Customer Demo'

// pick a real plan (fall back to free)
let planCode = 'complete_growth'
if (!(await one('select 1 from sts_plans where code=$1', [planCode]))) planCode = 'free'
const plan = await one('select code, price_kwd, channels from sts_plans where code=$1', [planCode])

// create/find the business
let biz = await one('select id from sts_businesses where name=$1 limit 1', [BIZ_NAME])
if (!biz) {
  biz = await one(
    `insert into sts_businesses (name, plan_code, status, mrr, channels)
     values ($1,$2,$3,$4,$5) returning id`,
    [BIZ_NAME, plan.code, plan.code === 'free' ? 'free' : 'paid', plan.price_kwd || 0, plan.channels || ['wa', 'ig', 'vc']],
  )
}

// create/refresh the client login
await pool.query(
  `insert into sts_users (email, name, role, business_id, password_hash, password_enc)
   values ($1,$2,'client',$3,$4,$5)
   on conflict (email) do update set
     role='client', name=excluded.name, business_id=excluded.business_id,
     password_hash=excluded.password_hash, password_enc=excluded.password_enc`,
  [EMAIL, 'Customer Demo Owner', biz.id, await hashPassword(PASSWORD), encryptJSON({ p: PASSWORD })],
)

console.log('✓ customer account ready')
console.log('  email   :', EMAIL)
console.log('  password:', PASSWORD)
console.log('  business:', BIZ_NAME, biz.id, '(plan', plan.code + ')')
await pool.end()
