import type { AppDeepLink } from './appDeepLink'
import { APP_NOTE_TEXT } from './appNotesConstants'
import type { AppElementPick, AppNote, AppNoteElementTarget } from './appNotesTypes'

const finite = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

/** Ignore malformed notifications rather than forwarding app-controlled HTML to a renderer. */
export function parseAppElementPick(raw: unknown): AppElementPick | null {
  if (!raw || typeof raw !== 'object') return null
  const value = raw as Record<string, unknown>
  if (
    typeof value.selector !== 'string' ||
    !value.selector.trim() ||
    value.selector.length > 4096 ||
    typeof value.outerHtml !== 'string' ||
    !value.outerHtml.trim()
  )
    return null
  const pick: AppElementPick = {
    selector: value.selector,
    outerHtml: value.outerHtml.slice(0, 20_000),
  }
  if (value.rect && typeof value.rect === 'object') {
    const r = value.rect as Record<string, unknown>
    if (
      finite(r.x) &&
      finite(r.y) &&
      finite(r.width) &&
      r.width > 0 &&
      finite(r.height) &&
      r.height > 0
    )
      pick.rect = { x: r.x, y: r.y, width: r.width, height: r.height }
  }
  return pick
}

/** A picked element as one note with one element target, on the App view it was picked in. */
export function appNoteOfPick(
  id: string,
  projectId: string,
  pick: AppElementPick,
  deepLink?: AppDeepLink | null,
): AppNote {
  const target: AppNoteElementTarget = {
    kind: 'element',
    selector: pick.selector,
    outerHtml: pick.outerHtml,
    ...(pick.rect ? { rect: { ...pick.rect, space: 'app-viewport' as const } } : {}),
  }
  return {
    id,
    projectId,
    ...(deepLink ? { view: deepLink.view, params: deepLink.params } : {}),
    comment: '',
    targets: [target],
  }
}

/** A note's line: each element's selector and each area's size, in order. */
export function appNoteLabel(note: AppNote): string {
  return note.targets
    .map((target) =>
      target.kind === 'element'
        ? target.selector
        : APP_NOTE_TEXT.area(Math.round(target.rect.width), Math.round(target.rect.height)),
    )
    .join(', ')
}

/** The captured markup of a note's elements, shown as text only. */
export function appNoteMarkup(note: AppNote): string {
  return note.targets
    .flatMap((target) => (target.kind === 'element' ? [target.outerHtml] : []))
    .join('\n')
}
