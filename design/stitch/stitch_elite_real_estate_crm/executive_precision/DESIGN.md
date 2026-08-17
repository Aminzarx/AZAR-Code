---
name: Executive Precision
colors:
  surface: '#f8f9fa'
  surface-dim: '#d9dadb'
  surface-bright: '#f8f9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f5'
  surface-container: '#edeeef'
  surface-container-high: '#e7e8e9'
  surface-container-highest: '#e1e3e4'
  on-surface: '#191c1d'
  on-surface-variant: '#44474a'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f2'
  outline: '#75777a'
  outline-variant: '#c5c6ca'
  surface-tint: '#5d5e61'
  primary: '#000101'
  on-primary: '#ffffff'
  primary-container: '#1a1c1e'
  on-primary-container: '#838486'
  inverse-primary: '#c6c6c9'
  secondary: '#3b6934'
  on-secondary: '#ffffff'
  secondary-container: '#b9eeab'
  on-secondary-container: '#3f6d38'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#001f26'
  on-tertiary-container: '#618a96'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2e2e5'
  primary-fixed-dim: '#c6c6c9'
  on-primary-fixed: '#1a1c1e'
  on-primary-fixed-variant: '#454749'
  secondary-fixed: '#bcf0ae'
  secondary-fixed-dim: '#a1d494'
  on-secondary-fixed: '#002201'
  on-secondary-fixed-variant: '#23501e'
  tertiary-fixed: '#bfe9f7'
  tertiary-fixed-dim: '#a3cdda'
  on-tertiary-fixed: '#001f26'
  on-tertiary-fixed-variant: '#224c57'
  background: '#f8f9fa'
  on-background: '#191c1d'
  surface-variant: '#e1e3e4'
typography:
  display:
    fontFamily: Geist
    fontSize: 40px
    fontWeight: '600'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '500'
    lineHeight: 32px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 8px
  margin-mobile: 16px
  margin-desktop: 32px
  gutter: 16px
  container-max-width: 1200px
---

## Brand & Style

The design system is anchored in **Minimalism** with a focus on high-performance productivity. It avoids the typical "home and hearth" cliches of real estate in favor of a sophisticated, data-driven aesthetic. The personality is calm and authoritative, designed for professionals who manage high-value transactions.

The visual narrative relies on extreme clarity, intentional whitespace, and a "utility-first" mindset. The emotional response should be one of quiet confidence and speed. Every element exists to facilitate a task, using subtle transitions and a refined palette to reduce cognitive load during long working sessions.

## Colors

The palette uses **Deep Charcoal (#1A1C1E)** as the primary anchor to establish a high-end, premium feel. This is contrasted against an **Off-White (#F8F9FA)** background to keep the interface feeling airy and expansive. 

**Emerald (#2D5A27)** serves as the primary accent for growth, status, and positive actions, while **Muted Blue (#335C67)** is reserved for secondary focus areas and information density. Status colors (Success, Warning, Error) are intentionally desaturated to maintain the professional, calm atmosphere of the CRM, ensuring they draw attention without causing visual alarm.

## Typography

This design system utilizes a dual-font strategy. **Geist** is used for headings and labels to provide a technical, modern edge with tight tracking for a "locked-in" professional look. **Inter** is used for all body copy, utilizing generous leading (line height) to ensure maximum legibility when reading client notes and property details.

Hierarchy is established through weight and spacing rather than color. Large display titles should always use negative letter spacing to feel more cohesive and "premium." Labels and metadata utilize Geist’s monospaced-adjacent qualities to feel like a precision tool.

## Layout & Spacing

The layout follows a **Fluid Grid** model with a refined 8px spacing scale. On mobile, the system uses a 4-column grid with 16px side margins. On desktop, it expands to a 12-column grid with a maximum container width of 1200px to prevent line lengths from becoming too long for comfortable reading.

Data-heavy views utilize "compact" spacing (gutter: 12px) to maximize information density, while editorial or profile views utilize "relaxed" spacing (gutter: 24px). Vertical rhythm is strictly enforced in 8px increments to maintain a sense of order and reliability.

## Elevation & Depth

Depth is communicated through **Tonal Layering** rather than heavy shadows. The background is a flat neutral surface, while primary content lives on pure white cards. 

Shadows, when used, are highly diffused and low-opacity (4-8% alpha), serving only to lift active elements like Bottom Sheets or hovering Desktop cards. There are no heavy borders; instead, subtle 1px strokes in a light grey (#E9ECEF) are used to define boundaries between data points without adding visual noise. This creates a "soft-flat" appearance that feels modern and lightweight.

## Shapes

The design system uses a **Soft (0.25rem)** roundedness level. This small radius maintains a professional, "architectural" feel while removing the harshness of sharp corners. 

Buttons and input fields use the standard `rounded` (4px) setting. Larger containers like cards or bottom sheets use `rounded-lg` (8px) to provide a gentle containerized feel. Pill-shaped elements are strictly reserved for status chips and tags to differentiate them from interactive buttons.

## Components

### Buttons & Controls
Primary buttons use the Deep Charcoal background with white Geist text. Secondary buttons are outlined or ghost-style. Segmented controls are preferred over tabs for fast filtering, using a light grey background and a white "sliding" surface for the active state.

### Bottom Sheets & Entry
On mobile, all data entry and detailed property views emerge from Bottom Sheets. This facilitates one-handed use for agents on-the-go. The sheets have a distinct 8px top radius and a subtle "handle" indicator.

### Input Fields
Fields are minimal, utilizing a bottom-border-only or a very light 4-sided stroke. Floating labels in `label-sm` appear upon focus. Error states are indicated by the desaturated red stroke and a small icon.

### Cards
Property and Client cards are pure white with `rounded-lg` corners. They rely on the `label-sm` Geist typography for metadata (e.g., SQFT, Price) to ensure the data feels like a spec sheet rather than an advertisement.

### Skeleton Loaders
To maintain the "Fast" brand pillar, skeleton loaders should match the exact shape and layout of the cards they replace, using a subtle pulse animation between #F1F3F5 and #F8F9FA.