/** Build admin dashboard chart series with zero-filled months/days. */

export function monthKey(date) {
  return date.toLocaleString('en', { month: 'short' })
}

export function lastNMonths(n = 6) {
  const out = []
  const base = new Date()
  base.setDate(1)
  base.setHours(0, 0, 0, 0)
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base)
    d.setMonth(d.getMonth() - i)
    out.push({ monthStart: d.toISOString(), m: monthKey(d) })
  }
  return out
}

export function lastNDays(n = 14) {
  const out = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const label = d.toLocaleString('en', { month: 'short', day: 'numeric' })
    out.push({ dayStart: d.toISOString().slice(0, 10), d: label })
  }
  return out
}

export function fillRevenueMonthly(rows, { currentMrr = 0 } = {}) {
  const byMonth = Object.fromEntries((rows || []).map((r) => [r.m, Number(r.total)]))
  const series = lastNMonths(6).map(({ m }) => ({ m, total: byMonth[m] ?? 0 }))
  const hasAny = series.some((r) => r.total > 0)
  if (!hasAny && currentMrr > 0) {
    series[series.length - 1].total = currentMrr
  }
  return series
}

export function fillGrowthMonthly(rows) {
  const byMonth = Object.fromEntries((rows || []).map((r) => [r.m, { paid: Number(r.paid), free: Number(r.free) }]))
  return lastNMonths(6).map(({ m }) => ({
    m,
    paid: byMonth[m]?.paid ?? 0,
    free: byMonth[m]?.free ?? 0,
  }))
}

export function fillMessagesDaily(rows) {
  const byDay = Object.fromEntries((rows || []).map((r) => [String(r.day_key || r.d).trim(), Number(r.n)]))
  return lastNDays(14).map(({ dayStart, d }) => ({ d, n: byDay[dayStart] ?? byDay[d] ?? 0 }))
}

export function fillPlanCategories(rows) {
  const labels = {
    bundle: 'bundle',
    social: 'social',
    whatsapp: 'whatsapp',
    instagram: 'instagram',
    voice: 'voice',
    free: 'free',
  }
  const byCat = Object.fromEntries((rows || []).map((r) => [r.category, Number(r.mrr)]))
  const cats = [...new Set([...Object.keys(labels), ...Object.keys(byCat)])]
  return cats.map((category) => ({
    category,
    mrr: byCat[category] ?? 0,
  })).filter((r) => r.mrr > 0 || cats.length === 1)
}
