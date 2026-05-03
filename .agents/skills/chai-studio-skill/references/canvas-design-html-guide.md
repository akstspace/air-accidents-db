# Canvas TSX Design Guide

Canvas pages now use React TSX via `componentTsx`.

## Source Of Truth

- Use `canvases.base.css.get({ canvasId })` before page generation.
- Set `presetMappedCss` into shared canvas CSS with `canvases.css.update`.
- Create/update pages with `componentTsx` (not `content.html`).

## Page Authoring Contract

- Write React function-component source in `componentTsx`.
- Use `className` (not `class`).
- Keep components theme-aware; canvas preview applies dark mode through root `dark` class.
- Keep components responsive and spacing-consistent.
- Follow linked rulesets before writing layouts.

## Preferred Canvas Runtime Components

Canvas preview injects a `UI` runtime. Use these directly in TSX (no local imports in preview component code):

- Core: `UI.Box`, `UI.Text`, `UI.Heading`, `UI.Stack`, `UI.Row`, `UI.Container`
- Actions: `UI.Button`, `UI.ButtonGroup`, `UI.Toggle`, `UI.ToggleGroup`
- Surfaces: `UI.Card`, `UI.CardHeader`, `UI.CardTitle`, `UI.CardDescription`, `UI.CardContent`, `UI.CardFooter`, `UI.CardElevated`
- Forms: `UI.Input`, `UI.Textarea`, `UI.Label`, `UI.Select`, `UI.InputGroup`, `UI.InputOTP`, `UI.Checkbox`, `UI.RadioGroup`, `UI.RadioItem`, `UI.Switch`, `UI.Slider`, `UI.Form`, `UI.Field`
- Feedback: `UI.Badge`, `UI.Alert`, `UI.AlertDialog`, `UI.Progress`, `UI.Skeleton`, `UI.Spinner`, `UI.Empty`, `UI.Sonner`
- Overlay: `UI.Dialog`, `UI.Drawer`, `UI.Sheet`, `UI.Popover`, `UI.HoverCard`, `UI.Tooltip`
- Data/Nav: `UI.Table`, `UI.Tabs`, `UI.TabsList`, `UI.TabsTrigger`, `UI.TabsContent`, `UI.Accordion`, `UI.AccordionItem`, `UI.AccordionTrigger`, `UI.AccordionContent`, `UI.Breadcrumb`, `UI.Pagination`, `UI.NavigationMenu`, `UI.Menubar`, `UI.DropdownMenu`, `UI.ContextMenu`, `UI.Command`
- Layout/Media: `UI.ScrollArea`, `UI.Collapsible`, `UI.AspectRatio`, `UI.Carousel`, `UI.Resizable`, `UI.Sidebar`, `UI.Chart`, `UI.Avatar`, `UI.Calendar`, `UI.Separator`, `UI.Kbd`

## Example `componentTsx`

```tsx
() => (
  <UI.Container className="p" style={{ "--p": 6 }}>
    <UI.CardElevated>
      <UI.Stack className="gap" style={{ "--gap": 4 }}>
        <UI.Heading as="h1">Welcome</UI.Heading>
        <UI.Text className="text-muted">Get started with your new workspace.</UI.Text>
        <UI.Row className="gap" style={{ "--gap": 3 }}>
          <UI.Button>Primary Action</UI.Button>
          <UI.Badge variant="secondary">New</UI.Badge>
        </UI.Row>
      </UI.Stack>
    </UI.CardElevated>
  </UI.Container>
)
```

## Status Lifecycle

- Start: `generationStatus: "started"`
- Progress: `generationStatus: "generating"`
- Complete: `generationStatus: "done"`
- Failure: `generationStatus: "error"`

## Product Development (Non-Canvas)

For real app implementation, use:

- `shadcn.component.list`
- `shadcn.component.get`
- `shadcn.css.get`

These return themed components/CSS for actual codebase development.
