---
name: Salus Precision Nutrition
colors:
  surface: '#fcf9f8'
  surface-dim: '#dcd9d9'
  surface-bright: '#fcf9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f2'
  surface-container: '#f0eded'
  surface-container-high: '#eae7e7'
  surface-container-highest: '#e4e2e1'
  on-surface: '#1b1c1c'
  on-surface-variant: '#424843'
  inverse-surface: '#303030'
  inverse-on-surface: '#f3f0f0'
  outline: '#727973'
  outline-variant: '#c1c8c2'
  surface-tint: '#456553'
  primary: '#032416'
  on-primary: '#ffffff'
  primary-container: '#1a3a2a'
  on-primary-container: '#82a48f'
  inverse-primary: '#abcfb8'
  secondary: '#5e5e5c'
  on-secondary: '#ffffff'
  secondary-container: '#e1dfdc'
  on-secondary-container: '#636360'
  tertiary: '#420700'
  on-tertiary: '#ffffff'
  tertiary-container: '#631908'
  on-tertiary-container: '#e97e65'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#c7ebd4'
  primary-fixed-dim: '#abcfb8'
  on-primary-fixed: '#002113'
  on-primary-fixed-variant: '#2d4d3c'
  secondary-fixed: '#e4e2de'
  secondary-fixed-dim: '#c8c6c3'
  on-secondary-fixed: '#1b1c1a'
  on-secondary-fixed-variant: '#474744'
  tertiary-fixed: '#ffdad2'
  tertiary-fixed-dim: '#ffb4a3'
  on-tertiary-fixed: '#3d0600'
  on-tertiary-fixed-variant: '#7d2c19'
  background: '#fcf9f8'
  on-background: '#1b1c1c'
  surface-variant: '#e4e2e1'
typography:
  display-lg:
    fontFamily: DM Serif Display
    fontSize: 48px
    fontWeight: '400'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: DM Serif Display
    fontSize: 32px
    fontWeight: '400'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: DM Serif Display
    fontSize: 28px
    fontWeight: '400'
    lineHeight: 36px
  headline-md:
    fontFamily: DM Serif Display
    fontSize: 24px
    fontWeight: '400'
    lineHeight: 32px
  body-lg:
    fontFamily: DM Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: DM Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: DM Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: DM Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  button:
    fontFamily: DM Sans
    fontSize: 16px
    fontWeight: '700'
    lineHeight: 24px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 48px
  xl: 64px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
---

## Brand & Style

This design system is built upon the intersection of clinical rigor and human warmth. It moves away from the sterile, cold aesthetics of traditional healthcare toward a "Precision Wellness" philosophy. The visual language is professional and trustworthy, prioritizing clarity and scientific accuracy without being intimidating.

The chosen style is **Corporate Modern with Minimalist influences**. It leverages a high-contrast palette and purposeful whitespace to ensure that complex nutritional data remains accessible. The aesthetic is grounded in reliability, using structured grids for professional dashboards and breathable, calm layouts for the patient-facing experience. The tone of voice is body-neutral and evidence-based, avoiding the hyperbolic language often found in the fitness industry.

## Colors

The color palette is rooted in nature and science. The **Primary Deep Teal (#1A3A2A)** provides a stable, professional foundation that feels more sophisticated than standard medical blues. The **Secondary Warm Off-White (#FAF8F4)** serves as the primary canvas, reducing eye strain compared to pure white while maintaining a clean, "clinical" feel.

The **Accent Soft Coral (#C4614A)** is reserved strictly for primary calls to action and critical interactive elements, providing a high-contrast focal point that feels energetic but not aggressive. **Charcoal (#2D2D2D)** is utilized for primary typography to ensure maximum legibility and an authoritative tone. An auxiliary **Gold (#C8A538)** is available for secondary status indicators or highlighting specific nutritional insights.

## Typography

This design system employs a sophisticated typographic pairing to balance authority with utility. **DM Serif Display** is used for headlines and wordmarks, providing a classic, editorial quality that suggests deep expertise and a personalized "concierge" experience. 

**DM Sans** is the workhorse for the UI, chosen for its high legibility and neutral, geometric construction. It handles data-heavy tables and instructional body copy with equal clarity. To maintain the professional tone, body-neutral copy should be set with generous line heights (1.5x or higher) to ensure readability for patients of all ages and cognitive loads.

## Layout & Spacing

The design system utilizes a dual-layout strategy tailored to the user's context.

**The Professional Dashboard** uses a **12-column fluid grid** designed for information density. It prioritizes the "at-a-glance" visibility of patient biomarkers. Gutters are kept tight at 24px to maximize screen real estate, and modules are organized in a logical, hierarchical flow.

**The Patient App** adopts a **spacious, breathable layout** with a maximum content width of 640px on mobile/tablet to ensure focus. It uses significantly larger vertical spacing (lg and xl units) to prevent the user from feeling overwhelmed by nutritional data, fostering a calm, self-paced environment. 

Both environments follow an 8px base unit for all margins and padding to maintain mathematical harmony.

## Elevation & Depth

To maintain a clinical and clean appearance, this design system avoids heavy shadows or excessive depth. Instead, it utilizes **Tonal Layering and Low-Contrast Outlines**.

Hierarchy is established through surface color shifts. The base background (#FAF8F4) hosts "Level 1" cards in pure white (#FFFFFF). These cards are defined by a subtle 1px border using a 10% opacity version of the Primary Teal, rather than a shadow.

When elevation is necessary (e.g., for modals or floating action buttons), use an **Ambient Shadow**: a very soft, diffused shadow with a slight teal tint to ensure it feels integrated into the brand environment. Depth is used sparingly to denote interactivity, not decoration.

## Shapes

The shape language is characterized by **softened geometry**. Elements utilize a 0.5rem (8px) base radius, striking a balance between the rigid precision of medical software and the approachability of a consumer wellness app. 

Large containers and cards should use `rounded-lg` (1rem) to feel friendly and protective. Internal elements like tags, chips, and buttons may use `rounded-xl` or pill shapes to distinguish them from structural layout components. All icon joins and path ends must be rounded to match the 1.5px stroke weight, reinforcing the "clinical but warm" aesthetic.

## Components

### Buttons
Primary buttons use the Accent Soft Coral with white text for maximum visibility. Secondary buttons use an outline style with the Primary Deep Teal. Ghost buttons are reserved for low-priority navigation.

### Cards
Cards are the primary container. They should have a white background, 1px subtle teal border, and no shadow. Headers within cards should use the Serif typeface to denote the start of a new data section.

### Input Fields
Inputs are clearly defined with a 1.5px border. On focus, the border transitions to Primary Teal with a subtle outer glow. Labels are always visible above the field in **DM Sans** (label-md) for accessibility.

### Iconography
Icons must be 24x24px, using a 1.5px stroke. They should be "Outline" style with rounded joins. Avoid filled icons unless used as a toggle state.

### Specialized Components
- **Data Visualization:** Charts should use the Primary Teal for the main data line and Gold for targets/benchmarks.
- **Progress Rings:** Used for nutritional goals, featuring a thick stroke and rounded caps.
- **Badges/Chips:** Used for dietary tags (e.g., "Gluten-Free"). These should have a light teal background with dark teal text.
