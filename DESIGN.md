# Job Application CRM — DESIGN.md

## Visual Theme & Atmosphere
**Athletic minimalism meets professional precision.** A monochromatic UI system inspired by Nike's editorial approach: the application pipeline (content) is the hero. Zero decorative UI. Bold typography. Strategic whitespace. Professional, focused, premium.

---

## Color Palette
| Name | Hex | Role |
|------|-----|------|
| **Black** | `#000000` | Primary text, headers, stark contrast |
| **Dark Gray** | `#1A1A1A` | Backgrounds, secondary elements |
| **Medium Gray** | `#666666` | Tertiary text, muted labels |
| **Light Gray** | `#F5F5F5` | Surface backgrounds, subtle dividers |
| **Accent (Blue)** | `#0066FF` | CTAs, focus states, status highlights |
| **Success** | `#00AA44` | Offered status only |
| **Warning** | `#FF9900` | More Info Required status |
| **Danger** | `#DD0000` | Denied or destructive actions |

---

## Typography
**Font Stack:** System fonts (San Francisco / Segoe / -apple-system) for speed and consistency

| Element | Size | Weight | Case | Letter-Spacing |
|---------|------|--------|------|-----------------|
| **Page Title** | 48px | 900 (Black) | UPPERCASE | +2px |
| **Section Header** | 28px | 700 (Bold) | Sentence case | 0 |
| **Card Title** | 18px | 700 (Bold) | Sentence case | 0 |
| **Body** | 14px | 400 (Regular) | Sentence case | 0 |
| **Label** | 12px | 500 (Medium) | UPPERCASE | +0.5px |
| **Metadata** | 11px | 400 (Regular) | Sentence case | 0 |

---

## Component Styling

### Buttons
- **Primary CTA:** Black background, white text, no border, 12px padding vertical, 24px horizontal
- **Secondary:** White background, black border (1px), black text
- **Hover:** 8% opacity change (darker for black, lighter for white)
- **Focus:** 2px blue outline, 2px offset
- **Disabled:** 50% opacity, no pointer events

### Cards (Applications)
- Background: White (`#FFFFFF`)
- Border: 1px solid `#E5E5E5`
- Padding: 24px
- Radius: 0px (sharp corners for editorial feel)
- Hover state: 1px solid `#000000`, shadow none (bold line, not lift)
- No drop shadow—borders do the work

### Column Headers
- UPPERCASE bold text
- 2px bottom border (black)
- Padding: 16px 0
- Status counts in medium gray

### Status Badges
- **Submitted:** Black background, white text, 4px radius
- **More Info:** Warning color background
- **Interview:** Accent blue background
- **Offered:** Success green background
- **Denied:** Danger red background
- **Archived:** Light gray background, medium gray text

---

## Layout Principles
- **Whitespace First:** Generous padding (48px edges, 32px between sections)
- **Grid:** 6 columns for Kanban (1 per status + 1 trash)
- **Max Width:** 1440px (editorial-scale content)
- **Gutters:** 24px between columns
- **Baseline:** 4px (all spacing uses 4px multiples)

---

## Depth & Elevation
**No drop shadows.** Depth comes from:
- Bold borders on hover (black 1px)
- Negative space
- Typography weight
- Color contrast
- Subtle 1px dividers (light gray) where needed

---

## Design Guardrails

### Do's
✅ Use whitespace aggressively  
✅ Let company names and job titles breathe  
✅ Use borders to define interactive elements  
✅ Bold typography for hierarchy  
✅ Keep surfaces and backgrounds monochromatic  
✅ Use accent blue sparingly (CTAs, focus, highlights only)  
✅ Use color status badges only for status (not decorative)  

### Don'ts
❌ Rounded corners (use sharp edges for editorial feel)  
❌ Drop shadows or floating effects  
❌ Gradients or pseudo-depth  
❌ Decorative icons or illustrations  
❌ Multiple accent colors (blue only for UI actions)  
❌ Opacity/fade effects (use bold borders instead)  
❌ Busy backgrounds (white or light gray only)  

---

## Responsive Behavior
- **Desktop:** 6-column grid at max-width 1440px
- **Tablet (1024px):** 3-column grid, doubled columns
- **Mobile (640px):** 1 column, full width

---

## Agent Prompt
*Build a Job Application CRM dashboard that follows this DESIGN.md. Create a monochromatic, editorial interface inspired by Nike's minimalism: black and white typography, no decorations, bold headers, strategic whitespace. Status badges add color (green=offer, red=denied, blue=interview, orange=info). Kanban columns show company name, job title, and applied date. Hover states use black borders, not shadows. Trash column has light gray background. Accent blue (#0066FF) only for buttons and focus states.*

