import { Line, Bar, Doughnut } from 'react-chartjs-2'
import { palette } from '../../lib/charts'

const gridY = { grid: { color: '#EDF1F5' } }
const gridXoff = { grid: { display: false } }
// secondary series colour (was gold) — a neutral slate to match the
// client's green/navy theme
const gold = '#94A3B8'

export function RevenueChart() {
  const data = {
    labels: ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
    datasets: [{ data: [1240, 1512, 1798, 2105, 2410, 2847], backgroundColor: palette.teal, borderRadius: 7 }],
  }
  return <Bar data={data} options={{ plugins: { legend: { display: false } }, maintainAspectRatio: false, scales: { y: gridY, x: gridXoff } }} />
}

export function GrowthChart() {
  const data = {
    labels: ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
    datasets: [
      { label: 'Paid', data: [14, 18, 21, 25, 27, 31], borderColor: palette.teal, backgroundColor: 'rgba(15,190,143,.12)', fill: true, tension: 0.4, borderWidth: 2.5 },
      { label: 'Free', data: [9, 10, 12, 11, 13, 12], borderColor: gold, borderDash: [6, 4], tension: 0.4, borderWidth: 2.5 },
    ],
  }
  return <Line data={data} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { y: gridY, x: gridXoff } }} />
}

export function PlanChart() {
  const data = {
    labels: ['Complete bundles', 'Social bundles', 'WhatsApp', 'Instagram', 'Voice'],
    datasets: [{ data: [1088, 242, 264, 196, 526], backgroundColor: [palette.navy, palette.teal, '#25D366', palette.ig, palette.vc], borderWidth: 0 }],
  }
  return <Doughnut data={data} options={{ maintainAspectRatio: false, cutout: '66%', plugins: { legend: { position: 'bottom' } } }} />
}

export function MessagesChart() {
  const data = {
    labels: Array.from({ length: 14 }, (_, i) => `J${i + 8}`),
    datasets: [{ data: [2100, 2350, 2280, 2600, 2540, 2890, 3010, 2760, 3150, 3290, 3080, 3420, 3510, 3640], borderColor: palette.vc, backgroundColor: 'rgba(91,141,239,.12)', fill: true, tension: 0.4, borderWidth: 2.5 }],
  }
  return <Line data={data} options={{ plugins: { legend: { display: false } }, maintainAspectRatio: false, scales: { y: gridY, x: gridXoff } }} />
}

export function ArpuChart() {
  const data = {
    labels: ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
    datasets: [
      { label: 'ARPU (KWD)', data: [88, 84, 86, 84, 89, 92], borderColor: palette.teal, tension: 0.4, borderWidth: 2.5, yAxisID: 'y' },
      { label: 'Churn %', data: [4.1, 3.8, 2.9, 3.2, 2.4, 1.9], borderColor: '#DC2626', borderDash: [6, 4], tension: 0.4, borderWidth: 2.5, yAxisID: 'y1' },
    ],
  }
  const options = {
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' } },
    scales: { y: gridY, y1: { position: 'right', grid: { display: false } }, x: gridXoff },
  }
  return <Line data={data} options={options} />
}

export function UsageChart() {
  const data = {
    labels: ['WhatsApp', 'Instagram', 'Voice', 'Website'],
    datasets: [{ data: [61200, 28400, 9800, 12100], backgroundColor: ['#25D366', palette.ig, palette.vc, '#8B5CF6'], borderRadius: 7 }],
  }
  return <Bar data={data} options={{ plugins: { legend: { display: false } }, maintainAspectRatio: false, scales: { y: gridY, x: gridXoff } }} />
}
