import { createIcon, Body } from "./core"

// ============================================================
// Salus duotone-organic glyphs — extended set.
// Same language as glyphs.tsx: outline over a faint currentColor body.
// Covers the food/activity/utility vocabulary the app reaches for.
// ============================================================

/* --------------------------- Food ------------------------------- */

export const Egg = createIcon("Egg", () => (
  <>
    <Body d="M12 3.5c3.4 0 6 5.2 6 9.3a6 6 0 0 1-12 0c0-4.1 2.6-9.3 6-9.3Z" />
    <path d="M12 3.5c3.4 0 6 5.2 6 9.3a6 6 0 0 1-12 0c0-4.1 2.6-9.3 6-9.3Z" />
    <path d="M9.5 13.5a2.6 2.6 0 0 0 2.2 2.4" />
  </>
))

export const Fish = createIcon("Fish", () => (
  <>
    <Body d="M3 12c2.6-3.4 6-5 9.5-5 3 0 5.3 1.3 6.9 3.4-1.6 2.1-3.9 3.4-6.9 3.4-3.5 0-6.9-1.6-9.5-1.8Z" opacity={0.13} />
    <path d="M3 12c3-4 7-5.5 10.5-5.5C17 6.5 19.5 8 21 12c-1.5 4-4 5.5-7.5 5.5C10 17.5 6 16 3 12Z" />
    <path d="M3 12c-.2 1.8.2 3.4 1 4.8C5.4 16 6.4 14.4 6.6 12 6.4 9.6 5.4 8 4 7.2 3.2 8.6 2.8 10.2 3 12Z" />
    <path d="M16.5 11h.01" />
  </>
))

export const Milk = createIcon("Milk", () => (
  <>
    <Body d="M8 8.5h8V20a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1Z" />
    <path d="M8 3.5h8v2.2L18 8.5V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V8.5L8 5.7Z" />
    <path d="M8 3.5h8M6 8.5h12" />
    <path d="M9.5 13.5h5v3.5h-5z" />
  </>
))

export const Wheat = createIcon("Wheat", () => (
  <>
    <path d="M12 21V9" />
    <path d="M12 9c0-2 1.4-3.4 3.4-3.4C15.4 7.6 14 9 12 9ZM12 9c0-2-1.4-3.4-3.4-3.4C8.6 7.6 10 9 12 9Z" />
    <Body d="M12 13c0-1.8 1.3-3 3.1-3 0 1.8-1.3 3-3.1 3ZM12 13c0-1.8-1.3-3-3.1-3 0 1.8 1.3 3 3.1 3Z" />
    <path d="M12 13c0-1.8 1.3-3 3.1-3 0 1.8-1.3 3-3.1 3ZM12 13c0-1.8-1.3-3-3.1-3 0 1.8 1.3 3 3.1 3Z" />
    <path d="M12 17c0-1.8 1.3-3 3.1-3 0 1.8-1.3 3-3.1 3ZM12 17c0-1.8-1.3-3-3.1-3 0 1.8 1.3 3 3.1 3Z" />
  </>
))

export const UtensilsCrossed = createIcon("UtensilsCrossed", () => (
  <>
    <path d="M5 3l8 8M16.5 3c-1.6 1.6-2.4 3.7-1.4 5.6L5.5 18.1" />
    <path d="M19 21 9.5 11.5M16.5 8.6 19 11" />
    <path d="M5 3c-1.5 1.5-1.5 4 0 5.5L7.5 6" />
  </>
))

/* ------------------------- Activity ----------------------------- */

export const Dumbbell = createIcon("Dumbbell", () => (
  <>
    <Body d="M3.5 9.5h2v5h-2zM18.5 9.5h2v5h-2z" />
    <path d="M3 9v6M5.5 8v8M18.5 8v8M21 9v6" />
    <path d="M5.5 12h13" />
  </>
))

export const Bike = createIcon("Bike", () => (
  <>
    <Body d="M5.5 13.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7ZM18.5 13.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Z" opacity={0.12} />
    <circle cx="5.5" cy="17" r="3.3" />
    <circle cx="18.5" cy="17" r="3.3" />
    <path d="M5.5 17 10 8h5l3.5 9" />
    <path d="M10 8H8M14 8h2.5l1 2.5" />
  </>
))

export const Footprints = createIcon("Footprints", () => (
  <>
    <Body d="M5 4.5c1.4 0 2.2 1.4 2.2 3.4S6.4 12 5 12 2.8 9.9 2.8 7.9 3.6 4.5 5 4.5ZM19 9.5c1.4 0 2.2 1.4 2.2 3.4s-.8 4.1-2.2 4.1-2.2-2.1-2.2-4.1.8-3.4 2.2-3.4Z" opacity={0.12} />
    <path d="M5 4.5c1.4 0 2.2 1.5 2.2 3.5S6.4 12 5 12s-2.2-2-2.2-4S3.6 4.5 5 4.5Z" />
    <path d="M2.9 14.5c.5-.8 3.6-.8 4.1 0 .4.7-.2 2.5-.2 3.5 0 .9-.7 1.5-1.8 1.5S3 18.9 3 18c0-1-.5-2.7-.1-3.5Z" />
    <path d="M19 9.5c1.4 0 2.2 1.5 2.2 3.5s-.8 4-2.2 4-2.2-2-2.2-4 .8-3.5 2.2-3.5Z" />
    <path d="M16.9 19.5c.5-.8 3.6-.8 4.1 0 .4.7-.2 2.5-.2 3.5" opacity={0} />
  </>
))

export const Heart = createIcon("Heart", () => (
  <>
    <Body d="M12 20S4 15 4 9.2A4.2 4.2 0 0 1 12 7a4.2 4.2 0 0 1 8 2.2C20 15 12 20 12 20Z" />
    <path d="M12 20S4 15 4 9.2A4.2 4.2 0 0 1 12 7a4.2 4.2 0 0 1 8 2.2C20 15 12 20 12 20Z" />
  </>
))

export const Zap = createIcon("Zap", () => (
  <>
    <Body d="M13 2 5 13h5l-1 9 8-11h-5Z" />
    <path d="M13 2 5 13h5l-1 9 8-11h-5Z" />
  </>
))

export const Moon = createIcon("Moon", () => (
  <>
    <Body d="M19 14.5A7.5 7.5 0 0 1 9.5 5 7.5 7.5 0 1 0 19 14.5Z" />
    <path d="M19 14.5A7.5 7.5 0 0 1 9.5 5 7.5 7.5 0 1 0 19 14.5Z" />
  </>
))

/* ---------------------- Time / calendar ------------------------- */

export const Calendar = createIcon("Calendar", () => (
  <>
    <Body d="M4.5 7.5h15V19a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 19Z" />
    <rect x="4" y="5.5" width="16" height="15" rx="2" />
    <path d="M4 9.5h16M8 3.5v3M16 3.5v3" />
  </>
))

export const CalendarDays = createIcon("CalendarDays", () => (
  <>
    <Body d="M4.5 7.5h15V19a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 19Z" />
    <rect x="4" y="5.5" width="16" height="15" rx="2" />
    <path d="M4 9.5h16M8 3.5v3M16 3.5v3" />
    <path d="M8 13h.01M12 13h.01M16 13h.01M8 16.5h.01M12 16.5h.01" />
  </>
))

export const Clock = createIcon("Clock", () => (
  <>
    <Body d="M12 4a8 8 0 1 1 0 16 8 8 0 0 1 0-16Z" />
    <circle cx="12" cy="12" r="8" />
    <path d="M12 7.5V12l3 2" />
  </>
))

/* ------------------------- Documents ---------------------------- */

export const Copy = createIcon("Copy", () => (
  <>
    <Body d="M8 8h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" />
    <rect x="7.5" y="7.5" width="12" height="12" rx="2" />
    <path d="M4.5 14.5A1 1 0 0 1 3.5 13.5v-9a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1" />
  </>
))

export const FileCheck2 = createIcon("FileCheck2", () => (
  <>
    <Body d="M6.5 3.5h7L19 9v5h-5a1 1 0 0 0-1 1v5.5H6.5a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" />
    <path d="M13.5 3.5H6.5a1 1 0 0 0-1 1v15a1 1 0 0 0 1 1H12" />
    <path d="M13.5 3.5V9H19" />
    <path d="M14.5 17.5 16.5 19.5 20.5 15" />
  </>
))

export const StickyNote = createIcon("StickyNote", () => (
  <>
    <Body d="M5 4.5h14a.5.5 0 0 1 .5.5v9L14 19.5H5a.5.5 0 0 1-.5-.5V5a.5.5 0 0 1 .5-.5Z" />
    <path d="M19.5 14 14 19.5V15a1 1 0 0 1 1-1Z" />
    <path d="M5 4.5h14a.5.5 0 0 1 .5.5v9L14 19.5H5a.5.5 0 0 1-.5-.5V5a.5.5 0 0 1 .5-.5Z" />
    <path d="M8 9h8M8 12.5h5" />
  </>
))

export const Paperclip = createIcon("Paperclip", () => (
  <path d="M19 11.5 12 18.5a4 4 0 0 1-5.7-5.7l7.4-7.4a2.6 2.6 0 0 1 3.7 3.7l-7.3 7.3a1.3 1.3 0 0 1-1.9-1.9l6.6-6.6" />
))

export const Pencil = createIcon("Pencil", () => (
  <>
    <Body d="M14.5 5.5 18.5 9.5 9 19l-4 1 1-4Z" opacity={0.14} />
    <path d="M14.5 5.5 18.5 9.5 9 19l-4.5 1.2L6 15.5Z" />
    <path d="M13 7 17 11" />
  </>
))

/* ------------------------- Security ----------------------------- */

export const Shield = createIcon("Shield", () => (
  <>
    <Body d="M12 3.5 19 6v5.5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6Z" />
    <path d="M12 3.5 19 6v5.5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6Z" />
  </>
))

export const ShieldCheck = createIcon("ShieldCheck", () => (
  <>
    <Body d="M12 3.5 19 6v5.5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6Z" />
    <path d="M12 3.5 19 6v5.5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6Z" />
    <path d="M9 11.8 11.2 14 15 9.8" />
  </>
))

export const ShieldAlert = createIcon("ShieldAlert", () => (
  <>
    <Body d="M12 3.5 19 6v5.5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6Z" />
    <path d="M12 3.5 19 6v5.5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6Z" />
    <path d="M12 8v4M12 15.2h.01" />
  </>
))

/* --------------------------- Misc ------------------------------- */

export const Armchair = createIcon("Armchair", () => (
  <>
    <Body d="M6 11.5V9a2.5 2.5 0 0 1 5 0v2.5h2V9a2.5 2.5 0 0 1 5 0v2.5a2.5 2.5 0 0 0-2.5 2.5v1.5h-9V14A2.5 2.5 0 0 0 6 11.5Z" />
    <path d="M5.5 12V9.5a2.5 2.5 0 0 1 5 0V13h3V9.5a2.5 2.5 0 0 1 5 0V12" />
    <path d="M4.5 13.5A2 2 0 0 1 6.5 15.5V18h11v-2.5a2 2 0 0 1 2-2" />
    <path d="M7 18v2M17 18v2" />
  </>
))

export const CreditCard = createIcon("CreditCard", () => (
  <>
    <Body d="M3.5 6.5h17a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-17a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Z" />
    <rect x="2.5" y="6" width="19" height="12" rx="2" />
    <path d="M2.5 10h19" />
    <path d="M6 14.5h3" />
  </>
))

export const Crown = createIcon("Crown", () => (
  <>
    <Body d="M4 8 7.5 12 12 6.5 16.5 12 20 8l-1.5 9.5H5.5Z" />
    <path d="M3.5 7.5 7.5 12 12 6l4.5 6 4-4.5-1.7 10H5.2Z" />
    <path d="M5.2 19.5h13.6" />
  </>
))

export const Flag = createIcon("Flag", () => (
  <>
    <Body d="M5.5 4.5c2.5-1.5 5-1.5 7.5 0s5 1.5 7.5 0v8c-2.5 1.5-5 1.5-7.5 0s-5-1.5-7.5 0Z" />
    <path d="M5.5 21V4.5c2.5-1.5 5-1.5 7.5 0s5 1.5 7.5 0v8c-2.5 1.5-5 1.5-7.5 0s-5-1.5-7.5 0" />
  </>
))

export const Image = createIcon("Image", () => (
  <>
    <Body d="M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <circle cx="8.5" cy="10" r="1.6" />
    <path d="M3.5 16.5 9 12l4 3.5 3-2.5 4.5 4" />
  </>
))
export const ImageIcon = Image

export const Info = createIcon("Info", () => (
  <>
    <Body d="M12 4a8 8 0 1 1 0 16 8 8 0 0 1 0-16Z" />
    <circle cx="12" cy="12" r="8" />
    <path d="M12 11v5" />
    <path d="M12 8h.01" />
  </>
))

export const Minus = createIcon("Minus", () => <path d="M5 12h14" />)

export const MinusCircle = createIcon("MinusCircle", () => (
  <>
    <Body d="M12 4a8 8 0 1 1 0 16 8 8 0 0 1 0-16Z" />
    <circle cx="12" cy="12" r="8" />
    <path d="M8.5 12h7" />
  </>
))

export const RefreshCw = createIcon("RefreshCw", () => (
  <>
    <path d="M4 11a8 8 0 0 1 13.7-4.4L20 9" />
    <path d="M20 4.5V9h-4.5" />
    <path d="M20 13a8 8 0 0 1-13.7 4.4L4 15" />
    <path d="M4 19.5V15h4.5" />
  </>
))

export const RotateCcw = createIcon("RotateCcw", () => (
  <>
    <path d="M4 9a8 8 0 1 1-1 6" />
    <path d="M4 4.5V9h4.5" />
  </>
))

export const Undo2 = createIcon("Undo2", () => (
  <>
    <path d="M9 8 4.5 12 9 16" />
    <path d="M4.5 12h9a5 5 0 0 1 0 10h-3" />
  </>
))

export const Upload = createIcon("Upload", () => (
  <>
    <Body d="M4.5 15h15v3.5a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1Z" opacity={0.12} />
    <path d="M12 15V5" />
    <path d="M8 8.5 12 4.5l4 4" />
    <path d="M4.5 15.5v2.5a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1v-2.5" />
  </>
))

export const UserCircle = createIcon("UserCircle", () => (
  <>
    <Body d="M12 4a8 8 0 1 1 0 16 8 8 0 0 1 0-16Z" />
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="10" r="2.6" />
    <path d="M6.8 18a5.2 5.2 0 0 1 10.4 0" />
  </>
))
