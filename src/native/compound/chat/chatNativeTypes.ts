import type {
  AlwaysAllowScope,
  GrantCovers,
  PendingToolGrant,
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
  /** What the call would do if approved, while it waits on that approval. */
  previewResult?: unknown
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
  /** The ask the call's row decides — its compact line and the card it opens to. */
  ask?: PendingToolGrant
}

/**
 * How a native chat shows the images sent with its messages: as thumbnails in
 * the composer and under a sent message, opening full size.
 */
export type NativeAttachmentImages = {
  /** Where a sent file's image is read from, or `undefined` where it cannot be. */
  sourceOf: (path: string) => { uri: string; headers?: Record<string, string> } | undefined
  /** Safe-area insets for the full-size view, supplied by the host. */
  topInset?: number
  bottomInset?: number
}
