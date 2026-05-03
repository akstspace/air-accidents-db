# Chai Studio MCP Workflows

This reference covers the operations the skill should perform after resolving `chai-studio.yaml` and syncing `design-studio.yaml`, plus website exploration with Chrome DevTools MCP.

## Fetch Live Design Context

1. Ensure `chai-studio.yaml` is present or create it through the setup workflow in `references/config.md`.
2. Ensure `chai-studio.yaml` is listed in `.gitignore`.
3. Fetch applications and confirm the configured application exists.
4. Match:
   - application, preset, and rulesets by IDs from `chai-studio.yaml` and MCP metadata
   - application YAML content by names and domain-level fields only
5. Call `applications.yaml.get({ applicationId })` and compare MCP `lastUpdated` to local `design-studio.yaml.lastUpdated`.
6. If MCP is newer, write `applications.yaml.get` content to `design-studio.yaml`.
7. If local is newer, call `applications.yaml.sync({ applicationId, content, approved: false })`, get approval, then call `applications.yaml.sync({ applicationId, content, approved: true })` and write returned content.
8. Fetch application-level rules with `rulesets.get({ applicationId })` when an audit needs rule metadata beyond `design-studio.yaml`.
9. Delete legacy local mirror docs (`DESIGN.md`, `DESIGN-RULES.md`, `design.yaml`, and similar) and do not recreate them.

## MCP Availability Gate

1. Verify Chai Studio MCP is available.
2. For website exploration: verify Chrome DevTools MCP is available.
3. If Chrome DevTools MCP is missing, explicitly ask the user to install/enable it and pause.
4. Continue only when required MCPs are available.

## Redesign Workflow

Use this workflow whenever the user asks to redesign, restyle, refresh, polish, modernize, rework, improve, or rebuild a UI surface that belongs to a Chai Studio project. The goal is not just a nicer screen: the finished work must match the Chai Studio application preset, respect every linked ruleset, and leave an audit trail in Chai Studio MCP.

### 0. Mandatory Path Decision (Ask First)

Before doing implementation work, ask the user to choose execution path:

1. **Canvas-first planning** (create/use canvas, then implement)
2. **Direct code changes** (skip canvas planning)

If user picks **Direct code changes**, ask one additional question:

- **Use existing canvas context?**
  - **Yes**: read existing canvas pages, links, and annotations first to understand intended flow and states.
  - **No**: continue without canvas context and implement from prompt + repository context.

Decision matrix:

- Canvas-first -> run `Canvas Workflow` first, then code implementation workflow.
- Direct + canvas context -> read canvas artifacts, then run redesign implementation workflow.
- Direct + no canvas context -> run redesign implementation workflow directly.

### 0. Establish MCP Access

1. Make sure the Chai Studio MCP tools are available before relying on the skill.
2. If the connection is uncertain, call `profile.get`.
3. Use the exact dot-notation MCP tool names exposed by Chai Studio.
4. Prefer streaming audit writes: `audits.runs.start` -> `audits.violations.add` -> `audits.runs.complete`.

### 1. Resolve Project Identity

1. Read `chai-studio.yaml` from the project root.
2. If it is missing but `design-studio.yaml` exists:
   - Parse `design-studio.yaml`.
   - Call `applications.get`.
   - Match by exact application name.
   - If matched, create `chai-studio.yaml` from that application.
   - If not matched, ask for explicit user approval before calling `applications.yaml.create({ content, approved: true })`.
3. If both files are missing:
   - Call `applications.get`.
   - Ask the user to choose the Chai Studio application.
   - Create `chai-studio.yaml` using the selected application `id`, `name`, `presetId`, and `auditRuleSetIds`.
   - Verify the selected preset with `presets.get` and rulesets with `rulesets.get({ applicationId })`.
   - Call `applications.yaml.get({ applicationId })` and write `design-studio.yaml`.
4. If `chai-studio.yaml` exists:
   - Call `applications.get`.
   - Confirm `applicationId` still exists.
   - Confirm the configured `presetId` matches the app `presetId` when possible.
   - Confirm configured `auditRuleSetIds` are included in the app `auditRuleSetIds`; if not, prefer the application record and ask before rewriting config.
5. Never invent `applicationId`, `presetId`, `auditRuleSetId`, `auditId`, or `violationId`.

### 2. Fetch Live Design Contract

Fetch fresh MCP context before reading too deeply or editing:

1. `applications.yaml.get({ applicationId })`
   - Treat `content` as the canonical application design payload.
   - Write it to `design-studio.yaml` after timestamp sync.
2. `applications.yaml.sync({ applicationId, content, approved })`
   - Use when local `design-studio.yaml.lastUpdated` is newer than MCP.
   - Call with `approved: false` for diff, then ask for approval before calling with `approved: true`.
3. `rulesets.get({ applicationId })`
   - Use only linked application rulesets.
   - Build a working map of `ruleId`, `ruleTitle`, `severity`, `category`, and `guidance`.
   - **Review rules before designing** — understand prohibitions and constraints so the redesign complies from the start, not just after an audit finds violations.
4. `presets.get()`
   - Find the configured `presetId`.
   - Use raw preset data for exact tokens when the design doc is ambiguous.
5. If any local `DESIGN.md`, `DESIGN-RULES.md`, `design.yaml`, or similar mirror docs exist, delete them before continuing; Chai Studio MCP is the source of truth and local source-of-truth file is `design-studio.yaml`.

Extract these decisions before editing:

- Brand and product tone from application name/description and preset overview.
- Color tokens, semantic surfaces, contrast expectations, and dark/light mode behavior.
- Typography families, scale, heading/body/label usage, and text density.
- Font asset handling: resolve each configured/chosen family through Google Fonts first, download the required files into the codebase when found, and look for suitable alternatives when not found. Use `fonts.list` to discover supported fonts.
- Radius, spacing, shadow, border, and component token conventions.
- Ruleset prohibitions, especially high/critical rules.
- Expected pages/components, states, and responsive behavior in scope.

### 3. Scope the Redesign

1. Identify all affected routes, components, shared styles, data states, and tests.
2. Inspect the current implementation with code search before planning the visual work.
3. If a browser/dev server is available, inspect the current UI before editing and capture observed problems.
4. Define the intended redesign in implementation terms:
   - Which components change.
   - Which tokens/classes/styles change.
   - Which states must be preserved or added.
   - Which interactions and accessibility affordances must remain intact.
5. Keep the scope tight. Do not migrate UI frameworks, rewrite unrelated layout systems, or touch unrelated design surfaces just to make the redesign feel broader.

### 4. Implementation Rules

Implement the redesign against the MCP contract:

- Use Chai Studio preset tokens and semantic roles over arbitrary colors, fonts, radii, shadows, or spacing.
- For every configured or chosen font family, find it on Google Fonts first. If available, download the required font files into the project using the existing asset convention when present, otherwise a clear fonts asset directory such as `public/fonts/`.
- If a required family is unavailable on Google Fonts, look for the closest suitable alternative, use the best fit for the Chai Studio design context, and report the fallback in the completion summary.
- Enforce component-level adherence: border radius, spacing, typography, semantic colors/tokens, borders/shadows, and interaction states must match `design-studio.yaml` and linked rulesets.
- Preserve application behavior, data flow, routing, auth boundaries, form submission, and analytics unless the user asked to change them.
- Build real UI states: loading, empty, error, disabled, hover, focus, active, selected, expanded/collapsed, validation, and long-content states when they apply.
- Keep accessibility first: semantic landmarks, labels, keyboard flow, focus visibility, dialog behavior, hit targets, reduced motion, and contrast.
- Prefer existing component patterns in the repo.
- Use icons from the existing icon library when available.
- Avoid broad refactors and unrelated cleanups.
- Avoid known ruleset traps such as nested cards, generic shadow stacks, low contrast text, decorative motion, repetitive identical card grids, weak typography hierarchy, and ungrounded dark-mode glow.
- Do not add explanatory in-app text about the redesign process, audit rules, implementation details, or keyboard shortcuts unless the product already has that kind of help surface.

For every notable design choice, be able to point back to one of:

- MCP design doc content.
- MCP preset token.
- MCP ruleset guidance.
- Explicit user instruction.
- Existing app pattern.

### 5. Build And Runtime Validation

Validate after implementation and before uploading a new audit run:

1. After write changes are done, discover the project's available verification commands from package scripts, Makefile targets, README instructions, CI config, or framework conventions.
2. Always run the project build when a build command is available. Examples: `npm run build`, `pnpm build`, `yarn build`, `bun run build`, `next build`, `vite build`, `make build`, `cargo build`, or the repo's documented equivalent.
3. Also run relevant focused checks when available: typecheck, lint, tests, or focused package scripts.
4. Run the build before final audit upload when feasible, so the Chai Studio audit represents buildable code.
5. If the build cannot run because dependencies, environment variables, external services, or toolchain binaries are missing, record the exact blocker and run the strongest available fallback checks.
6. If Chrome DevTools MCP, Playwright MCP, or equivalent browser MCP tooling is available, ask the user whether they want browser tests and runtime review through those MCPs before running them.
7. If the user agrees to browser MCP validation, inspect every redesigned route/surface with the selected MCP.
8. Check at least:
   - Desktop and mobile viewport framing.
   - Keyboard navigation and focus order.
   - Hover/focus/active/disabled states.
   - Dialog/popover/menu open and close behavior.
   - Loading/empty/error states when reachable.
   - Text overflow, long names, narrow widths, and wrapping.
   - Contrast and semantic color usage.
   - Required Google Fonts files are present in the codebase when the chosen family is available from Google Fonts.
   - Motion safety and reduced-motion behavior when motion exists.
9. Fix implementation defects before starting the new audit run.
10. Record what validation ran, whether browser MCP validation was offered, whether the user accepted it, and what could not run.

### 6. Reconcile Previous Audits

Before creating fresh audit runs, reconcile prior Chai Studio issues:

1. Call `audits.get({ applicationId })`.
2. Select relevant previous runs for the same app and rulesets in scope. Prefer open, failed, recent, or high-count runs.
3. For each relevant run, call `audits.violations.get({ auditId, status: "open" })`.
4. Compare open prior violations against the current code/UI after redesign.
5. For each prior violation:
   - If fixed and verified, call `audits.violations.status.update({ violationId, status: "resolved", resolvedBy })`.
   - If accepted out of scope by user/team, call `audits.violations.status.update({ violationId, status: "ignored", resolvedBy })`.
   - If the finding does not apply, call `audits.violations.status.update({ violationId, status: "false_positive", resolvedBy })`.
   - If still present, leave it `open` and include it in the new audit if it is still in scope.
6. Never mark a violation resolved only because code changed. Verify the current behavior or source condition first.

### 7. Run Fresh Audit Passes

Create one streaming audit run per ruleset configured for the application.

For each configured ruleset:

1. Call `audits.runs.start`:

```json
{
  "applicationId": "app-id",
  "auditRuleSetId": "ruleset-id",
  "summary": "Post-redesign audit for <surface>",
  "totalRulesEvaluated": 0
}
```

2. Evaluate every relevant rule in that ruleset against the redesigned scope.
3. Upload each genuine, non-duplicate finding immediately with `audits.violations.add`. So that the user is informed about the progress.
4. Keep an in-memory fingerprint set for this audit run. Use:
   - `ruleId`
   - `filePath`
   - `lineStart`
   - `lineEnd`
   - normalized `codeSnippet`
   - normalized `violationDescription`
5. Do not upload duplicate findings in the same run.
6. Use server duplicate output (`duplicate: true`) as confirmation, not as the primary dedupe strategy.
7. If there are no violations, still complete the run.
8. Call `audits.runs.complete`:

```json
{
  "auditId": "audit-id",
  "status": "completed",
  "summary": "Audited <surface>; <n> violation(s) found.",
  "totalRulesEvaluated": 42
}
```

If the audit cannot finish because tooling or context fails, complete the run with `status: "failed"` and a summary explaining the blocker.

### 8. Violation Payload Rules

Every `audits.violations.add` call must match the Chai Studio schema:

```json
{
  "auditId": "audit-id",
  "violation": {
    "ruleId": "rule-id-from-ruleset",
    "ruleTitle": "Rule title from ruleset",
    "severity": "high",
    "category": "layout",
    "filePath": "src/app/page.tsx",
    "lineStart": 42,
    "lineEnd": 42,
    "codeSnippet": "<div className=\"...\">",
    "contextBefore": "optional surrounding code",
    "contextAfter": "optional surrounding code",
    "violationDescription": "Specific observed problem and why it violates the rule.",
    "guidance": "Rule guidance from Chai Studio ruleset.",
    "aiFixPrompt": "Self-contained fix prompt naming file, issue, constraints, and expected verification.",
    "suggestedFix": "Concise suggested code or design change.",
    "frameworkHint": "React, Tailwind CSS",
    "metadata": {
      "source": "runtime",
      "surface": "Dashboard",
      "component": "MetricCard"
    }
  }
}
```

Strict values:

- `severity`: `critical`, `high`, `medium`, or `low`.
- `category`: `accessibility`, `visual`, `typography`, `color`, `layout`, `motion`, `interaction`, `responsive`, `metadata`, `performance`, or `content`.
- `lineStart` and `lineEnd`: positive 1-based integers when present.
- `filePath`: relative project path when known.
- `aiFixPrompt`: self-contained enough for another agent to fix without the conversation.
- `metadata`: keep concise; Chai Studio limits metadata size.

Do not upload vague findings such as "needs polish". Tie every violation to an actual ruleset rule and exact evidence.

### 9. Audit Findings And Optional Remediation

After the fresh audit:

1. Leave newly uploaded violations open unless the user explicitly asked to fix, remediate, resolve, close, or update them.
2. For violations from previous audits that are already fixed in the current code/UI, call `audits.violations.status.update`.
3. For violations uploaded in the just-created run:
   - If the user asked for remediation and you fix them during the same turn, re-run the relevant validation from section 5 and call `audits.violations.status.update({ violationId, status: "resolved", resolvedBy })` after verification.
   - If remediation was not requested or a fix is out of scope, leave them open and explain why.
5. If all violations in a run become resolved/ignored/false_positive, Chai Studio will auto-resolve the parent audit run.

### 10. Completion Report

When finishing a redesign, report:

- Files changed.
- MCP app/preset/rulesets used.
- Build command run, result, and any fallback checks.
- Browser MCP tests/review offered, whether the user accepted, and browser checks run.
- Audit runs created, with violation counts by ruleset.
- Violations fixed and statuses updated.
- Any remaining open findings or blockers.

Keep the final user response concise, but include enough audit status detail that the Chai Studio trail is understandable.

## Website Exploration Workflow (Preset-Oriented)

Use this when user provides a website URL and wants Chai artifacts.

1. Validate URL and reachability.
2. Explore top-level IA and route templates in Chrome DevTools MCP.
3. Capture design primitives:
   - color and semantic usage
   - typography system
   - spacing/radius/border/shadow systems
4. Capture components and states:
   - core components and their variants
   - hover/focus/active/disabled/loading/error/empty/selected states
   - interaction and responsive patterns
5. Normalize findings into a structured JSON model for preset creation.
6. Ask for preset name (blocking) with suggestions.
7. Call `presets.create` with JSON representation of design document.

## Artifact Creation Contracts

### presets.create

- Input must be JSON representation of design document (not raw YAML string).
- Build JSON from exploration findings:
  - `tokens` (color/typography/spacing/radius/shadow/border)
  - `components`
  - `states`
  - `metadata` and source notes
- Ask for preset name before create, provide suggestions.

### rulesets.create

- Supports standalone creation.
- Use directly when user asks for ruleset-only flow.

### rulesets.rules.add

- Attaches an existing rule object to a `rulesetId`.
- Discover rules with pagination before attaching.

### applications.create

- Accepts `presetId` and `rulesetIds`.
- Resolve candidate preset/ruleset IDs via paginated listing first.
- Show selected IDs and ask for confirmation only if there is ambiguity or competing matches.

## Shadcn Development Workflow (Non-Canvas)

Use this workflow when the user asks to build real product UI components in the codebase (not canvas planning).

1. Resolve `applicationId` via setup/sync (`chai-studio.yaml`, `applications.get`).
2. Call `shadcn.css.get({ applicationId })` to fetch preset-mapped CSS tokens for product styling.
3. Call `shadcn.component.list({ applicationId })` to see available themed components.
4. Call `shadcn.component.get({ applicationId, componentName })` for each needed component.
5. Integrate returned TSX into repository paths (usually `components/ui/*`) while preserving project architecture.
6. Validate with build/typecheck/tests and run audit flow if requested.

## Canvas Workflow

Use this workflow when the user asks to plan, wireframe, map, or design a multi-screen flow in Chai Studio.

### 1. Resolve Application

Run the mandatory setup/sync gate and identify the configured `applicationId` from `chai-studio.yaml`. If there is no configured application, ask the user to select one from `applications.get`.

Also fetch linked rulesets via `rulesets.get({ applicationId })` and REVIEW EVERY RULE before designing. The canvas pages MUST comply with ALL linked rulesets from the start — this is NOT optional. High/critical severity rules are absolute prohibitions. Build a working map of `ruleId`, `ruleTitle`, `severity`, `category`, and `guidance`. Do not wait for an audit to discover violations.

### 2. Create Canvas

Call `canvases.create`:

```json
{
  "applicationId": "app-id",
  "name": "Onboarding Flow",
  "description": "User onboarding screens and state transitions",
  "createdByAgent": "chai-studio-skill"
}
```

The canvas is created with a default shared CSS template. You must replace it with preset-derived CSS before creating pages.

### 3. Update Canvas CSS from Preset (CRITICAL)

The canvas creates a default shared CSS template, but it is generic. Before creating any pages, fetch the preset-mapped base CSS and set it as the shared stylesheet:

Preview styling is the **merged result** of base preset-mapped CSS plus optional additional `canvas.css` overrides.

1. Call `canvases.base.css.get({ canvasId })` to fetch the base utility CSS framework **already mapped to the linked application preset**.
2. The response includes `presetMappedCss` — a complete stylesheet with:
   - `:root` CSS custom properties mapping preset tokens (e.g., `--color-bg`, `--color-fg`, `--color-brand-bg`, `--radius-md`, `--spacing`, `--font-family`, `--shadow-sm`)
   - Preset-mapped component classes (`.card`, `.btn`, `.btn-secondary`, `.stack`, `.row`, `.text-muted`, `.surface`, `.surface-elevated`)
   - Dark mode token variants (`--dark-color-bg`, etc.)
3. Call `canvases.css.update({ canvasId, css: presetMappedCss })` to set the shared stylesheet.
4. **Only if you need additional custom styles** (keyframes, layout tokens, or components the preset does not cover), append them sparingly to the same CSS string before updating. Otherwise, do not update canvas CSS again after setting `presetMappedCss`. All overrides MUST reference preset tokens — do not introduce hardcoded values.
5. Verify by calling `canvases.css.get({ canvasId })`.

**Do not inline ad-hoc CSS in page JSX.** Prefer utility/component classes with preset token values; shared CSS is injected automatically into every page preview.

### 4. Create Pages

For each screen, call `canvases.pages.create`:

```json
{
  "canvasId": "canvas-id",
  "title": "Welcome Screen",
  "generationStatus": "done",
  "layout": { "x": 100, "y": 150 },
  "componentTsx": "() => (<div className=\"card\"><h1>Welcome</h1><p className=\"text-muted\">Get started today.</p><button className=\"btn\">Start</button></div>)"
}
```

Page content structure:
- `componentTsx`: React function-component TSX source. Use `className` and tokenized style values. Keep layouts responsive using fluid utilities (`display-flex`, `display-grid`, `flex-wrap`, `w-full`, `h-dvh`) — do not use fixed pixel widths.
- Theme-aware requirement: keep TSX theme-neutral and ensure it renders correctly in both light and dark modes (paired token usage, no hardcoded light-only values).
- **Spacing discipline is REQUIRED:** Every container MUST have explicit padding (`.p`, `.px`, `.py`, or component default). Every flex/grid parent MUST have explicit gap (`.gap`, `.gap-x`, `.gap-y`). Never leave content touching edges. Use the spacing scale consistently (multiples of `var(--spacing)`).
- **Ruleset compliance is REQUIRED:** All canvas pages MUST comply with the linked application rulesets reviewed in Step 1. High/critical severity rules are absolute prohibitions.
- `layout.x` and `layout.y`: Position on the infinite canvas board (in pixels).

Generation status values:
- `idle`: not started
- `started`: initialization started
- `generating`: being built incrementally
- `done`: finished
- `error`: blocked or failed

Each page stores a `constraintsSnapshot` of the application's preset and rulesets at creation time.

### 4. Link Pages

Define navigation flows with `canvases.pages.links.create`:

```json
{
  "canvasId": "canvas-id",
  "fromPageId": "page-a",
  "toPageId": "page-b",
  "label": "next",
  "conditionExpr": "user.isAuthenticated === true",
  "metadata": { "trigger": "button click" }
}
```

Update links with `canvases.pages.links.update` if the flow changes.

### 5. Read Open Annotations First

Before modifying any existing canvas page, discover pending work:

```json
{
  "pageId": "page-id",
  "status": "open"
}
```

Call `canvases.annotations.get` for every page in the canvas. Address open annotations before adding new ones or changing page structure.

### 6. Annotate Pages

Place fix instructions or design notes with `canvases.annotations.create`:

```json
{
  "pageId": "page-id",
  "x": 120,
  "y": 340,
  "componentPath": "hero.cta-button",
  "instruction": "Increase padding to 16px and use the primary brand color."
}
```

### 7. Update Pages Incrementally

As design or implementation progresses, call `canvases.pages.update`:

```json
{
  "pageId": "page-id",
  "generationStatus": "done",
  "layout": { "updated": true },
  "componentTsx": "() => (<main className=\"stack\">...</main>)"
}
```

#### Page Status Lifecycle

Page statuses follow a deterministic lifecycle:

- `idle`: page is queued but generation has not started.
- `started`: generation has started.
- `generating`: AI agent is actively building JSX. The UI polls every 3 seconds for updates.
- `done`: page is finished and ready for review.
- `error`: generation failed; the agent should investigate and retry or update manually.

**Streaming generation pattern:**
1. Start with `canvases.pages.create({ ..., generationStatus: "started" })`.
2. Do the design or implementation work.
3. Stream updates with `canvases.pages.update({ pageId, generationStatus: "generating", layout, componentTsx })`.
4. Finish with `canvases.pages.update({ pageId, generationStatus: "done", layout, componentTsx })`.
5. If the work fails, use `generationStatus: "error"`.

### 8. Reconcile Annotation Statuses

After addressing an annotation's instruction, mark it fixed:

```json
{
  "annotationId": "annotation-id",
  "status": "fixed"
}
```

Annotation statuses toggle between `open` and `fixed`:
- **Fix then mark**: After implementing the instruction, call `canvases.annotations.status.update({ annotationId, status: "fixed" })`.
- **Reopen when needed**: If a fix is incomplete or regresses, call `canvases.annotations.status.update({ annotationId, status: "open" })`.
- **Never leave orphaned**: Do not create new annotations without either fixing existing open ones or explicitly explaining why they remain open.

### 9. Canvas-Level Status Limitations

Canvas objects expose `theme` and `generationStatus` fields, but there is no general `canvases.update` MCP tool. Use page-level updates (`canvases.pages.update`) and CSS updates (`canvases.css.update`) instead of attempting non-existent canvas mutation tools.

### 10. Render Secure Previews

When generating markup previews for canvas pages, sanitize through `canvases.artifacts.render_preview`:

```json
{
  "markup": "<div>...</div>"
}
```

The response includes `sanitizedMarkup`, `csp`, and `sandbox` values for safe iframe rendering.

## Journal Workflow

Use this workflow when the user asks to document design decisions, audit results, or project notes.

### 1. List Existing Journals

Call `journals.list` to discover existing journals and entries.

### 2. Create Journal If Needed

Call `journals.create`:

```json
{
  "name": "Q2 Redesign Decisions",
  "kind": "design"
}
```

Kinds:
- `design`: design system, UX, or visual documentation
- `personal`: general notes or process documentation

### 3. Create Entries

Call `journals.entries.create`:

```json
{
  "journalId": "journal-id",
  "title": "Typography Audit Results",
  "markdown": "## Findings\n\n- Fixed heading hierarchy...\n- Replaced Inter with Space Grotesk..."
}
```

Use journals for post-audit summaries, redesign rationales, canvas documentation, and long-form design writing that does not belong in `design-studio.yaml`.

## Ruleset Management Workflow

Use this workflow when the user asks to create, extend, or inspect audit rulesets.

### 1. Create Ruleset

Call `rulesets.create`:

```json
{
  "name": "Custom Brand Audit",
  "description": "Rules specific to the Acme brand system",
  "citationUrl": "https://brand.acme.co/guidelines",
  "rules": [
    {
      "id": "rule-acme-01",
      "title": "Use Acme Red on CTAs",
      "severity": "high",
      "category": "color",
      "guidance": "All primary call-to-action buttons must use the Acme Red token."
    }
  ]
}
```

Every ruleset automatically includes the design-token compliance rule (`rule-ds-01-preset-token-compliance`).

### 2. Add Rules To Existing Ruleset

Call `rulesets.rules.add`:

```json
{
  "rulesetId": "ruleset-id",
  "rule": {
    "id": "rule-acme-02",
    "title": "Avoid competitor colors",
    "severity": "medium",
    "category": "color",
    "guidance": "Do not use orange or teal as primary brand colors."
  }
}
```

### 3. Inspect Rules

Call `rulesets.rules.get`:

```json
{
  "rulesetId": "ruleset-id",
  "page": 1,
  "pageSize": 20
}
```

### 4. Link Ruleset To Application

Rulesets must be linked to an application through:
- `applications.create` (at creation time)
- `applications.yaml.sync` (updating the rulesets array in `design-studio.yaml`)

### 5. Ruleset Modification Limits

The MCP does not expose tools to edit or remove individual rules from an existing ruleset:
- **Append only**: Use `rulesets.rules.add` to add new rules.
- **Full replacement**: Modify the ruleset in `design-studio.yaml` and call `applications.yaml.sync` with user approval. This replaces the entire ruleset content.
- **No partial edits**: Do not attempt to call non-existent tools like `rulesets.rules.update` or `rulesets.rules.remove`.

## Audit Local UI

Audit and fix are separate flows. An audit request authorizes inspection, reconciliation of already-fixed prior violations, ruleset validation, audit upload, and reporting. It does not authorize code/UI changes to remediate newly discovered findings.

Audit flow (required):

1. Start audit: `audits.runs.start`.
2. Add violations as they are found: `audits.violations.add` for each finding.
3. Stop audit: `audits.runs.complete`.

Fixing audit flow (separate; only when the user asks to fix, remediate, resolve, close, or update violations):

1. Implement the requested code/UI fix for selected violations.
2. Re-check the fixed behavior.
3. Update individual violations as each fix is verified: `audits.violations.status.update`.

Every audit request must follow this sequence:

1. Reconcile previous audits.
2. Start a new audit run.

Rule: regardless of previous conversation context, do not skip this sequence and do not bypass ruleset validation. Always validate against the configured `auditRuleSetIds`.

Detailed flow:

1. Confirm configured application and rulesets.
2. Call `audits.get` for the configured `applicationId`.
3. For previous runs, call `audits.violations.get` and inspect open findings.
4. Verify whether previously reported issues are now fixed in the current code/UI.
5. For each verified fix, call `audits.violations.status.update` with `status: "resolved"` (and `resolvedBy` when available).
6. Read spec context in this order: Chai Studio `design-studio.yaml` (`applications.yaml.get({ applicationId })` after the sync gate), then rulesets (`rulesets.get({ applicationId })`), then preset (`presets.get`).
7. Read the requested files or inspect the requested browser view.
8. Audit against project hard rules first (`MUST`/`NEVER`), then ruleset severity guidance.
9. For every relevant component, verify component-level design adherence (including border radius, spacing, typography, semantic token usage, border/shadow treatment, and states).
10. Verify that configured/chosen fonts were checked against Google Fonts first, downloaded into the codebase when available, or replaced with a suitable documented alternative when not available.
11. Prioritize critical and high findings (especially accessibility, keyboard/focus/dialog, metadata correctness).
12. Keep findings tight: exact code, why it matters, and a code-level suggested fix.
13. Create a fresh run with `audits.runs.start`, upload findings one by one with `audits.violations.add` as soon as each finding is confirmed, then close the run with `audits.runs.complete` (even when zero new violations are found).
14. Keep a per-run fingerprint set and skip duplicate findings before upload. Build the fingerprint from `ruleId`, `filePath`, `lineStart`, `lineEnd`, normalized `codeSnippet`, and normalized `violationDescription`.
15. When multiple `auditRuleSetIds` are configured, audit each ruleset separately. Repeat the full streaming sequence once per ruleset, evaluating that ruleset's rules and uploading only that ruleset's findings to its audit run.

Granularity requirements:

- Cover each relevant page and each relevant component in the requested scope.
- Log findings at page/component granularity instead of broad aggregate notes.
- For each finding, include where it was observed (page/view + component + file reference when available).

Runtime validation requirements:

- If Chrome DevTools MCP, Playwright MCP, or equivalent browser MCP tooling is available, ask the user whether they want browser tests and runtime review through those MCPs.
- If the user agrees, open the app and validate behavior in runtime, not just source code.
- Validate keyboard navigation, focus/dialog behavior, accessibility semantics, responsive behavior, and interaction states.
- Annotate findings as static-only, runtime-only, or confirmed by both.

Build verification requirements:

- After write changes are done, always run the project build when a build command is available.
- Run build before uploading the fresh audit when feasible.
- If build is blocked, record the blocker and use the strongest available fallback checks.

Useful categories:

- `accessibility`
- `visual`
- `typography`
- `color`
- `layout`
- `motion`
- `interaction`
- `responsive`
- `metadata`
- `performance`
- `content`

Useful severities:

- `critical`
- `high`
- `medium`
- `low`

Recommended category mapping from common project spec areas:

- accessibility and semantics -> `accessibility`
- typography hierarchy and readability -> `typography`
- color contrast and token misuse -> `color`
- spacing/layout rhythm -> `layout`
- animation/motion safety -> `motion`
- interaction patterns and dialog behavior -> `interaction`
- viewport/breakpoint issues -> `responsive`
- SEO/head/meta/canonical issues -> `metadata`
- rendering/perf anti-patterns -> `performance`
- clarity/microcopy/content quality -> `content`

## Upload Audit Results

Prefer streaming uploads after a real audit, or when the user explicitly asks for dummy/test audits:

1. Call `audits.runs.start` once.
2. Call `audits.violations.add` for each confirmed finding as soon as it is found.
3. Call `audits.runs.complete` once after the audit pass is complete.

Always upload a fresh audit run after the reconciliation step above, even if all old issues were resolved and the new run contains zero violations.

Required `audits.runs.start` fields:

- `applicationId`
- `auditRuleSetId`

Recommended `audits.runs.start` fields:

- `summary`
- `totalRulesEvaluated`

Required `audits.runs.complete` fields:

- `auditId`
- `status`: `completed` or `failed`

Violation fields should be as complete as possible:

```json
{
  "ruleId": "impeccable-a11y-contrast",
  "ruleTitle": "Verify accessible contrast",
  "category": "accessibility",
  "severity": "critical",
  "guidance": "Flag foreground/background pairs below WCAG text contrast expectations.",
  "violationDescription": "The muted text has insufficient contrast on the accent surface.",
  "aiFixPrompt": "In src/app/page.tsx, replace the low-contrast foreground token on the affected paragraph with a semantic on-accent foreground token. Verify WCAG AA contrast and keep the existing layout unchanged.",
  "filePath": "src/app/page.tsx",
  "lineStart": 42,
  "lineEnd": 42,
  "codeSnippet": "<p className=\"text-gray-400 bg-blue-500\">...</p>",
  "frameworkHint": "React, Tailwind CSS",
  "suggestedFix": "Use `text-white` or a project-defined `text-on-accent` token."
}
```

`aiFixPrompt` must be self-contained. It should name the file, the issue, the desired fix, and the constraints.
Before every `audits.violations.add` call, check the current run's fingerprint set. If the fingerprint already exists, do not upload it again. Chai Studio also performs server-side duplicate detection for the same audit.

## Read Audits and Violations

- Use `audits.get` with `applicationId` to list runs for the configured app.
- Use `audits.violations.get` with `auditId` to inspect findings.
- Filter by `category`, `severity`, or `status` when triaging.

## Update Violation Status

Use `audits.violations.status.update` only after triage or verification:

```json
{
  "violationId": "violation-id",
  "status": "resolved",
  "resolvedBy": "agent-or-user-name"
}
```

Status meanings:

- `open`: still needs attention.
- `resolved`: fix verified.
- `ignored`: accepted exception or out of scope.
- `false_positive`: finding is incorrect.

Fix-and-close workflow runs only when the user asks to fix, remediate, resolve, close, or update audit entries:

1. Apply code/UI fix for selected audit entries.
2. Re-check the fixed behavior (runtime when available).
3. Call `audits.violations.status.update` for each fixed/triaged violation.
4. Keep unresolved items as `open` and explain blockers.

### Required sequencing for every audit run

1. `audits.get` (by `applicationId`)
2. `audits.violations.get` (for prior runs that matter)
3. `audits.violations.status.update` for verified fixes
4. fresh audit analysis
5. `audits.runs.start` to create a new run
6. `audits.violations.add` as each non-duplicate finding is confirmed
7. `audits.runs.complete` when the audit pass finishes

This required audit sequence does not include implementing new fixes. Only mark prior items resolved when they are already fixed, or when the user separately requested remediation and the fix has been implemented and verified.

## Dummy Audit Policy

Dummy audits are allowed only when requested. Make them unmistakable:

- Put `Dummy` or `smoke-test` in the summary.
- Add `metadata.dummy: true` to every violation.
- Use fake file paths that cannot be confused with verified findings, or clearly mark the descriptions as synthetic.

## Failure Handling

- If Chai Studio has no applications, tell the user to create one in Chai Studio first.
- If `chai-studio.yaml` references missing IDs, fetch current apps/presets/rulesets and ask before changing the config.
- If an upload fails, preserve the prepared payload in the response or a local scratch file only if the user asks.
- If local docs conflict with Chai Studio rules, treat Chai Studio as source of truth and call out the mismatch.
