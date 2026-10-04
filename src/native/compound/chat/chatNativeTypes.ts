import type { ToolCallLike, ToolResultTypeLike } from '../../../headless/utils/chatTypes'

/** What a host's native tool-card renderer receives for one tool row. */
export type NativeToolCallRenderArgs = {
  toolCall: ToolCallLike
  result?: unknown
  resultType?: ToolResultTypeLike
  durationMs?: number
  /** The call awaits approval in a batch: show a toggle granting it. */
  selectable?: boolean
  selected?: boolean
  onToggleSelect?: () => void
  /** Marked "Always allow": the batch's Resume grants this tool for every later call too. */
  alwaysAllowed?: boolean
  /** Mark or unmark "Always allow" — offered beside the toggle. */
  onAlwaysAllow?: () => void
}
