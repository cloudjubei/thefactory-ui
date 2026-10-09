import { textLineRange } from '../../headless/utils/fileLocation'

/**
 * Scroll a textarea to its 1-based `line`, a third of the way down, with the line selected — how a
 * file opened from a search result shows where it matched. The height of the text above the line
 * is measured in the textarea itself, so wrapped lines are counted as they are drawn.
 */
export function revealTextLine(el: HTMLTextAreaElement, line: number): void {
  const full = el.value
  const { start, end } = textLineRange(full, line)
  el.value = full.slice(0, start)
  const above = el.scrollHeight
  el.value = full
  el.scrollTop = above <= el.clientHeight ? 0 : above - el.clientHeight / 3
  el.focus({ preventScroll: true })
  el.setSelectionRange(start, end)
}
