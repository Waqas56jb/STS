import 'dotenv/config'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { one } from '../db.js'

const JWT_SECRET = process.env.JWT_SECRET
const JWT_EXPIRES = process.env.JWT_EXPIRES || '7d'
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not set')
  process.exit(1)
}

export const hashPassword = (pw) => bcrypt.hash(pw, 10)
export const comparePassword = (pw, hash) => bcrypt.compare(pw, hash)

export function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, business_id: user.business_id },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES },
  )
}

/** Require a valid Bearer token; loads a fresh user row onto req.user. */
export async function auth(req, res, next) {
  try {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : null
    if (!token) return res.status(401).json({ error: 'Not authenticated' })

    const payload = jwt.verify(token, JWT_SECRET)
    const user = await one(
      `select u.id, u.email, u.name, u.role, u.business_id,
              b.name as business_name, b.plan_code, b.status as business_status
         from sts_users u
         left join sts_businesses b on b.id = u.business_id
        where u.id = $1`,
      [payload.id],
    )
    if (!user) return res.status(401).json({ error: 'Invalid session' })
    if (user.business_status === 'suspended')
      return res.status(403).json({ error: 'Account suspended — contact STS support' })

    req.user = user
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

/** Require an admin after `auth`. */
export function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin access required' })
  next()
}

/** Resolve a user from a raw JWT (WebSocket / query-token auth). */
export async function userFromToken(token) {
  if (!token) return null
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    const user = await one(
      `select u.id, u.email, u.name, u.role, u.business_id,
              b.name as business_name, b.plan_code, b.status as business_status
         from sts_users u
         left join sts_businesses b on b.id = u.business_id
        where u.id = $1`,
      [payload.id],
    )
    if (!user || user.business_status === 'suspended') return null
    return user
  } catch {
    return null
  }
}
