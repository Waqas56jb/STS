import { Line, Bar, Doughnut } from 'react-chartjs-2'
import { palette } from '../../lib/charts'

const gridY = { grid: { color: '#EDF1F5' }, beginAtZero: true }
const gridXoff = { grid: { display: false } }
const slate = '#94A3B8'

function ChartEmpty({ label = 'No data yet' }) {
  return (
    <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: 'var(--mut)', fontSize: 13 }}>
      {label}
    </div>
  )
}

export function ChartLoading() {
  return <ChartEmpty label="Loading analytics…" />
}

const hasSeries = (d) => Array.isArray(d) && d.length > 0

const CH_LABEL = { whatsapp: 'WhatsApp', instagram: 'Instagram', voice: 'Voice', web: 'Website' }
const CH_COLOR = { whatsapp: '#25D366', instagram: palette.ig, voice: palette.vc, web: '#8B5CF6' }
const CAT_LABEL = {
  bundle: 'Complete bundles', social: 'Social bundles', whatsapp: 'WhatsApp',
  instagram: 'Instagram', voice: 'Voice', free: 'Free',
}

function intTicks(max) {
  const m = Math.max(1, Math.ceil(max))
  return { stepSize: m <= 5 ? 1 : undefined, precision: 0 }
}

/* ---- Overview: collected revenue per month (paid payments + MRR fallback) ---- */
export function RevenueChart({ data }) {
  if (!hasSeries(data)) return <ChartLoading />
  const values = data.map((r) => Number(r.total) || 0)
  const peak = Math.max(...values, 0)
  const chart = {
    labels: data.map((r) => r.m),
    datasets: [{ data: values, backgroundColor: palette.teal, borderRadius: 7 }],
  }
  return (
    <Bar
      data={chart}
      options={{
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `${c.parsed.y} KWD` } } },
        maintainAspectRatio: false,
        scales: {
          y: { ...gridY, suggestedMax: peak > 0 ? peak * 1.15 : 10, ticks: { callback: (v) => `${v}` } },
          x: gridXoff,
        },
      }}
    />
  )
}

/* ---- Overview: cumulative paid vs free businesses ---- */
export function GrowthChart({ data }) {
  if (!hasSeries(data)) return <ChartLoading />
  const paid = data.map((r) => Number(r.paid) || 0)
  const free = data.map((r) => Number(r.free) || 0)
  const peak = Math.max(...paid, ...free, 1)
  const chart = {
    labels: data.map((r) => r.m),
    datasets: [
      { label: 'Paid', data: paid, borderColor: palette.teal, backgroundColor: 'rgba(15,190,143,.12)', fill: true, tension: 0.35, borderWidth: 2.5, pointRadius: 3 },
      { label: 'Free', data: free, borderColor: slate, borderDash: [6, 4], tension: 0.35, borderWidth: 2.5, pointRadius: 3 },
    ],
  }
  return (
    <Line
      data={chart}
      options={{
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } },
        scales: { y: { ...gridY, suggestedMax: peak * 1.2, ticks: intTicks(peak) }, x: gridXoff },
      }}
    />
  )
}

/* ---- Overview: MRR by plan category ---- */
export function PlanChart({ data }) {
  if (!hasSeries(data)) return <ChartLoading />
  const rows = data.filter((r) => Number(r.mrr) > 0)
  if (!rows.length) return <ChartEmpty />
  const chart = {
    labels: rows.map((r) => CAT_LABEL[r.category] || r.category),
    datasets: [{
      data: rows.map((r) => r.mrr),
      backgroundColor: [palette.navy, palette.teal, '#25D366', palette.ig, palette.vc, slate],
      borderWidth: 0,
    }],
  }
  return <Doughnut data={chart} options={{ maintainAspectRatio: false, cutout: '66%', plugins: { legend: { position: 'bottom' } } }} />
}

/* ---- Overview: platform messages per day (last 14 days) ---- */
export function MessagesChart({ data }) {
  if (!hasSeries(data)) return <ChartLoading />
  const values = data.map((r) => Number(r.n) || 0)
  const peak = Math.max(...values, 0)
  const chart = {
    labels: data.map((r) => r.d),
    datasets: [{
      data: values,
      borderColor: palette.vc,
      backgroundColor: 'rgba(91,141,239,.12)',
      fill: true,
      tension: 0.35,
      borderWidth: 2.5,
      pointRadius: values.length <= 7 ? 4 : 2,
    }],
  }
  return (
    <Line
      data={chart}
      options={{
        plugins: { legend: { display: false } },
        maintainAspectRatio: false,
        scales: {
          y: { ...gridY, suggestedMax: peak > 0 ? peak * 1.2 : 5, ticks: intTicks(peak) },
          x: { ...gridXoff, ticks: { maxRotation: 45, minRotation: 0, autoSkip: true, maxTicksLimit: 8 } },
        },
      }}
    />
  )
}

/* ---- Analytics: ARPU per month ---- */
export function ArpuChart({ data }) {
  const rows = (data || []).filter((r) => r?.m)
  if (!hasSeries(rows)) return <ChartLoading />
  const values = rows.map((r) => Number(r.arpu ?? 0))
  const peak = Math.max(...values, 0)
  const chart = {
    labels: rows.map((r) => r.m),
    datasets: [{
      label: 'ARPU (KWD)',
      data: values,
      borderColor: palette.teal,
      tension: 0.35,
      borderWidth: 2.5,
      fill: true,
      backgroundColor: 'rgba(15,190,143,.1)',
      pointRadius: rows.length <= 3 ? 5 : 3,
    }],
  }
  return (
    <Line
      data={chart}
      options={{
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } },
        scales: {
          y: { ...gridY, suggestedMax: peak > 0 ? peak * 1.2 : 10 },
          x: gridXoff,
        },
      }}
    />
  )
}

/* ---- Analytics: message volume by channel ---- */
export function UsageChart({ data }) {
  const rows = (data || []).filter((r) => Number(r.n) > 0)
  if (!hasSeries(rows)) return <ChartEmpty />
  const chart = {
    labels: rows.map((r) => CH_LABEL[r.channel] || r.channel),
    datasets: [{ data: rows.map((r) => r.n), backgroundColor: rows.map((r) => CH_COLOR[r.channel] || slate), borderRadius: 7 }],
  }
  return <Bar data={chart} options={{ plugins: { legend: { display: false } }, maintainAspectRatio: false, scales: { y: gridY, x: gridXoff } }} />
}
