Salus — Design Specification for Google Stitch
1. Product Overview
Salus is a precision nutrition platform that pairs an AI-powered patient app with a clinical dashboard for licensed nutritionists. The product replaces the broken, manual workflow of traditional nutrition care — paper food diaries, weekly check-ins, generic meal plans — with a continuous, intelligent feedback loop between patient and professional.
The core insight: nutritionists spend most of their time on data entry and chasing patients for compliance. Patients abandon plans because logging is tedious and feedback is sparse. Salus collapses this gap with computer vision, wearable integration, and an AI clinical co-pilot.
Tagline: Precision nutrition, powered by AI.
Market: Brazil (primary) + English-speaking global market (secondary).
2. The Three Pillars
Salus is built around three product pillars that map to the patient journey:
📸 Snap — Effortless Logging
Photo-based food recognition using vision AI.
Patient takes a picture of their meal; Salus identifies foods, estimates portions, and logs macros and micronutrients automatically.
Manual fallback for edge cases (restaurant dishes, mixed plates, beverages).
Voice logging as a secondary input ("I just had a coffee with milk").
📊 Sense — Continuous Context
Wearable integration via unified API (Terra API) — Apple Health, Google Fit, Garmin, Whoop, Oura, Fitbit.
Pulls steps, heart rate, sleep, HRV, training load, body composition.
Cross-references nutrition data with biometric signals to surface patterns the patient and nutritionist would otherwise miss.
🧠 Suggest — Intelligent Guidance
AI-generated insights for the patient: meal timing, hydration nudges, recovery-aligned macros.
AI clinical co-pilot for the nutritionist: pattern detection, plan suggestions, adherence flags, draft notes.
The nutritionist always reviews, approves, or overrides AI output. Salus augments, never replaces.
3. Two Products, One Platform
3.1 Salus iOS App (Patient-facing)
Stack: Swift / SwiftUI, native iOS. Audience: Patients of nutritionists who use NutriGen, plus a self-serve tier.
Core flows:
Onboarding: Goals, dietary restrictions, allergies, current weight/height, wearable connection, invite code from nutritionist (optional).
Snap a meal: Camera → AI recognition → confirm/edit → log.
Daily dashboard: Macros vs. target, hydration, energy balance, sleep summary.
Chat with my nutritionist: Asynchronous messaging, photo sharing, plan questions.
AI assistant: Conversational interface for quick questions ("Is this snack okay?", "What should I eat post-workout?").
Progress: Weight trend, photos, biometric trends, adherence streaks.
3.2 NutriGen Dashboard (Nutritionist-facing)
Stack: Next.js, Supabase, deployed on Vercel. Current URL: nutrigen-psi.vercel.app Audience: Licensed nutritionists running solo or small practices.
Core flows:
Patient roster: All active patients, last contact, adherence score, flags.
Patient profile: Full nutrition history, biometric trends, meal photos, notes, plan history.
Plan builder: Drag-and-drop meal plan creation, macro/micro targets, meal swaps, AI-suggested plans based on patient profile.
AI co-pilot panel: Highlights non-compliance, suggests adjustments, drafts session notes, generates patient summaries.
Messaging: Async chat with each patient, broadcast announcements.
Billing & sessions: Schedule consultations, track plan duration, renewal reminders.
4. Brand & Visual Language
Voice
Clinical but warm. Salus is a healthcare product, not a fitness gimmick. Copy avoids hype, exclamation marks, and gamification clichés.
Bilingual-first. Every screen must work in pt-BR and en-US. Portuguese is primary in Brazil; English is the global default.
Patient-respectful. No shame language, no calorie-policing, no "cheat day" framing. Body-neutral phrasing throughout.
Visual identity
Palette: A calm, medical-adjacent palette. Primary: deep teal or forest green (health, trust). Secondary: warm off-white background, charcoal text. Accent: a single soft coral or amber for CTAs and alerts.
Typography: A geometric sans-serif for UI (Inter, Geist, or similar). A subtle serif for the wordmark and large hero text to add warmth.
Iconography: Outline icons, 1.5px stroke, rounded joins. No emoji-heavy UI.
Photography: Real food, real plates, natural light. No stock photos of impossibly perfect green smoothies.
Density: Patient app is spacious and breathable; dashboard is information-dense but never cluttered. Generous use of whitespace in both, just calibrated differently.
Motion
Subtle and purposeful. Spring animations for state changes, no bouncy or playful motion. The product should feel like a medical instrument, not a game.
5. Information Architecture
Patient App (iOS)
Tab Bar (4 tabs)
├── Today      → Daily dashboard, log meal CTA, today's plan
├── Log        → Snap, voice, manual entry; recent meals
├── Coach      → Chat with nutritionist, AI assistant, plan view
└── Profile    → Goals, wearables, settings, progress photos
NutriGen Dashboard (Web)
Sidebar
├── Inbox          → Unread messages, flagged patients
├── Patients       → Roster, search, filters
├── Plans          → Template library, drafts
├── Insights       → Practice-wide analytics
├── Calendar       → Sessions, reminders
└── Settings       → Profile, billing, integrations
6. Key Screens to Design First
For Stitch, prioritize these in order:
Patient App
Onboarding flow (6–8 screens): welcome → goals → restrictions → wearable connect → nutritionist invite code → done.
Today dashboard: Macro rings, hydration, next meal, quick log button.
Snap a meal flow: Camera → recognition results → confirm/edit → logged confirmation.
Coach chat: Threaded conversation with nutritionist, photo attachments, AI suggestions inline.
Progress view: Weight chart, biometric trends, adherence calendar.
NutriGen Dashboard
Patient roster: Table view with adherence indicators, last-contact column, search.
Patient detail: Tabs for overview, nutrition log, biometrics, messages, plan, notes.
Plan builder: Weekly grid, drag meals from library, macro targets visualized.
AI co-pilot panel: Side drawer with pattern detection, suggested actions, draft notes.
Inbox: Threaded patient messages, priority flagging.
7. Technical Foundations (for design constraints)
Auth: Supabase Auth (email + OAuth).
Database: Supabase Postgres with row-level security per nutritionist / per patient.
LLM: Anthropic Claude (primary) for all AI features — meal analysis, co-pilot, conversational assistant.
Vision: Multimodal Claude for meal photo recognition; fallback to specialized food-recognition API if needed.
Wearables: Terra API as the unified integration layer.
Compliance: HIPAA-aligned architecture, GDPR-ready, LGPD-compliant from day one. PHI encrypted at rest and in transit. Audit logs for every clinical action.
iOS: SwiftUI, iOS 17+ minimum. HealthKit integration native.
Web: Next.js App Router, server components, Tailwind, shadcn/ui.
8. Design Principles
The nutritionist is the hero. Salus does not replace clinical judgment. Every AI output is reviewable, editable, overridable.
Logging must be near-zero-friction. If logging takes more than 10 seconds for a typical meal, the product fails.
Patients see signal, not noise. Surface what changes behavior; hide what doesn't.
Trust is built in the details. Clear data sources, explainable AI suggestions, no dark patterns, transparent billing.
Bilingual by construction. No screen, error message, or empty state ships in one language only.
Health-first, not fitness-first. Salus is for people working with a clinician on a real goal — recovery, chronic disease management, sports performance, weight regulation — not for casual macro counters.
9. What Salus Is Not
Not a calorie-counting app like MyFitnessPal.
Not a diet program with a fixed methodology.
Not a direct-to-consumer wellness product without clinical oversight.
Not a chatbot pretending to be a nutritionist.
Not a habit tracker with food as a side feature.
Salus is clinical infrastructure for modern nutrition practice, with a patient experience that finally makes adherence feel possible.
10. Stitch Generation Notes
When generating screens in Google Stitch from this spec:
Default to the iOS patient app unless the screen is explicitly a dashboard view.
Use the brand palette and typography defined above; do not invent new colors or fonts per screen.
Keep copy in Portuguese (pt-BR) for Brazilian-market mockups, English for global mockups.
Patient-facing screens use spacious, calm layouts with one primary action per screen.
Dashboard screens use dense tables, side drawers for detail, and clear hierarchy between primary content and AI suggestions.
Always include realistic data — actual food names, plausible macro values, real-sounding patient names — never lorem ipsum.