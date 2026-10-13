import type { ChatKind, ChatKindView } from './chatHeaderTypes'

/** Each chat kind's name and tile colour — the same in the header and the chat list. */
export const CHAT_KIND_VIEW: Record<ChatKind, ChatKindView> = {
  project: { label: 'Project chat', ramp: 'brand' },
  topic: { label: 'Topic', ramp: 'brand' },
  story: { label: 'Story chat', ramp: 'pink' },
  feature: { label: 'Feature chat', ramp: 'teal' },
  run: { label: 'Process run', ramp: 'purple' },
  request: { label: 'Incoming request', ramp: 'orange' },
  group: { label: 'Group chat', ramp: 'gray' },
  assistant: { label: 'Assistant', ramp: 'brand' },
}

/** An agent run chat — a single developer or verifier run — reads as a run, named for what it is. */
export const CHAT_AGENT_RUN_KIND_LABEL = 'Agent run'

/** What a run's time chip heads its details with. */
export const CHAT_HEADER_RUN_TIME_TITLE = 'Time spent working, across every attempt'

/** What a chat's cost chip heads its details with. */
export const CHAT_HEADER_CHAT_COST_TITLE = 'Spent in this chat'

/** The context line of a chat no project or story narrows. */
export const CHAT_HEADER_ASSISTANT_CONTEXT = 'Across everything'

/** The pill of an Assistant conversation archived from the list. */
export const CHAT_HEADER_ARCHIVED_PILL = { label: 'Archived', tone: 'empty' } as const
