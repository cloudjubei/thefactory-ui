import type { OutsideDismissOptions, OutsideDismissTarget } from './tooltipTypes'

/**
 * Dismisses an open tooltip on a mousedown outside it or on Escape. Returns the
 * detach that removes the very listeners it added, so each open adds one pair
 * and each close removes it.
 */
export function attachOutsideDismiss(
  target: OutsideDismissTarget,
  { isInside, onDismiss }: OutsideDismissOptions,
): () => void {
  const onMouseDown = (e: Event) => {
    if (!isInside(e.target)) onDismiss()
  }
  const onKeyDown = (e: Event) => {
    if ((e as KeyboardEvent).key === 'Escape') onDismiss()
  }
  target.addEventListener('mousedown', onMouseDown)
  target.addEventListener('keydown', onKeyDown)
  return () => {
    target.removeEventListener('mousedown', onMouseDown)
    target.removeEventListener('keydown', onKeyDown)
  }
}
