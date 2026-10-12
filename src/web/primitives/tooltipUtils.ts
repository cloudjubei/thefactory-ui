import type { TooltipBlurAction, TooltipBlurInput, TooltipRegion } from './tooltipTypes'

/** Whether `target` sits inside any mounted region of the tooltip. */
export function isInsideTooltipRegions(
  target: EventTarget | null,
  regions: ReadonlyArray<TooltipRegion | null | undefined>,
): boolean {
  if (!target) return false
  return regions.some((region) => !!region && region.contains(target as Node))
}

/**
 * Focus moving between the anchor and the tooltip's content keeps it open, so a
 * control inside it can be pressed. Focus going elsewhere closes it; focus going
 * nowhere (a click on plain text, the window losing focus) leaves a pinned
 * tooltip open — an outside click or Escape still dismisses it.
 */
export function tooltipBlurAction({
  nextFocus,
  regions,
  pinned,
}: TooltipBlurInput): TooltipBlurAction {
  if (isInsideTooltipRegions(nextFocus, regions)) return 'keep'
  if (nextFocus === null && pinned) return 'keep'
  return 'close'
}
