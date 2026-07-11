# KomaForge Design System — usage conventions

A dark-first, warm-neutral component system (shadcn/ui + Radix + Tailwind v4) for a
manga page editor. Components are exported on `window.KomaForgeUI.*`. Compose them;
do not reimplement. Realistic Korean UI copy is welcome (this is a Korean-language editor).

## Setup & wrapping

- **Import the bundle's `styles.css`.** It carries all design tokens (`:root` = dark, `.light` =
  light) **and** the Tailwind utility set used for layout. Without it, components render unstyled.
- **Theme is dark by default** — no class needed on `<html>`. For the light ("paper") theme, add
  `class="light"` to `<html>`. Never hardcode hex; use the token utilities below so both themes work.
- **No global provider is required** for most components. `IconButton` ships its own tooltip
  provider; if you use the raw `Tooltip` primitive directly, wrap that subtree in `TooltipProvider`.
- **Compounds are composed, never used piecemeal.** `Dialog` = `Dialog` + `DialogTrigger` +
  `DialogContent` (+ `DialogHeader`/`DialogTitle`/`DialogDescription`/`DialogFooter`).
  `Select` = `Select` + `SelectTrigger` + `SelectValue` + `SelectContent` + `SelectItem`.
  `DropdownMenu`, `Popover`, `Collapsible`, `ScrollArea` follow the same Trigger/Content shape.

## Styling idiom — Tailwind utilities with semantic tokens

Every component accepts `className`, merged with `cn()` (tailwind-merge — the later class wins, so
your overrides win). Style your own layout glue with the SAME utilities. **Use semantic token
classes, not raw colors:**

| Role | Classes |
|---|---|
| Surfaces | `bg-background` (app floor) · `bg-card` (panels) · `bg-popover` (overlays) · `bg-secondary` / `bg-muted` (raised, inputs) |
| Text | `text-foreground` (body) · `text-muted-foreground` (secondary) · `text-faint` (hint) |
| Brand (clay accent) | `bg-primary` · `text-primary` · `text-primary-foreground` · `hover:bg-primary-hover` |
| Subtle interaction | `hover:bg-accent` + `hover:text-accent-foreground` (ghost / menu-item hover) |
| Lines & focus | `border-border` · `border-input` · `focus-visible:ring-2 focus-visible:ring-ring/50` |
| Danger | `bg-destructive` · `text-destructive` |

Layout vocabulary available in the stylesheet: `flex`/`grid`, `flex-col`/`flex-row`, `gap-*`,
`items-*`/`justify-*`, `p*-*`/`m*-*`, `w-*`/`h-*`/`size-*`, `grid-cols-{1..12}`, `text-{xs..3xl}`,
`font-{medium,semibold,bold}`, `rounded-{sm,md,lg,xl}`, `shadow-{sm,md,lg}`, `truncate`,
`opacity-*`. The UI is **compact** — prefer `text-xs`/`text-sm`, `gap-2`, `h-7`/`h-8` controls.

Radius: `--radius` is `0.625rem`; use `rounded-md`/`rounded-lg`. Corners are soft, not pill-shaped.

## Where the truth lives

- The bound **`styles.css`** defines every token (read its `:root` and `.light` blocks before
  styling) and the full utility set. The largest CSS file in the bundle.
- Each component's **`<Name>.d.ts`** is its prop contract — read it for variants/sizes
  (e.g. `Button` has `variant`: default/secondary/outline/ghost/destructive/link, `size`: default/sm/lg/icon).

## Idiomatic example

```tsx
// from window.KomaForgeUI
<div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
  <Section title="속성">
    <Row label="이름">
      <Input defaultValue="페이지 1" className="h-7 w-40 text-xs" />
    </Row>
    <Row label="배경">
      <ColorField value="#1a1815" onChange={() => {}} />
    </Row>
  </Section>
  <div className="flex justify-end gap-2">
    <Button variant="ghost" size="sm">취소</Button>
    <Button size="sm">저장</Button>
  </div>
</div>
```
