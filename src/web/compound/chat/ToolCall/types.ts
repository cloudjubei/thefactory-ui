import type {
  ToolCallLike,
  ToolResultLike,
  ToolResultTypeLike,
} from '../../../../headless/utils/chatTypes'

/**
 * Backwards-compatible aliases for code inside the lifted ToolCall
 * directory that previously imported from `@api/types`. New code should
 * reach for the `Like` aliases from `../types` directly.
 */
export type ToolCall = ToolCallLike
export type ToolResult = ToolResultLike
export type ToolResultType = ToolResultTypeLike
