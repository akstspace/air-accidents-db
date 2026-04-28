# Chai Studio MCP Workflows

This reference covers the operations the skill should perform after resolving `chai-studio.yaml` and syncing `design-studio.yaml`.

## Fetch Live Design Context

1. Ensure `chai-studio.yaml` is present or create it through the setup workflow in `references/config.md`.
2. Ensure `chai-studio.yaml` is listed in `.gitignore`.
3. Fetch applications and confirm the configured application exists.
4. Match:
   - application, preset, and rulesets by IDs from `chai-studio.yaml` and MCP metadata
   - application YAML content by names and domain-level fields only
5. Call `get_application_yaml(applicationId)` and compare MCP `lastUpdated` to local `design-studio.yaml.lastUpdated`.
6. If MCP is newer, write `get_application_yaml.content` to `design-studio.yaml`.
7. If local is newer, call `sync_application_yaml({ applicationId, content, approved: false })`, get approval, then call `sync_application_yaml({ applicationId, content, approved: true })` and write returned content.
8. Fetch application-level rules with `get-rulesets(applicationId)` when an audit needs rule metadata beyond `design-studio.yaml`.
9. Delete legacy local mirror docs (`DESIGN.md`, `DESIGN-RULES.md`, `design.yaml`, and similar) and do not recreate them.

## Redesign Workflow

Use this workflow whenever the user asks to redesign, restyle, refresh, polish, modernize, rework, improve, or rebuild a UI surface that belongs to a Chai Studio project. The goal is not just a nicer screen: the finished work must match the Chai Studio application preset, respect every linked ruleset, and leave an audit trail in Chai Studio MCP.

### 0. Establish MCP Access

1. Make sure the Chai Studio MCP tools are available before relying on the skill.
2. If the connection is uncertain, call `get-profile`.
3. Use the exact MCP tool names exposed by Chai Studio:
   - Read/context tools: `get-profile`, `get-applications`, `get_application_yaml`, `get-design-doc`, `get-rulesets`, `get-presets`, `get_audits`, `get_audit_violations`
   - Write/audit tools: `create_application_from_yaml`, `sync_application_yaml`, `start_audit_run`, `add_audit_violation`, `complete_audit_run`, `update_violation_status`
4. Prefer streaming audit writes: `start_audit_run` -> `add_audit_violation` -> `complete_audit_run`.

### 1. Resolve Project Identity

1. Read `chai-studio.yaml` from the project root.
2. If it is missing but `design-studio.yaml` exists:
   - Parse `design-studio.yaml`.
   - Call `get-applications`.
   - Match by exact application name.
   - If matched, create `chai-studio.yaml` from that application.
   - If not matched, ask for explicit user approval before calling `create_application_from_yaml({ content, approved: true })`.
3. If both files are missing:
   - Call `get-applications`.
   - Ask the user to choose the Chai Studio application.
   - Create `chai-studio.yaml` using the selected application `id`, `name`, `presetId`, and `auditRuleSetIds`.
   - Verify the selected preset with `get-presets` and rulesets with `get-rulesets({ applicationId })`.
   - Call `get_application_yaml({ applicationId })` and write `design-studio.yaml`.
4. If `chai-studio.yaml` exists:
   - Call `get-applications`.
   - Confirm `applicationId` still exists.
   - Confirm the configured `presetId` matches the app `presetId` when possible.
   - Confirm configured `auditRuleSetIds` are included in the app `auditRuleSetIds`; if not, prefer the application record and ask before rewriting config.
5. Never invent `applicationId`, `presetId`, `auditRuleSetId`, `auditId`, or `violationId`.

### 2. Fetch Live Design Contract

Fetch fresh MCP context before reading too deeply or editing:

1. `get_application_yaml({ applicationId })`
   - Treat `content` as the canonical application design payload.
   - Write it to `design-studio.yaml` after timestamp sync.
2. `sync_application_yaml({ applicationId, content, approved })`
   - Use when local `design-studio.yaml.lastUpdated` is newer than MCP.
   - Call with `approved: false` for diff, then ask for approval before calling with `approved: true`.
3. `get-rulesets({ applicationId })`
   - Use only linked application rulesets.
   - Build a working map of `ruleId`, `ruleTitle`, `severity`, `category`, and `guidance`.
4. `get-presets()`
   - Find the configured `presetId`.
   - Use raw preset data for exact tokens when the design doc is ambiguous.
5. If any local `DESIGN.md`, `DESIGN-RULES.md`, `design.yaml`, or similar mirror docs exist, delete them before continuing; Chai Studio MCP is the source of truth and local source-of-truth file is `design-studio.yaml`.

Extract these decisions before editing:

- Brand and product tone from application name/description and preset overview.
- Color tokens, semantic surfaces, contrast expectations, and dark/light mode behavior.
- Typography families, scale, heading/body/label usage, and text density.
- Font asset handling: resolve each configured/chosen family through Google Fonts first, download the required files into the codebase when found, and look for suitable alternatives when not found.
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

1. Call `get_audits({ applicationId })`.
2. Select relevant previous runs for the same app and rulesets in scope. Prefer open, failed, recent, or high-count runs.
3. For each relevant run, call `get_audit_violations({ auditId, status: "open" })`.
4. Compare open prior violations against the current code/UI after redesign.
5. For each prior violation:
   - If fixed and verified, call `update_violation_status({ violationId, status: "resolved", resolvedBy })`.
   - If accepted out of scope by user/team, call `update_violation_status({ violationId, status: "ignored", resolvedBy })`.
   - If the finding does not apply, call `update_violation_status({ violationId, status: "false_positive", resolvedBy })`.
   - If still present, leave it `open` and include it in the new audit if it is still in scope.
6. Never mark a violation resolved only because code changed. Verify the current behavior or source condition first.

### 7. Run Fresh Audit Passes

Create one streaming audit run per ruleset configured for the application.

For each configured ruleset:

1. Call `start_audit_run`:

```json
{
  "applicationId": "app-id",
  "auditRuleSetId": "ruleset-id",
  "summary": "Post-redesign audit for <surface>",
  "totalRulesEvaluated": 0
}
```

2. Evaluate every relevant rule in that ruleset against the redesigned scope.
3. Upload each genuine, non-duplicate finding immediately with `add_audit_violation`. So that the user is informed about the progress.
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
8. Call `complete_audit_run`:

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

Every `add_audit_violation` call must match the Chai Studio schema:

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
2. For violations from previous audits that are already fixed in the current code/UI, call `update_violation_status`.
3. For violations uploaded in the just-created run:
   - If the user asked for remediation and you fix them during the same turn, re-run the relevant validation from section 5 and call `update_violation_status({ violationId, status: "resolved", resolvedBy })` after verification.
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

## Audit Local UI

Audit and fix are separate flows. An audit request authorizes inspection, reconciliation of already-fixed prior violations, ruleset validation, audit upload, and reporting. It does not authorize code/UI changes to remediate newly discovered findings.

Audit flow (required):

1. Start audit: `start_audit_run`.
2. Add violations as they are found: `add_audit_violation` for each finding.
3. Stop audit: `complete_audit_run`.

Fixing audit flow (separate; only when the user asks to fix, remediate, resolve, close, or update violations):

1. Implement the requested code/UI fix for selected violations.
2. Re-check the fixed behavior.
3. Update individual violations as each fix is verified: `update_violation_status`.

Every audit request must follow this sequence:

1. Reconcile previous audits.
2. Start a new audit run.

Rule: regardless of previous conversation context, do not skip this sequence and do not bypass ruleset validation. Always validate against the configured `auditRuleSetIds`.

Detailed flow:

1. Confirm configured application and rulesets.
2. Call `get_audits` for the configured `applicationId`.
3. For previous runs, call `get_audit_violations` and inspect open findings.
4. Verify whether previously reported issues are now fixed in the current code/UI.
5. For each verified fix, call `update_violation_status` with `status: "resolved"` (and `resolvedBy` when available).
6. Read spec context in this order: Chai Studio `design-studio.yaml` (`get_application_yaml(applicationId)` after the sync gate), then rulesets (`get-rulesets(applicationId)`), then preset (`get-presets`).
7. Read the requested files or inspect the requested browser view.
8. Audit against project hard rules first (`MUST`/`NEVER`), then ruleset severity guidance.
9. For every relevant component, verify component-level design adherence (including border radius, spacing, typography, semantic token usage, border/shadow treatment, and states).
10. Verify that configured/chosen fonts were checked against Google Fonts first, downloaded into the codebase when available, or replaced with a suitable documented alternative when not available.
11. Prioritize critical and high findings (especially accessibility, keyboard/focus/dialog, metadata correctness).
12. Keep findings tight: exact code, why it matters, and a code-level suggested fix.
13. Create a fresh run with `start_audit_run`, upload findings one by one with `add_audit_violation` as soon as each finding is confirmed, then close the run with `complete_audit_run` (even when zero new violations are found).
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

1. Call `start_audit_run` once.
2. Call `add_audit_violation` for each confirmed finding as soon as it is found.
3. Call `complete_audit_run` once after the audit pass is complete.

Always upload a fresh audit run after the reconciliation step above, even if all old issues were resolved and the new run contains zero violations.

Required `start_audit_run` fields:

- `applicationId`
- `auditRuleSetId`

Recommended `start_audit_run` fields:

- `summary`
- `totalRulesEvaluated`

Required `complete_audit_run` fields:

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
Before every `add_audit_violation` call, check the current run's fingerprint set. If the fingerprint already exists, do not upload it again. Chai Studio also performs server-side duplicate detection for the same audit.

## Read Audits and Violations

- Use `get_audits` with `applicationId` to list runs for the configured app.
- Use `get_audit_violations` with `auditId` to inspect findings.
- Filter by `category`, `severity`, or `status` when triaging.

## Update Violation Status

Use `update_violation_status` only after triage or verification:

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
3. Call `update_violation_status` for each fixed/triaged violation.
4. Keep unresolved items as `open` and explain blockers.

### Required sequencing for every audit run

1. `get_audits` (by `applicationId`)
2. `get_audit_violations` (for prior runs that matter)
3. `update_violation_status` for verified fixes
4. fresh audit analysis
5. `start_audit_run` to create a new run
6. `add_audit_violation` as each non-duplicate finding is confirmed
7. `complete_audit_run` when the audit pass finishes

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
