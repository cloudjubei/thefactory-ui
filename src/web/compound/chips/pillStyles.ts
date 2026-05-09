// Shared visual chrome for the agent/run chip family (Cost, Project, Status,
// Tokens, Turn). Captures the colour + border + sizing that desktop uses for
// these pills. Layout (flex direction, gap) stays per-chip because TokensChip
// stacks vertically while the others lay out horizontally.

export const CHIP_PILL_NEUTRAL = [
  'rounded-full border px-2 py-0.5',
  'text-xs font-medium',
  'bg-neutral-50 text-neutral-800',
  'dark:bg-neutral-800/60 dark:text-neutral-200',
  'border-neutral-200 dark:border-neutral-700',
].join(' ')
