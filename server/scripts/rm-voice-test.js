import { pool, one } from '../db.js'
const u = await one("select business_id from sts_users where email='owner@alnoorperfumes.com'")
await pool.query("delete from sts_channel_configs where business_id=$1 and channel='voice'", [u.business_id])
console.log('removed fake voice test creds for Al Noor')
await pool.end()
