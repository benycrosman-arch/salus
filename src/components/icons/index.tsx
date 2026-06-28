// Salus icon barrel.
//
// `export * from "lucide-react"` is a safety net so any icon name we
// haven't (yet) drawn still resolves. The explicit re-export below then
// SHADOWS those names with the bespoke duotone-organic versions — an
// explicit named re-export always wins over a star export, so call sites
// importing from "@/components/icons" get the custom glyph.
export * from "lucide-react"

export type { SalusIconProps } from "./core"

export {
  // navigation / brand
  Home,
  LayoutDashboard,
  Bot,
  Camera,
  Sparkles,
  BarChart3,
  User,
  Users,
  Settings,
  // domain
  Apple,
  Leaf,
  Droplet,
  Flame,
  Utensils,
  Scale,
  Beaker,
  FlaskConical,
  Target,
  ShoppingCart,
  Store,
  BookOpen,
  Lightbulb,
  IdCard,
  Stethoscope,
  Activity,
  // comms
  MessageCircle,
  Send,
  Mail,
  Phone,
  Smartphone,
  Globe,
  // status / trend
  TrendingUp,
  TrendingDown,
  Star,
  History,
  CheckCircle,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  HelpCircle,
  Circle,
  Check,
  X,
  Plus,
  // auth / security
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  Unlink,
  LogOut,
  // actions
  Save,
  Trash2,
  Download,
  FileText,
  // notify / ai
  Bell,
  Wand2,
  // directional
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Search,
} from "./glyphs"

export {
  // food
  Egg,
  Fish,
  Milk,
  Wheat,
  UtensilsCrossed,
  // activity / wellbeing
  Dumbbell,
  Bike,
  Footprints,
  Heart,
  Zap,
  Moon,
  // time / calendar
  Calendar,
  CalendarDays,
  Clock,
  // documents
  Copy,
  FileCheck2,
  StickyNote,
  Paperclip,
  Pencil,
  // security
  Shield,
  ShieldCheck,
  ShieldAlert,
  // misc
  Armchair,
  CreditCard,
  Crown,
  Flag,
  Image,
  ImageIcon,
  Info,
  Minus,
  MinusCircle,
  RefreshCw,
  RotateCcw,
  Undo2,
  Upload,
  UserCircle,
} from "./glyphs-extra"
