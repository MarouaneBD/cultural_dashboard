# ERS Dashboard — DEWA Hybrid Theme Design

**Date:** 2026-05-07  
**Status:** Approved  
**Approach:** Option C — Dark Sidebar + Warm Neutral Cards (DEWA palette)

---

## Goal

Apply the DEWA AI Academy visual language to the ERS dashboard. The design keeps the authoritative dark sidebar (suited for Arabic executive reporting) while upgrading the main content area with the DEWA warm-neutral card system, Fraunces display typography, and Space Grotesk / JetBrains Mono UI chrome.

---

## Color Tokens

All tokens go in `app/globals.css` under `:root`. The Shadcn oklch defaults are replaced with the warm palette:

| CSS Variable    | Value                                                              | Role                              |
|-----------------|--------------------------------------------------------------------|-----------------------------------|
| `--bg`          | `#faf9f7`                                                          | Page background                   |
| `--bg-alt`      | `#f4f2ed`                                                          | Section backgrounds, hover states |
| `--ink`         | `#23221f`                                                          | Primary text                      |
| `--ink-soft`    | `#555149`                                                          | Secondary text                    |
| `--ink-muted`   | `#8a867d`                                                          | Labels, metadata                  |
| `--card-bg`     | `#fdfcfa`                                                          | All card surfaces                 |
| `--hair`        | `rgba(35,34,31,.06)`                                               | Dividers, thin separators         |
| `--border`      | `rgba(35,34,31,.10)`                                               | Card and container borders        |
| `--accent`      | `#0f4024`                                                          | Primary accent (unchanged)        |
| `--accent-2`    | `#14583a`                                                          | Hover state of accent             |
| `--gold`        | `#b8822a`                                                          | Secondary accent (badges, dots)   |
| `--sidebar-bg`  | `#162b1e`                                                          | Sidebar background                |
| `--card-shadow` | `0 1px 2px rgba(35,34,31,.04), 0 16px 40px -16px rgba(35,34,31,.10)` | Card elevation                 |
| `--card-shadow-hover` | `0 2px 4px rgba(35,34,31,.06), 0 28px 60px -16px rgba(35,34,31,.16)` | Card hover lift          |

The Shadcn semantic tokens (`--background`, `--foreground`, `--card`, etc.) must be remapped to reference these values so Shadcn components inherit the warm palette automatically.

---

## Typography

### Fonts to add (Google Fonts, alongside existing Cairo)

| Font            | Weights       | Usage                                              |
|-----------------|---------------|----------------------------------------------------|
| Space Grotesk   | 400, 500, 600, 700 | UI labels, section titles, nav items, badges  |
| Fraunces        | 300, 400, 500 (+ italic) | KPI big numbers (display serif)         |
| JetBrains Mono  | 400, 500      | Period badges (Q1 · 2026), variance %, target values |

Cairo (400, 500, 600, 700) stays as the Arabic body and heading font. Space Grotesk handles Latin UI chrome only.

### Application rules

- KPI big number → `font-family: 'Fraunces', serif; font-weight: 500`
- Section title labels (ALL CAPS) → `font-family: 'Space Grotesk'; font-weight: 600; letter-spacing: .14em`
- Period badges, targets, variance % → `font-family: 'JetBrains Mono', monospace`
- Sidebar nav links → `font-family: 'Cairo'` (Arabic), `font-family: 'Space Grotesk'` (brand name only)
- Body text / KPI names / narrative → `font-family: 'Cairo'`

---

## Page Background

Add radial gradient bleed to `body` (mirrors DEWA canvas):

```css
body {
  background:
    radial-gradient(800px 400px at 88% -5%, rgba(15,64,36,.03), transparent 60%),
    radial-gradient(900px 500px at 8% 105%, rgba(184,130,42,.04), transparent 60%),
    var(--bg);
}
```

Note: gradients are mirrored horizontally vs. the LTR DEWA source because the ERS layout is RTL (sidebar on the right).

---

## Sidebar (`components/layout/Sidebar.tsx`)

| Property        | Value                                        |
|-----------------|----------------------------------------------|
| Background      | `var(--sidebar-bg)` = `#162b1e`              |
| Border          | `border-right: 1px solid rgba(255,255,255,.06)` (logical: `border-inline-end`) |
| Brand area      | Space Grotesk "ERS" + gold dot + Cairo subtitle |
| Nav links       | Cairo, `rgba(255,255,255,.58)` inactive → `rgba(255,255,255,.95)` active |
| Active nav bg   | `rgba(255,255,255,.10)` pill                 |
| Hover nav bg    | `rgba(255,255,255,.06)`                      |
| Section labels  | Space Grotesk 600, `rgba(255,255,255,.25)`, ALL CAPS, `letter-spacing: .12em` |
| Dividers        | `rgba(255,255,255,.07)` hairlines             |
| Footer links    | Same style as nav links                      |

---

## AppShell Header (`components/layout/AppShell.tsx`)

| Property        | Value                                        |
|-----------------|----------------------------------------------|
| Background      | `var(--card-bg)` (replaces `bg-white`)       |
| Border          | `1px solid var(--border)` (replaces `border-[--border]`) |
| Page title      | Cairo 600, `var(--ink)`                      |
| Period controls | JetBrains Mono pills with `var(--hair)` bg + `var(--border)` border; active state = `var(--accent)` bg + white text |
| Export button   | Space Grotesk 500, transparent bg, `var(--border)` border, hover → `var(--card-bg)` bg + `var(--ink)` border |

---

## KPI Cards (`components/kpi/KpiCard.tsx`)

| Property              | Value                                                   |
|-----------------------|---------------------------------------------------------|
| Background            | `var(--card-bg)` — all cards identical neutral surface  |
| Border                | `1px solid var(--border)`                               |
| Border radius         | `16px`                                                  |
| Shadow                | `var(--card-shadow)`                                    |
| Hover transform       | `translateY(-3px)` + `var(--card-shadow-hover)`         |
| **Variance signal**   | 3px colored `border-top` on the card: `#22c55e` green / `#f59e0b` amber / `#ef4444` red |
| KPI name              | Cairo, `var(--ink-soft)`, 13px                          |
| Big number            | Fraunces 500, `var(--ink)`, 38px, `letter-spacing: -.02em` |
| Variance %            | JetBrains Mono 500, colored (`#16a34a` / `#d97706` / `#dc2626`) |
| Target value          | JetBrains Mono 400, `var(--ink-muted)`                  |
| Footer divider        | `1px solid var(--hair)`                                 |
| Progress ring         | Unchanged (already implemented correctly)               |
| Sparkline bars        | Soft tinted fills matching variance color               |

The card background is **always** `var(--card-bg)` — the colored top-border is the sole variance signal on the card surface.

---

## Narrative Strip (`components/narrative/ExecutiveSummary.tsx`)

Wrap the narrative text in a card-style strip:

| Property     | Value                                      |
|--------------|--------------------------------------------|
| Background   | `var(--card-bg)`                           |
| Border       | `1px solid var(--border)`                  |
| Shadow       | `var(--card-shadow)`                       |
| Border radius| `16px`                                     |
| Icon chip    | `rgba(15,64,36,.07)` bg + `rgba(15,64,36,.12)` border, `10px` border-radius |
| Label        | Space Grotesk 600, `var(--gold)`, ALL CAPS, `letter-spacing: .12em` |
| Body text    | Cairo, `var(--ink-soft)`, 13px             |

---

## Files to Change

| File | What changes |
|------|-------------|
| `app/globals.css` | Replace Shadcn oklch tokens with warm palette; add font imports; add page background gradients; remap Shadcn semantic vars |
| `app/layout.tsx` | Add Space Grotesk + Fraunces + JetBrains Mono to Google Fonts link |
| `components/layout/Sidebar.tsx` | New sidebar bg, brand block with gold dot, nav link styles |
| `components/layout/AppShell.tsx` | Header bg → card-bg, border softened, period control pill style |
| `components/kpi/KpiCard.tsx` | card-bg background, 3px top-border variance signal, Fraunces number, JetBrains Mono footer |
| `components/narrative/ExecutiveSummary.tsx` | Card-style strip wrapper with gold label |

No new files. No schema changes. No API changes. Pure styling/component update.

---

## What Does NOT Change

- KPI variance logic (`lib/kpi.ts`) — untouched
- Prisma schema, API routes — untouched
- RTL/direction setup — already correct
- Progress ring SVG — already implemented correctly
- Chart components — already have RTL wrapper

---

## Success Criteria

- [ ] Sidebar renders with `#162b1e` background, gold dot, correct nav hierarchy
- [ ] All KPI cards render on `#fdfcfa` background with 3px colored top-border
- [ ] Big numbers use Fraunces serif
- [ ] Period badges use JetBrains Mono
- [ ] Page background shows subtle radial gradient
- [ ] Hover lift on cards works (`translateY(-3px)`)
- [ ] No Shadcn component regressions (dropdowns, dialogs still render correctly)
- [ ] All 58 tests still pass
- [ ] TypeScript clean (`npx tsc --noEmit`)
