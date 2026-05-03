# Chai Studio Project Config

Create `chai-studio.yaml` in the project root. This local file tells the skill which Chai Studio application, preset, and rulesets to use by default. Add `chai-studio.yaml` to the project `.gitignore`.

`design-studio.yaml` is the synced application contract. It is generated from `applications.yaml.get`, includes `lastUpdated`, and contains application details, the full linked preset, and all linked rulesets. It is not supposed to be manually edited; update it through `applications.yaml.get` or the approved `applications.yaml.sync` flow. It must be Chai Studio database agnostic: no `application.id`, `preset.id`, `rulesets[].id`, `createdAt`, `updatedAt`, or similar Chai Studio DB fields.

## Required MCP Dependencies

- Chai Studio MCP
- Chrome DevTools MCP (required for website exploration workflows only)

## Pagination Defaults

List/discovery operations are paginated at 20 items per page by default.

Applies to:

- applications (`applications.get`)
- presets (`presets.get`)
- rulesets (`rulesets.get`)
- rules (`rulesets.rules.get`)

Agents must iterate pages until target is found or pages are exhausted.

## Minimal `chai-studio.yaml`

```yaml
applicationId: d7f3c8cd-4288-4f21-9a42-386711866539
applicationName: Customer Portal
presetId: heritage-seed
auditRuleSetIds:
  - ruleset-default-craft
sync:
  source: chai-studio
  file: design-studio.yaml
  lastApplicationYamlUpdatedAt: "2026-04-28T00:00:00.000Z"
```

## Required Fields

- `applicationId`: required. Use `applications.get`; never invent this.
- `applicationName`: optional but helpful for humans.
- `presetId`: required for design sync. Usually present on the application record or returned by `applications.yaml.get`.
- `auditRuleSetIds`: required for audit upload. Choose from the application's `auditRuleSetIds`, then verify details via `rulesets.get({ applicationId })`.
- `sync.file`: must be `design-studio.yaml`.
- `sync.lastApplicationYamlUpdatedAt`: copy from `applications.yaml.get.lastUpdated` or returned sync/create output.

## `design-studio.yaml` Shape

```yaml
schemaVersion: "1.0"
lastUpdated: "2026-04-28T00:00:00.000Z"
application:
  name: Customer Portal
  description: Customer-facing dashboard
  websiteUrl: https://example.com
  iconUrl: null
preset:
  name: Heritage Seed
  # full preset fields continue here
rulesets:
  - name: Default Craft Rules
    description: Core UI quality checks
    citationUrl: https://app.chaistudio.space
    rules:
      - id: rule-id
        title: Rule title
        severity: high
        category: visual
        guidance: Rule guidance
```

## Setup Workflow

1. Ensure `chai-studio.yaml` is listed in `.gitignore`.
2. If `chai-studio.yaml` exists, read it, call `applications.yaml.get({ applicationId })`, then run timestamp sync.
3. If `chai-studio.yaml` is missing but `design-studio.yaml` exists:
   - Parse `design-studio.yaml`.
   - Call `applications.get`.
   - Match by exact `application.name`.
   - If matched, create `chai-studio.yaml`, then run timestamp sync.
   - If not matched, ask for explicit user approval before calling `applications.yaml.create({ content, approved: true })`.
4. If neither file exists, call `applications.get`, ask the user to choose an application, create `chai-studio.yaml`, call `applications.yaml.get`, and write `design-studio.yaml`.

## Sync Workflow

1. Call `applications.yaml.get({ applicationId })` and compare its `lastUpdated` with local `design-studio.yaml.lastUpdated`.
2. If MCP is newer, replace local `design-studio.yaml` with MCP content.
3. If local is newer, call `applications.yaml.sync({ applicationId, content, approved: false })`, show the diff, ask for approval, then call with `approved: true`.
4. After any create/sync/fetch, update `chai-studio.yaml.sync.lastApplicationYamlUpdatedAt`.

## Preset Data Contract

`presets.create` expects a JSON design document (not a raw YAML string).

Suggested normalized payload shape:

```json
{
  "name": "Preset Name",
  "design": {
    "tokens": {
      "color": {},
      "typography": {},
      "spacing": {},
      "radius": {},
      "shadow": {},
      "border": {}
    },
    "components": {},
    "states": {},
    "metadata": {
      "sourceUrl": "https://example.com",
      "capturedAt": "2026-05-01T00:00:00.000Z"
    }
  }
}
```

## Application Creation Contract

`applications.create` requires:

- `name`
- `description`
- `presetId`
- `rulesetIds` (array of existing ruleset IDs)

The preset and all rulesets must already exist and belong to the authenticated user.

## Ruleset Contracts

- `rulesets.create`: standalone ruleset creation flow.
- `rulesets.rules.add`: attach an existing rule object to a target `rulesetId`.
- `rulesets.rules.get`: fetch rules from a specific ruleset with pagination.

## Font Fallback Policy

When extracted fonts are unavailable in Chai/platform context:

1. Keep category match first.
2. Prefer open/platform fonts with similar style metrics.
3. Use deterministic priority ordering.
4. Always report fallback and rationale.

Never silently replace fonts. Use `fonts.list` to discover supported fonts.

## Canvas Schema

Canvases are planning surfaces tied to an application. Each canvas has a shared CSS stylesheet and stores page components as JSX.

```yaml
canvas:
  id: string
  userId: string
  applicationId: string
  name: string
  theme: light | dark
  css: string                    # Shared CSS stylesheet injected into all page previews
  generationStatus: idle | started | generating | done | error
  generationStatusUpdatedAt: ISOString
  createdAt: ISOString
  updatedAt: ISOString

canvasPage:
  id: string
  canvasId: string
  title: string
  generationStatus: idle | started | generating | done | error
  generationStatusUpdatedAt: ISOString
  layout:
    x: number                    # X coordinate on the canvas board
    y: number                    # Y coordinate on the canvas board
  componentTsx: string           # React function-component TSX source
  createdAt: ISOString
  updatedAt: ISOString

canvasPageLink:
  id: string
  canvasId: string
  fromPageId: string
  toPageId: string
  label: string
  labelOffsetX: number (default 0)
  labelOffsetY: number (default 0)
  conditionExpr: string | null
  metadata: Record<string, unknown>
  createdAt: ISOString

canvasAnnotation:
  id: string
  pageId: string
  x: number
  y: number
  componentPath: string
  instruction: string
  status: open | fixed
  createdAt: ISOString
  updatedAt: ISOString
```

### Canvas CSS Contract

The `canvas.css` field holds a full stylesheet that is automatically injected into every page preview. Pages should provide TSX in `componentTsx` and rely on shared CSS tokens/classes.

**Best practice:** Call `canvases.base.css.get({ canvasId })` and set `presetMappedCss` via `canvases.css.update` before creating pages.

## Journal Schema

Journals hold markdown design documentation.

```yaml
journal:
  id: string
  name: string
  kind: design | personal
  createdAt: ISOString
  updatedAt: ISOString

journalEntry:
  id: string
  journalId: string
  title: string
  markdown: string
  source: mcp
  createdAt: ISOString
  updatedAt: ISOString
```

## Ruleset Schema

Rulesets are collections of audit rules.

```yaml
ruleset:
  id: string
  name: string
  description: string
  citationUrl: string
  rules:
    - id: string
      title: string
      severity: critical | high | medium | low
      category: accessibility | visual | typography | color | layout | motion | interaction | responsive | metadata | performance | content
      guidance: string
  createdAt: ISOString
  updatedAt: ISOString
```

Every ruleset automatically includes the design-token compliance rule (`rule-ds-01-preset-token-compliance`).
