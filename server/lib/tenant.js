import { pool, one, many } from '../db.js'

const NONE = '00000000-0000-0000-0000-000000000000'

/** Optional env override only — admin identity lives in sts_users. */
export function platformAdminEmail() {
  return String(process.env.PLATFORM_ADMIN_EMAIL || '').toLowerCase()
}

/** Optional allow-list from env. Empty = every role=admin user is a platform admin. */
export function platformAdminEmails() {
  const emails = new Set([
    platformAdminEmail(),
    String(process.env.ADMIN_EMAIL || '').toLowerCase(),
    ...(String(process.env.PLATFORM_ADMIN_EMAILS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)),
  ])
  emails.delete('')
  return emails
}

export function isPlatformAdmin(user) {
  if (user?.role !== 'admin') return false
  const emails = platformAdminEmails()
  if (!emails.size) return true
  return emails.has(String(user.email || '').toLowerCase())
}

/** Placeholder so `= any($1::uuid[])` still type-checks when an admin has no tenants. */
export function idList(ids) {
  return ids.length ? ids : [NONE]
}

/**
 * Every login gets a private workspace. Admins without a business_id used to
 * share the global "STS Official" row — that leaked training, QR, and agents.
 */
export async function ensureUserWorkspace(user) {
  if (!user?.id) return null
  if (user.business_id) return user.business_id

  const existing = await one(`select business_id from sts_users where id=$1`, [user.id])
  if (existing?.business_id) {
    user.business_id = existing.business_id
    return user.business_id
  }

  const label = user.role === 'admin'
    ? `${user.name || String(user.email || 'Admin').split('@')[0]} Workspace`
    : (user.name || user.email || 'Business')
  const status = user.role === 'admin' ? 'paid' : 'free'
  const row = await one(
    `insert into sts_businesses (name, plan_code, status, owner_user_id)
     values ($1,'free',$2,$3) returning id, name`,
    [label, status, user.id],
  )
  await pool.query(
    `update sts_users set business_id=$1 where id=$2 and business_id is null`,
    [row.id, user.id],
  )
  user.business_id = row.id
  user.business_name = user.business_name || row.name
  return row.id
}

export async function adminOwns(user, businessId) {
  if (!user || user.role !== 'admin' || !businessId) return false
  // Platform admins can mutate any tenant (list/report already showed them all).
  if (isPlatformAdmin(user)) return true
  if (user.business_id && String(user.business_id) === String(businessId)) return true
  const row = await one(
    `select id from sts_businesses where id=$1 and owner_user_id=$2`,
    [businessId, user.id],
  )
  return !!row
}

/** All customer-tenant business ids (excludes admin personal workspaces). */
export async function allCustomerBusinessIds() {
  const rows = await many(
    `select b.id from sts_businesses b
      where b.id not in (select business_id from sts_users where role='admin' and business_id is not null)`,
  )
  return rows.map((r) => r.id)
}

/** Scope for admin charts, payments, and user lists. */
export async function adminReportBusinessIds(user) {
  if (!user?.id || user.role !== 'admin') return []
  if (isPlatformAdmin(user)) return allCustomerBusinessIds()
  const scoped = await customerBusinessIds(user)
  if (scoped.length) return scoped
  return allCustomerBusinessIds()
}
/** Customer tenants this admin owns — platform operator sees all customer tenants. */
export async function customerBusinessIds(user) {
  if (!user?.id) return []
  if (isPlatformAdmin(user)) return allCustomerBusinessIds()
  const rows = await many(
    `select b.id from sts_businesses b
      where b.owner_user_id=$1
        and b.id not in (select business_id from sts_users where role='admin' and business_id is not null)`,
    [user.id],
  )
  return rows.map((r) => r.id)
}

/** Workspace + customers this admin may receive live events for. */
export async function allowedBusinessIds(user) {
  if (!user?.id) return []
  const rows = await many(
    `select id from sts_businesses where owner_user_id=$1 or id=$2`,
    [user.id, user.business_id || NONE],
  )
  const ids = new Set(rows.map((r) => String(r.id)))
  if (user.business_id) ids.add(String(user.business_id))
  return [...ids]
}

export async function emailTaken(email) {
  return one(`select id from sts_users where email=$1`, [String(email).toLowerCase()])
}

/**
 * One-time mapping so existing customers stay with the STS operator and
 * extra admin logins start empty instead of inheriting the whole platform.
 */
export async function backfillTenantIsolation() {
  const primary = await one(
    `select id, email from sts_users where role='admin' and lower(email)=$1`,
    [platformAdminEmail()],
  ) || await one(`select id, email from sts_users where role='admin' order by created_at asc limit 1`)

  const official = await one(`select id from sts_businesses where name='STS Official' limit 1`)
  const admins = await many(
    `select id, name, email, business_id from sts_users where role='admin' order by created_at`,
  )

  for (const a of admins) {
    if (a.business_id) {
      await pool.query(
        `update sts_businesses set owner_user_id=coalesce(owner_user_id,$2) where id=$1`,
        [a.business_id, a.id],
      )
      continue
    }
    if (official && primary && a.id === primary.id) {
      await pool.query(`update sts_users set business_id=$1 where id=$2`, [official.id, a.id])
      await pool.query(`update sts_businesses set owner_user_id=$1 where id=$2`, [a.id, official.id])
      continue
    }
    await ensureUserWorkspace({ ...a, role: 'admin' })
  }

  if (primary) {
    await pool.query(
      `update sts_businesses set owner_user_id=$1 where owner_user_id is null`,
      [primary.id],
    )
  }

  await pool.query(
    `update sts_businesses
        set widget_key = 'biz_' || substr(replace(gen_random_uuid()::text,'-',''),1,10)
      where widget_key is null`,
  )
}
