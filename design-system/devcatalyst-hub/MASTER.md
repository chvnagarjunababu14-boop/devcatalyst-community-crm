# Design System Master File — DevCatalyst Hub

> **LOGIC:** When building a specific page, first check `design-system/devcatalyst-hub/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** DevCatalyst Hub  
**Architecture:** Unified Project Management & Community CRM  
**Target Audience:** Club Administrators, Organizers, Project Leads, Club Members, Event Participants  
**Visual Style:** Brand-Aligned Editorial Monochrome (Deep Black Structural Foundation + Clean Crisp White Content Canvas + Subtle Charcoal & Neutral Elevators)  
**Density Tier:** Dashboard / High Density (`--space-scale: 8px-32px`)  
**Motion Intensity:** Cinematic & Restrained Micro-Interactions (150ms–200ms page transitions & hover feedback, strictly honoring `prefers-reduced-motion`)

---

## 1. Global Color Tokens

The visual identity is anchored directly to the official DevCatalyst black-and-white emblem. It employs a disciplined monochrome palette using deep primary black for structure and primary actions, crisp white for content surfaces, and neutral grays for secondary hierarchy and subtle elevation.

| Token | Hex / Value | Usage & Meaning | WCAG Contrast |
|-------|-------------|-----------------|---------------|
| `--color-primary-black` | `#090909` | Deep primary black: persistent dark surfaces, primary buttons | 21:1 against white text |
| `--color-charcoal` | `#171717` | Charcoal: primary text on light mode, active navigation backgrounds | 18.5:1 on white |
| `--color-dark-elevated`| `#262626` | Elevated dark surface: cards and pills in dark mode, hover states | 12.8:1 against white text |
| `--color-sidebar-bg` | `#090909` | Deep primary black persistent sidebar & top status bar | 21:1 against white text |
| `--color-sidebar-surface` | `#171717` | Sidebar active item, hover states, subgroup cards | 18.5:1 against white text |
| `--color-sidebar-border` | `#262626` | Sidebar dividers and section borders | Structural |
| `--color-sidebar-text` | `#FFFFFF` | Sidebar headers and active navigation labels | 21:1 on sidebar bg |
| `--color-sidebar-muted` | `#737373` | Sidebar inactive icons and secondary labels | 5.2:1 on sidebar bg |
| `--color-background` | `#FAFAFA` | Main content canvas surface (Neutral 50) | Base surface |
| `--color-card` | `#FFFFFF` | Primary data cards, tables, kanban cards, dialogs | Base card surface |
| `--color-card-subtle` | `#F5F5F5` | Table header, subtle card subsections, input disabled | Secondary surface |
| `--color-foreground` | `#171717` | Primary body and heading text (Neutral 900) | 18.5:1 on background |
| `--color-foreground-muted`| `#737373` | Secondary captions, timestamps, meta (Neutral 500) | 4.8:1 on background |
| `--color-border` | `#E5E5E5` | Default card borders, table row dividers (Neutral 200)| Structural |
| `--color-border-hover` | `#CCCCCC` | Interactive borders on hover/focus (Neutral 300) | Structural |
| `--color-primary` | `#090909` | Primary action button fill, active tabs | 21:1 against white text |
| `--color-primary-hover` | `#262626` | Primary button hover state | 12.8:1 against white text |
| `--color-primary-light` | `#F5F5F5` | Muted badge & pill surface | High contrast on dark |
| `--color-primary-text` | `#171717` | Text on primary-light badges | 18.5:1 on light |
| `--color-accent` | `#171717` | Focus indicators, primary highlights | High contrast |
| `--color-ring` | `rgba(9, 9, 9, 0.20)` | Keyboard focus ring token | 3px visible outline |

### Functional Status Tokens (Semantic Colors Preserved)

| Semantic Role | Background Tint | Border | Text / Icon | Badges & Use Case |
|---------------|-----------------|--------|-------------|-------------------|
| **Success / Done** | `#ECFDF5` (Emerald 50) | `#A7F3D0` (Emerald 200) | `#047857` (Emerald 700) | Tasks Done, Attended, Selected candidate |
| **In Progress / Active** | `#EFF6FF` (Blue 50) | `#BFDBFE` (Blue 200) | `#1D4ED8` (Blue 700) | Tasks In Progress, Active Projects, Screening |
| **Pending / Todo** | `#F5F5F5` (Neutral 100) | `#E5E5E5` (Neutral 200) | `#737373` (Neutral 500) | Tasks Todo, Applied candidates, Draft events |
| **Warning / Deadline**| `#FFFBEB` (Amber 50) | `#FDE68A` (Amber 200) | `#B45309` (Amber 700) | Priority Medium, Near Capacity, Approaching deadline |
| **Urgent / High** | `#FEF2F2` (Red 50) | `#FECACA` (Red 200) | `#B91C1C` (Red 700) | Priority High, Registration Closed, Rejected candidate |

---

## 2. Typography System

Engineered specifically for data-intensive developer and club operations using **Inter** for clean UI readability and **JetBrains Mono** for technical IDs, metrics, and timestamps.

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

:root {
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
}
```

### Type Scale

| Level | Size | Weight | Tracking | Line Height | Usage |
|-------|------|--------|----------|-------------|-------|
| **Display / Page Title**| `24px` (`1.5rem`) | `700` (Bold) | `-0.025em` | `1.25` | Top page titles, primary KPI numbers |
| **Heading 1 / Section** | `18px` (`1.125rem`)| `600` (SemiBold)| `-0.02em` | `1.3` | Card headers, table section titles |
| **Heading 2 / Group** | `15px` (`0.9375rem`)| `600` (SemiBold)| `-0.01em` | `1.35` | Kanban column headers, form groups |
| **Body Standard** | `14px` (`0.875rem`) | `400` (Regular) | `0em` | `1.5` | Table cell text, descriptions, body |
| **Body Medium** | `14px` (`0.875rem`) | `500` (Medium) | `0em` | `1.5` | Interactive table values, labels |
| **Caption / Meta** | `12px` (`0.75rem`) | `500` (Medium) | `+0.01em` | `1.4` | Timestamps, secondary metadata, chips |
| **Data / Code Monospace**| `13px` (`0.8125rem`)| `500` (Medium) | `0em` | `1.4` | IDs (`PRJ-01`, `TSK-104`), metrics, keys |

---

## 3. Spacing & Elevation System (Dashboard Density)

DevCatalyst Hub utilizes a compact 4px base grid optimized for high-density administrative workflows:

```css
:root {
  --space-2xs: 2px;
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 12px;
  --space-base: 16px;
  --space-lg: 20px;
  --space-xl: 24px;
  --space-2xl: 32px;
  --space-3xl: 48px;

  --radius-xs: 4px;
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px;

  /* Restrained Shadows (Subtle architectural depth without visual clutter) */
  --shadow-subtle: 0 1px 2px 0 rgba(15, 23, 42, 0.04);
  --shadow-card: 0 1px 3px 0 rgba(15, 23, 42, 0.06), 0 1px 2px -1px rgba(15, 23, 42, 0.04);
  --shadow-card-hover: 0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.05);
  --shadow-dropdown: 0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.03);
  --shadow-modal: 0 20px 25px -5px rgba(15, 23, 42, 0.12), 0 8px 10px -6px rgba(15, 23, 42, 0.05);
}
```

---

## 4. Component Standards

### A. Navigation & Application Shell
- **Sidebar**: Fixed 260px desktop width, collapsible to 68px icon-rail or off-canvas drawer on mobile (`<768px`).
- **Brand Mark**: DevCatalyst logo badge with violet glowing accent on navy `#0B132B`.
- **User Profile Pill**: Bottom sidebar anchor with user avatar, name, active role badge (`ADMIN`, `ORGANIZER`, etc.), and quick sign-out.
- **Top Utility Bar**: Global search bar, club selector / notification bell, and breadcrumb hierarchy.

### B. Cards & Panels
- **Standard Card**: White `#FFFFFF` background, 1px solid border `#E2E8F0`, 12px border radius, `--shadow-card`.
- **Card Header**: 16px padding, flex row with title on left and actions/badges on right, separated by subtle bottom border if data-heavy.
- **Card Interactive State**: On hover, border shifts to `#CBD5E1`, shadow transitions to `--shadow-card-hover`, transform translates `-1px` on Y-axis.

### C. Data Tables
- **Table Container**: `overflow-x-auto` with clean scrollbars, wrapped in a 1px solid border `#E2E8F0` with 8px radius.
- **Header Row (`<th>`)**: Background `#F8FAFC`, uppercase 11px font with `letter-spacing: 0.05em`, color `#475569`, sort indicators.
- **Table Rows (`<tr>`)**: Minimum height 48px, horizontal borders `#E2E8F0`, hover background `#F8FAFC`, zebra striping optional.
- **Controls**: Always pair with a search input, status filter select, and accessible pagination footer ("Showing 1-10 of 48 items").

### D. Kanban Task Board
- **Columns**: 3 primary columns (TODO, IN_PROGRESS, DONE) + optional custom workflow columns.
- **Column Header**: Column title with count badge pill (`<span class="badge">12</span>`) and quick "+" task button.
- **Task Card**:
  - Top row: Priority badge (`HIGH`, `MEDIUM`, `LOW`) and project tag (`[PRJ-01]`).
  - Middle: Task title (bold 14px) and optional 2-line summary.
  - Bottom row: Assignee avatar(s) with fallback initials, due date with warning color if near/overdue, and checklist progress (`3/5`).
  - Accessible keyboard controls: Support keyboard navigation (Space/Enter to pick up, Up/Down to reorder, Left/Right to move column).

### E. Event Cards & Registration Components
- **Event Visual**: Clean banner header or date badge block (`OCT 24` square badge).
- **Meta Row**: Calendar date & time, location/mode (In-Person / Online), and host project lead.
- **Capacity Meter**: Accessible HTML5 `<progress>` or styled bar showing `42/50 seats filled` with color shift (Green -> Amber at 80% -> Red at 100%).
- **Registration Action**: Clear stateful CTA: "Register Now", "Already Registered (View Ticket)", "Waitlist", or "Registration Closed".

---

## 5. Accessibility & Motion Rules (WCAG 2.1 AA Compliant)

1. **Color Independence**: Never convey status by color alone. Every badge, priority pill, and attendance tag must include explicit text labels or semantic icons.
2. **Keyboard Navigation & Focus**:
   - All interactive controls have visible focus rings: `outline: 2px solid var(--color-primary); outline-offset: 2px;`.
   - Modals trap focus and close on `Escape`.
   - Tables and boards support arrow key navigation.
3. **Motion & Reduced Motion**:
   - Transitions strictly between `150ms` and `250ms` using `cubic-bezier(0.4, 0, 0.2, 1)`.
   - Any animation (e.g. skeleton loaders, modal fade-ins, card reorders) must be disabled or replaced with immediate state when `@media (prefers-reduced-motion: reduce)` is active:
     ```css
     @media (prefers-reduced-motion: reduce) {
       *, *::before, *::after {
         animation-duration: 0.01ms !important;
         animation-iteration-count: 1 !important;
         transition-duration: 0.01ms !important;
         scroll-behavior: auto !important;
       }
     }
     ```
