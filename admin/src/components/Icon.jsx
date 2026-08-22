/**
 * Icon wrapper.
 *
 * The original used Lucide via CDN with kebab-case `data-lucide` names.
 * Here we import only the icons the app actually uses (named imports, so
 * the bundle stays small instead of pulling all ~1,500 lucide icons) and
 * map the kebab names to them. Unknown names fall back to Circle.
 */
import {
  Activity, AlertTriangle, ArrowLeft, ArrowRight, ArrowUpCircle, BadgeCheck,
  Banknote, BarChart3, Bell, BookOpen, Bot, Brain, Building2, Calendar, Check,
  CheckCircle2, Circle, Clock, Code2, Copy, CreditCard, Crown, Download, Eye, EyeOff,
  FileAudio, FileSpreadsheet, FileText, FileUp, Globe, Hash, HelpCircle, Inbox,
  Instagram, KeyRound, Languages, LayoutDashboard, Library, Lock, LogIn, LogOut,
  Menu, MessageCircle, MessageSquare, MessagesSquare, Package, Pause, Pencil,
  PhoneCall, PhoneIncoming, PhoneOutgoing, PieChart, Play, PlugZap, Plus,
  QrCode, Receipt, RefreshCw, Save, Send, Settings, Shield, ShieldCheck, Sparkles, Target, Timer,
  TrendingUp, Trash2, Trophy, Twitter, UploadCloud, User, UserCheck, UserPlus, Users,
  Webhook, Wrench, X, XCircle, Zap,
} from 'lucide-react'

const MAP = {
  activity: Activity,
  'alert-triangle': AlertTriangle,
  'arrow-left': ArrowLeft,
  'arrow-right': ArrowRight,
  banknote: Banknote,
  bell: Bell,
  crown: Crown,
  'log-in': LogIn,
  pause: Pause,
  pencil: Pencil,
  play: Play,
  shield: Shield,
  trophy: Trophy,
  user: User,
  'user-check': UserCheck,
  'user-plus': UserPlus,
  'x-circle': XCircle,
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
  copy: Copy,
  'credit-card': CreditCard,
  download: Download,
  eye: Eye,
  'eye-off': EyeOff,
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
  'qr-code': QrCode,
  'refresh-cw': RefreshCw,
  receipt: Receipt,
  save: Save,
  send: Send,
  settings: Settings,
  'shield-check': ShieldCheck,
  sparkles: Sparkles,
  target: Target,
  timer: Timer,
  'trending-up': TrendingUp,
  'trash-2': Trash2,
  webhook: Webhook,
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
