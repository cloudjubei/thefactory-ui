// Cross-client chat-title formatter. Used by the chat-session screen
// header on web, mobile and desktop so the title reads identically
// regardless of platform.
//
// Format contract (user-defined):
//   - PROJECT          → `${projectName} Chat`
//   - PROJECT_TOPIC    → topic name (chat title) verbatim
//   - STORY            → `Story #${storyIndex}`
//   - FEATURE          → `Feature #${storyIndex}.${featureIndex}`
//   - AGENT_RUN_STORY  → `Agent Run · Story #${storyIndex}`
//   - AGENT_RUN_FEAT.  → `Agent Run · Feature #${storyIndex}.${featureIndex}`
//   - GROUP            → `${groupName} Chat`
//   - GROUP_TOPIC      → topic name (chat title) verbatim
//   - GENERAL          → `General Chat`

import type { ChatContextLike } from './chatTypes'

export type ChatTitleInputs = {
  /** Decoded chat context (PROJECT / STORY / FEATURE / TOPIC / etc.). */
  context: ChatContextLike
  /** Title stored on the chat record — used for `*_TOPIC` types. */
  chatTitle?: string | null
  /** Display name of the active project (PROJECT type). */
  projectName?: string | null
  /** Display name of the active group (GROUP type). */
  groupName?: string | null
  /** 1-based display index for a story (StoriesContext.storyDisplayIndex). */
  storyDisplayIndex?: (storyId: string) => number | undefined
  /** 1-based display index for a feature within a story. */
  featureDisplayIndex?: (storyId: string, featureId: string) => number | undefined
}

function storyRef(
  storyId: string | undefined,
  storyDisplayIndex: ChatTitleInputs['storyDisplayIndex'],
): string {
  if (!storyId) return '?'
  const idx = storyDisplayIndex?.(storyId)
  return typeof idx === 'number' ? String(idx) : (storyId.slice(0, 6) ?? '?')
}

function featureRef(
  storyId: string | undefined,
  featureId: string | undefined,
  storyDisplayIndex: ChatTitleInputs['storyDisplayIndex'],
  featureDisplayIndex: ChatTitleInputs['featureDisplayIndex'],
): string {
  const s = storyRef(storyId, storyDisplayIndex)
  if (!featureId || !storyId) return `${s}.?`
  const fIdx = featureDisplayIndex?.(storyId, featureId)
  const f = typeof fIdx === 'number' ? String(fIdx) : (featureId.slice(0, 6) ?? '?')
  return `${s}.${f}`
}

export function formatChatTitle(input: ChatTitleInputs): string {
  const { context, chatTitle, projectName, groupName, storyDisplayIndex, featureDisplayIndex } =
    input
  switch (context.type) {
    case 'PROJECT':
      return `${projectName ?? 'Project'} Chat`
    case 'PROJECT_TOPIC':
      return chatTitle?.trim() || 'Topic'
    case 'STORY':
      return `Story #${storyRef(context.storyId, storyDisplayIndex)}`
    case 'FEATURE':
      return `Feature #${featureRef(context.storyId, context.featureId, storyDisplayIndex, featureDisplayIndex)}`
    case 'AGENT_RUN_STORY':
      return `Agent Run · Story #${storyRef(context.storyId, storyDisplayIndex)}`
    case 'AGENT_RUN_FEATURE':
      return `Agent Run · Feature #${featureRef(context.storyId, context.featureId, storyDisplayIndex, featureDisplayIndex)}`
    case 'GROUP':
      return `${groupName ?? 'Group'} Chat`
    case 'GROUP_TOPIC':
      return chatTitle?.trim() || 'Topic'
    case 'GENERAL':
      return 'General Chat'
    default:
      return chatTitle?.trim() || 'Chat'
  }
}
