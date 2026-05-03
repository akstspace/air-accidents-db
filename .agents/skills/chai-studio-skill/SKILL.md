---
name: chai-studio-skill
description: Use when a project is connected to Chai Studio MCP for application-aware design system work, Chai-governed redesigns, preset/ruleset selection, UI audits, audit uploads, canvas management, journal entries, violation follow-up, or website exploration via Chrome DevTools MCP. Triggers when the user mentions Chai Studio, chai-studio.yaml, design-studio.yaml, Chai MCP, design presets, audit rulesets, redesign workflow, uploading UI audit results, syncing project design guidance with MCP, canvases, journals, or website exploration.
license: MIT
metadata:
  version: 2.0.0
  owner: akshayt
  short-description: Use Chai Studio MCP for design rules, audits, canvases, journals, and website exploration
---

# Chai Studio MCP

Use this skill to make Chai Studio MCP the only source of truth for design context, audit rules, canvas planning, and journal documentation. Also supports Chrome DevTools MCP for evidence-driven website exploration and artifact creation.

## First Move

Before every other Chai Studio action, run the setup and sync gate below. This is mandatory for redesigns, audits, fixes, rule checks, preset lookups, canvas work, journal entries, website exploration, and any tool use that depends on Chai Studio context.

1. Look for `chai-studio.yaml` at the project root and ensure `chai-studio.yaml` is listed in `.gitignore`.
2. If `chai-studio.yaml` is missing but `design-studio.yaml` exists, parse `design-studio.yaml`, call `applications.get`, and look for a matching application by exact application name.
3. If a match is found, create `chai-studio.yaml` from that application, then run the sync gate below.
4. If no match is found and `design-studio.yaml` is valid, ask the user for explicit approval to create a Chai Studio application from it. Only after approval call `applications.yaml.create({ content, approved: true })`, then write the returned `design-studio.yaml` content and create `chai-studio.yaml`.
5. If neither file exists, call `applications.get`, ask the user to choose which application to configure, create `chai-studio.yaml`, then call `applications.yaml.get({ applicationId })` and write the returned content to `design-studio.yaml`.
6. Read the configured application, preset, and audit rulesets from `design-studio.yaml` before editing UI or running audits.
7. Delete any existing local design mirror files (`DESIGN.md`, `DESIGN-RULES.md`, `design.yaml`, or similar local design-spec copies) and do not recreate them.

`design-studio.yaml` must remain Chai Studio database agnostic. Do not write `application.id`, `preset.id`, `rulesets[].id`, `createdAt`, `updatedAt`, or other Chai Studio DB fields into it. Use IDs only in `chai-studio.yaml` and MCP tool input/output metadata.

`design-studio.yaml` is not supposed to be manually edited. Treat it as a synced Chai Studio artifact: update it by calling `applications.yaml.get` or, when local changes are intentional, by running `applications.yaml.sync` with the required user approval flow.

## Mandatory Sync Gate

After project identity is resolved and before every Chai Studio operation:

1. Call `applications.yaml.get({ applicationId })` and read its `lastUpdated`.
2. Read local `design-studio.yaml` and its top-level `lastUpdated`.
3. If the MCP `lastUpdated` is older than local `design-studio.yaml`, call `applications.yaml.sync({ applicationId, content, approved: false })` to get the diff. Show the diff summary to the user and ask for approval. Only after approval call `applications.yaml.sync({ applicationId, content, approved: true })`, then replace local `design-studio.yaml` with the returned `content` and update `chai-studio.yaml`.
4. If the MCP `lastUpdated` is newer than local `design-studio.yaml`, replace local `design-studio.yaml` with `applications.yaml.get` content and update `chai-studio.yaml`.
5. If timestamps match, keep using local `design-studio.yaml`; if the file is missing or invalid, replace it with `applications.yaml.get` content.

For the config schema and examples, read `references/config.md`.
For full workflows, redesign protocol, and payload patterns, read `references/workflows.md`.

## Default Project Contract

`chai-studio.yaml` identifies the project's default Chai Studio application. Once present, use it without repeatedly asking the user:

- `applicationId`: default application for audits, canvases, and design context.
- `presetId`: preferred design preset; verify against Chai Studio when possible.
- `auditRuleSetIds`: default rulesets for audit uploads. Pick this from the selected application's `auditRuleSetIds`, then validate them with `rulesets.get` using `applicationId`.
- `sync.lastApplicationYamlUpdatedAt`: last MCP application YAML timestamp written locally.

Do not invent IDs. Fetch them from Chai Studio MCP.

## MCP Tool Map

### Read / Context Tools

- `profile.get`
  - **Purpose**: Confirm authentication when the connection is uncertain.
- `applications.get`
  - **Purpose**: Fetches all applications belonging to the authenticated user.
  - **Includes**: Crucial metadata linking each app to its design system (`presetId`) and its array of connected audit rulesets (`auditRuleSetIds`).
- `applications.yaml.get`
  - **Input**: `applicationId`
  - **Purpose**: Returns `design-studio.yaml` content with application details, full linked preset, full linked rulesets, and `lastUpdated`.
- `design.docs.get`
  - **Input**: `applicationId`
  - **Purpose**: Legacy markdown design representation derived from the linked preset. Prefer `applications.yaml.get` + `design-studio.yaml` as the project source-of-truth file.
- `rulesets.get`
  - **Input**: `applicationId`, optional paging (`page`, `pageSize`)
  - **Purpose**: Fetches audit rule sets linked to a specific application.
- `rulesets.rules.get`
  - **Input**: `rulesetId`, optional paging (`page`, `pageSize`)
  - **Purpose**: Fetches rules from a specific ruleset.
- `presets.get`
  - **Input**: optional paging (`page`, `pageSize`)
  - **Purpose**: Fetches all raw design presets configuration data associated with the user.
- `fonts.list`
  - **Input**: optional `query` string for filtering
  - **Purpose**: Lists all Google Fonts supported by Chai Studio preset typography selectors.
- `audits.get`
  - **Input**: optional `applicationId`, optional `includeArchived`
  - **Purpose**: Fetches the history of audit runs (id, status, severity counts, etc).
- `audits.violations.get`
  - **Input**: `auditId`, optional filters (`status`, `severity`, `category`)
  - **Purpose**: Fetches the granular violations for a specific audit. Crucially, each finding returns an `aiFixPrompt`, the exact `codeSnippet`, and guidance to allow an agent to immediately patch the failing file.
- `canvases.annotations.get`
  - **Input**: `pageId`, optional `status` filter (`open` | `fixed`)
  - **Purpose**: Fetches annotations for a canvas page. Use this to read open instructions before fixing them.
- `journals.list`
  - **Purpose**: Lists user journals and entries.

### Write / Management Tools

- `applications.create`
  - **Input**: `name`, `description`, `presetId`, `rulesetIds`
  - **Purpose**: Creates an application linked to an existing preset and one or more existing rulesets.
- `rulesets.create`
  - **Input**: `name`, `description`, `citationUrl`, `rules`
  - **Purpose**: Creates a standalone ruleset.
- `rulesets.rules.add`
  - **Input**: `rulesetId`, `rule`
  - **Purpose**: Attaches an existing rule object to a ruleset by ID.
- `presets.create`
  - **Input**: `preset` (JSON design document)
  - **Purpose**: Creates a preset from a JSON design document representation (not YAML text).
- `applications.yaml.create`
  - **Input**: `content`, `approved`
  - **Purpose**: Creates a new application, linked preset, and linked rulesets from valid `design-studio.yaml`. Requires explicit user approval before `approved: true`.
- `applications.yaml.sync`
  - **Input**: `applicationId`, `content`, `approved`
  - **Purpose**: Diffs local `design-studio.yaml` against Chai Studio and updates the linked preset/rulesets only after explicit user approval.

### Audit Tools

- `audits.runs.start`
  - **Input**: `applicationId`, `auditRuleSetId`, optional `summary`, optional `totalRulesEvaluated`
  - **Purpose**: Creates one audit run before analysis so findings can be uploaded as they are discovered.
- `audits.violations.add`
  - **Input**: `auditId`, `violation`
  - **Purpose**: Uploads one violation to the existing audit run. The server skips duplicates for the same audit when the same rule/file/line/snippet/description is uploaded again.
- `audits.runs.complete`
  - **Input**: `auditId`, `status`, optional `summary`, optional `totalRulesEvaluated`
  - **Purpose**: Marks a streaming audit run `completed` or `failed` after all findings have been uploaded.
- `audits.violations.status.update`
  - **Input**: `violationId`, `status`, optional `resolvedBy`
  - **Purpose**: Allows the agent or IDE to automatically mark an open violation as resolved, ignored, or a `false_positive`. If all violations in an audit run are squashed, this tool auto-resolves the parent audit status.

### Canvas Tools

- `canvases.create`
  - **Input**: `applicationId`, `name`
  - **Purpose**: Creates a canvas under an application for planning UI surfaces. Canvas pages are built as React component JSX.
- `canvases.pages.create`
  - **Input**: `canvasId`, `title`, optional `generationStatus`, `layout`, `componentTsx`
  - **Purpose**: Creates a page inside a canvas using React component JSX.
- `canvases.pages.update`
  - **Input**: `pageId`, optional `title`, `generationStatus`, `layout`, `componentTsx`
  - **Purpose**: Updates an existing canvas page JSX and generation state.
- `canvases.pages.links.create`
  - **Input**: `canvasId`, `fromPageId`, `toPageId`, optional `label`, `labelOffsetX`, `labelOffsetY`, `conditionExpr`, `metadata`
  - **Purpose**: Creates a directed link between two pages in the same canvas. Use `labelOffsetX` and `labelOffsetY` to position the label text relative to the midpoint of the connecting line (positive = right/down, negative = left/up).
- `canvases.pages.links.update`
  - **Input**: `linkId`, optional `fromPageId`, `toPageId`, `label`, `labelOffsetX`, `labelOffsetY`, `conditionExpr`, `metadata`
  - **Purpose**: Updates an existing directed link between pages in an owned canvas. Use `labelOffsetX` and `labelOffsetY` to reposition the label text.
- `canvases.annotations.create`
  - **Input**: `pageId`, `x`, `y`, optional `componentPath`, `instruction`
  - **Purpose**: Adds an annotation to a canvas page at a specific coordinate with an instruction for the AI agent to fix.
- `canvases.annotations.status.update`
  - **Input**: `annotationId`, `status` (`open` | `fixed`)
  - **Purpose**: Marks a canvas annotation as fixed or reopens it. Use this after the AI agent has addressed the instruction.
- `canvases.base.css.get`
  - **Input**: optional `canvasId`
  - **Purpose**: Returns the base utility CSS framework mapped to the linked application preset. Provides `presetMappedCss` with `:root` design tokens, component classes, and dark mode variants. Use this as the foundation for canvas shared CSS.
- `canvases.css.get`
  - **Input**: `canvasId`
  - **Purpose**: Fetches the shared CSS stylesheet for a canvas. Pages inherit this CSS automatically — use it to understand existing design tokens before writing new page markup.
- `canvases.css.update`
  - **Input**: `canvasId`, `css`
  - **Purpose**: Updates the shared CSS stylesheet for a canvas. All pages in the canvas inherit this CSS automatically — write page React TSX in `componentTsx` and keep styling token-driven. Use this to define design tokens, component styles, and layout primitives once per canvas.
- `canvases.artifacts.render_preview`
  - **Input**: `markup`
  - **Purpose**: Sanitizes AI-generated markup and returns secure rendering metadata (`sanitizedMarkup`, `csp`, `sandbox`).

### Shadcn Development Tools (Non-Canvas)

- `shadcn.component.list`
  - **Input**: `applicationId`
  - **Purpose**: Lists themed component names available for generation via `shadcn.component.get`.
- `shadcn.component.get`
  - **Input**: `applicationId`, `componentName`
  - **Purpose**: Returns themed component TSX for real product development (not canvas-only mockups).
- `shadcn.css.get`
  - **Input**: `applicationId`
  - **Purpose**: Returns preset-mapped CSS tokens for product development.

### Journal Tools

- `journals.create`
  - **Input**: `name`, `kind` (`design` | `personal`)
  - **Purpose**: Creates a new journal for the authenticated user.
- `journals.entries.create`
  - **Input**: `journalId`, `title`, `markdown`
  - **Purpose**: Creates a markdown journal entry in a journal.
- `journals.entries.update`
  - **Input**: `entryId`, optional `title`, optional `markdown`
  - **Purpose**: Updates an existing journal entry's title and/or markdown content.

Name hygiene matters: use the exact dot-notation MCP tool names when calling them. Do not rename or alias tools.

`design-studio.yaml` is the only local design source-of-truth file for this skill, and it must be generated or synced through Chai Studio using `applications.yaml.get` and `applications.yaml.sync`.

If there is a `DESIGN.md`, `DESIGN-RULES.md`, `design.yaml`, or other local design mirror file already present in the workspace, you MUST delete it. The source of truth is strictly the Chai Studio MCP server. Do not create or maintain local design mirror docs outside `design-studio.yaml` synced from Chai Studio.

## Redesign Flow

### Mandatory Execution Choice (Ask First)

When a user asks to redesign a screen or design a new feature, the agent must ask this first before implementation:

1. **Canvas-first**: "Do you want to plan this in a canvas first, then implement?"
2. **Direct code changes**: "Do you want me to implement directly in code now?"

If the user chooses **direct code changes**, ask one more required question:

- "Do you want me to reference existing canvas context (pages, links, annotations) to understand the intended flow, or continue without canvas context?"

Then proceed based on the user's answer:

- **Direct + with canvas context**: read canvas pages/links/annotations first, extract flow and states, then implement code changes.
- **Direct + without canvas context**: implement directly from prompt + repository context.
- **Canvas-first**: run the full Canvas Flow before product-code edits.

When the user asks to redesign a page, component, app surface, visual system, or interaction, read `references/workflows.md#redesign-workflow` and follow that protocol. The mandatory loop is:

1. **Context**: Run the mandatory setup/sync gate, read `chai-studio.yaml`, then use `design-studio.yaml`, `presets.get`, and `rulesets.get` when needed. **Fetch linked rulesets via `rulesets.get({ applicationId })` before designing** — review the rules so the redesign complies with the application's audit constraints from the start, not just after an audit finds violations.
2. **Plan**: Identify affected files/routes/components and translate Chai Studio preset/ruleset constraints into implementation decisions.
3. **Implement**: Redesign with `design-studio.yaml` and linked rulesets as the source of truth.
4. **Validate**: After write changes are done, always run the project build when a build command is available, plus relevant static checks. If Chrome DevTools MCP or Playwright MCP is available, ask the user whether they want browser tests/review through those MCPs.
5. **Audit**: Reconcile prior audits, then create a fresh streaming audit run per configured ruleset.
6. **Fix only when requested**: Treat remediation as a separate flow. Do not implement fixes for audit findings unless the user explicitly asks to fix, remediate, resolve, close, or update selected violations.
7. **Document in design journal**: After the redesign is complete, create or update a design journal entry (see Design Journal Entry Contract below).

Do not stop after a visual pass. A Chai Studio redesign is complete only after implementation, validation, audit upload, verified status updates for issues already fixed by the redesign are handled or explicitly blocked, and a design journal entry is created. Remaining audit findings should be reported as open unless the user asked for remediation.

## Shadcn Development Flow (Product Code)

Use this flow when the user asks to implement or scaffold real UI in the codebase (not canvas planning):

1. Resolve `applicationId` from `chai-studio.yaml`.
2. Call `shadcn.css.get({ applicationId })` to obtain preset-mapped tokens.
3. Call `shadcn.component.list({ applicationId })` to inspect available themed components.
4. Call `shadcn.component.get({ applicationId, componentName })` for component TSX you need.
5. Integrate returned TSX into product code paths (`components/ui/...`) following repo conventions.
6. Validate build/tests, then continue normal audit/journal process when applicable.

## Canvas Flow

When the user asks to plan, wireframe, or design a multi-page flow using Chai Studio canvases:

1. **Resolve**: Run the mandatory setup/sync gate and identify the configured `applicationId`. Fetch the linked preset via `presets.get` or `applications.yaml.get` to extract design tokens. **ALSO fetch linked rulesets via `rulesets.get({ applicationId })` and REVIEW EVERY RULE before designing.** The canvas pages MUST comply with ALL linked rulesets from the start — this is NOT optional. High/critical severity rules are absolute prohibitions. Do not wait for an audit to discover violations.
2. **Create canvas**: Call `canvases.create` with the application ID and a descriptive name. The canvas is created with a default shared CSS template.
3. **Update canvas CSS from preset** (CRITICAL): Before creating any pages, call `canvases.base.css.get({ canvasId })` to fetch the base utility CSS **already mapped to the linked application preset**. The response includes `presetMappedCss` with `:root` tokens, component classes, and dark mode variants. Call `canvases.css.update({ canvasId, css: presetMappedCss })` to set the shared stylesheet. **Do NOT modify/update canvas CSS again unless additional components/overrides are truly needed beyond the preset output.**
4. **Create pages**: Call `canvases.pages.create` for each screen in the flow.
   - Store React component code in `componentTsx` (function component source).
   - Use `layout.x` and `layout.y` to set initial position on the canvas board.
   - Keep TSX theme-neutral and theme-aware; canvas-level theme toggle controls rendering mode. Always support both light and dark token paths.
   - **Apply spacing discipline:** Every container MUST have explicit padding (`.p`, `.px`, `.py`). Every flex/grid parent MUST have explicit gap (`.gap`, `.gap-x`, `.gap-y`). Never leave content touching edges. Use the spacing scale consistently (multiples of `var(--spacing)`).
   - **Follow the Canvas Design Quality Checklist** before marking any page `done`. A page is only complete when spacing, ruleset compliance, theme tokens, typography, and component usage are all verified.
5. **Link pages**: Call `canvases.pages.links.create` to define navigation flows between pages.
6. **Read open annotations first**: Before modifying any existing canvas page, call `canvases.annotations.get({ pageId, status: "open" })` to discover pending fix instructions. Address them before adding new annotations.
7. **Annotate**: Call `canvases.annotations.create` to place fix instructions or design notes on specific coordinates of a page.
8. **Update page status**: As pages are designed or built incrementally, use the streaming status pattern:
    - Create with `generationStatus: "generating"` when work begins.
    - Call `canvases.pages.update` with `generationStatus: "done"` when finished successfully.
    - Call `canvases.pages.update` with `generationStatus: "error"` if generation fails.
9. **Reconcile annotations**: After addressing an annotation's instruction, call `canvases.annotations.status.update` to mark it `fixed`. If a fix turns out to be incorrect or incomplete, the annotation can be reopened with `status: "open"`.
10. **Document in design journal**: After canvas work is complete, create a design journal entry summarizing the flow, pages created, and design decisions (see Design Journal Entry Contract below).

Canvas pages carry a `constraintsSnapshot` derived from the application's preset and rulesets at creation time. This lets future agents know which design system was in force when the page was planned.

### Canvas CSS-First Contract

**Always set the shared CSS before creating pages.** The canvas creates a default CSS template, but it is generic. The agent must:

Canvas preview styling is the **merged result** of:
1. Base preset-mapped CSS from `canvases.base.css.get` (`presetMappedCss`)
2. Additional shared `canvas.css` overrides (only when needed)

1. Call `canvases.base.css.get({ canvasId })` to fetch the base utility CSS framework already mapped to the linked application preset.
2. The response includes `presetMappedCss` — a complete stylesheet with:
   - `:root` CSS custom properties mapping preset tokens (e.g., `--color-bg`, `--color-fg`, `--color-brand-bg`, `--radius-md`, `--spacing`, `--font-family`, `--shadow-sm`)
   - Preset-mapped component classes (`.card`, `.btn`, `.btn-secondary`, `.stack`, `.row`, `.text-muted`, `.surface`, `.surface-elevated`)
   - Dark mode token variants (`--dark-color-bg`, etc.)
3. Call `canvases.css.update({ canvasId, css: presetMappedCss })` to set the shared stylesheet.
4. **Only if needed**, append additional custom styles (keyframes, layout tokens, or components the preset does not cover) and update CSS again. Otherwise, do not touch shared CSS after the initial preset-mapped update. The preview applies this as a merge on top of base preset-mapped CSS. All overrides MUST reference preset tokens (e.g., `background: var(--color-surface); border-radius: var(--radius-md);`) — do not introduce hardcoded values.
5. Verify by calling `canvases.css.get({ canvasId })`.

**Do not inline CSS in TSX.** Pages should use utility/component classes and tokenized style props in `componentTsx`. Shared CSS is injected automatically by the canvas preview renderer.

### Canvas Page Content Contract

Pages store content with specific keys:

- `componentTsx`: React component TSX source (string).
- `layout.x`: X coordinate on the canvas board (number).
- `layout.y`: Y coordinate on the canvas board (number).

**Wireframe guidelines:**
- **Navigation between pages** should be represented via `canvases.pages.links.create` (visible on the canvas board), not route wiring inside preview JSX.
- `componentTsx` should evaluate to a React function component.
- Use `className` (not `class`) in JSX and keep layout responsive.
- You may use interactive JSX states/handlers for preview behavior, but avoid external side effects/network calls.
- **Image sources:** Use trusted URLs (`https:` preferred).
- Focus on **layout, structure, and visual hierarchy** while keeping components realistic.

Example page creation:

```json
{
  "canvasId": "canvas-id",
  "title": "Welcome Screen",
  "generationStatus": "done",
  "layout": { "x": 100, "y": 150 },
  "componentTsx": "() => (<div className=\"card\"><h1>Welcome</h1><p className=\"text-muted\">Get started today.</p><button className=\"btn\">Start</button></div>)"
}
```

### Canvas Design Quality Checklist

Before finalizing any canvas page, verify every item below. A "perfect" wireframe requires disciplined spacing, ruleset compliance, and professional visual hierarchy.

#### Spacing & Layout (MUST CHECK)
- [ ] Every container has explicit padding (`.p`, `.px`, `.py`, or component default).
- [ ] Every flex/grid parent has explicit gap (`.gap`, `.gap-x`, `.gap-y`).
- [ ] No content touches container edges unless explicitly designed to bleed.
- [ ] Spacing follows the scale (multiples of `var(--spacing)`: 2, 4, 6, 8, 12, 16). No arbitrary pixel values mixed with scale values.
- [ ] Vertical rhythm is consistent across sections.
- [ ] Layout is responsive: uses `display-flex`, `display-grid`, `flex-wrap`, `w-full`, `minmax()`, `fr` units. No fixed pixel widths like `width: 1200px`.

#### Ruleset Compliance (MUST CHECK)
- [ ] Reviewed linked rulesets via `rulesets.get({ applicationId })` BEFORE designing.
- [ ] No ruleset violations are present: no nested cards if prohibited, no low-contrast text, no decorative motion if restricted, no weak typography hierarchy, no ungrounded dark-mode glow.
- [ ] All high/critical severity rules are explicitly respected.
- [ ] If a ruleset prohibits a pattern (e.g., "no generic shadow stacks"), the wireframe uses semantic shadow tokens (`--shadow-sm`, `--shadow-md`) from the preset instead.

#### Theme & Tokens (MUST CHECK)
- [ ] All colors reference preset tokens (`--color-bg`, `--color-fg`, `--color-surface`, etc.).
- [ ] Dark mode tokens are provided wherever light tokens are used (`--dark-bg` paired with `--bg`, `--dark-color` paired with `--color`).
- [ ] No hardcoded hex colors or `style="background: white"` without dark variants.
- [ ] Body text and background inherit from base CSS — no `<body style="background: ...">`.

#### Typography & Hierarchy (MUST CHECK)
- [ ] Heading levels are semantically correct (`<h1>` → `<h2>` → `<h3>`).
- [ ] Font sizes use preset tokens (`text-sm`, `text-lg`, `text-xl`, etc.) or `--font-size` variables.
- [ ] Text has sufficient contrast against its background in both light and dark themes.
- [ ] Muted/secondary text uses `.text-muted` or `--color-muted-fg`.

#### Component Usage (MUST CHECK)
- [ ] Uses provided component classes (`.card`, `.btn`, `.stack`, `.row`, `.surface`) instead of recreating them manually.
- [ ] Buttons use `.btn` for primary and `.btn-secondary` for secondary actions.
- [ ] Cards use `.card` with preset-mapped padding and radius.

#### Content & Structure (MUST CHECK)
- [ ] `componentTsx` is valid React function-component TSX and uses `className` correctly.
- [ ] No `href` attributes for inter-page navigation (use `canvases.pages.links.create`).
- [ ] Avoid external side effects (network calls, storage writes) in preview JSX.
- [ ] Images use `https:` or `blob:` URLs only.
- [ ] Focus is on layout, structure, and visual hierarchy — not functionality.

**If any checklist item is not met, the page is NOT complete.** Fix it before calling `canvases.pages.update` with `generationStatus: "done"`.

### Canvas JSX Utility Framework

Canvas preview executes `componentTsx` with a pre-provided `UI` runtime. Use these directly in page components (do not import local files inside canvas TSX):

- Core: `UI.Box`, `UI.Text`, `UI.Heading`, `UI.Stack`, `UI.Row`, `UI.Container`
- Actions: `UI.Button` (default, secondary, outline, ghost, danger, success, warning, info), `UI.ButtonGroup`, `UI.Toggle`, `UI.ToggleGroup`
- Surfaces: `UI.Card`, `UI.CardHeader`, `UI.CardTitle`, `UI.CardDescription`, `UI.CardContent`, `UI.CardFooter`, `UI.CardElevated`
- Inputs: `UI.Input`, `UI.Textarea`, `UI.Label`, `UI.Select`, `UI.InputGroup`, `UI.InputOTP`, `UI.Checkbox`, `UI.RadioGroup`, `UI.RadioItem`, `UI.Switch`, `UI.Slider`
- Feedback: `UI.Badge`, `UI.Alert`, `UI.AlertDialog`, `UI.Progress`, `UI.Skeleton`, `UI.Spinner`, `UI.Empty`, `UI.Sonner`
- Overlay: `UI.Dialog`, `UI.Drawer`, `UI.Sheet`, `UI.Popover`, `UI.HoverCard`, `UI.Tooltip`
- Data/Nav: `UI.Table`, `UI.Tabs`, `UI.TabsList`, `UI.TabsTrigger`, `UI.TabsContent`, `UI.Accordion`, `UI.AccordionItem`, `UI.AccordionTrigger`, `UI.AccordionContent`, `UI.Breadcrumb`, `UI.Pagination`, `UI.NavigationMenu`, `UI.Menubar`, `UI.DropdownMenu`, `UI.ContextMenu`, `UI.Command`
- Layout/Media: `UI.ScrollArea`, `UI.Collapsible`, `UI.AspectRatio`, `UI.Carousel`, `UI.Resizable`, `UI.Sidebar`, `UI.Chart`, `UI.Avatar`, `UI.Calendar`, `UI.Form`, `UI.Field`, `UI.Separator`, `UI.Kbd`

Use `shadcn.component.list` to discover currently available names and `shadcn.component.get` for themed TSX when building real app code.

Canvas pages are rendered with `/canvas-base.css` plus a preset-mapped shared stylesheet. For page authoring, prefer the built-in `UI.*` component runtime (shadcn-style primitives) and theme tokens. When implementing changes in the user's codebase, use the project's real component system (typically shadcn/ui).

#### Value-Driven Utilities

Set values via inline `style` attributes using CSS custom properties. The class name is the property.

For JSX pages, use `className` and a React style object equivalent when applying these patterns.

```html
<div class="bg p rounded" style="--bg: var(--color-bg); --p: 4; --rounded: var(--radius-md)">
  Content
</div>
```

| Class | Style Variable | Result |
|-------|---------------|--------|
| `.bg` | `--bg: red` | `background-color: red` |
| `.bg/o` | `--bg: red; --bg-o: 50%` | opacity-mixed background |
| `.p` | `--p: 4` | `padding: calc(var(--spacing) * 4)` |
| `.px` / `.py` | `--px: 4` / `--py: 2` | horizontal / vertical padding |
| `.m` | `--m: 4` | `margin: calc(var(--spacing) * 4)` |
| `.gap` | `--gap: 4` | `gap: calc(var(--spacing) * 4)` |
| `.w` / `.h` | `--w: 4` / `--h: 4` | width / height |
| `.min-w` / `.max-w` | `--min-w: 4` | min/max width |
| `.rounded` | `--rounded: 8px` | `border-radius` |
| `.color` | `--color: red` | `color: red` |
| `.border` / `.border-w` | `--border: red` / `--border-w: 1px` | border color / width |
| `.z` | `--z: 10` | `z-index` |
| `.opacity` | `--opacity: 0.5` | `opacity` |
| `.flex` | `--flex: 1` | `flex: 1` |
| `.grid-cols` | `--grid-cols: 3` | grid columns |
| `.col-span` | `--col-span: 2` | grid column span |

#### Static Utilities

These classes apply fixed declarations without style variables:

| Class | Effect |
|-------|--------|
| `.display-flex` / `.display-grid` / `.display-block` / `.display-hidden` | display utilities |
| `.flex-col` / `.flex-row` | flex direction |
| `.items-center` / `.justify-center` / `.justify-between` / `.justify-end` | flex alignment |
| `.w-full` / `.h-full` | full width / height |
| `.absolute` / `.relative` / `.fixed` / `.sticky` | positioning |
| `.overflow-hidden` | overflow |
| `.font-bold` / `.font-medium` / `.font-semibold` | font weight |
| `.text-sm` / `.text-lg` / `.text-xl` / `.text-2xl` | font size |
| `.rounded-md` / `.rounded-lg` / `.rounded-full` | border radius |
| `.shadow-sm` / `.shadow-md` / `.shadow-lg` | box shadow |

#### Component Classes

The preset-mapped shared CSS provides these components:

| Class | Description |
|-------|-------------|
| `.card` | Card container with background, border, radius |
| `.btn` | Primary button (brand colors) |
| `.btn-secondary` | Secondary button |
| `.stack` | Flex column with gap |
| `.row` | Flex row with gap |
| `.text-muted` | Muted text color |
| `.surface` / `.surface-elevated` | Surface backgrounds |

#### Dark Mode

When generating JSX for canvas pages, you **MUST** make it theme-aware so it works with whichever theme the canvas is set to (light or dark). The application passes the theme state to the preview by adding `class="dark"` to the `<html>` element when dark mode is active.

**DO:**
- Use the provided component classes: `.card`, `.btn`, `.btn-secondary`, `.stack`, `.row`, `.text-muted`, `.surface`, `.surface-elevated`. These automatically switch colors based on the theme state passed by the application.
- Use utility classes with the `dark:` prefix pattern: `class="bg dark:bg color dark:color"` and map them to preset tokens via inline style variables: `style="--bg: var(--color-surface); --dark-bg: var(--dark-color-surface); --color: var(--color-fg); --dark-color: var(--dark-color-fg)"`
- Let body text and background inherit naturally — the base CSS already sets `body { background: var(--color-bg); color: var(--color-fg); }` with `.dark body` overrides based on the theme state.

**DON'T:**
- Use hardcoded colors like `style="background: #fff"` or `style="color: black"` — these won't switch when the application changes the theme.
- Use `style="--bg: white"` without a corresponding `--dark-bg` — it will stay white in dark mode regardless of the theme state.
- Write `<body style="background: ...">` — the base CSS handles body theming automatically based on the theme state.
- Assume light mode is the default — always provide both light and dark token mappings so the markup adapts to whichever theme state the application passes.

```html
<div class="bg dark:bg p rounded" style="--bg: var(--color-bg); --dark-bg: var(--dark-color-surface); --p: 4; --rounded: var(--radius-md)">
  <h2 class="color dark:color" style="--color: var(--color-fg); --dark-color: var(--dark-color-fg)">Adaptive Title</h2>
</div>
```

Component classes (`.card`, `.btn`, `.text-muted`, `.surface`) also have dark mode overrides built into the preset-mapped CSS and switch automatically when the canvas theme is dark.

#### What Is NOT Supported

Do not use these patterns — they are not generated in the CSS:
- State suffixes (`bg:hover`, `color:hover`)
- Responsive prefixes for value-driven utilities (`sm:p`, `md:bg`, `lg:gap`)

Bracket raw value utilities (for example `[px]`, `[top]`) are supported when defined by the base kit.

For interactive states or responsive value-driven utilities in canvas previews, write the CSS manually in the shared `canvas.css` or keep previews static.

### Canvas Annotation Status Contract

Annotation statuses are a toggle between `open` and `fixed`:

- **Always read first**: Call `canvases.annotations.get({ pageId, status: "open" })` before editing a page.
- **Fix then mark**: After implementing the instruction, call `canvases.annotations.status.update({ annotationId, status: "fixed" })`.
- **Reopen when needed**: If a fix is incomplete or regresses, call `canvases.annotations.status.update({ annotationId, status: "open" })`.
- **Never leave orphaned**: Do not create new annotations without either fixing existing open ones or explicitly explaining why they remain open.

### Canvas Page Status Lifecycle

Page statuses follow a deterministic lifecycle:

- `idle`: page exists but generation has not started.
- `started`: generation process started.
- `generating`: AI agent is actively building JSX. The UI polls every 3 seconds for updates.
- `done`: page is finished and ready for review.
- `error`: generation failed; the agent should investigate and retry or update manually.

When generating pages incrementally:
1. Start with `canvases.pages.create({ ..., generationStatus: "started" })`.
2. Do the design or implementation work.
3. Stream progress with `canvases.pages.update({ pageId, generationStatus: "generating", layout, componentTsx })`.
4. Finish with `canvases.pages.update({ pageId, generationStatus: "done", layout, componentTsx })`.
5. If the work fails, use `generationStatus: "error"`.

### Canvas-Level Status Limitations

Canvases expose `theme` and `generationStatus` fields, but there is no general `canvases.update` MCP tool. Use `canvases.pages.update` and `canvases.css.update` for mutable canvas work.

### Canvas Theme Is User-Controlled

Canvases have a `theme` field (`light` | `dark`) that controls the preview rendering mode. When the theme is `dark`, the preview renderer adds `class="dark"` to the `<html>` element, activating dark mode utilities and component overrides.

**The agent must NOT attempt to change the canvas theme.** There is no MCP tool to update it. Theme switching is controlled by the user through the Chai Studio UI toggle. The agent should write markup that is theme-aware (using `dark:` prefixes and `--dark-*` variables) so it renders correctly in whichever mode the user has selected.

### Design Journal Entry Contract

After completing any design work — redesigns, canvas wireframes, ruleset changes, audit remediation, or preset updates — you MUST document the work in a design journal. This creates an auditable history of design decisions.

To handle same-date entries:

1. **List first**: Call `journals.list` to find existing design journals and entries.
2. **Find or create journal**: Look for a journal with `kind: "design"`. If none exists, create one with `journals.create({ name: "Design Log", kind: "design" })`.
3. **Check for today's entry**: Look for an entry with today's date in the title (e.g., "Design Log - 2024-01-15").
4. **Update or create**:
   - If an entry exists for today, **update it** with `journals.entries.update({ entryId, markdown: updatedContent })`. Append the new work summary to the existing entry.
   - If no entry exists for today, create one with `journals.entries.create({ journalId, title: "Design Log - 2024-01-15", markdown })`.

**Entry format:**
```markdown
## Work Summary
Brief description of what was done.

## Decisions
- Decision 1 and rationale
- Decision 2 and rationale

## Files/Routes Affected
- `file1.tsx`
- `file2.tsx`

## Preset/Canvas References
- Canvas: [canvas name]
- Preset: [preset name]

## Notes
Any follow-up items or open questions.
```

## Journal Flow

When the user asks to document design decisions, audit results, or project notes in Chai Studio journals:

1. **List**: Call `journals.list` to see existing journals.
2. **Create if needed**: Call `journals.create` with `kind: "design"` for design documentation or `kind: "personal"` for general notes.
3. **Add entries**: Call `journals.entries.create` with the `journalId`, a `title`, and markdown `content`.

Use journals for post-audit summaries, redesign rationales, and long-form design documentation that does not belong in `design-studio.yaml`.

## Ruleset Management Flow

When the user asks to create or extend audit rulesets:

1. **Create ruleset**: Call `rulesets.create` with a name, description, citation URL, and an array of rule objects.
2. **Add rules**: Call `rulesets.rules.add` to append individual rules to an existing ruleset.
3. **Read rules**: Call `rulesets.rules.get` to inspect the rules in a ruleset.
4. **Link to application**: Use `applications.create` or `applications.yaml.sync` to associate the ruleset with an application.
5. **Document in design journal**: After ruleset work is complete, create a design journal entry summarizing the rules added, rationale, and linked application (see Design Journal Entry Contract below).

Every ruleset automatically includes the design-token compliance rule. Rules must have `id`, `title`, `severity` (`critical` | `high` | `medium` | `low`), `category`, and `guidance`.

### Ruleset Modification Limits

The MCP does not expose tools to edit or remove individual rules from an existing ruleset. To change existing rules:
- **Append only**: Use `rulesets.rules.add` to add new rules.
- **Full replacement**: Modify the ruleset in `design-studio.yaml` and call `applications.yaml.sync` with user approval. This replaces the entire ruleset content.
- **No partial edits**: Do not attempt to call non-existent tools like `rulesets.rules.update` or `rulesets.rules.remove`.

## Website Exploration Flow

When the user asks to create artifacts from an existing website using Chrome DevTools MCP:

1. **Validate input URL**
   - Ensure a URL is present and syntactically valid.
   - Ask the user only if URL is missing or unreachable.
2. **Open and map site structure in Chrome DevTools MCP**
   - Identify main routes/surfaces, header/footer/nav structure, primary flows, and key templates.
3. **Extract design primitives**
   - Colors/tokens: brand, neutrals, semantic states, opacity usage.
   - Typography: families, weights, sizes, line-heights, letter spacing, heading/body/label scales.
   - Spacing/radius/shadows/borders: spacing steps, container widths, corner radius system, elevation model, border usage.
4. **Extract component patterns and states**
   - Buttons, inputs, cards, modals, tables, navigation, badges, alerts, menus.
   - State behavior: hover/focus/active/disabled/loading/error/empty/selected.
   - Interaction patterns: transitions, motion, keyboard affordances, responsive breakpoints.
5. **Normalize findings into structured preset-ready data**
   - Convert extracted styles into a deterministic token model suitable for preset creation.
   - Keep raw evidence links/notes tied to each inferred token.
6. **Propose preset options and ask for preset name**
   - Suggest names from site brand/domain/style.
   - Ask user to choose or provide preset name (blocking question).
7. **Create artifacts through Chai Studio MCP tools**.
8. **Document in design journal**: After exploration is complete, create a design journal entry summarizing findings, extracted tokens, and any presets or canvases created (see Design Journal Entry Contract below).

Keep exploration efficient and repeatable: same route order, same extraction checklist, same normalization schema for each run.

## Project Spec Execution Protocol

To follow Chai Studio project specifications effectively, treat project rules as a layered contract:

1. Run the mandatory setup/sync gate, then read application-level `design-studio.yaml` and extract hard constraints.
2. Read configured rulesets via `rulesets.get({ applicationId })` and map rule IDs/categories/severities.
3. Read configured preset via `presets.get` for token-level styling guidance.

Priority order when rules conflict:

1. Safety and explicit user instruction
2. Chai Studio `design-studio.yaml` hard constraints
3. Chai Studio ruleset severity and guidance
4. Preset/token conventions
5. Explicit user preferences for this task

When producing findings or fixes:

- Keep changes minimal and targeted; do not refactor unrelated surfaces.
- Provide exact path + line/snippet + impact + concrete fix.
- Prioritize critical accessibility, keyboard, focus/dialog, and metadata correctness issues before lower-severity visual polish.
- Avoid introducing prohibited patterns from project specs (for example unnecessary decorative motion or forbidden visual cliches).

## Font Asset Requirement

When implementing or auditing typography, always resolve each configured or chosen font family against Google Fonts first. If the family is available there, download the required font files into the codebase (for example `public/fonts/`, `src/assets/fonts/`, or the repo's established font asset directory) and wire the app to load those local files with the framework's local font API or `@font-face`.

If a required font is not available on Google Fonts, look for the closest suitable alternative, use the best fit for the Chai Studio design context, and document the fallback in the completion report. Use `fonts.list` to discover supported fonts.

## Deterministic Font Fallback Contract

When extracted fonts are unavailable in Chai/platform context:

1. Match by category first: serif, sans-serif, monospace, display.
2. Match by x-height/shape impression and weight coverage.
3. Prefer widely available open/platform fonts.
4. Keep a deterministic priority order per category (example: sans -> Inter -> Noto Sans -> Arial).
5. Report fallback rationale explicitly for each substituted family.

Never silently replace fonts.

## Audit And Fix Boundaries

Auditing and fixing are separate flows:

- An audit request means inspect, reconcile previously fixed violations, validate against configured rulesets, upload a fresh audit run, and report findings. It does not authorize code/UI changes to fix newly discovered findings.
- A fix/remediation request means implement selected fixes, re-validate, and update violation statuses.
- Only fix audit findings when the user explicitly asks to fix, remediate, resolve, close, or update those violations. Phrases like "audit this", "find issues", "upload an audit", or "check compliance" are audit-only.
- During audit reconciliation, it is still correct to mark prior violations `resolved` when they are already fixed in the current code/UI. That status update is not the same as implementing a new fix.

## Audit Standards

Audit flow is strictly:

1. Start audit (`audits.runs.start`).
2. Add violations as the agent finds them (`audits.violations.add` per finding).
3. Stop audit (`audits.runs.complete`).

Fixing audit flow is separate and runs only when the user asks for remediation:

1. Implement the requested code/UI fixes.
2. Re-validate each fix.
3. Update individual violations as each one is fixed (`audits.violations.status.update` per violation).

Audit workflow is mandatory and always two-phase:

1. Reconcile previous audits first.
2. Start and upload a new audit run.

When the user asks for an audit, always run phase 1 before phase 2.
When auditing, regardless of previous conversation context, always execute this full flow and always perform ruleset-based validation against the configured `auditRuleSetIds`.

Audit depth is mandatory:

- Audit each and every relevant page and each and every relevant component in scope.
- Produce granular findings per page/component (do not collapse multiple issues into one vague item).
- Include exact artifact context in every finding: page/screen, component name, file path, and line/snippet when available.
- Component-level adherence is required for every audit: validate border radius, spacing, typography, color/semantic token usage, shadow/border treatment, and interaction states against `design-studio.yaml` and linked rulesets.

Before uploading an audit:

1. Identify the configured app and rulesets from `chai-studio.yaml`.
2. Get previous audits with `audits.get` for the same `applicationId`.
3. For relevant prior runs, fetch findings with `audits.violations.get`.
4. Verify in current code/UI whether prior issues are fixed.
5. For each verified fix, call `audits.violations.status.update` before the new run.
6. Audit the actual files or UI surfaces requested by the user.
7. For each audited component, explicitly check design and rule adherence (including border radius and token-level styling fidelity).
8. Classify each finding into supported MCP categories and severities before upload.
9. Report each violation with exact file path, line/snippet, why it matters, and a concrete suggested fix.
10. Ensure each finding is grounded in Chai Studio `design-studio.yaml` and/or ruleset guidance.
11. Upload only genuine findings unless the user explicitly asks for dummy/test audits.
12. Start one new audit run with `audits.runs.start`, upload each violation immediately with `audits.violations.add`, then call `audits.runs.complete` when finished. If there are zero violations, still start and complete the run.
13. Keep an in-memory set of uploaded finding fingerprints for the current run and skip repeats before calling MCP. Use at least `ruleId`, `filePath`, `lineStart`, `lineEnd`, normalized `codeSnippet`, and normalized `violationDescription` in the fingerprint.
14. If `chai-studio.yaml` has multiple `auditRuleSetIds`, audit each ruleset separately. For every ruleset, create one audit run, evaluate that ruleset's rules, upload only findings from that ruleset to that run, then complete that run before moving on or after finishing the ruleset's pass.

Browser/runtime validation:

- If Chrome DevTools MCP, Playwright MCP, or equivalent browser MCP tooling is available, ask the user whether they want browser tests and runtime review through those MCPs before running them.
- If the user agrees, open the app and validate in runtime in addition to static code review.
- Use browser/devtools-style checks for rendered behavior: accessibility tree/labels, keyboard flow, focus handling, responsive behavior, and interaction states.
- Record whether each finding came from static review, runtime validation, or both.

Build verification:

- Once write changes are complete, always run the project build command when one exists (`build` script, framework build command, or documented equivalent).
- Run the build before final audit upload when feasible, so audit results reflect buildable code.
- If the build cannot run because dependencies, environment variables, or tooling are missing, report the exact blocker and run the strongest available fallback checks.

Each uploaded violation must include a self-contained `aiFixPrompt` that another agent could use without reading the whole conversation.

Chai Studio validation constraints to respect:

- `audits.runs.complete.status` must be `completed` or `failed`.
- Use streaming uploads only (`audits.runs.start` -> `audits.violations.add` -> `audits.runs.complete`).
- `severity` must be one of: `critical`, `high`, `medium`, `low`.
- `category` must be one of: `accessibility`, `visual`, `typography`, `color`, `layout`, `motion`, `interaction`, `responsive`, `metadata`, `performance`, `content`.
- Provide line numbers as positive integers when present.

## Status Updates And Fix Flow

Only mark a violation resolved after verifying the code or UI changed. Use:

- `resolved`: fixed and verified.
- `ignored`: intentionally accepted by the team or outside scope.
- `false_positive`: rule did not actually apply.

When changing statuses, include the resolver identity when available.

When running audits, status reconciliation is mandatory:

- Always check previous audits first.
- Resolve already-fixed violations before creating a fresh audit run.
- Do not skip the new run after reconciliation.

Fix workflow requirement:

- Only run this flow when the user asks to fix, remediate, resolve, close, or update audit entries.
- When the user asks to fix audit entries, implement code/UI fixes for the selected violations.
- After each fix, re-validate (runtime when available).
- Then call `audits.violations.status.update` so each fixed item is marked appropriately (`resolved`, `ignored`, or `false_positive` with evidence).

## Safety

- Do not create dummy audits unless the user asks for test data.
- Do not create or update local design-spec mirror files (`DESIGN.md`, `DESIGN-RULES.md`, `design.yaml`, or alternatives) as part of this skill. Keep only `design-studio.yaml` synced from Chai Studio.
- Do not migrate UI libraries, rewrite the design system, or refactor broad UI areas just to satisfy an audit.
- Prefer Chai Studio IDs and tokens over memory or guesses.
