# Canvas Preview Usage

This reference covers how to build canvas page previews in the current TSX + shadcn-style runtime.

## What You Write

- Page field: `componentTsx`
- Format: React function-component TSX source
- Styling: preset-mapped shared CSS + className utilities

## What The Preview Provides

- React runtime inside canvas preview
- `UI.*` component runtime (see `references/canvas-design-html-guide.md`)
- Shared CSS from `canvases.css.get/update`
- Base CSS + preset token mapping from `canvases.base.css.get`
- Theme mode from canvas toggle (`light` / `dark`)

## Minimal Pattern

```tsx
() => (
  <UI.Container className="p" style={{ "--p": 6 }}>
    <UI.Card>
      <UI.Stack className="gap" style={{ "--gap": 4 }}>
        <UI.Heading as="h2">Page title</UI.Heading>
        <UI.Text className="text-muted">Short description</UI.Text>
      </UI.Stack>
    </UI.Card>
  </UI.Container>
)
```

## Quality Requirements

- Responsive layout by default
- Explicit spacing (padding/gap) for every structural container
- Theme-aware visuals (no hardcoded light-only colors)
- Compliance with all linked rulesets

## Non-Canvas Product Development

Use these MCP tools for real code implementation:

- `shadcn.component.list`
- `shadcn.component.get`
- `shadcn.css.get`
