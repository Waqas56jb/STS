/**
 * Icon wrapper.
 *
 * The original used Lucide via CDN with kebab-case `data-lucide` names.
 * Here we import only the icons the app actually uses (named imports, so
 * the bundle stays small instead of pulling all ~1,500 lucide icons) and
 * map the kebab names to them. Unknown names fall back to Circle.
 */
import {
  Activity, ArrowRight, ArrowUpCircle, BadgeCheck, BarChart3, BookOpen, Bot,
  Brain, Building2, Calendar, Check, CheckCircle2, Circle, Clock, Code2,
  CreditCard, Download, Eye, FileAudio, FileSpreadsheet, FileText, FileUp,
  Globe, Hash, HelpCircle, Inbox, Instagram, KeyRound, Languages,
  LayoutDashboard, Library, Lock, LogOut, Menu, MessageCircle, MessageSquare,
  MessagesSquare, Package, PhoneCall, PhoneIncoming, PhoneOutgoing, PieChart,
  PlugZap, Plus, Receipt, Save, Send, Settings, ShieldCheck, Sparkles, Target,
  Timer, TrendingUp, Twitter, UploadCloud, Users, Wrench, X, Zap,
} from 'lucide-react'

const MAP = {
  activity: Activity,
  'arrow-right': ArrowRight,
  'arrow-up-circle': ArrowUpCircle,
  'badge-check': BadgeCheck,
  'bar-chart-3': BarChart3,
  'book-open': BookOpen,
  bot: Bot,
  brain: Brain,
  'building-2': Building2,
  calendar: Calendar,
  check: Check,
  'check-circle-2': CheckCircle2,
  clock: Clock,
  'code-2': Code2,
  'credit-card': CreditCard,
  download: Download,
  eye: Eye,
  'file-audio': FileAudio,
  'file-spreadsheet': FileSpreadsheet,
  'file-text': FileText,
  'file-up': FileUp,
  globe: Globe,
  hash: Hash,
  'help-circle': HelpCircle,
  inbox: Inbox,
  instagram: Instagram,
  'key-round': KeyRound,
  languages: Languages,
  'layout-dashboard': LayoutDashboard,
  library: Library,
  lock: Lock,
  'log-out': LogOut,
  menu: Menu,
  'message-circle': MessageCircle,
  'message-square': MessageSquare,
  'messages-square': MessagesSquare,
  package: Package,
  'phone-call': PhoneCall,
  'phone-incoming': PhoneIncoming,
  'phone-outgoing': PhoneOutgoing,
  'pie-chart': PieChart,
  'plug-zap': PlugZap,
  plus: Plus,
  receipt: Receipt,
  save: Save,
  send: Send,
  settings: Settings,
  'shield-check': ShieldCheck,
  sparkles: Sparkles,
  target: Target,
  timer: Timer,
  'trending-up': TrendingUp,
  twitter: Twitter,
  'upload-cloud': UploadCloud,
  users: Users,
  wrench: Wrench,
  x: X,
  zap: Zap,
}

export function Icon({ name, size, className, style, strokeWidth = 2, ...rest }) {
  const Cmp = MAP[name] || Circle
  return (
    <Cmp
      className={className}
      strokeWidth={strokeWidth}
      style={size ? { width: size, height: size, ...style } : style}
      {...rest}
    />
  )
}
