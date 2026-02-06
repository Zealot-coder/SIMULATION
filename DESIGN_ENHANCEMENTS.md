# SIMULATION Design Enhancements

## Overview
This document outlines the design system enhancements made to the SIMULATION platform, inspired by the SiteAI/Flow Forge UI kit while preserving the orange brand identity and professional, infrastructure-grade feel.

---

## 1. Theme System Architecture

### Three Theme Modes

1. **Default (Brand Orange)**
   - Primary: Orange (#f97316) - HSL(25, 95%, 53%)
   - Background: White/light
   - Accent: Orange preserved across all components

2. **Dark Mode**
   - Neutral dark background (slate-900)
   - Orange accent preserved as primary brand color
   - High contrast text for accessibility

3. **Custom Mode**
   - User-defined accent color
   - Orange remains fallback
   - Real-time color preview

### CSS Variables (globals.css)
```css
:root {
  --primary: 25 95% 53%;        /* Brand Orange */
  --background: 0 0% 100%;       /* White */
  --foreground: 222.2 84% 4.9%;  /* Near black */
  /* ... additional semantic variables */
}
```

### Theme Provider (contexts/theme-context.tsx)
- Persists theme preference to localStorage
- Respects `prefers-color-scheme` media query
- Hex-to-HSL conversion for custom colors
- No flash on load (suppressHydrationWarning)

---

## 2. Animation System

### CSS Animations (globals.css)
All animations respect `prefers-reduced-motion`:

| Animation | Duration | Use Case |
|-----------|----------|----------|
| `fadeIn` | 0.5s | Page transitions |
| `fadeUp` | 0.5s | Card reveals |
| `scaleIn` | 0.3s | Modal/dialogs |
| `slideInRight` | 0.3s | Drawers |
| `float` | 6s infinite | Background elements |
| `shimmer` | 1.5s infinite | Loading states |

### Utility Classes
- `.animate-fade-in` - Fade in animation
- `.animate-fade-up` - Fade up with translation
- `.stagger-children` - Staggered child animations
- `.hover-lift` - Subtle lift on hover
- `.elevation-1/2/3` - Shadow depth levels

---

## 3. Enhanced Components

### KPI Card (components/kpi-card.tsx)
**UI Kit Inspiration:** Analytics cards with subtle elevation

Features:
- Icon with hover color transition
- Trend indicators (up/down arrows)
- Delta badges
- Loading shimmer state
- Hover lift effect
- Compact variant for dense layouts

```tsx
<KpiCard
  title="Events Today"
  value="47"
  delta="+12%"
  trend="up"
  icon={CalendarDays}
/>
```

### Event Stream (components/event-stream.tsx)
**UI Kit Inspiration:** Activity feeds with status badges

Features:
- Icon-based type indicators
- Status badges with animated dots
- Hover reveal actions
- Sticky header
- Empty state with guidance
- Responsive mobile layout

### Needs Attention Panel (components/needs-attention-panel.tsx)
**UI Kit Inspiration:** Alert panels with severity levels

Features:
- Severity levels: critical, warning, info
- Color-coded borders and icons
- Issue count badge
- Action buttons on hover
- "All clear" empty state
- Attention count badge for sidebar

### AI Assistant Panel (components/ai-assistant-panel.tsx)
**UI Kit Inspiration:** AI suggestion cards

Features:
- Daily summary metrics
- Categorized suggestions (improvement, warning, tip, success)
- Action buttons for each suggestion
- Icon-based type indicators
- Loading shimmer state

### Data Table (components/data-table.tsx)
**UI Kit Inspiration:** Advanced table layouts

Features:
- Searchable (optional)
- Sortable columns
- Pagination
- Empty states with actions
- Export button
- Loading shimmer
- Row hover states

### Status Badge (components/ui/badge.tsx)
**UI Kit Inspiration:** Status indicators with dots

Variants:
- default, secondary, destructive
- success, warning, info
- outline, ghost

Animated dot for "running" status.

---

## 4. Navigation & Layout

### AppShell (components/app-shell.tsx)
**UI Kit Inspiration:** Professional sidebar navigation

Enhancements:
- Icon + label navigation items
- Active state highlighting
- Organization switcher
- Mobile drawer with overlay
- Notification badge in header
- Developer section divider
- Consistent spacing and alignment

### Settings Page (app/(protected)/app/settings/page.tsx)
**UI Kit Inspiration:** Settings layout with sections

Structure:
- Sidebar navigation (Profile, Org, Team, Integrations, Appearance, Notifications, Security)
- Theme selector with live preview
- Color picker with presets
- Toggle switches for notifications
- Form sections with save buttons

---

## 5. Landing Page Enhancements

### Hero (components/hero.tsx)
- Animated gradient background orbs
- Pre-title availability badge with pulse
- Gradient text with underline animation
- Staggered feature badges
- Stats counter section
- Scroll indicator with bounce

### FeatureCard (components/feature-card.tsx)
- Icon hover scale + color change
- Gradient overlay on hover
- Lift effect on hover
- Staggered entrance animations

### Page Sections
1. **Hero** - Animated headline, CTAs, stats
2. **Problem Section** - 3-column pain points
3. **Stats Section** - KPI cards with trends
4. **Solution Section** - Feature highlights
5. **How It Works** - Numbered steps with alternating layout
6. **Why Africa** - Two-column feature cards
7. **Trust Indicators** - Logo placeholders
8. **CTA Block** - Final call-to-action

---

## 6. Dashboard Enhancements

### App Overview (app/(protected)/app/overview/page.tsx)
Layout:
- Header with actions (Refresh, New Workflow)
- 4-column KPI cards
- 2:1 main:side grid
  - Left: Event stream + Quick actions
  - Right: Needs Attention + AI Assistant

### Dev Overview (app/(protected)/dev/overview/page.tsx)
Layout:
- System health status badge
- 4-column system metrics
- Service status cards (API, DB, Worker, AI)
- 2-column grid: Tenant table + System logs

---

## 7. Design Principles Applied

### From SiteAI/Flow Forge UI Kit (Selective Adoption)
✅ **Adopted:**
- Card layouts with subtle elevation
- Section spacing & rhythm (consistent 24px/32px)
- Dashboard grid logic (responsive 2:1 layouts)
- Table styling (filters, empty states)
- AI panels with suggestion cards
- Settings page sectioning
- Status badges with animated indicators

❌ **Not Adopted:**
- Exact color palette (kept orange brand)
- Over-decorated hero sections
- Marketing-heavy visuals
- Playful gradients
- Neon colors

### Brand Preservation
- Orange remains primary across all themes
- Professional, calm tone maintained
- Infrastructure-grade feel
- No breaking changes to routing/logic

---

## 8. Accessibility

- Respects `prefers-reduced-motion`
- High contrast ratios in dark mode
- Focus-visible states on interactive elements
- Semantic HTML structure
- ARIA labels where needed
- Skip-to-content link

---

## 9. Performance

- CSS animations over JavaScript where possible
- Lazy loaded Hero component
- Shimmer effects instead of spinners
- Reduced motion support
- Optimized re-renders with proper state management

---

## 10. File Structure

```
app/
├── globals.css              # Theme variables + animations
├── layout.tsx               # ThemeProvider wrapper
├── page.tsx                 # Enhanced landing page
├── (protected)/
│   ├── app/
│   │   ├── overview/page.tsx
│   │   └── settings/page.tsx
│   └── dev/
│       └── overview/page.tsx

components/
├── ui/
│   ├── badge.tsx            # Status badges
│   └── card.tsx             # Card primitives
├── app-shell.tsx            # Navigation shell
├── kpi-card.tsx             # KPI with trends
├── event-stream.tsx         # Activity feed
├── needs-attention-panel.tsx # Alerts panel
├── ai-assistant-panel.tsx   # AI suggestions
├── data-table.tsx           # Advanced table
├── hero.tsx                 # Animated hero
└── feature-card.tsx         # Feature cards

contexts/
└── theme-context.tsx        # Theme provider
```

---

## Summary

The SIMULATION platform now features:

1. **A complete theme system** with Default, Dark, and Custom modes
2. **Elegant animations** that respect user preferences
3. **Professional dashboard components** with clear hierarchy
4. **Enhanced navigation** that's stable and predictable
5. **AI-assisted UX** that feels helpful, not overwhelming
6. **Refined landing page** with engaging animations
7. **Infrastructure-grade UI** that builds trust

All while preserving the orange brand identity and existing functionality.
