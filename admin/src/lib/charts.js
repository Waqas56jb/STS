/**
 * Chart.js registration + shared defaults, matching the original
 * client.html (font family from the body, muted grey text colour).
 * Imported once by the Dashboard before any chart renders.
 */
import {
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'

Chart.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
)

Chart.defaults.font.family =
  "'Inter', 'IBM Plex Sans Arabic', ui-sans-serif, system-ui, sans-serif"
Chart.defaults.color = '#5C6B7C'

/** Brand palette used across the dashboard charts. */
export const palette = {
  teal: '#0FBE8F',
  navy: '#071A2B',
  ig: '#DD2A7B',
  vc: '#5B8DEF',
  web: '#8B5CF6',
  wa: '#25D366',
}
