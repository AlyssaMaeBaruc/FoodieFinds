# FoodieFinds Design System

> **For Claude Code:** Follow this file for all UI work in this repo. Use the CSS variables in `src/styles/tokens.css` and never hard-code hex values in components. If a new component needs a colour or size that isn't listed here, ask before adding one.

## Feel

Warm, cosy and modern. **Dark colours are for text, light colours are for backgrounds.** Espresso, Cocoa and Copper carry the words; Cream, Tan and soft peach-amber blends make the surfaces, gradients and glows. Frosted-glass cards float over a gently glowing cream-to-tan background. Rounded, pill-shaped controls.

---

## Colour

### Palette

| Token | Hex | Name | Role |
|---|---|---|---|
| `--ff-ink` | `#210F04` | Espresso | Body text, icons on light backgrounds |
| `--ff-brown` | `#452103` | Cocoa | Headings, dark sections, cover background |
| `--ff-oxblood` | `#690500` | Oxblood | Saved / favourite state (filled heart) |
| `--ff-copper` | `#934B00` | Copper | Primary button fill, links, labels, borders |
| `--ff-amber` | `#BB6B00` | Amber | Large accents only: step numbers, rules, hover glow |
| `--ff-cream` | `#FBF4EA` | Cream | Page background, text on dark backgrounds |
| `--ff-tan` | `#F3E2CC` | Tan | Ingredient tags, subtle fills, secondary surfaces |

### Contrast rules

- **Body text** is `--ff-ink` on `--ff-cream` or `--ff-tan`. Never use amber or copper for paragraphs.
- **Amber (`#BB6B00`)** fails contrast for small text on cream. Use it for elements of 24px or larger, decorative rules, and icons only.
- **Copper (`#934B00`)** is the smallest-safe accent. Use it for links, labels and 12–14px text.
- **On dark backgrounds** (`--ff-brown`, `--ff-ink`), use `--ff-cream` for text and `--ff-tan` for secondary text.
- **Buttons:** a light peach gradient (`--ff-gradient-primary`) with Espresso text. Don't put white or cream text on amber.
- **Solid dark fills are rare:** only for small state markers that must stand out (a ticked checkbox, a selected-card tick, the saved heart) and the non-palette colours (grades, delete).

### Gradients

Gradients only blend the palette above. Never add a new colour to a gradient.

| Token | Blend | Use |
|---|---|---|
| `--ff-gradient-page` | Cream → Tan, with soft amber/copper glows in the corners | Page background (behind glass cards) |
| `--ff-gradient-hero` | Cream → Tan → a hint of amber | Page headers (dark text on top) |
| `--ff-gradient-primary` | Light peach: amber 22% → 55% blended into Tan | Primary buttons, active nav tab and selected chips, always with Espresso text (contrast 7.5+) |
| `--ff-gradient-accent` | Copper → Amber | Progress bars, rules, bullets (no text on it) |
| `--ff-gradient-title` | Copper → copper/amber blend | Gradient text for the accent words of a heading (large text on light backgrounds) |

### Colour jobs (one colour, one meaning)

- Oxblood means **saved**. Only the filled heart and saved-state badges use it.
- Amber means **step or progress**: numbered circles, section rules, and active underlines.
- Copper means **you can click this**: buttons and links.

---

## Typography

Fonts come from Google Fonts:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=DM+Sans:wght@400;500&display=swap" rel="stylesheet">
```

| Use | Font | Size | Weight | Line height |
|---|---|---|---|---|
| Display (hero, cover) | Fraunces | 48px (32px mobile) | 600 | 1.1 |
| H1 page title | Fraunces | 36px (28px mobile) | 500 | 1.15 |
| H2 section / step title | Fraunces | 28px (22px mobile) | 500 | 1.2 |
| H3 card title (recipe name) | Fraunces | 20px | 500 | 1.3 |
| Body | DM Sans | 16px | 400 | 1.6 |
| Small / meta | DM Sans | 14px | 400 | 1.5 |
| Label, tag, button | DM Sans | 14px | 500 | 1 |

Rules:
- Use **Fraunces for headings only.** Everything you interact with or read as instructions (buttons, tags, inputs, body copy) uses DM Sans.
- Use sentence case everywhere ("Find recipes", not "Find Recipes"). The exception is the brand name **FoodieFinds**.
- Never use DM Sans above weight 500.

---

## Spacing, radius and shadow

- **Spacing scale (px):** 4, 8, 12, 16, 24, 32, 48, 64. Don't use values off this scale.
- **Radius:** 12px for inputs and small controls (`--ff-radius-sm`), 24px for cards (`--ff-radius-lg`), 28px for page headers (`--ff-radius-xl`), 999px for buttons, tags, chips and the heart (`--ff-radius-pill`).
- **Shadow:** `--ff-shadow` (soft, for floating cards), `--ff-shadow-lift` (cards on hover, headers).
- **Glow:** `--ff-glow` under primary buttons and active nav tabs, `--ff-glow-strong` on hover. Glows are amber-tinted, never grey.
- **Max content width:** 1120px, centred, with 16px side padding on mobile and 24px on desktop.

---

## Components

### Frosted-glass card
For cards, panels and recipe cards over the glowing page background.
```css
background: var(--ff-glass);              /* cream at 62% */
backdrop-filter: blur(18px) saturate(140%);
-webkit-backdrop-filter: blur(18px) saturate(140%);
border: 1px solid transparent;            /* no visible border line */
border-radius: var(--ff-radius-lg);
box-shadow: var(--ff-shadow);
```
Text inside uses `--ff-ink` and `--ff-brown`. Add a fallback solid `--ff-cream` background for browsers without `backdrop-filter`. Inside a page header, glass is cream at 70%. Cards have no border line: the glass and soft shadow define them.

### Page header
No box, border, shadow or panel: the header sits straight on the glowing page. A Copper label above, a Cocoa Fraunces title with the accent words in a shimmering Cocoa ↔ Copper gradient, a 48px × 3px `--ff-gradient-accent` rule under it, and Cocoa body text. (No photo.)

### Buttons
- **Primary** (one per view, e.g. "Find recipes"): `--ff-gradient-primary` pill with Espresso text, a thin copper edge (35%), 12px × 20px padding and `--ff-glow`. On hover, the gradient shifts, the glow strengthens and it lifts 1px.
- **Secondary:** a glass pill (cream at 55%, light blur) with a copper border and copper text. On hover, fill with `--ff-tan`.
- **Selected chips and the active nav tab** use the same light gradient with Espresso text.
- **Focus (all buttons):** `outline: 2px solid var(--ff-amber); outline-offset: 2px;`

### Search input
Cream background, 1px `--ff-copper` border at 40% opacity, 12px radius (`--ff-radius-sm`), 44px height, DM Sans 16px. On focus, the border becomes solid copper and gets the amber outline.

### Ingredient tag
Tan background, 1px copper border, Cocoa text, DM Sans 14px/500, 999px radius, 4px × 12px padding. Each tag has an "×" remove button with an `aria-label` like "Remove garlic".

### Recipe card
- The photo sits on top with a 4:3 ratio, `object-fit: cover`, and rounded top corners.
- The title is Fraunces 20px in Cocoa. Meta info (e.g. used vs missing ingredients) is DM Sans 14px in Copper.
- A soft Espresso fade over the bottom of the photo (under the heart and badges).
- On hover, the card lifts `translateY(-6px)` with `--ff-shadow-lift` plus `--ff-glow`, 250ms ease-out.

### Heart (save) button
- A 40px circle in the photo's top-right corner, with a cream background at 85%.
- **Unsaved:** an outline heart in `--ff-ink`.
- **Saved:** a filled heart in `--ff-oxblood` with a quick scale pop (1 → 1.2 → 1 over 250ms).
- Use `aria-pressed` to show saved/unsaved state, and an `aria-label` of "Save [recipe name]".
- No pop-ups or toasts on save. The heart change is the confirmation.

### Step header (for guides and onboarding)
A 32px amber circle with a cream number, next to a Fraunces H2 in Cocoa.

### Tip / callout
A 3px left border in `--ff-oxblood` (square corners), with DM Sans 14px text in Espresso.

### Dark section
Not used in the app any more (headers are light). If a dark block is ever needed (cover, footer): `--ff-brown` background, cream Fraunces headings, tan body text and a 48px × 3px `--ff-gradient-accent` rule under the heading.

---

## Layout and responsiveness

- **Mobile-first.** Breakpoints at 640px (tablet) and 1024px (desktop).
- **Recipe grid:** `repeat(auto-fill, minmax(260px, 1fr))` with a 24px gap.
- **Touch targets:** at least 44 × 44px.
- No horizontal scroll at any width.

## Motion

- Durations: 150ms for hovers, 200–250ms for lifts and the heart pop. Use `ease-out`.
- **Ambient movement** (slow, 8–30s, `ease-in-out`, alternating):
  - Whole page: two large fixed blob layers (Amber up to 30%, Copper up to 20%) drift on their own and also glide, slide sideways, turn and grow as you scroll (`--scroll` 0 → 1, set in `main.jsx`, eased over 900ms). No Cocoa in blobs (it reads muddy).
  - A soft amber glow follows the mouse anywhere on the page (`--mx` / `--my`, set in `main.jsx`).
  - The accent words of a header title shimmer through a Cocoa ↔ Copper gradient.
  - The active nav tab's glow breathes.
  - Keep moving blobs at 35% or less so body text stays at 5:1 contrast or better.
- Respect `prefers-reduced-motion`: turn off lifts, the heart pop and all ambient movement.

## Imagery

- Warm, natural-light food photos. Avoid cold, blue-tinted shots.
- Spoonacular images can vary in quality, so always crop them with `object-fit: cover` into a fixed ratio.
- Every image needs `alt` text (the recipe name is fine).

---

## Tokens file

The real file is `client/src/styles/tokens.css`, imported once in `client/src/main.jsx`. Keep this copy in step with it:

```css
:root {
  /* colour */
  --ff-ink: #210F04;
  --ff-brown: #452103;
  --ff-oxblood: #690500;
  --ff-copper: #934B00;
  --ff-amber: #BB6B00;
  --ff-cream: #FBF4EA;
  --ff-tan: #F3E2CC;
  --ff-glass: rgba(251, 244, 234, 0.62);
  --ff-glass-edge: rgba(251, 244, 234, 0.75);
  --ff-overlay: linear-gradient(rgba(33, 15, 4, 0.45), rgba(33, 15, 4, 0.65));

  /* gradients: blends of the palette only, no new colours */
  --ff-gradient-page:
    radial-gradient(60rem 40rem at 0% -10%, color-mix(in srgb, var(--ff-amber) 22%, transparent), transparent 60%),
    radial-gradient(50rem 36rem at 100% 0%, color-mix(in srgb, var(--ff-copper) 16%, transparent), transparent 60%),
    radial-gradient(50rem 40rem at 85% 100%, color-mix(in srgb, var(--ff-amber) 14%, transparent), transparent 60%),
    linear-gradient(180deg, var(--ff-cream) 0%, var(--ff-tan) 100%);
  /* light backgrounds, dark text on top */
  --ff-gradient-hero: linear-gradient(135deg, var(--ff-cream) 0%, var(--ff-tan) 60%, color-mix(in srgb, var(--ff-amber) 22%, var(--ff-tan)) 100%);
  --ff-gradient-primary: linear-gradient(135deg, color-mix(in srgb, var(--ff-amber) 22%, var(--ff-tan)) 0%, color-mix(in srgb, var(--ff-amber) 55%, var(--ff-tan)) 100%);
  --ff-gradient-accent: linear-gradient(90deg, var(--ff-copper), var(--ff-amber));
  /* accent words in headings: Copper -> copper/amber blend, readable on the light headers */
  --ff-gradient-title: linear-gradient(90deg, var(--ff-copper), color-mix(in srgb, var(--ff-copper) 50%, var(--ff-amber)));

  /* type */
  --ff-font-display: 'Fraunces', Georgia, serif;
  --ff-font-body: 'DM Sans', system-ui, sans-serif;

  /* spacing */
  --ff-space-1: 4px;
  --ff-space-2: 8px;
  --ff-space-3: 12px;
  --ff-space-4: 16px;
  --ff-space-5: 24px;
  --ff-space-6: 32px;
  --ff-space-7: 48px;
  --ff-space-8: 64px;

  /* shape */
  --ff-radius-sm: 12px;
  --ff-radius-lg: 24px;
  --ff-radius-xl: 28px;
  --ff-radius-pill: 999px;
  --ff-shadow: 0 12px 32px rgba(33, 15, 4, 0.12);
  --ff-shadow-lift: 0 20px 44px rgba(33, 15, 4, 0.18);
  /* warm glow under primary buttons and hovered cards */
  --ff-glow: 0 8px 24px color-mix(in srgb, var(--ff-amber) 24%, transparent);
  --ff-glow-strong: 0 12px 32px color-mix(in srgb, var(--ff-amber) 34%, transparent);

  /* motion */
  --ff-fast: 150ms;
  --ff-base: 250ms;
}

body {
  background: var(--ff-gradient-page);
  background-color: var(--ff-cream);
  background-attachment: fixed;
  color: var(--ff-ink);
  font-family: var(--ff-font-body);
  font-size: 16px;
  line-height: 1.6;
}

h1, h2, h3 {
  font-family: var(--ff-font-display);
  color: var(--ff-brown);
  font-weight: 500;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Don'ts

- Don't use pure black (`#000`) or pure white (`#fff`). Use Espresso and Cream instead.
- Don't use amber for small text, or oxblood for anything except "saved".
- Don't add new colours, fonts or one-off spacing values. Gradients may only blend palette colours.
- Don't use more than one primary button per screen.
- Don't use Title Case in UI copy.
