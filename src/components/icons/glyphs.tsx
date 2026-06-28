import { createIcon, Body } from "./core"

// ============================================================
// Salus duotone-organic glyph set.
// Outline in currentColor over a faint currentColor body, so each
// icon "fills in" wherever the text color goes solid. Botanical
// motifs (leaf, seed, sprout, bloom) replace the stock line set.
// ============================================================

/* ----------------------- Navigation / brand ---------------------- */

// Home — a hearth with a sprout poking from the roof.
export const Home = createIcon("Home", () => (
  <>
    <Body d="M5.5 10.8 12 5.4 18.5 10.8V18.5A1.5 1.5 0 0 1 17 20H7a1.5 1.5 0 0 1-1.5-1.5Z" />
    <path d="M3.6 11.4 12 4.6l8.4 6.8" />
    <path d="M5.6 10v8.5A1.5 1.5 0 0 0 7.1 20H17a1.5 1.5 0 0 0 1.5-1.5V10" />
    <path d="M10.4 20v-3.1a1.6 1.6 0 0 1 3.2 0V20" />
    <path d="M12 6.4c.2-1.6 1.5-2.6 3.1-2.5.1 1.6-1.2 2.7-2.8 2.7" />
  </>
))

// LayoutDashboard — panels, one drawn as a planted bed.
export const LayoutDashboard = createIcon("LayoutDashboard", () => (
  <>
    <Body d="M4 4.5h6v9H4zM13 4.5h7v4h-7zM13 11h7v8.5h-7z" />
    <rect x="3.8" y="4" width="6.4" height="9.4" rx="1.4" />
    <rect x="13" y="4" width="7.2" height="4.6" rx="1.4" />
    <rect x="13" y="11" width="7.2" height="9" rx="1.4" />
    <rect x="3.8" y="15.4" width="6.4" height="4.6" rx="1.4" />
  </>
))

// Bot — a friendly seed-companion with a leaf antenna.
export const Bot = createIcon("Bot", () => (
  <>
    <Body d="M5.5 12.5a5.5 5.5 0 0 1 5.5-5.5h2a5.5 5.5 0 0 1 5.5 5.5v2.5A4 4 0 0 1 14.5 19h-5A4 4 0 0 1 5.5 15Z" />
    <path d="M5.5 13.5a5.5 5.5 0 0 1 5.5-5.5h2a5.5 5.5 0 0 1 5.5 5.5v1.5A4 4 0 0 1 14.5 19h-5A4 4 0 0 1 5.5 15Z" />
    <path d="M12 8V5.4" />
    <path d="M12 5.4c.2-1.6 1.5-2.6 3.1-2.5.1 1.6-1.2 2.7-2.8 2.7" />
    <path d="M9.7 13h0M14.3 13h0" />
    <path d="M10.2 16.2c1 .8 2.6.8 3.6 0" />
  </>
))

// Camera — the plate-lens: capture what's on your plate.
export const Camera = createIcon("Camera", () => (
  <>
    <Body d="M4 9.5h3l1.2-2h7.6l1.2 2H20a1.5 1.5 0 0 1 1.5 1.5v7.5A1.5 1.5 0 0 1 20 20H4a1.5 1.5 0 0 1-1.5-1.5V11A1.5 1.5 0 0 1 4 9.5Z" />
    <path d="M3 11a1.5 1.5 0 0 1 1.5-1.5H7l1.2-2h7.6l1.2 2h2.5A1.5 1.5 0 0 1 21 11v7a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18Z" />
    <circle cx="12" cy="14" r="3.2" />
    <path d="M16.6 7.4c.2-1.2 1.2-1.9 2.4-1.7.1 1.2-.9 2-2.1 2" />
  </>
))

// Sparkles — insights as a sprouting spark.
export const Sparkles = createIcon("Sparkles", () => (
  <>
    <Body d="M10 5c.4 3.2 1.8 4.6 5 5-3.2.4-4.6 1.8-5 5-.4-3.2-1.8-4.6-5-5 3.2-.4 4.6-1.8 5-5Z" />
    <path d="M10 4.5c.4 3.4 1.9 4.9 5.3 5.3-3.4.4-4.9 1.9-5.3 5.3-.4-3.4-1.9-4.9-5.3-5.3 3.4-.4 4.9-1.9 5.3-5.3Z" />
    <path d="M17 14c.2 1.6.9 2.3 2.5 2.5-1.6.2-2.3.9-2.5 2.5-.2-1.6-.9-2.3-2.5-2.5 1.6-.2 2.3-.9 2.5-2.5Z" />
  </>
))

// BarChart3 — progress as growing stems, one topped with a leaf.
export const BarChart3 = createIcon("BarChart3", () => (
  <>
    <Body d="M5 20v-4a1.5 1.5 0 0 1 3 0v4ZM10.5 20v-9a1.5 1.5 0 0 1 3 0v9ZM16 20v-6a1.5 1.5 0 0 1 3 0v6Z" />
    <path d="M5 20v-4.5a1.5 1.5 0 0 1 3 0V20" />
    <path d="M10.5 20v-9a1.5 1.5 0 0 1 3 0v9" />
    <path d="M16 20v-6.5a1.5 1.5 0 0 1 3 0V20" />
    <path d="M3.5 20h17" />
    <path d="M12 11c.2-1.5 1.4-2.4 3-2.3.1 1.5-1.1 2.5-2.6 2.5" />
  </>
))

// User — head and shoulders, softened.
export const User = createIcon("User", () => (
  <>
    <Body d="M12 5.5a3.3 3.3 0 1 1 0 6.6 3.3 3.3 0 0 1 0-6.6ZM5.7 19.5a6.4 6.4 0 0 1 12.6 0Z" />
    <circle cx="12" cy="8.8" r="3.3" />
    <path d="M5.7 19.5a6.4 6.4 0 0 1 12.6 0" />
  </>
))

// Users — two of the above, overlapped.
export const Users = createIcon("Users", () => (
  <>
    <Body d="M9 5.5a3 3 0 1 1 0 6 3 3 0 0 1 0-6ZM3.5 19a5.7 5.7 0 0 1 11 0Z" />
    <circle cx="9" cy="8.4" r="3" />
    <path d="M3.5 19a5.7 5.7 0 0 1 11 0" />
    <path d="M15.5 5.7a3 3 0 0 1 0 5.6" />
    <path d="M16.5 14.4a5.7 5.7 0 0 1 4 4.6" />
  </>
))

// Settings — a six-petal bloom-cog.
export const Settings = createIcon("Settings", () => (
  <>
    <Body d="M12 9.2a2.8 2.8 0 1 1 0 5.6 2.8 2.8 0 0 1 0-5.6Z" />
    <g>
      <path d="M12 12c-1.5-2.6-1.5-5.6 0-8.2 1.5 2.6 1.5 5.6 0 8.2Z" />
      <path d="M12 12c-1.5-2.6-1.5-5.6 0-8.2 1.5 2.6 1.5 5.6 0 8.2Z" transform="rotate(60 12 12)" />
      <path d="M12 12c-1.5-2.6-1.5-5.6 0-8.2 1.5 2.6 1.5 5.6 0 8.2Z" transform="rotate(120 12 12)" />
      <path d="M12 12c-1.5-2.6-1.5-5.6 0-8.2 1.5 2.6 1.5 5.6 0 8.2Z" transform="rotate(180 12 12)" />
      <path d="M12 12c-1.5-2.6-1.5-5.6 0-8.2 1.5 2.6 1.5 5.6 0 8.2Z" transform="rotate(240 12 12)" />
      <path d="M12 12c-1.5-2.6-1.5-5.6 0-8.2 1.5 2.6 1.5 5.6 0 8.2Z" transform="rotate(300 12 12)" />
    </g>
    <circle cx="12" cy="12" r="2.6" />
  </>
))

/* --------------------------- Domain ----------------------------- */

export const Apple = createIcon("Apple", () => (
  <>
    <Body d="M12 9c-1.5-2.1-4.3-2.5-6-1-2 1.7-1.5 6.2.6 9.4 1 1.5 2.6 2.9 3.8 2.2 1.2.7 2.8-.7 3.8-2.2 2.1-3.2 2.6-7.7.6-9.4-1.7-1.5-4.5-1.1-6 1Z" />
    <path d="M12 9c-1.5-2.1-4.3-2.5-6-1-2 1.7-1.5 6.2.6 9.4 1 1.5 2.6 2.9 3.8 2.2 1.2.7 2.8-.7 3.8-2.2 2.1-3.2 2.6-7.7.6-9.4-1.7-1.5-4.5-1.1-6 1Z" />
    <path d="M12 9V6" />
    <path d="M12 6.4c.2-1.6 1.5-2.6 3.1-2.5.1 1.6-1.2 2.7-2.8 2.7" />
  </>
))

export const Leaf = createIcon("Leaf", () => (
  <>
    <Body d="M5 19c0-8 6-14 14-14 0 8-6 14-14 14Z" />
    <path d="M5 19C5 11 11 5 19 5c0 8-6 14-14 14Z" />
    <path d="M5 19c4-4 8-8 12-12" />
  </>
))

export const Droplet = createIcon("Droplet", () => (
  <>
    <Body d="M12 3.5S6 10 6 14a6 6 0 0 0 12 0c0-4-6-10.5-6-10.5Z" />
    <path d="M12 3.5S6 10 6 14a6 6 0 0 0 12 0c0-4-6-10.5-6-10.5Z" />
    <path d="M9.4 14.6a2.6 2.6 0 0 0 2.1 2.3" />
  </>
))

export const Flame = createIcon("Flame", () => (
  <>
    <Body d="M12 3c-3 4-5 6-5 10a5 5 0 0 0 10 0c0-2-1-3.4-1.5-4.5-1 1.5-2 2-2.5 2.5.5-3-1-6-1-8Z" />
    <path d="M12 3c-3 4-5 6-5 10a5 5 0 0 0 10 0c0-3.5-2.5-5-3-7.5-.6 1.8-1.6 2.7-2.5 3.5C11 6.7 11.5 5 12 3Z" />
    <path d="M9.6 14.6a2.6 2.6 0 0 0 5 .4" />
  </>
))

export const Utensils = createIcon("Utensils", () => (
  <>
    <Body d="M7 3v6a2 2 0 0 0 4 0V3ZM15.5 3c1.8 1.8 1.8 6.5 0 9.5H16V21" opacity={0.12} />
    <path d="M7 3v5.5a2 2 0 0 0 4 0V3" />
    <path d="M9 8.5V21" />
    <path d="M16 3c1.9 1.8 1.9 7-.5 10H16V21" />
  </>
))

export const Scale = createIcon("Scale", () => (
  <>
    <Body d="M5.5 4.5h13a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1v-13a1 1 0 0 1 1-1Z" />
    <rect x="4.5" y="4.5" width="15" height="15" rx="2.5" />
    <path d="M9 16a3 3 0 0 1 6 0" />
    <path d="M12 16 13.6 9" />
  </>
))

export const Beaker = createIcon("Beaker", () => (
  <>
    <Body d="M8 14.5h8V19a1.5 1.5 0 0 1-1.5 1.5h-5A1.5 1.5 0 0 1 8 19Z" />
    <path d="M7.5 4h9" />
    <path d="M8.5 4v15a1.5 1.5 0 0 0 1.5 1.5h4a1.5 1.5 0 0 0 1.5-1.5V4" />
    <path d="M8.5 14.5h7" />
  </>
))

export const FlaskConical = createIcon("FlaskConical", () => (
  <>
    <Body d="M8 13.5h8l2.6 4.4a1.6 1.6 0 0 1-1.4 2.6H6.8a1.6 1.6 0 0 1-1.4-2.6Z" />
    <path d="M9.5 4v6L4.7 18a1.6 1.6 0 0 0 1.4 2.5h11.8a1.6 1.6 0 0 0 1.4-2.5L14.5 10V4" />
    <path d="M8.5 4h7" />
    <path d="M7.2 14h9.6" />
  </>
))

export const Target = createIcon("Target", () => (
  <>
    <Body d="M12 9.4a2.6 2.6 0 1 1 0 5.2 2.6 2.6 0 0 1 0-5.2Z" />
    <circle cx="12" cy="12" r="8.2" />
    <circle cx="12" cy="12" r="4.6" />
    <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
  </>
))

export const ShoppingCart = createIcon("ShoppingCart", () => (
  <>
    <Body d="M7.6 7h12l-1.7 7.5a1.5 1.5 0 0 1-1.5 1.2H9.4a1.5 1.5 0 0 1-1.5-1.2Z" />
    <path d="M3 4h1.8a1 1 0 0 1 1 .8L8 15.7a1.5 1.5 0 0 0 1.5 1.2h7a1.5 1.5 0 0 0 1.5-1.2L20.5 8H6.2" />
    <circle cx="10" cy="20" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="17" cy="20" r="1.3" fill="currentColor" stroke="none" />
  </>
))

export const Store = createIcon("Store", () => (
  <>
    <Body d="M4.5 9.5h15V19a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1Z" />
    <path d="M4 9.5 5.6 4.5h12.8L20 9.5a2.5 2.5 0 0 1-5 0 2.5 2.5 0 0 1-3 0 2.5 2.5 0 0 1-3 0 2.5 2.5 0 0 1-5 0Z" />
    <path d="M5.5 11v8a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-8" />
    <path d="M10 20v-4.5h4V20" />
  </>
))

export const BookOpen = createIcon("BookOpen", () => (
  <>
    <Body d="M12 6.2C10 4.7 6.6 4.4 4 5.3V18c2.6-.9 6 .6 8 1.8Z" />
    <path d="M12 6.2C10 4.7 6.5 4.4 4 5.3v12.6c2.5-.9 6-.6 8 1.1 2-1.7 5.5-2 8-1.1V5.3c-2.5-.9-6-.6-8 .9Z" />
    <path d="M12 6.2v13" />
  </>
))

export const Lightbulb = createIcon("Lightbulb", () => (
  <>
    <Body d="M12 3.5a6 6 0 0 1 4 10.4c-1 .9-1.5 1.8-1.5 3.1h-5c0-1.3-.5-2.2-1.5-3.1A6 6 0 0 1 12 3.5Z" />
    <path d="M9.5 17c0-1.4-.5-2.3-1.5-3.2a6 6 0 1 1 8 0c-1 .9-1.5 1.8-1.5 3.2" />
    <path d="M9.5 17.5h5" />
    <path d="M10.5 20h3" />
    <path d="M12 13c-.2-1.2.4-2 1.4-2.6" />
  </>
))

export const IdCard = createIcon("IdCard", () => (
  <>
    <Body d="M4 5.5h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1Z" />
    <rect x="3" y="5.5" width="18" height="13" rx="2" />
    <circle cx="8.5" cy="11" r="2.1" />
    <path d="M5.5 16a3 3 0 0 1 6 0" />
    <path d="M14.5 10h4M14.5 13h4" />
  </>
))

export const Stethoscope = createIcon("Stethoscope", () => (
  <>
    <Body d="M16.5 14a2.4 2.4 0 1 1 0 4.8 2.4 2.4 0 0 1 0-4.8Z" opacity={0.14} />
    <path d="M5 4v4.5a4 4 0 0 0 8 0V4" />
    <path d="M5 4H3.5M13 4h-1.5" />
    <path d="M9 12.5v2a4 4 0 0 0 7.5 1.9" />
    <circle cx="16.8" cy="16.4" r="2.4" />
  </>
))

export const Activity = createIcon("Activity", () => (
  <path d="M3 12.5h3.5l2-6 3.5 11 2.5-7 1.5 2H21" />
))

/* --------------------------- Comms ------------------------------ */

export const MessageCircle = createIcon("MessageCircle", () => (
  <>
    <Body d="M4.5 12a7.5 7.5 0 1 1 3.4 6.3L4 19.5l1.1-3.6A7.4 7.4 0 0 1 4.5 12Z" />
    <path d="M20 12a8 8 0 1 1-3.6-6.7" />
    <path d="M20 5.5 8 17.5l-3.8 1.2L5.3 15" opacity={0} />
    <path d="M4 19.5l1.2-3.7A7.5 7.5 0 1 1 7.9 18.4Z" />
    <path d="M9 11.8h.01M12 11.8h.01M15 11.8h.01" />
  </>
))

export const Send = createIcon("Send", () => (
  <>
    <Body d="M20.5 4 3.6 11.2l6.5 2 2 6.5Z" />
    <path d="M20.8 3.7 3.4 11.1a.6.6 0 0 0 .05 1.1l6.3 2 2 6.3a.6.6 0 0 0 1.1.05Z" />
    <path d="M20.8 3.7 10 13.5" />
  </>
))

export const Mail = createIcon("Mail", () => (
  <>
    <Body d="M4 5.5h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1Z" />
    <rect x="3" y="5.5" width="18" height="13" rx="2" />
    <path d="M3.5 7 12 13l8.5-6" />
  </>
))

export const Phone = createIcon("Phone", () => (
  <>
    <Body d="M6 3.5h2.4l1.4 4-1.8 1.4a11 11 0 0 0 5.1 5.1l1.4-1.8 4 1.4V19A1.6 1.6 0 0 1 16.9 20.6 14.6 14.6 0 0 1 3.4 7.1 1.6 1.6 0 0 1 5 5.5Z" opacity={0.13} />
    <path d="M6.2 4h2a1 1 0 0 1 1 .8l.7 3a1 1 0 0 1-.3 1L8.2 10a11 11 0 0 0 5.8 5.8l1.2-1.4a1 1 0 0 1 1-.3l3 .7a1 1 0 0 1 .8 1v2a1.6 1.6 0 0 1-1.7 1.6A14.6 14.6 0 0 1 4.6 5.7 1.6 1.6 0 0 1 6.2 4Z" />
  </>
))

export const Smartphone = createIcon("Smartphone", () => (
  <>
    <Body d="M7.5 3.5h9a1.5 1.5 0 0 1 1.5 1.5v14a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19V5a1.5 1.5 0 0 1 1.5-1.5Z" />
    <rect x="6" y="3.5" width="12" height="17" rx="2.4" />
    <path d="M10.5 17.5h3" />
  </>
))

export const Globe = createIcon("Globe", () => (
  <>
    <Body d="M12 4a8 8 0 1 1 0 16 8 8 0 0 1 0-16Z" />
    <circle cx="12" cy="12" r="8" />
    <path d="M4 12h16" />
    <path d="M12 4c2.4 2.2 3.6 4.9 3.6 8s-1.2 5.8-3.6 8c-2.4-2.2-3.6-4.9-3.6-8S9.6 6.2 12 4Z" />
  </>
))

/* ----------------------- Status / trend ------------------------- */

export const TrendingUp = createIcon("TrendingUp", () => (
  <>
    <Body d="M3.5 16.5 9.5 10.5 13 14 20.5 6.5V18.5a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1Z" opacity={0.12} />
    <path d="M3.5 16.5 9.5 10.5 13 14l7-7" />
    <path d="M16.5 7h3.5v3.5" />
  </>
))

export const TrendingDown = createIcon("TrendingDown", () => (
  <>
    <Body d="M3.5 7.5 9.5 13.5 13 10l7 7V7.5" opacity={0.12} />
    <path d="M3.5 7.5 9.5 13.5 13 10l7 7" />
    <path d="M16.5 17h3.5v-3.5" />
  </>
))

export const Star = createIcon("Star", () => (
  <>
    <Body d="M12 4.2l2.3 4.7 5.2.8-3.7 3.6.9 5.1L12 16l-4.6 2.4.9-5.1L4.5 9.7l5.2-.8Z" />
    <path d="M12 4.2l2.3 4.7 5.2.8-3.7 3.6.9 5.1L12 16l-4.6 2.4.9-5.1L4.5 9.7l5.2-.8Z" />
  </>
))

export const History = createIcon("History", () => (
  <>
    <Body d="M12 4.5a7.5 7.5 0 1 1-7.1 5h0Z" opacity={0.12} />
    <path d="M4.5 8A7.5 7.5 0 1 1 4 12" />
    <path d="M4.5 4.5V8H8" />
    <path d="M12 8.5V12l2.6 1.6" />
  </>
))

export const CheckCircle = createIcon("CheckCircle", () => (
  <>
    <Body d="M12 4a8 8 0 1 1 0 16 8 8 0 0 1 0-16Z" />
    <circle cx="12" cy="12" r="8" />
    <path d="M8.4 12.2 11 14.7l4.6-5" />
  </>
))
export const CheckCircle2 = CheckCircle

export const AlertCircle = createIcon("AlertCircle", () => (
  <>
    <Body d="M12 4a8 8 0 1 1 0 16 8 8 0 0 1 0-16Z" />
    <circle cx="12" cy="12" r="8" />
    <path d="M12 8v4.5" />
    <path d="M12 15.8h.01" />
  </>
))

export const AlertTriangle = createIcon("AlertTriangle", () => (
  <>
    <Body d="M10.3 4.7 3 17.5A1.8 1.8 0 0 0 4.6 20.2h14.8A1.8 1.8 0 0 0 21 17.5L13.7 4.7a2 2 0 0 0-3.4 0Z" />
    <path d="M10.3 4.7 3 17.5A1.8 1.8 0 0 0 4.6 20.2h14.8A1.8 1.8 0 0 0 21 17.5L13.7 4.7a2 2 0 0 0-3.4 0Z" />
    <path d="M12 9.5v3.5" />
    <path d="M12 16.3h.01" />
  </>
))

export const HelpCircle = createIcon("HelpCircle", () => (
  <>
    <Body d="M12 4a8 8 0 1 1 0 16 8 8 0 0 1 0-16Z" />
    <circle cx="12" cy="12" r="8" />
    <path d="M9.7 9.4a2.4 2.4 0 0 1 4.6.8c0 1.6-2.3 2-2.3 3.6" />
    <path d="M12 16.4h.01" />
  </>
))

export const Circle = createIcon("Circle", () => (
  <>
    <Body d="M12 4a8 8 0 1 1 0 16 8 8 0 0 1 0-16Z" opacity={0.1} />
    <circle cx="12" cy="12" r="8" />
  </>
))

export const Check = createIcon("Check", () => <path d="M5 12.5 10 17.5 19 6.5" />)

export const X = createIcon("X", () => (
  <>
    <path d="M6 6 18 18" />
    <path d="M18 6 6 18" />
  </>
))

export const Plus = createIcon("Plus", () => (
  <>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </>
))

/* ----------------------- Auth / security ------------------------ */

export const Lock = createIcon("Lock", () => (
  <>
    <Body d="M5.5 11h13a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1Z" />
    <rect x="4.5" y="11" width="15" height="9" rx="2" />
    <path d="M7.5 11V8a4.5 4.5 0 0 1 9 0v3" />
    <circle cx="12" cy="15.2" r="1.3" fill="currentColor" stroke="none" />
  </>
))

export const KeyRound = createIcon("KeyRound", () => (
  <>
    <Body d="M8.5 4.5a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z" opacity={0.13} />
    <path d="M12.2 11.8 20 19.6M16 15.6l-2 2M18 13.6l-2 2" />
    <circle cx="8.5" cy="9.5" r="5" />
    <circle cx="8.5" cy="9.5" r="1.4" fill="currentColor" stroke="none" />
  </>
))

export const Eye = createIcon("Eye", () => (
  <>
    <Body d="M12 7c4.4 0 7.8 2.7 9 5-1.2 2.3-4.6 5-9 5s-7.8-2.7-9-5c1.2-2.3 4.6-5 9-5Z" opacity={0.12} />
    <path d="M2.5 12C4 9.2 7.6 7 12 7s8 2.2 9.5 5C20 14.8 16.4 17 12 17S4 14.8 2.5 12Z" />
    <circle cx="12" cy="12" r="2.8" />
  </>
))

export const EyeOff = createIcon("EyeOff", () => (
  <>
    <path d="M9.6 6.6A9.6 9.6 0 0 1 12 6.4c4.4 0 8 2.7 9.5 5.5a13 13 0 0 1-2.5 3" />
    <path d="M6.5 8C4.6 9 3.2 10.5 2.5 11.9 4 14.7 7.6 17.4 12 17.4a9.8 9.8 0 0 0 3.4-.6" />
    <path d="M9.8 9.9a2.8 2.8 0 0 0 3.9 4" />
    <path d="M4 4 20 20" />
  </>
))

export const Unlink = createIcon("Unlink", () => (
  <>
    <path d="M8.5 11.5 6.8 13.2a3.3 3.3 0 0 0 4.7 4.7l1.7-1.7" />
    <path d="M15.5 12.5l1.7-1.7a3.3 3.3 0 0 0-4.7-4.7l-1.7 1.7" />
    <path d="M16.5 4.5V7M19.5 7.5H17M4.5 16.5V19M7.5 19.5H5" />
  </>
))

export const LogOut = createIcon("LogOut", () => (
  <>
    <Body d="M5 4.5h6v15H5a1 1 0 0 1-1-1v-13a1 1 0 0 1 1-1Z" opacity={0.12} />
    <path d="M11 4.5H5a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h6" />
    <path d="M15.5 8 19.5 12l-4 4" />
    <path d="M19.5 12H9.5" />
  </>
))

/* --------------------------- Actions ---------------------------- */

export const Save = createIcon("Save", () => (
  <>
    <Body d="M5 4.5h11l3.5 3.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5.5a1 1 0 0 1 1-1Z" />
    <path d="M5 4.5h10.5L19.5 8.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5.5a1 1 0 0 1 1-1Z" />
    <path d="M8 4.5v4.5h6.5V4.5" />
    <rect x="8" y="13" width="8" height="6.5" rx="1" />
  </>
))

export const Trash2 = createIcon("Trash2", () => (
  <>
    <Body d="M6 7.5h12l-1 11.5a1.5 1.5 0 0 1-1.5 1.4H8.5A1.5 1.5 0 0 1 7 19Z" />
    <path d="M4 7h16" />
    <path d="M9 7V5.4A1.4 1.4 0 0 1 10.4 4h3.2A1.4 1.4 0 0 1 15 5.4V7" />
    <path d="M6.5 7.5 7.5 19a1.5 1.5 0 0 0 1.5 1.4h6a1.5 1.5 0 0 0 1.5-1.4L17.5 7.5" />
    <path d="M10 11v6M14 11v6" />
  </>
))

export const Download = createIcon("Download", () => (
  <>
    <Body d="M4.5 15h15v3.5a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1Z" opacity={0.12} />
    <path d="M12 4v10" />
    <path d="M8 10.5 12 14.5l4-4" />
    <path d="M4.5 15.5v2.5a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1v-2.5" />
  </>
))

export const FileText = createIcon("FileText", () => (
  <>
    <Body d="M6.5 3.5h7L19 9v10.5a1 1 0 0 1-1 1H6.5a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" />
    <path d="M13.5 3.5H6.5a1 1 0 0 0-1 1v15a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V9Z" />
    <path d="M13.5 3.5V9H19" />
    <path d="M8.5 13h7M8.5 16.2h7M8.5 9.8h2.5" />
  </>
))

/* ---------------------- Notify / AI ----------------------------- */

export const Bell = createIcon("Bell", () => (
  <>
    <Body d="M6 16.5c1-1 1.5-2.2 1.5-3.7V11a4.5 4.5 0 0 1 9 0v1.8c0 1.5.5 2.7 1.5 3.7Z" />
    <path d="M6 16.5c1-1 1.5-2.2 1.5-3.8V11a4.5 4.5 0 0 1 9 0v1.7c0 1.6.5 2.8 1.5 3.8Z" />
    <path d="M10 19a2 2 0 0 0 4 0" />
  </>
))

export const Wand2 = createIcon("Wand2", () => (
  <>
    <Body d="M14.5 6.5 17.5 9.5 9 18l-3-3Z" opacity={0.14} />
    <path d="M5 19 16.5 7.5a1.3 1.3 0 0 0 0-1.8l-.2-.2a1.3 1.3 0 0 0-1.8 0L3 17a1.3 1.3 0 0 0 0 1.8l.2.2a1.3 1.3 0 0 0 1.8 0Z" />
    <path d="M13.5 6.5 17.5 10.5" />
    <path d="M18 3.5l.5 1.5 1.5.5-1.5.5L18 7.5l-.5-1.5L16 5.5l1.5-.5ZM6 3l.4 1.1 1.1.4-1.1.4L6 6l-.4-1.1L4.5 4.5l1.1-.4Z" />
  </>
))

/* ------------------------- Directional -------------------------- */

export const ChevronDown = createIcon("ChevronDown", () => <path d="M6 9.5 12 15.5 18 9.5" />)
export const ChevronUp = createIcon("ChevronUp", () => <path d="M6 14.5 12 8.5 18 14.5" />)
export const ChevronRight = createIcon("ChevronRight", () => <path d="M9.5 6 15.5 12 9.5 18" />)
export const ArrowRight = createIcon("ArrowRight", () => (
  <>
    <path d="M4 12h15" />
    <path d="M13 6 19 12 13 18" />
  </>
))
export const ArrowLeft = createIcon("ArrowLeft", () => (
  <>
    <path d="M20 12H5" />
    <path d="M11 6 5 12 11 18" />
  </>
))

export const Loader2 = createIcon("Loader2", () => (
  <path d="M12 4a8 8 0 1 1-7.4 5" strokeWidth={2} />
))

// Search — a magnifier whose lens reads as a seed, with a leaf vein.
export const Search = createIcon("Search", () => (
  <>
    <Body d="M10.5 4.5a6 6 0 1 1 0 12 6 6 0 0 1 0-12Z" />
    <circle cx="10.5" cy="10.5" r="6" />
    <path d="M14.9 14.9 20 20" />
    <path d="M8 12.5c.4-2.2 1.8-3.6 4-4" />
  </>
))
