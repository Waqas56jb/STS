import { Line, Bar, Doughnut } from 'react-chartjs-2'
import { palette } from '../../lib/charts'

const gridY = { grid: { color: '#EDF1F5' } }
const gridXoff = { grid: { display: false } }
// secondary series colour (neutral slate to match the green/navy theme)
const slate = '#94A3B8'

/** Shown instead of a chart when there is no data yet (empty database). */
function ChartEmpty() {
  return (
    <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: 'var(--mut)', fontSize: 13 }}>
      No data yet
    </div>
  )
}
const hasRows = (d) => Array.isArray(d) && d.length > 0

const CH_LABEL = { whatsapp: 'WhatsApp', instagram: 'Instagram', voice: 'Voice', web: 'Website' }
const CH_COLOR = { whatsapp: '#25D366', instagram: palette.ig, voice: palette.vc, web: '#8B5CF6' }
const CAT_LABEL = {
  bundle: 'Complete bundles', social: 'Social bundles', whatsapp: 'WhatsApp',
  instagram: 'Instagram', voice: 'Voice', free: 'Free',
}

/* ---- Overview: collected revenue per month (paid payments) ---- */
export function RevenueChart({ data }) {
  if (!hasRows(data)) return <ChartEmpty />
  const chart = {
    labels: data.map((r) => r.m),
    datasets: [{ data: data.map((r) => r.total), backgroundColor: palette.teal, borderRadius: 7 }],
  }
  return <Bar data={chart} options={{ plugins: { legend: { display: false } }, maintainAspectRatio: false, scales: { y: gridY, x: gridXoff } }} />
}

/* ---- Overview: new businesses per month (paid vs free) ---- */
export function GrowthChart({ data }) {
  if (!hasRows(data)) return <ChartEmpty />
  const chart = {
    labels: data.map((r) => r.m),
    datasets: [
      { label: 'Paid', data: data.map((r) => r.paid), borderColor: palette.teal, backgroundColor: 'rgba(15,190,143,.12)', fill: true, tension: 0.4, borderWidth: 2.5 },
      { label: 'Free', data: data.map((r) => r.free), borderColor: slate, borderDash: [6, 4], tension: 0.4, borderWidth: 2.5 },
    ],
  }
  return <Line data={chart} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { y: gridY, x: gridXoff } }} />
}

/* ---- Overview: MRR by plan category ---- */
export function PlanChart({ data }) {
  const rows = (data || []).filter((r) => Number(r.mrr) > 0)
  if (!hasRows(rows)) return <ChartEmpty />
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
  if (!hasRows(data)) return <ChartEmpty />
  const chart = {
    labels: data.map((r) => r.d),
    datasets: [{ data: data.map((r) => r.n), borderColor: palette.vc, backgroundColor: 'rgba(91,141,239,.12)', fill: true, tension: 0.4, borderWidth: 2.5 }],
  }
  return <Line data={chart} options={{ plugins: { legend: { display: false } }, maintainAspectRatio: false, scales: { y: gridY, x: gridXoff } }} />
}

/* ---- Analytics: ARPU per month (revenue ÷ active paid customers) ---- */
export function ArpuChart({ data }) {
  const rows = (data || []).filter((r) => r?.m)
  if (!hasRows(rows)) return <ChartEmpty />
  const values = rows.map((r) => Number(r.arpu ?? 0))
  const chart = {
    labels: rows.map((r) => r.m),
    datasets: [{
      label: 'ARPU (KWD)',
      data: values,
      borderColor: palette.teal,
      tension: 0.4,
      borderWidth: 2.5,
      fill: true,
      backgroundColor: 'rgba(15,190,143,.1)',
      pointRadius: rows.length <= 3 ? 5 : 3,
      pointHoverRadius: 6,
    }],
  }
  const peak = Math.max(...values, 0)
  const options = {
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' } },
    scales: {
      y: { ...gridY, beginAtZero: true, suggestedMax: peak > 0 ? peak * 1.2 : 10 },
      x: gridXoff,
    },
  }
  return <Line data={chart} options={options} />
}

/* ---- Analytics: message volume by channel ---- */
export function UsageChart({ data }) {
  const rows = (data || []).filter((r) => Number(r.n) > 0)
  if (!hasRows(rows)) return <ChartEmpty />
  const chart = {
    labels: rows.map((r) => CH_LABEL[r.channel] || r.channel),
    datasets: [{ data: rows.map((r) => r.n), backgroundColor: rows.map((r) => CH_COLOR[r.channel] || slate), borderRadius: 7 }],
  }
  return <Bar data={chart} options={{ plugins: { legend: { display: false } }, maintainAspectRatio: false, scales: { y: gridY, x: gridXoff } }} />
}
