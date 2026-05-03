# Chai Studio Skill

Reusable agent skill for:

- verifying Chai Studio MCP + Chrome DevTools MCP availability
- exploring user-provided websites with Chrome DevTools MCP
- extracting design systems into preset-ready structured data
- creating Chai artifacts (`presets.create`, `rulesets.create`, `rulesets.rules.add`, `applications.create`)

## Requirements

- An agent environment that supports Agent Skills
- Access to a `chai-studio` MCP server
- Access to a Chrome DevTools MCP server (required for website exploration)

## Key Behavior

- MCP availability gate before exploration/creation.
- Pagination-aware discovery for applications/presets/rulesets/rules (20/page default).
- `presets.create` uses JSON representation of design YAML, not raw YAML.
- Deterministic font fallback policy with explicit rationale reporting.
- Prompting policy: ask only blocking questions.

## Install from GitHub

```bash
npx skills add chai-studio-space/chai-studio-skill
```

## Verify install

```bash
npx skills list
```

## Typical usage prompts

- "Use $chai-studio-skill to explore https://example.com and create a preset from its design system."
- "Use $chai-studio-skill to create a standalone ruleset and attach existing rules."
- "Use $chai-studio-skill to create an application from preset and ruleset IDs."
- "Use $chai-studio-skill to scaffold themed shadcn components for my app using shadcn.component.get."

## Directory Layout

```text
.
├── SKILL.md
├── agents/
│   └── openai.yaml
└── references/
    ├── config.md
    ├── workflows.md
    ├── usage.md
    └── canvas-design-html-guide.md
```

## Canvas Preview

Canvas pages are authored in `componentTsx` and rendered with the built-in `UI.*` runtime plus preset-mapped shared CSS.

## License

MIT. See `LICENSE`.
