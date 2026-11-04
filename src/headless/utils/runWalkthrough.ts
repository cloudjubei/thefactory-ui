import { isLoomWalkthroughLink } from 'thefactory-tools/utils'
import { LOOM_WALKTHROUGH_TEXT } from './runWalkthroughConstants'
import type {
  LoomWalkthroughRow,
  LoomWalkthroughView,
  RunWalkthroughItem,
  RunWalkthroughSending,
  RunWalkthroughState,
} from './runWalkthroughTypes'

/** Why a link cannot be added, said before it is sent; nothing for an empty box. */
export function loomLinkProblem(url: string): string | undefined {
  const trimmed = url.trim()
  return trimmed === '' || isLoomWalkthroughLink(trimmed)
    ? undefined
    : LOOM_WALKTHROUGH_TEXT.badLink
}

function sendingWords(sending: RunWalkthroughSending | undefined): string | undefined {
  if (!sending) return undefined
  if (sending.kind === 'link') return LOOM_WALKTHROUGH_TEXT.sendingLink
  const { sentBytes, totalBytes } = sending
  if (sentBytes === undefined || !totalBytes) return LOOM_WALKTHROUGH_TEXT.sendingFile
  return `${LOOM_WALKTHROUGH_TEXT.sendingFile} ${Math.round((sentBytes / totalBytes) * 100)}%`
}

function resultOf(item: RunWalkthroughItem): LoomWalkthroughRow['result'] {
  const { result } = item
  if (!result) return undefined
  if (result.kind !== 'link') return { kind: 'file', label: result.name }
  const label = LOOM_WALKTHROUGH_TEXT.linkResult
  return isLoomWalkthroughLink(result.url)
    ? { kind: 'link', url: result.url, label }
    : { kind: 'file', label }
}

/** What the walkthrough's tab shows, or `undefined` when the run has nothing to record. */
export function loomWalkthroughView(state: RunWalkthroughState): LoomWalkthroughView | undefined {
  const { items, sending, errors } = state
  if (!items || items.length === 0) return undefined
  const rows = items.map((item, index): LoomWalkthroughRow => {
    const result = resultOf(item)
    const words = sendingWords(sending[item.id])
    const error = errors[item.id]
    return {
      id: item.id,
      number: index + 1,
      title: item.title,
      open: item.open,
      steps: item.steps,
      mustShow: item.mustShow,
      ...(result ? { result } : {}),
      state: result ? LOOM_WALKTHROUGH_TEXT.recorded : LOOM_WALKTHROUGH_TEXT.toRecord,
      recorded: result !== undefined,
      ...(words ? { sending: words } : {}),
      ...(error ? { error } : {}),
    }
  })
  const left = rows.filter((r) => !r.recorded).length
  return {
    rows,
    left,
    summary:
      left > 0
        ? LOOM_WALKTHROUGH_TEXT.left(left, rows.length)
        : LOOM_WALKTHROUGH_TEXT.allRecorded(rows.length),
    firstOpen: rows.find((r) => !r.recorded)?.id,
  }
}
