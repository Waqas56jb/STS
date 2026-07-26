import { Line, Bar, Doughnut } from 'react-chartjs-2'
import { palette } from '../../lib/charts'

const gridY = { grid: { color: '#EDF1F5' } }
const gridXoff = { grid: { display: false } }

/** Shown instead of a chart when there is no data yet (empty database). */
function ChartEmpty() {
  return (
    <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: 'var(--mut)', fontSize: 13 }}>
      No data yet
    </div>
  )
}
const hasRows = (d) => Array.isArray(d) && d.length > 0

/* ---- Overview: messages per day (last 7 days) ---- */
export function WeekChart({ data }) {
  if (!hasRows(data)) return <ChartEmpty />
  const chart = {
    labels: data.map((d) => d.d),
    datasets: [{
      label: 'Messages', data: data.map((d) => d.n), borderColor: palette.teal,
      backgroundColor: 'rgba(15,190,143,.12)', fill: true, tension: 0.4, borderWidth: 2.5, pointRadius: 3,
    }],
  }
  return <Line data={chart} options={{ plugins: { legend: { display: false } }, maintainAspectRatio: false, scales: { y: gridY, x: gridXoff } }} />
}

const CH_LABEL = { whatsapp: 'WhatsApp', instagram: 'Instagram', voice: 'Voice', web: 'Website' }
const CH_COLOR = { whatsapp: '#25D366', instagram: palette.ig, voice: palette.vc, web: palette.web }

/* ---- Overview: conversations by channel ---- */
export function ChannelChart({ data }) {
  if (!hasRows(data)) return <ChartEmpty />
  const chart = {
    labels: data.map((d) => CH_LABEL[d.channel] || d.channel),
    datasets: [{
      data: data.map((d) => d.n),
      backgroundColor: data.map((d) => CH_COLOR[d.channel] || palette.navy),
      borderWidth: 0,
    }],
  }
  return <Doughnut data={chart} options={{ maintainAspectRatio: false, cutout: '68%', plugins: { legend: { position: 'bottom' } } }} />
}

/* ---- Analytics: messages per day (last 30 days) ---- */
export function MonthChart({ data }) {
  if (!hasRows(data)) return <ChartEmpty />
  const chart = {
    labels: data.map((d) => d.d),
    datasets: [{ data: data.map((d) => d.n), backgroundColor: palette.teal, borderRadius: 5 }],
  }
  const options = {
    plugins: { legend: { display: false } },
    maintainAspectRatio: false,
    scales: { y: gridY, x: { grid: { display: false }, ticks: { maxTicksLimit: 10 } } },
  }
  return <Bar data={chart} options={options} />
}

/* ---- Analytics: AI resolved vs human handoff ---- */
export function ResolutionChart({ data }) {
  const ai = data?.ai || 0
  const human = data?.human || 0
  if (ai + human === 0) return <ChartEmpty />
  const chart = {
    labels: ['AI resolved', 'Human handoff'],
    datasets: [{ data: [ai, human], backgroundColor: [palette.teal, palette.navy], borderWidth: 0 }],
  }
  const options = { maintainAspectRatio: false, cutout: '68%', plugins: { legend: { position: 'bottom' } } }
  return <Doughnut data={chart} options={options} />
}

/* ---- Analytics: leads per week ---- */
export function LeadsChart({ data }) {
  if (!hasRows(data)) return <ChartEmpty />
  const chart = {
    labels: data.map((d) => d.w),
    datasets: [{
      label: 'Leads', data: data.map((d) => d.n), borderColor: palette.vc,
      backgroundColor: 'rgba(91,141,239,.12)', fill: true, tension: 0.4, borderWidth: 2.5,
    }],
  }
  const options = {
    plugins: { legend: { display: false } },
    maintainAspectRatio: false,
    scales: { y: gridY, x: gridXoff },
  }
  return <Line data={chart} options={options} />
}
