import { useMemo } from 'react'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import { palette } from '../../lib/charts'

const gridY = { grid: { color: '#EDF1F5' } }
const gridXoff = { grid: { display: false } }

export function WeekChart({ data }) {
  // real message-per-day data when available, else a sensible default
  const has = Array.isArray(data) && data.length > 0
  const labels = has ? data.map((d) => d.d) : ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri']
  const values = has ? data.map((d) => d.n) : [74, 92, 88, 110, 96, 121, 128]
  const chart = {
    labels,
    datasets: [{
      label: 'Messages', data: values, borderColor: palette.teal,
      backgroundColor: 'rgba(15,190,143,.12)', fill: true, tension: 0.4, borderWidth: 2.5, pointRadius: 3,
    }],
  }
  return <Line data={chart} options={{ plugins: { legend: { display: false } }, maintainAspectRatio: false, scales: { y: gridY, x: gridXoff } }} />
}

const CH_LABEL = { whatsapp: 'WhatsApp', instagram: 'Instagram', voice: 'Voice', web: 'Website' }
const CH_COLOR = { whatsapp: '#25D366', instagram: palette.ig, voice: palette.vc, web: palette.web }

export function ChannelChart({ data }) {
  const has = Array.isArray(data) && data.length > 0
  const labels = has ? data.map((d) => CH_LABEL[d.channel] || d.channel) : ['WhatsApp', 'Instagram', 'Voice', 'Website']
  const values = has ? data.map((d) => d.n) : [52, 27, 9, 12]
  const colors = has ? data.map((d) => CH_COLOR[d.channel] || palette.navy) : ['#25D366', palette.ig, palette.vc, palette.web]
  const chart = { labels, datasets: [{ data: values, backgroundColor: colors, borderWidth: 0 }] }
  return <Doughnut data={chart} options={{ maintainAspectRatio: false, cutout: '68%', plugins: { legend: { position: 'bottom' } } }} />
}

export function MonthChart() {
  const data = useMemo(
    () => ({
      labels: Array.from({ length: 30 }, (_, i) => i + 1),
      datasets: [
        {
          data: Array.from({ length: 30 }, () => 60 + Math.round(Math.random() * 80)),
          backgroundColor: palette.teal,
          borderRadius: 5,
        },
      ],
    }),
    [],
  )
  const options = {
    plugins: { legend: { display: false } },
    maintainAspectRatio: false,
    scales: { y: gridY, x: { grid: { display: false }, ticks: { maxTicksLimit: 10 } } },
  }
  return <Bar data={data} options={options} />
}

export function ResolutionChart() {
  const data = {
    labels: ['AI resolved', 'Human handoff'],
    datasets: [{ data: [86, 14], backgroundColor: [palette.teal, palette.navy], borderWidth: 0 }],
  }
  const options = { maintainAspectRatio: false, cutout: '68%', plugins: { legend: { position: 'bottom' } } }
  return <Doughnut data={data} options={options} />
}

export function LeadsChart() {
  const data = {
    labels: ['W1', 'W2', 'W3', 'W4'],
    datasets: [
      {
        label: 'Leads',
        data: [41, 55, 49, 68],
        borderColor: palette.vc,
        backgroundColor: 'rgba(91,141,239,.12)',
        fill: true,
        tension: 0.4,
        borderWidth: 2.5,
      },
    ],
  }
  const options = {
    plugins: { legend: { display: false } },
    maintainAspectRatio: false,
    scales: { y: gridY, x: gridXoff },
  }
  return <Line data={data} options={options} />
}
