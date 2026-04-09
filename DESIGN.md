# Chai — Design System

## Index
1. [Purpose](#1-purpose)
2. [Design Principles](#2-design-principles)
3. [Color System](#3-color-system)
4. [Theme Modes](#4-theme-modes)
5. [Typography](#5-typography)
6. [Spacing, Grid, and Layout](#6-spacing-grid-and-layout)
7. [Borders, Radius, and Elevation](#7-borders-radius-and-elevation)
8. [Component System](#8-component-system)
9. [Visualization System](#9-visualization-system)
10. [Illustration, Imagery, and Iconography](#10-illustration-imagery-and-iconography)
11. [Interaction and Motion](#11-interaction-and-motion)
12. [Content and Tone](#12-content-and-tone)
13. [Responsive Rules](#13-responsive-rules)
14. [Accessibility Rules](#14-accessibility-rules)
15. [Implementation Rules](#15-implementation-rules)
16. [Do / Don’t](#16-do--dont)
17. [Quick Reference](#17-quick-reference)
---

## 1. Purpose

Chai is a warm, editorial, content-first design system built around cream, brown, and spice tones instead of conventional SaaS blues and purples. It should feel handcrafted, grounded, readable, and calm.

This document is the source of truth for:
- visual design
- component styling
- layout and spacing
- visualization and chart styling
- interaction rules
- content tone
- accessibility baselines
- implementation guidance

If something is not explicitly defined elsewhere, default back to the rules in this document.

---

## 2. Design Principles

### 2.1 Core principles
- Warm, not cold
- Editorial, not dashboard-generic
- Clear, not decorative
- Flat and layered, not glossy
- Dense but readable
- Crafted, not corporate
- Interactive feedback should feel subtle but noticeable

### 2.2 Product feel
Use this system for products that should feel:
- thoughtful
- text-heavy
- human
- trustworthy
- calm under complexity

### 2.3 Visual priorities
In order of importance:
1. readability
2. hierarchy
3. consistency
4. interaction clarity
5. personality

Personality should never reduce readability or usability.

---

## 3. Color System

### 3.1 Core palette

| Token | Hex | Role |
|---|---|---|
| Bark | `#4a4039` | Primary text |
| Dark Chai | `#221a13` | Headings, links, high-emphasis text |
| Masala Orange | `#C94B1F` | Hover accent, active emphasis |
| Cardamom Gold | `#D4920A` | Secondary accent, dark-button hover text |
| Amber Border | `#a3720e` | Special CTA border |
| Focus Blue | `#3b82f6` | Focus ring only |
| Warm Parchment | `#fdfdf8` | Main page background |
| Malai | `#eeeae3` | Inputs, secondary surfaces |
| Oat | `#e4dfd6` | Light buttons, tertiary surfaces |
| Kullad | `#d4c9b5` | Featured surfaces / featured buttons |
| Hover White | `#f5f4f1` | Hover surface |
| Selection Wash | `#d4c9b5` | Text selection on light surfaces |
| Selection Ink | `#221a13` | Text color on selected text |
| Muted Bark | `#6b5f55` | Secondary text |
| Ash | `#9c948c` | Placeholder, disabled text |
| Warm Border | `#c8c3b8` | Primary border |
| Light Border | `#b8b2a8` | Secondary border / dividers |
| Deep Ink | `#111111` | High-contrast text when needed |

### 3.2 Color role rules
- `#fdfdf8` is the default canvas.
- `#4a4039` is the default body text color.
- `#221a13` is for headings and important links.
- `#C94B1F` should be used mainly on hover, active state, or selective emphasis.
- `#3b82f6` is reserved for focus indication and accessibility.

### 3.3 Color usage rules
- No gradients by default.
- No glassmorphism.
- No heavy neon or glowing accents.
- Avoid cool gray foundations.
- Do not use pure white as the default page background.
- Selection highlight must preserve legibility. Do not use low-opacity text selection colors that reduce contrast against the selected text.

### 3.4 Surface hierarchy
Use surface color for depth before using shadow:
1. `#fdfdf8` — page canvas
2. `#eeeae3` — secondary surfaces
3. `#e4dfd6` — tertiary surfaces / controls
4. `#d4c9b5` — featured but still warm emphasis

### 3.5 Semantic guidance
For semantic UI states, stay within the warm-neutral system as much as possible:
- success: muted earthy green if needed, but avoid bright app-green
- warning: use a warm amber/orange family before adding saturated yellow
- error: use a darker, muted brick red rather than bright red
- info: use Focus Blue only when functional clarity requires it

If semantic tokens are introduced in implementation, they must still harmonize with the warm system.

---

## 4. Theme Modes

### 4.1 Supported theme choices
The product must expose four theme choices:
- `Light`
- `Dark`
- `Chai`
- `System`

Theme pickers must present them in this order:
1. `Light`
2. `Dark`
3. `Chai`
4. `System`

### 4.2 Theme semantics
- `Light` uses the warm parchment default theme.
- `Dark` is a neutral dark theme for users who want a conventional dark interface.
- `Chai` is the warm dark editorial theme described by this document’s dark-surface guidance.
- `System` follows the operating system theme and must resolve to `Light` or `Dark` only.

### 4.3 Important rule
- `System` dark mode must use the standard `Dark` theme, not `Chai`.
- `Chai` is opt-in and should never be the automatic result of system dark preference.
- Any theme picker, settings menu, or theme skill guidance must preserve this distinction.
- Do not collapse `Dark` and `Chai` into a single option called "dark mode".
- Users must be able to choose a neutral dark theme without being forced into the Chai palette.

### 4.4 Chai-specific note
- When this document refers to dark warm browns, spice tones, and editorial dark surfaces, that guidance applies to the `Chai` theme specifically.
- Do not force those tones into the default `Dark` theme.

### 4.5 Selection and active-state rule across themes
- Text selection must remain legible in `Light`, `Dark`, and `Chai`.
- Selected navigation items must use a clearly distinct surface and text contrast in all themes.
- If a selected or highlighted state becomes harder to read than the resting state, the implementation is wrong and must be adjusted.

---

## 5. Typography

### 5.1 Font families
- Primary: `IBM Plex Sans Variable`
- Fallbacks: `IBM Plex Sans, -apple-system, system-ui, Avenir Next, Avenir, Segoe UI, Helvetica Neue, Helvetica, Ubuntu, Roboto, Noto, Arial`
- Monospace: `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New`
- Code display: `Source Code Pro, Menlo, Consolas, Monaco`

### 5.2 Type scale

| Role | Size | Weight | Line Height | Letter Spacing |
|---|---:|---:|---:|---:|
| Display Hero | 30px | 800 | 1.20 | -0.75px |
| Section Heading | 36px | 700 | 1.50 | 0 |
| Feature Heading | 24px | 700 | 1.33 | 0 |
| Card Heading | 21.4px | 700 | 1.40 | -0.54px |
| Sub-heading | 20px | 700 | 1.40 | -0.5px |
| Sub-heading Uppercase | 20px | 700 | 1.40 | 0 |
| Body Emphasis | 19.3px | 600 | 1.56 | -0.48px |
| Label Uppercase | 18px | 700 | 1.50 | 0 |
| Body Semi | 18px | 600 | 1.56 | 0 |
| Body | 16px | 400 | 1.50 | 0 |
| Body Medium | 16px | 500 | 1.50 | 0 |
| Body Relaxed | 15px | 400 | 1.71 | 0 |
| Nav / UI | 15px | 600 | 1.50 | 0 |
| Caption | 14px | 400–700 | 1.43 | 0 |
| Small Label | 13px | 500–700 | 1.00–1.50 | 0 |
| Micro | 12px | 400–700 | 1.33 | 0 |
| Code | 14px | 500 | 1.43 | 0 |

### 5.3 Typography rules
- Default body text: 16px / 1.50 / 400.
- Dense reading blocks may use 15px / 1.71.
- Headings should generally be 700–800 weight.
- Avoid ultra-light typography.
- Tight tracking is allowed only on large headings.
- Use uppercase sparingly for labels, categories, or small metadata.

### 5.4 Paragraph rules
- Keep paragraphs moderately short.
- For long-form reading, prefer 60–75 character average line length.
- Avoid visually cramped text blocks.
- Use generous spacing between paragraphs in editorial sections.

### 5.5 Code and data text
- Use monospace for code, IDs, table numerics when alignment matters.
- Code blocks should have clear containment with warm border treatment.
- Avoid dark terminal styling unless the product specifically needs it.

---

## 6. Spacing, Grid, and Layout

### 6.1 Spacing scale
Base unit: `8px`

Preferred scale:
- 2px
- 4px
- 6px
- 8px
- 10px
- 12px
- 16px
- 18px
- 24px
- 32px
- 40px
- 48px

### 6.2 Usage guidance
- Related inline items: 4px–8px gap
- Component internal spacing: 8px–16px
- Card padding: 12px default, 16px for content-rich cards
- Section padding: 32px–48px vertically
- Large editorial separation: 48px+

### 6.3 Container widths
- Max outer width: `1536px`
- Standard content width: `1200px–1280px`
- Reading width: narrower than app shell when content-heavy

### 6.4 Grid rules
- Single-column for long-form/editorial content
- Two-column for mixed text and supporting content
- Three-column for features, cards, summaries
- Asymmetry is allowed if hierarchy remains clear

### 6.5 Layout philosophy
- Content-dense is allowed
- Empty space should support clarity, not luxury branding
- Layout should feel structured but not rigid

---

## 7. Borders, Radius, and Elevation

### 7.1 Border tokens
- Primary border: `1px solid #c8c3b8`
- Secondary border: `1px solid #b8b2a8`

### 7.2 Radius scale

| Radius | Usage |
|---|---|
| 2px | Inline tags, micro badges |
| 4px | Inputs, dropdowns, menu items, standard buttons |
| 6px | Cards, larger buttons, list rows |
| 9999px | Pills, status indicators |

### 7.3 Elevation levels

| Level | Treatment | Usage |
|---|---|---|
| 0 | none | page, default surfaces |
| 1 | border only | cards, inputs, contained sections |
| 2 | compound borders | grouped controls, toolbars |
| 3 | `0px 25px 50px -12px rgba(0,0,0,0.20)` | modal, popover, dropdown |

### 7.4 Elevation rules
- Use border before shadow.
- Use only one default shadow style.
- Floating UI can use the Level 3 shadow.
- Main page sections should remain visually flat.

---

## 8. Component System

### 8.1 Buttons

| Variant | Background | Text | Radius | Hover |
|---|---|---|---:|---|
| Primary / Dark Chai | `#221a13` | `#ffffff` | 6px | Opacity `0.7` + Cardamom Gold text |
| Secondary / Oat | `#e4dfd6` | `#4a4039` | 4px | `#f5f4f1` bg + Masala Orange text |
| Featured / Kullad | `#d4c9b5` | `#111111` | 0px | Masala Orange text |
| Input-style | `#eeeae3` | `#9c948c` | 4px | `1px solid #b8b2a8` |
| Ghost | `#fdfdf8` | `#4a4039` | 4px | subtle border / text emphasis |

#### Button rules
- Primary action count per view should be limited.
- Primary buttons in the light theme should use Chai ink (`#221a13`), not a neutral black or browser-default dark gray.
- Use orange hover for clarity, not decoration.
- Active state may use `transform: scale(0.98)` and `opacity: 0.8`.
- Do not over-style buttons with multiple effects.

### 8.2 Cards
- Default background: `#fdfdf8` or white where contrast is required
- Border: `1px solid #c8c3b8`
- Radius: 4px–6px
- Secondary card: `#eeeae3`
- Floating card: Level 3 shadow

#### Card rules
- Cards should support containment, not visual spectacle.
- Use card sections and spacing to organize information.
- For dense data, prefer dividers over oversized padding.

### 8.3 Inputs
- Background: `#eeeae3`
- Border: `1px solid #b8b2a8`
- Radius: 4px
- Placeholder: `#9c948c`
- Input text: `#374151`
- Focus ring: `#3b82f6` at 50% opacity
- Default padding: `2px 0px 2px 8px`

#### Input rules
- Inputs should look quiet at rest and clearer on focus.
- Use grouped borders when composing form rows.
- Do not over-round form controls.
- Native checkboxes and radio buttons must be theme-styled. Do not leave browser-default blue selected states in a Chai interface.
- Checked controls should use a theme token that harmonizes with the current theme, typically the active foreground/control ink rather than a bright browser accent.

### 8.4 Tables
- Background: `#fdfdf8`
- Row separators: `#c8c3b8`
- Header text: `#221a13`
- Body text: `#4a4039`
- Numeric cells may use monospace if alignment is important
- Hover rows may use `#f5f4f1`

#### Table rules
- Prefer horizontal separators over boxed cells when possible.
- Right-align numeric values.
- Use subtle zebra striping only if scanability requires it.
- Avoid strong colored table fills.

### 8.5 Navigation
- Background: `#fdfdf8`
- Links: `#221a13`
- Font: 15px / 600
- Hover: underline or orange text emphasis depending on context
- CTA in nav: dark button
- Mobile: collapses to hamburger

#### Navigation state rules
- Selected navigation items must remain clearly distinguishable from the surrounding surface.
- Do not rely on a slightly darker version of the page background for active state.
- Preferred selected treatment on light surfaces: `#e4dfd6` or `#d4c9b5` background with `#221a13` text.
- Selected state must still read clearly in dark mode; use a lighter warm surface with strong foreground text rather than a low-contrast dark fill.

### 8.6 Badges and tags
- Use small radii or pill depending on status importance
- Keep background muted
- Use strong contrast for status-critical content
- Avoid loud badges unless necessary for warnings/errors

### 8.7 Empty states
- Use concise, human language
- Optional illustration support
- Provide a next action
- Avoid sterile “No data found” style copy without context

### 8.8 Modals, drawers, and popovers
- Use Level 3 shadow
- Keep border visible
- Prefer simple layout hierarchy
- Important actions should be obvious but not loud

---

## 9. Visualization System

This section is the source of truth for charts, graphs, dashboards, metrics, and all data visualization inside Chai.

### 8.1 Visualization principles
- Readability first
- Comparison clarity second
- Brand styling third
- Decoration last

Charts should feel calm, flat, and editorial. They should not feel like flashy BI dashboards.

### 8.2 Visualization use rules
Choose the simplest visualization that communicates the point:
- single number → stat card
- trend over time → line chart
- comparison across categories → bar chart
- composition with few categories → stacked bar or donut only when necessary
- detailed comparison → table instead of chart
- exact values matter → table plus chart if needed

Do not use a chart when plain text or table communicates the data better.

### 8.3 Chart palette
Use a restrained palette. Prefer one primary data color plus muted supporting tones.

#### Recommended chart colors
| Role | Color |
|---|---|
| Primary series | `#4a4039` |
| Secondary series | `#6b5f55` |
| Tertiary series | `#d4c9b5` |
| Hover / highlight | `#C94B1F` |
| Gridline | `#c8c3b8` |
| Axis text | `#6b5f55` |
| Annotation accent | `#221a13` |

#### Chart color rules
- Use orange only for hover, selected state, or meaningful emphasis.
- Do not make every series a saturated color.
- Prefer tonal variation over rainbow palettes.
- Keep chart fills muted.

### 8.4 Background and containment
- Chart area background should usually match page or card background.
- Prefer border containment over heavy card shadows.
- Gridlines should be subtle.
- Use white or near-white only when contrast is required inside a contained card.

### 8.5 Axes and gridlines
- Axis labels: `#6b5f55`
- Axis titles: `#4a4039`
- Gridlines: `#c8c3b8`, low emphasis
- Remove unnecessary chart ink
- Avoid thick axes
- Prefer fewer ticks with better labeling

### 8.6 Labels and annotation
- Data labels should be used only when necessary
- Annotation text should use warm text tones
- Important callouts may use `#221a13`
- Hover state or active point can use `#C94B1F`

### 8.7 Chart-specific rules

#### Line charts
Use for:
- trends over time
- comparison between limited time-series

Rules:
- max 2–4 series preferred
- line weight should be clean and readable, not too thin
- avoid area fills unless they provide real clarity
- use orange only for hovered point or key highlighted series
- emphasize the most important series through contrast, not neon

#### Bar charts
Use for:
- comparing categories
- ranking values

Rules:
- vertical bars for few categories
- horizontal bars for long labels or ranked lists
- prefer a single tone for most bars and orange for one highlighted bar
- keep spacing consistent
- avoid unnecessary rounded giant pills unless stylistically matched to component context

#### Stacked bar charts
Use for:
- part-to-whole comparison across categories

Rules:
- use only when comparison remains legible
- keep number of segments small
- use tonal range, not rainbow categories

#### Area charts
Use sparingly.

Rules:
- only for cumulative or volume-oriented time trends
- fill should be subtle and low opacity
- line edge should remain readable

#### Donut / pie charts
Use only when:
- category count is very small
- part-to-whole relationship is obvious

Rules:
- 2–4 segments maximum preferred
- use direct labels where possible
- do not use pie charts for precise comparison
- prefer bar charts if there are many categories

#### Scatter plots
Use for:
- relationships or distribution

Rules:
- subtle point styling
- highlight key points with orange only when meaningful
- annotate outliers instead of oversaturating the chart

#### Heatmaps
Use for:
- density, matrix-style patterns, frequency

Rules:
- use warm sequential scales
- avoid overly bright diverging palettes unless the data specifically requires it
- ensure labels remain legible

### 8.8 Dashboard composition
A Chai dashboard should feel like an editorial workspace, not a control tower.

Rules:
- mix charts with text summaries
- use stat cards sparingly and meaningfully
- combine narrative insight with numbers
- do not stack too many charts without interpretation
- every chart should answer a question

Recommended dashboard flow:
1. headline / takeaway
2. key stats
3. trend or comparison chart
4. detailed breakdown table or secondary chart
5. notes / explanation / next steps

### 8.9 Stat cards
Stat cards are preferred when one value matters more than a full chart.

Rules:
- large headline number
- short label
- optional change indicator
- optional comparison context
- avoid unnecessary microchart unless it adds real value

Example structure:
- label
- main value
- delta
- timeframe/context

### 8.10 Tables vs charts
Use a table when:
- exact values matter
- users need scanning, lookup, or export thinking
- there are many categories
- values are close and hard to distinguish visually

Use chart + table when:
- users need both quick pattern recognition and exact values

### 8.11 Visualization motion
- hover should be subtle
- selected states may use orange accent
- animations should be fast and low-amplitude
- avoid long loading morphs or dramatic transitions

### 8.12 Visualization accessibility
- never rely only on color to distinguish series
- use labels, patterns, emphasis, or ordering when needed
- ensure axis labels are readable
- orange highlight must still meet contrast needs in context
- interactive chart states must be keyboard reachable if the chart is interactive

### 8.13 Data density rules
- high-density data should prefer tables, sparklines, or grouped summaries over overloaded charts
- reduce noise before adding decoration
- collapse secondary information where necessary

### 8.14 Recommended visualization defaults
- chart title: 16px–20px, strong weight
- chart subtitle / notes: 14px–16px
- axis labels: 12px–14px
- stat card number: large and bold
- default chart border container: `1px solid #c8c3b8`
- default hover accent: `#C94B1F`

---

## 10. Illustration, Imagery, and Iconography

### 9.1 Illustration style
- Flat fills only
- Use palette colors only
- 2–3px line weight
- Slightly human, not overly geometric
- Warm, quiet, and supportive

### 9.2 Imagery rules
- Prefer artwork or context-specific imagery over generic corporate stock
- Screenshots should sit inside clean containers
- Photography, if used, should feel warm and natural

### 9.3 Icons
- Keep icons simple and readable
- Avoid overly futuristic or glossy icon style
- Use warm text tones by default
- Orange can be used for selected or hover states only

---

## 11. Interaction and Motion

### 10.1 Interaction principles
- Response should be obvious
- Feedback should be subtle
- Hover should help, not entertain

### 10.2 Hover behavior
- Text/link hover may use `#C94B1F`
- Surface hover may use `#f5f4f1`
- Dark buttons may reduce opacity and shift text accent to gold

### 10.3 Active behavior
- Optional `scale(0.98)`
- Slight opacity reduction allowed
- Avoid bouncy or playful motion unless the product specifically needs it

### 10.4 Focus behavior
- Focus ring: `#3b82f6` at 50% opacity
- Focus must remain visible and accessible

### 10.5 Selection behavior
- Text selection should feel warm and readable.
- Preferred light theme selection: `#d4c9b5` background with `#221a13` text.
- Preferred dark theme selection: a lighter warm brown fill that still preserves foreground readability.
- Never let selected text become harder to read than unselected text.
- Checked and selected form controls should also remain within the theme palette; avoid default OS/browser accent colors unless explicitly desired.

### 10.6 Motion rules
- Use short, functional transitions
- Avoid heavy parallax, blur transitions, glass effects, or dramatic zooms
- Motion should support clarity

---

## 12. Content and Tone

### 11.1 Tone
- clear
- warm
- direct
- specific
- helpful

### 11.2 Preferred writing style
- explain what matters
- reduce jargon when possible
- use active voice
- do not sound like generic marketing copy

### 11.3 UI copy examples
- good: `Make better decisions.`
- good: `Get started — free.`
- good: `Something went sideways — let's fix it.`

### 11.4 Writing rules
- headings should be concise
- body copy should be useful, not ornamental
- empty states should guide the next step
- microcopy should remove ambiguity

---

## 13. Responsive Rules

### 12.1 Breakpoints
| Name | Width | Behavior |
|---|---|---|
| Mobile Small | `<425px` | single column, compact spacing |
| Mobile | `425px–640px` | larger touch targets |
| Tablet | `640px–768px` | two-column layouts begin |
| Tablet Large | `768px–1024px` | expanded layout |
| Desktop | `1024px–1280px` | full layout, multi-column grids |
| Large Desktop | `1280px–1536px` | wider margins |
| Extra Large | `>1536px` | centered max-width |

### 12.2 Responsive behavior
- nav collapses to hamburger
- multi-column layouts reduce progressively
- display typography scales down
- dense tables may require horizontal scroll or alternate card layout
- charts should simplify on smaller screens

### 12.3 Mobile visualization guidance
- prefer single chart per section
- reduce axis clutter
- move legends below if needed
- switch to table/card summaries if chart readability breaks down

---

## 14. Accessibility Rules

### 13.1 Core rules
- maintain readable contrast
- do not rely only on color
- keep focus states visible
- use semantic structure
- support keyboard access

### 13.2 Text accessibility
- body text should remain readable against warm surfaces
- placeholder text should not be the only label
- avoid low-contrast tiny text in key workflows

### 13.3 Chart accessibility
- use labels and annotations where needed
- support screen-reader summaries for important visualizations
- ensure critical data is also available as text or table when necessary

### 13.4 Motion accessibility
- motion should not be required to understand meaning
- avoid distracting animation loops

---

## 15. Implementation Rules

### 14.1 CSS / token guidance
Use tokens instead of hardcoding values where possible.

Suggested token groups:
- colors
- typography
- spacing
- radius
- border
- elevation
- motion
- chart tokens

### 14.2 Suggested token examples
```css
--chai-bg: #fdfdf8;
--chai-surface: #eeeae3;
--chai-surface-2: #e4dfd6;
--chai-text: #4a4039;
--chai-text-strong: #221a13;
--chai-accent: #C94B1F;
--chai-border: #c8c3b8;
--chai-border-light: #b8b2a8;
--chai-primary-action: #221a13;
--chai-control-accent: currentColor;
--chai-focus: rgba(59, 130, 246, 0.5);
--chai-shadow-floating: 0px 25px 50px -12px rgba(0,0,0,0.20);
--chai-selection-bg: #d4c9b5;
--chai-selection-fg: #221a13;
````

### 14.3 Tailwind guidance

If implemented in Tailwind:

* extend theme with named tokens
* do not rely on arbitrary values everywhere
* create reusable component classes for buttons, cards, inputs, table shells, chart containers

### 14.4 Component consistency rules

* variants should be systematic
* charts should use shared style defaults
* spacing should follow scale
* border and radius values should not drift between teams/components

---

## 16. Do / Don’t

### Do

* use warm text and border tones
* keep `#fdfdf8` as the base background
* use IBM Plex Sans with strong headings
* keep body line-height generous
* use orange hover feedback consistently
* prefer flat surfaces and border-based structure
* make charts calm and readable
* use tables when values need precision

### Don’t

* don’t switch to blue/purple/cool-neutral branding
* don’t overuse shadows
* don’t use pure white as the base canvas
* don’t use gradients by default
* don’t use orange as constant decoration everywhere
* don’t overload dashboards with too many charts
* don’t use pie charts when bars would be clearer
* don’t hide critical data behind color alone

---

## 17. Quick Reference

### 16.1 Core tokens

```txt
Primary Text:       #4a4039
High Emphasis:      #221a13
Hover Accent:       #C94B1F
Dark CTA:           #1e1f23
Button Surface:     #e4dfd6
Page Background:    #fdfdf8
Border:             #c8c3b8
Placeholder:        #9c948c
Focus Ring:         #3b82f6 @ 50%
```

### 16.2 Common component defaults

* page bg: `#fdfdf8`
* card border: `1px solid #c8c3b8`
* input bg: `#eeeae3`
* standard radius: `4px`
* larger radius: `6px`
* floating shadow: `0px 25px 50px -12px rgba(0,0,0,0.20)`

### 16.3 Visualization defaults

* primary series: `#4a4039`
* secondary series: `#6b5f55`
* highlight: `#C94B1F`
* gridline: `#c8c3b8`
* axis label: `#6b5f55`
* chart container: bordered, flat, warm
