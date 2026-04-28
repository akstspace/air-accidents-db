# Chai Studio Project Config

Create `chai-studio.yaml` in the project root. This local file tells the skill which Chai Studio application, preset, and rulesets to use by default. Add `chai-studio.yaml` to the project `.gitignore`.

`design-studio.yaml` is the synced application contract. It is generated from `get_application_yaml`, includes `lastUpdated`, and contains application details, the full linked preset, and all linked rulesets. It is not supposed to be manually edited; update it through `get_application_yaml` or the approved `sync_application_yaml` flow. It must be Chai Studio database agnostic: no `application.id`, `preset.id`, `rulesets[].id`, `createdAt`, `updatedAt`, or similar Chai Studio DB fields.

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

- `applicationId`: required. Use `get-applications`; never invent this.
- `applicationName`: optional but helpful for humans.
- `presetId`: required for design sync. Usually present on the application record or returned by `get_application_yaml`.
- `auditRuleSetIds`: required for audit upload. Choose from the application's `auditRuleSetIds`, then verify details via `get-rulesets({ applicationId })`.
- `sync.file`: must be `design-studio.yaml`.
- `sync.lastApplicationYamlUpdatedAt`: copy from `get_application_yaml.lastUpdated` or returned sync/create output.

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
2. If `chai-studio.yaml` exists, read it, call `get_application_yaml(applicationId)`, then run timestamp sync.
3. If `chai-studio.yaml` is missing but `design-studio.yaml` exists, parse it and call `get-applications`.
4. Match by exact `application.name`.
5. If matched, create `chai-studio.yaml`, then run timestamp sync.
6. If not matched, ask for explicit user approval. After approval, call `create_application_from_yaml({ content, approved: true })`, write returned `design-studio.yaml`, then create `chai-studio.yaml`.
7. If neither file exists, call `get-applications`, ask the user to choose an application, create `chai-studio.yaml`, call `get_application_yaml`, and write `design-studio.yaml`.

## Sync Workflow

1. Call `get_application_yaml(applicationId)` and compare its `lastUpdated` with local `design-studio.yaml.lastUpdated`.
2. If MCP is newer, replace local `design-studio.yaml` with MCP content.
3. If local is newer, call `sync_application_yaml({ applicationId, content, approved: false })`, show the diff, ask for approval, then call with `approved: true`.
4. After any create/sync/fetch, update `chai-studio.yaml.sync.lastApplicationYamlUpdatedAt`.
