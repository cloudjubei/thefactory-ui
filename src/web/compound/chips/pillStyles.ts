// Shared visual chrome for the agent/run chip family (Cost, Project, Status,
// Tokens, Turn). Captures the colour + border + sizing that desktop uses for
// these pills. Layout (flex direction, gap) stays per-chip because TokensChip
// stacks vertically while the others lay out horizontally.

// Defers entirely to the CSS `.chip-pill .chip-pill--sm .chip-pill--neutral`
// recipe so project / cost / tokens chips share the `text-box-trim`-based
// optical centring with `.badge` and `.chip`. Don't add Tailwind utilities
// here that fight the CSS — keep it as a single token consumers can compose.
export const CHIP_PILL_NEUTRAL = 'chip-pill chip-pill--sm chip-pill--neutral font-medium'
