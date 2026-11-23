import type {
  Chat,
  ChatContext,
  ChatSettings,
  CompletionSettings,
  GetChatSummaryResponse,
} from '../../headless/api/generated/types.gen'
import { FAKE_EVIDENCE_IDS, type FakeEvidenceName } from './evidenceIdsConstants'
import { CLI_MODELS } from './models'
import { FAKE_GROUP_ID, FAKE_PROJECT_ID } from './projects'
import { FAKE_AT, FAKE_STAMP } from './stamps'
import { STORY } from './stories'

export const CHAT_MESSAGES = [
  {
    id: 'u1',
    role: 'user',
    content: 'Why did verify fail on the watch-mode feature?',
  },
  {
    id: 'a1',
    role: 'assistant',
    content:
      'The verifier ran `npm test -- --watch` and it never exited, so the step timed out. The feature works; the check needs `--watch=false` in CI.',
  },
] satisfies NonNullable<Chat['messages']>

const cite = (name: FakeEvidenceName, at?: number): string =>
  `\`&${FAKE_PROJECT_ID}/evidence/${FAKE_EVIDENCE_IDS[name]}${at !== undefined ? `@${at}` : ''}\``

/** A follow-up that cites filed evidence by reference: a screenshot, an issue and a moment. */
export const EVIDENCE_MESSAGES = [
  {
    id: 'u2',
    role: 'user',
    content: 'What did the sign-up run-through find?',
  },
  {
    id: 'a2',
    role: 'assistant',
    content: [
      `The worst is a blocker: Create account does nothing ${cite('run-through-blocker')}.`,
      `It shows in the recording at 0:42 ${cite('run-through-recording', 42)}.`,
      `The short sign-up variant stopped on the same form ${cite('short-stopped')}.`,
    ].join(' '),
  },
] satisfies NonNullable<Chat['messages']>

const COMPLETION: CompletionSettings = {
  limitTurns: true,
  maxTurns: 50,
  numberMessagesToSend: 100,
  availableTools: ['readPaths', 'gitDiff', 'writeFile', 'webSearch'],
  forceFinishTools: [],
  finishTurnOnErrors: false,
  allowNoCallResponses: true,
  allowErrorResponses: true,
}

const settingsOf = (systemPrompt: string, availableTools?: string[]): ChatSettings => ({
  systemPrompt,
  completionSettings: {
    ...COMPLETION,
    ...(availableTools ? { availableTools } : {}),
  },
})

const PROJECT_SETTINGS = settingsOf('You are working in one project.', [
  ...COMPLETION.availableTools,
  'startFeatureWork',
])
const GROUP_SETTINGS = settingsOf('You are working across a group of projects.', [
  'readPaths',
  'startGroupWork',
])
const RUN_SETTINGS = settingsOf('You are the chat of a run.', ['readPaths', 'gitDiff'])

/** What a chat of each type starts with, as `GET /chats/settings` keys it. */
export const FAKE_CHAT_SETTINGS: Record<ChatContext['type'], ChatSettings> = {
  GENERAL: settingsOf('You are the Overseer’s assistant.', ['webSearch', 'startGroupWork']),
  GROUP: GROUP_SETTINGS,
  GROUP_TOPIC: GROUP_SETTINGS,
  PROJECT: PROJECT_SETTINGS,
  PROJECT_TOPIC: PROJECT_SETTINGS,
  STORY: PROJECT_SETTINGS,
  FEATURE: PROJECT_SETTINGS,
  FEATURE_REQUEST: PROJECT_SETTINGS,
  AGENT_RUN_STORY: RUN_SETTINGS,
  AGENT_RUN_FEATURE: RUN_SETTINGS,
  AGENT_RUN_TASK: RUN_SETTINGS,
}

const PROJECT_CONTEXT: ChatContext = { type: 'PROJECT', projectId: FAKE_PROJECT_ID }
const STORY_CONTEXT: ChatContext = {
  type: 'STORY',
  projectId: FAKE_PROJECT_ID,
  storyId: STORY.id,
}
const GROUP_CONTEXT: ChatContext = { type: 'GROUP', groupId: FAKE_GROUP_ID }
const GENERAL_CONTEXT: ChatContext = { type: 'GENERAL', timestamp: FAKE_AT }

/** Stored chats, one per shape: messages or none, on the API or attached to a CLI. */
export const FAKE_CHATS: Chat[] = [
  {
    context: PROJECT_CONTEXT,
    title: 'Why did verify fail?',
    messages: [...CHAT_MESSAGES, ...EVIDENCE_MESSAGES],
    settings: PROJECT_SETTINGS,
    ...FAKE_STAMP,
  },
  {
    context: STORY_CONTEXT,
    title: STORY.title,
    messages: [],
    settings: PROJECT_SETTINGS,
    cliRunner: { tool: 'claude-code', model: CLI_MODELS[0]?.id },
    ...FAKE_STAMP,
  },
  { context: GROUP_CONTEXT, messages: [], settings: GROUP_SETTINGS, ...FAKE_STAMP },
  {
    context: GENERAL_CONTEXT,
    title: 'Set up a new project',
    messages: [{ id: 'g1', role: 'user', content: 'Add a project for the docs site.' }],
    settings: FAKE_CHAT_SETTINGS.GENERAL,
    ...FAKE_STAMP,
  },
]

const CONTEXT_FIELDS = [
  'type',
  'groupId',
  'projectId',
  'storyId',
  'featureId',
  'agentRunId',
  'topicId',
  'featureRequestId',
  'timestamp',
] as const

const sameContext = (a: ChatContext, b: ChatContext) =>
  CONTEXT_FIELDS.every((field) => a[field] === b[field])

/**
 * Identity of a chat inside this store.
 * Kept here so the fake backend imports no package at run time.
 */
function sentChatKey(context: ChatContext): string {
  return JSON.stringify(CONTEXT_FIELDS.map((field) => context[field] ?? null))
}

export const findFakeChat = (context: ChatContext): Chat | undefined =>
  FAKE_CHATS.find((chat) => sameContext(chat.context, context))

type StoredMessage = NonNullable<Chat['messages']>[number]

/** Messages a send appended, keyed by chat, so a later read returns them. */
const sentMessages = new Map<string, StoredMessage[]>()

function openedChat(context: ChatContext): Chat {
  return (
    findFakeChat(context) ?? {
      context,
      messages: [],
      settings: FAKE_CHAT_SETTINGS[context.type],
      ...FAKE_STAMP,
    }
  )
}

/** The chat of a context: stored, or opened the first time it is asked for, as the real backend does. */
export const fakeChatOf = (context: ChatContext): Chat => {
  const base = openedChat(context)
  const sent = sentMessages.get(sentChatKey(context))
  return sent ? { ...base, messages: sent } : base
}

/** Remember messages a send stored, and return the chat as a later read would. */
export function appendFakeChatMessages(
  context: ChatContext,
  messages: readonly StoredMessage[],
): Chat {
  const current = fakeChatOf(context)
  const next = [...(current.messages ?? []), ...messages]
  sentMessages.set(sentChatKey(context), next)
  return { ...current, messages: next }
}

export function fakeChatSummaryOf({ messages = [], ...chat }: Chat): GetChatSummaryResponse {
  return {
    ...chat,
    messageCount: messages.length,
    messageTimes: messages.map(() => FAKE_AT),
    needsYouTimes: [],
  }
}
