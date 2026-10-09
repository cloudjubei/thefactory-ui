import type {
  AlwaysAllowScope,
  GrantCovers,
  ToolCallLike,
  ToolResultTypeLike,
} from '../../../headless/utils/chatTypes'

/** What a host's native tool-card renderer receives for one tool row. */
export type NativeToolCallRenderArgs = {
  toolCall: ToolCallLike
  result?: unknown
  resultType?: ToolResultTypeLike
  durationMs?: number
  /** When the call was made — a running call says where it waits once it has run a while. */
  startedAt?: string
  /** The call awaits approval in a batch: show a toggle granting it. */
  selectable?: boolean
  selected?: boolean
  onToggleSelect?: () => void
  /** Where "Always allow" may apply for this call, the default first. Defaults to this chat only. */
  alwaysAllowScopes?: readonly AlwaysAllowScope[]
  /** What an always-allow of this call covers. Defaults to the whole tool. */
  grantCovers?: GrantCovers
  /** Marked "Always allow" in this place: the batch's Resume grants it there. */
  alwaysAllowScope?: AlwaysAllowScope
  /** Mark "Always allow" in `scope`, or (`undefined`) unmark — offered beside the toggle. */
  onAlwaysAllow?: (scope: AlwaysAllowScope | undefined) => void
}
