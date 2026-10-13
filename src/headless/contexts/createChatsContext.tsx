import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { JSX, ReactNode } from 'react'
import {
  abortChatCompletion,
  abortCliAgentRun,
  addChatMessages,
  clearChat as clearChatApi,
  consolidateChat as consolidateChatApi,
  createTopicChat,
  deleteChat as deleteChatApi,
  deleteLastChatMessage,
  getChat as getChatApi,
  getChatSummary as getChatSummaryApi,
  getChatsSettings,
  hideChatFromList as hideChatFromListApi,
  getCliAgentRun,
  listChatSummaries,
  restartChatWithCli,
  sendChatWithCli,
  sendCompletionWithTools,
  setChatNotifyLevel as setChatNotifyLevelApi,
  showChatInList as showChatInListApi,
  updateChat,
  uploadAnyChatAttachment,
  uploadChatAttachment,
} from '../api'
import type {
  ChatContext as ChatCtx,
  ChatMessage,
  GetChatResponse,
  GetChatsSettingsResponse,
  GetLlmConfigResponse,
  SendCompletionWithToolsData,
  UpdateChatData,
} from '../api'
import { useApi, useAuth } from '../api'
import { errorStatus } from '../api/errorMessage'
import { getChatContextKey, normalizeChatContext } from 'thefactory-tools/utils'
import { applyChatLiveStatePatch } from '../utils/chatLiveState'
import { chatUpdateTarget, withChat, withFullRefresh } from '../utils/chatUpdates'
import { withChatNotifyLevel } from '../utils/chatNotify'
import type { ChatNotifyLevel } from '../utils/chatNotifyTypes'
import { chatListBackNotice, chatListHiddenNotice, withChatListHidden } from '../utils/chatList'
import type { ChatListNotice } from '../utils/chatListTypes'
import {
  isChatLoaded,
  withAppendedMessage,
  withSummary,
  type ChatListEntry,
  type ChatSummaryLike,
} from '../utils/chatListEntry'
import { InflightRequests } from '../utils/inflightRequests'
import { createCoalescedRefresh } from '../utils/runUpdateRefresh'
import { isRestartableChatTail } from '../utils/chatMessageRestart'
import { lastMessageDeleteFromIndex } from '../utils/chatTurnDelete'
import { chatCliRunnerToDispatchOptions, parseCliRunUpdateEvent } from '../utils/cliRunner'
import { buildChatPromptVariables, interpolateChatSystemPrompt } from '../utils/promptInterpolate'
import { ChatDraftStore } from '../utils/chatDraftStore'
import { CHAT_TURN_LIMIT_START } from '../utils/chatTurnLimitConstants'
import type { ChatDraft, ChatDraftListener } from '../utils/chatDraftTypes'
import type { SyncKVStorage } from '../hooks/useStorageBackedState'
import { useLLMConfigs } from './LLMConfigsContext'
import { useStories } from './StoriesContext'
import { useProjectsGroups } from './ProjectsGroupsContext'
import { useActiveProject } from './ProjectsContext'

type CompletionSettings = SendCompletionWithToolsData['body']['settings']
export type ChatSettingsPatch = NonNullable<
  NonNullable<UpdateChatData['body']['patch']>['settings']
>
/**
 * Per-chat live state. One entry per active chat context; mutations are
 * scoped so a slow project-chat send doesn't bleed its `Thinking…` into the
 * neighbouring story chat.
 */
export type ChatLiveState = {
  isSending: boolean
  pendingAssistant: { content: string; turn: number } | null
  sendError: Error | null
  /** Active CLI run id for this chat (from the `cli:run-update` stream); null when idle. Drives gated-action grants. */
  cliRunId: string | null
  /** Model tag (`cli-agent/<tool>/<modelId>`) for the active CLI run, so the live
   * Agent-run message shows the same model chip as the persisted reply. */
  cliModel: string | null
  /** ISO start time of the active CLI run, for the live message's timestamp. */
  cliStartedAt: string | null
  /**
   * A delete is in flight for this chat. The rows are already gone locally, so
   * this exists to keep the control busy — a second delete while the first is
   * still landing would trim from a list the server has not agreed to yet, and
   * that is how one mis-aimed click became several.
   */
  isDeleting: boolean
}

const EMPTY_LIVE_STATE: ChatLiveState = {
  isSending: false,
  pendingAssistant: null,
  sendError: null,
  cliRunId: null,
  cliModel: null,
  cliStartedAt: null,
  isDeleting: false,
}

const FALLBACK_COMPLETION_SETTINGS: CompletionSettings = {
  limitTurns: false,
  maxTurns: CHAT_TURN_LIMIT_START,
  numberMessagesToSend: 30,
  availableTools: [],
  forceFinishTools: [],
  finishTurnOnErrors: true,
  allowNoCallResponses: true,
  allowErrorResponses: true,
}

export type ChatsContextValue = {
  /** True once the first chat-list fetch for the active project has completed. */
  isLoaded: boolean
  loadError: Error | null

  /**
   * Every chat — as a summary (no `messages`; see `chatMessageCount` /
   * `chatMessageTimes`) until it is opened or read whole (`loadChat`).
   */
  chats: ChatListEntry[]
  /** The project-level chat for the active project (context type `PROJECT`, no sub-ids). */
  projectChat: ChatListEntry | null
  /** The LLM config currently being used; `null` if none are configured. */
  activeLLMConfig: GetLlmConfigResponse | null

  /** Look up a chat by its `ChatContext`. Returns `null` if not yet created. */
  getChat: (ctx: ChatCtx) => ChatListEntry | null
  /**
   * Read a chat's messages when the list holds only its summary — what an open
   * chat calls. A no-op for a chat already loaded.
   */
  loadChat: (ctx: ChatCtx) => Promise<void>
  /**
   * Read one chat's summary into the list when it is there — for a chat opened
   * before the whole list arrived, so it does not wait on every other chat.
   * Never creates the chat.
   */
  findChat: (ctx: ChatCtx) => Promise<void>
  /**
   * Per-chat live state. Always returns a defaulted shape — never `null` —
   * so consumers can destructure directly.
   */
  getChatLiveState: (ctx: ChatCtx) => ChatLiveState

  /**
   * Per-chat draft text — the text part of {@link getDraftState}. Read at the
   * point you need the value (e.g. on chat open). `clearDraft` empties the
   * composer (text and attachments) and leaves the pending queue.
   */
  getDraft: (ctx: ChatCtx) => string
  setDraft: (ctx: ChatCtx, text: string) => void
  clearDraft: (ctx: ChatCtx) => void
  /**
   * The chat's whole unsent draft: composer text, attachment chips and the
   * pending queue. Kept in the provider's `draftStorage` when one is given, so
   * it survives a reload or a crash.
   */
  getDraftState: (ctx: ChatCtx) => ChatDraft
  updateDraftState: (ctx: ChatCtx, update: (prev: ChatDraft) => ChatDraft) => void
  /** Listen for changes to one chat's draft. Returns the unsubscribe. */
  subscribeDraft: (ctx: ChatCtx, listener: ChatDraftListener) => () => void

  /**
   * Send a message in the given chat context. Persists the user message
   * first, then runs `sendCompletionWithTools`. The backend's chat
   * persistence callbacks write the assistant + tool messages into the
   * chat, so the call is followed by a `refresh()` to pull them in.
   *
   * `attachments` are the project-relative paths {@link uploadAttachment}
   * returned; they ride on the user message's `files` field, and the agent is
   * told their paths to read when it needs them — never their contents.
   *
   * Resolves `true` once the user message reached the server (a failure after
   * that still lands as `sendError`), `false` when it did not — the caller then
   * puts the text back.
   */
  sendMessage: (ctx: ChatCtx, content: string, attachments?: string[]) => Promise<boolean>
  /**
   * Re-trigger the agent on the chat as it already stands, WITHOUT appending a
   * copy of the user's message. Offered when a turn ended without a reply and
   * the conversation's last message is the user's own. No-op when the chat's
   * tail is anything else — the caller trims that tail with
   * {@link deleteLastMessage} first.
   *
   * Both transports re-run the same turn without duplicating it, by opposite
   * means: the API transport is the one that appends client-side, so this path
   * simply skips that step and re-sends the stored messages; the CLI transport
   * appends server-side, so this path calls the restart route instead of the
   * send route.
   */
  restartLastTurn: (ctx: ChatCtx) => Promise<void>
  /** Clear all messages in the chat — keeps the chat record itself. Mirrors
   * desktop's `restartChat`. */
  clearChat: (ctx: ChatCtx) => Promise<void>
  /**
   * Take the chat out of the person's chat list — "Archive from list". It stays
   * open and comes back by itself when it next needs them. Leaves a
   * {@link chatListNotice} whose Undo shows it again.
   */
  hideChatFromList: (ctx: ChatCtx) => Promise<void>
  /** Put a chat hidden from the list back in it — "Show in list again", and the notice's Undo. */
  showChatInList: (ctx: ChatCtx) => Promise<void>
  /**
   * The person's own notification level for a chat — "Notify me" — or, with
   * none, back to the level for its kind. Shown at once; put back if it fails.
   */
  setChatNotifyLevel: (ctx: ChatCtx, level: ChatNotifyLevel | undefined) => Promise<void>
  /** What the chat list last said about a chat leaving or coming back to it, until dismissed. */
  chatListNotice: ChatListNotice | null
  dismissChatListNotice: () => void
  /**
   * Summarise a finished agent-run chat into a NEW chat and close this one.
   * Resolves with the successor's context to navigate to.
   */
  consolidateChat: (ctx: ChatCtx) => Promise<ChatCtx | undefined>
  /** Delete the chat entirely. Backend rejects deletion of the canonical
   * `PROJECT` chat — callers should guard against that case. */
  deleteChat: (ctx: ChatCtx) => Promise<void>
  /** Delete the last message in the chat. Used by the message-hover delete
   * affordance. */
  deleteLastMessage: (ctx: ChatCtx) => Promise<void>
  /**
   * Keep a file attached to a chat in its attachment store — a project chat's
   * in its project, a group chat's in its group workspace, the general chat's in
   * the global chat workspace — for the chat's agent to read when it needs it.
   * The bytes go base64-encoded, so a binary file arrives intact. Resolves to
   * the path to send in the message's `attachments`. The store is temporary: it
   * goes with the chat, or after 30 days unused.
   */
  uploadAttachment: (ctx: ChatCtx, name: string, contentBase64: string) => Promise<string>
  /**
   * Cancel the in-flight chat completion for `ctx`. No-op when nothing is
   * in flight. The HTTP call resolves with `resultType: 'aborted'` rather
   * than throwing — the upstream loop checks `abortSignal.aborted` between
   * turns and tool calls.
   */
  /**
   * Stop the chat's in-flight turn. Pass `serverRunId` — the run the backend
   * reports for this chat — so a stop still reaches the sandbox when live state
   * has no run id, which is every case after a reload or on a second client.
   */
  abortChat: (ctx: ChatCtx, serverRunId?: string) => Promise<void>

  /**
   * Create a new `PROJECT_TOPIC` chat under the given project. Returns the
   * fresh chat shape; the chat list is refreshed in the background. An optional
   * `systemPrompt` is persisted as the topic's per-chat system prompt (via
   * {@link updateChatSettings}) so an embedded app can brief the agent about
   * THIS project + the item under discussion, overriding the generic per-type
   * template for that topic only.
   */
  createProjectTopic: (
    projectId: string,
    title: string,
    systemPrompt?: string,
  ) => Promise<GetChatResponse>
  createGroupTopic: (groupId: string, title: string) => Promise<GetChatResponse>

  /**
   * Returns the per-context settings — `systemPrompt` + `completionSettings` —
   * that were loaded from `getChatsSettings`. Falls back to safe defaults so
   * UI code can render without checking for null.
   */
  getEffectiveChatSettings: (ctx: ChatCtx) => ChatSettingsPatch
  /**
   * The chat type's own settings — what a chat of this type starts with and
   * what "Reset to defaults" puts back — loaded from `getChatsSettings`, with
   * the same safe fallback as {@link getEffectiveChatSettings}.
   */
  getChatTypeSettings: (ctx: ChatCtx) => ChatSettingsPatch
  /**
   * Persist a settings patch on a chat. The backend stores them on the chat
   * itself; subsequent sends pick them up via `getChatsSettings`. The chat
   * must already exist server-side (typically true after the first message).
   */
  updateChatSettings: (ctx: ChatCtx, patch: Partial<ChatSettingsPatch>) => Promise<void>
  /**
   * True when a settings write failed and is being retried. The settings UI
   * greys itself out while blocked; it clears automatically once the backend
   * write succeeds on retry.
   */
  settingsBlocked: boolean

  refresh: () => Promise<void>
}

/**
 * The two host-app context dependencies the factory needs. Apps wire their
 * concrete `useLLMConfigs` / `useActiveProject` hooks in at module load; the
 * factory returns a Provider + `useChats` pair bound to a stable React
 * context.
 */
export type CreateChatsContextDeps = {
  useLLMConfigs: () => {
    configs: GetLlmConfigResponse[]
    activeChatConfig: GetLlmConfigResponse | null
  }
  useActiveProject: () => {
    projectId: string | null | undefined
    project?: { id?: string; title?: string; description?: string }
  }
}

export type ChatsProviderProps = {
  children: ReactNode
  /** Where unsent drafts survive a reload or a crash (web: localStorage; native: MMKV). Omit to keep them in memory. */
  draftStorage?: SyncKVStorage
  /**
   * Calls `flush` when the app is being hidden or closed (`pagehide` on web,
   * AppState `background` on native), so a debounced draft write is not lost.
   * Returns the unsubscribe.
   */
  subscribeAppHidden?: (flush: () => void) => () => void
}

// Coalesce a burst of settings toggles into one backend write.
const SETTINGS_PERSIST_DEBOUNCE_MS = 300
// While the settings surface is blocked (a persist failed), retry on this cadence
// so it unblocks the moment the backend comes back.
const SETTINGS_PERSIST_RETRY_MS = 2000

function nowIso(): string {
  return new Date().toISOString()
}

function buildUserMessage(content: string, files?: string[]): ChatMessage {
  const ts = nowIso()
  return {
    role: 'user',
    content,
    startedAt: ts,
    completedAt: ts,
    durationMs: 0,
    ...(files && files.length > 0 ? { files } : {}),
  }
}

function sameContext(a: ChatCtx, b: ChatCtx): boolean {
  return getChatContextKey(a) === getChatContextKey(b)
}

/**
 * Heal each listed chat's context so its `type` agrees with its fields — chat
 * storage paths are field-keyed, so persisted data whose stamped `type` lies
 * (observed: an agent-run chat stamped 'PROJECT') would otherwise break every
 * type-guarded consumer (grouping, agent-run detection, delete guards).
 */
function chatKeyOf(chat: { context: GetChatResponse['context'] }): string {
  return getChatContextKey(chat.context)
}

function healChatContexts<T extends { context: GetChatResponse['context'] }>(chats: T[]): T[] {
  return chats.map((c) => {
    const healed = normalizeChatContext(c.context as Parameters<typeof normalizeChatContext>[0])
    return healed === c.context ? c : { ...c, context: healed as T['context'] }
  })
}

/**
 * Build a host-bound `{ ChatsProvider, useChats }` pair. Apps call this once
 * at module load — the returned Provider / hook share a single React context
 * identity, so a hot-reload / re-render of the consumer module does not
 * create a fresh context.
 *
 * The factory is the single source of truth for chat orchestration across
 * web + mobile + desktop. Per-app divergence lives only in the two injected
 * hooks (`useLLMConfigs`, `useActiveProject`).
 */
export function createChatsContext(deps: CreateChatsContextDeps): {
  ChatsProvider: (props: ChatsProviderProps) => JSX.Element
  useChats: () => ChatsContextValue
} {
  const { useLLMConfigs, useActiveProject } = deps
  const ChatsContext = createContext<ChatsContextValue | null>(null)

  function ChatsProvider({ children, draftStorage, subscribeAppHidden }: ChatsProviderProps) {
    const { ws, wsState } = useApi()
    const { token } = useAuth()
    const { projectId, project } = useActiveProject()
    const { configs: llmConfigs, activeChatConfig } = useLLMConfigs()
    // Resolve the chat's story / feature / group so their prompt placeholders fill on the send path
    // (StoriesProvider + ProjectsGroupsProvider both wrap ChatsProvider in every app).
    const { getStory, getFeature } = useStories()
    const { getGroupById } = useProjectsGroups()

    const [chats, setChats] = useState<ChatListEntry[]>([])
    // Mirror of `chats` kept in sync SYNCHRONOUSLY (in `refresh`), so code that `await`s a refresh
    // — e.g. createProjectTopic → updateChatSettings → refresh, then sends — reads the just-persisted
    // per-chat system prompt immediately, instead of the stale render-state (which lagged the prompt
    // to the SECOND message).
    const chatsRef = useRef<ChatListEntry[]>([])
    const [chatSettings, setChatSettings] = useState<GetChatsSettingsResponse | null>(null)
    const [isLoaded, setIsLoaded] = useState(false)
    const [loadError, setLoadError] = useState<Error | null>(null)
    const [liveStateByKey, setLiveStateByKey] = useState<Map<string, ChatLiveState>>(
      () => new Map(),
    )

    // Optimistic settings overlay: a settings change shows INSTANTLY (overlay)
    // while the backend write resolves in the background, coalesced so a flurry
    // of toggles persists once. `getEffectiveChatSettings` reads the overlay
    // first; a successful persist (after the inline refresh lands the stored
    // copy) clears the key, so there's no flash of the pre-write value.
    const [pendingSettingsByKey, setPendingSettingsByKey] = useState<
      Record<string, ChatSettingsPatch>
    >({})
    const pendingSettingsRef = useRef<Record<string, ChatSettingsPatch>>({})
    const settingsPersistTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
    // Monotonic per-key edit counter — a flush only clears / stops retrying its
    // own key when no newer edit has superseded it.
    const settingsPersistSeqRef = useRef<Record<string, number>>({})
    // Keys whose last persist attempt failed. Non-empty ⇒ the settings surface
    // is blocked (greyed) until the backend write succeeds on retry.
    const settingsFailedKeysRef = useRef<Set<string>>(new Set())
    const [settingsBlocked, setSettingsBlocked] = useState(false)

    /**
     * Tracks the chat context that currently has a `sendCompletionWithTools`
     * in flight, so the global `completion:progress` WS
     * stream can be routed back to the right per-chat `pendingAssistant`. The
     * backend's progress payload doesn't echo the chatContext today, so this
     * ref is the only way to disambiguate when multiple chats are visible.
     */
    const inFlightCtxRef = useRef<ChatCtx | null>(null)
    // Per chat, the number of the latest `sendMessage` — see the guard there.
    const sendSeqRef = useRef<Map<string, number>>(new Map())
    // CLI runs are dispatched fast (the route returns the runId and detaches),
    // so a run keeps streaming `cli:run-update` after `sendMessage` resolves —
    // past the lifetime of the single `inFlightCtxRef`. Map each live runId to
    // its chat so the stream routes correctly even for concurrent detached runs;
    // entries are removed on the run's terminal event.
    const cliRunCtxByRunIdRef = useRef<Map<string, ChatCtx>>(new Map())
    // Run ids the user explicitly Stopped — so the terminal handler treats the
    // resulting `aborted` status as a clean stop (no error Alert) rather than a
    // failure.
    const userAbortedRunIdsRef = useRef<Set<string>>(new Set())
    // Chats whose Stop was clicked before the CLI run's id was known — abort the
    // run as soon as its id arrives (the abort would otherwise be a no-op).
    const pendingCliAbortKeysRef = useRef<Set<string>>(new Set())
    // Run ids whose terminal event has already been handled — guards the
    // post-202 registration from re-adding an entry (leak) / re-setting a stale
    // cliRunId when the terminal event wins the race against the 202 response.
    const finalizedCliRunIdsRef = useRef<Set<string>>(new Set())
    // Tracks the prior WS connection state so we can detect a (re)connect and
    // resync any run whose terminal event was lost while the socket was down.
    const prevWsStateRef = useRef(wsState)

    // Per-chat drafts. Held outside React state (no re-render on a keystroke)
    // so a sibling that doesn't read this chat's draft doesn't churn; a chat's
    // own composer subscribes to its key.
    const draftStore = useMemo(() => new ChatDraftStore({ storage: draftStorage }), [draftStorage])
    useEffect(() => () => draftStore.dispose(), [draftStore])
    useEffect(
      () => subscribeAppHidden?.(() => draftStore.flush()),
      [draftStore, subscribeAppHidden],
    )
    const getDraftState = useCallback(
      (ctx: ChatCtx): ChatDraft => draftStore.get(getChatContextKey(ctx)),
      [draftStore],
    )
    const updateDraftState = useCallback(
      (ctx: ChatCtx, update: (prev: ChatDraft) => ChatDraft) =>
        draftStore.update(getChatContextKey(ctx), update),
      [draftStore],
    )
    const subscribeDraft = useCallback(
      (ctx: ChatCtx, listener: ChatDraftListener) =>
        draftStore.subscribe(getChatContextKey(ctx), listener),
      [draftStore],
    )
    const getDraft = useCallback(
      (ctx: ChatCtx): string => draftStore.get(getChatContextKey(ctx)).text,
      [draftStore],
    )
    const setDraft = useCallback(
      (ctx: ChatCtx, text: string) =>
        draftStore.update(getChatContextKey(ctx), (prev) =>
          prev.text === text ? prev : { ...prev, text },
        ),
      [draftStore],
    )
    const clearDraft = useCallback(
      (ctx: ChatCtx) =>
        draftStore.update(getChatContextKey(ctx), (prev) =>
          prev.text === '' && prev.attachments.length === 0
            ? prev
            : { ...prev, text: '', attachments: [] },
        ),
      [draftStore],
    )

    const updateLiveState = useCallback((ctx: ChatCtx, patch: Partial<ChatLiveState>) => {
      const key = getChatContextKey(ctx)
      // A no-op patch keeps the map identity: a streaming CLI turn re-asserts the
      // same `cliRunId` on every transcript entry, and minting a fresh Map for
      // each one re-rendered every chats-context consumer in the app.
      setLiveStateByKey(
        (prev) =>
          applyChatLiveStatePatch(prev, key, EMPTY_LIVE_STATE, patch) as Map<string, ChatLiveState>,
      )
    }, [])

    const getChatLiveState = useCallback(
      (ctx: ChatCtx): ChatLiveState =>
        liveStateByKey.get(getChatContextKey(ctx)) ?? EMPTY_LIVE_STATE,
      [liveStateByKey],
    )

    // AbortController per refresh — StrictMode double-invoke aborts the
    // first request as the second takes over, plus WS-driven refreshes
    // don't pile up if one is already in flight.
    const abortRef = useRef<AbortController | null>(null)
    // When each chat was last read on its own, on a counter shared with the full
    // read — so a full read that began earlier keeps the newer copy.
    const chatUpdateSeqRef = useRef(0)
    const chatUpdatedAtRef = useRef(new Map<string, number>())
    const refresh = useCallback(async () => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      if (!token) {
        setChats([])
        setIsLoaded(true)
        setLoadError(null)
        return
      }
      try {
        // Summaries of ALL chats (no projectId filter) so the sidebar can render
        // per-project unread / thinking badges for every project, not just
        // the active one. Summaries, not chats: every chat's messages ran to
        // megabytes, and only the open chat shows them (`loadChat`).
        const startedAt = chatUpdateSeqRef.current
        const { data } = await listChatSummaries({
          signal: controller.signal,
          throwOnError: true,
        })
        if (controller.signal.aborted) return
        const healed = healChatContexts(data as ChatSummaryLike[])
        const fresher = new Set<string>()
        for (const [key, at] of chatUpdatedAtRef.current) if (at > startedAt) fresher.add(key)
        setChats((prev) => {
          const byKey = new Map(prev.map((c) => [chatKeyOf(c), c]))
          const merged = healed.map((sm) => withSummary(byKey.get(chatKeyOf(sm)), sm))
          return withFullRefresh(prev, merged, fresher, chatKeyOf)
        })
        setLoadError(null)
      } catch (err) {
        if (controller.signal.aborted) return
        setLoadError(err instanceof Error ? err : new Error(String(err)))
      } finally {
        if (!controller.signal.aborted) setIsLoaded(true)
      }
    }, [token])

    // Keep the ref synced for the optimistic setChats paths (message sends, deletes) too, so reads
    // never see a chat the state has since dropped/added.
    useEffect(() => {
      chatsRef.current = chats
    }, [chats])

    useEffect(() => {
      if (!token) {
        setChats([])
        setIsLoaded(true)
        setLoadError(null)
        setLiveStateByKey(new Map())
        return
      }
      void refresh()
      return () => abortRef.current?.abort()
    }, [token, refresh])

    // A chat changing reads that chat alone. Reading every chat with every
    // message — megabytes — on each update, aborting the read before it, meant
    // a turn streaming updates kept cancelling its own refresh: replies and
    // their asks appeared only seconds after the stream went quiet.
    const refreshAllCoalesced = useMemo(() => createCoalescedRefresh(refresh), [refresh])
    const stampChatUpdate = useCallback((ctx: ChatCtx) => {
      chatUpdateSeqRef.current += 1
      chatUpdatedAtRef.current.set(getChatContextKey(ctx), chatUpdateSeqRef.current)
    }, [])
    /** Read one chat whole and put it in the list — in place, or added. Returns it. */
    const fetchChat = useCallback(
      async (ctx: ChatCtx): Promise<GetChatResponse> => {
        const { data } = await getChatApi({ body: { context: ctx }, throwOnError: true })
        const [healed] = healChatContexts([data])
        stampChatUpdate(ctx)
        setChats((prev) => withChat<ChatListEntry>(prev, healed, chatKeyOf))
        return healed
      },
      [stampChatUpdate],
    )
    /**
     * Read one chat's summary into the list — for a chat whose messages are not
     * loaded, which a change must not pull in whole. Gone from the server: gone
     * from the list.
     */
    const fetchChatSummary = useCallback(
      async (ctx: ChatCtx): Promise<void> => {
        let data: unknown
        try {
          ;({ data } = await getChatSummaryApi({ body: { context: ctx }, throwOnError: true }))
        } catch (err) {
          if (errorStatus(err) !== 404) throw err
          setChats((prev) => prev.filter((c) => !sameContext(c.context, ctx)))
          return
        }
        const [healed] = healChatContexts([data as ChatSummaryLike])
        stampChatUpdate(ctx)
        setChats((prev) => {
          const current = prev.find((c) => sameContext(c.context, ctx))
          return withChat(prev, withSummary(current, healed), chatKeyOf)
        })
      },
      [stampChatUpdate],
    )
    const chatLoadsRef = useRef(new InflightRequests<GetChatResponse>())
    /** The chat whole — as the list holds it when loaded, else read once however many ask. */
    const ensureChatLoaded = useCallback(
      async (ctx: ChatCtx): Promise<GetChatResponse> => {
        const current = chatsRef.current.find((c) => sameContext(c.context, ctx))
        if (current && isChatLoaded(current)) return current
        return chatLoadsRef.current.run(getChatContextKey(ctx), () => fetchChat(ctx))
      },
      [fetchChat],
    )
    const loadChat = useCallback(
      async (ctx: ChatCtx): Promise<void> => {
        await ensureChatLoaded(ctx)
      },
      [ensureChatLoaded],
    )
    /**
     * What a change to ONE chat reloads: that chat. The whole list — every chat
     * with every message — is read again only if it cannot be.
     */
    const reloadChat = useCallback(
      async (ctx: ChatCtx): Promise<void> => {
        try {
          await fetchChat(ctx)
        } catch {
          await refresh()
        }
      },
      [fetchChat, refresh],
    )
    const chatRefreshersRef = useRef(new Map<string, () => Promise<void>>())
    const refreshChat = useCallback(
      (ctx: ChatCtx): Promise<void> => {
        const key = getChatContextKey(ctx)
        let refreshOne = chatRefreshersRef.current.get(key)
        if (!refreshOne) {
          // A loaded chat is read whole — it is on screen, or was; any other
          // only as a summary, which is all the lists show of it.
          refreshOne = createCoalescedRefresh(async () => {
            const current = chatsRef.current.find((c) => sameContext(c.context, ctx))
            if (current && isChatLoaded(current)) await fetchChat(ctx)
            else await fetchChatSummary(ctx)
          })
          chatRefreshersRef.current.set(key, refreshOne)
        }
        return refreshOne()
      },
      [fetchChat, fetchChatSummary],
    )
    useEffect(
      () =>
        ws.on('chats:updated', (data: unknown) => {
          const target = chatUpdateTarget(data)
          if (!target) {
            void refreshAllCoalesced()
            return
          }
          void refreshChat(target).catch(() => void refreshAllCoalesced())
        }),
      [ws, refreshAllCoalesced, refreshChat],
    )
    // What changed while the socket was down — a card closed, a message added — was never told.
    useEffect(() => ws.onReconnect(() => void refreshAllCoalesced()), [ws, refreshAllCoalesced])

    // Load chat settings once auth lands. The map is keyed by ChatContextType
    // (PROJECT, STORY, …) and supplies the systemPrompt + completionSettings
    // we forward to send-with-tools / resume.
    useEffect(() => {
      if (!token) return
      let cancelled = false
      void (async () => {
        try {
          const { data } = await getChatsSettings({ throwOnError: true })
          if (!cancelled) setChatSettings(data)
        } catch {
          // The settings endpoint is non-critical; chat send falls back to
          // FALLBACK_COMPLETION_SETTINGS until it lands.
        }
      })()
      return () => {
        cancelled = true
      }
    }, [token])

    // Cancel any in-flight settings-persist debounce/retry timers on unmount so
    // a flush doesn't fire against a torn-down provider.
    useEffect(() => {
      const timers = settingsPersistTimersRef.current
      return () => {
        for (const t of Object.values(timers)) clearTimeout(t)
      }
    }, [])

    // Subscribe to completion progress: per-turn partial messages and a final
    // `done` envelope. The backend's payload is loosely typed so we narrow
    // defensively before reading from it. Routes back to the in-flight chat
    // via `inFlightCtxRef`.
    useEffect(() => {
      type ProgressTurn = { turn: number; assistantMessage?: { content?: string } }
      type ProgressDone = { done: true }
      const isTurn = (v: unknown): v is ProgressTurn =>
        typeof v === 'object' && v !== null && typeof (v as ProgressTurn).turn === 'number'
      const isDone = (v: unknown): v is ProgressDone =>
        typeof v === 'object' && v !== null && (v as ProgressDone).done === true
      return ws.on('completion:progress', (data) => {
        const target = inFlightCtxRef.current
        if (!target) return
        if (isDone(data)) {
          updateLiveState(target, { pendingAssistant: null })
          return
        }
        if (isTurn(data)) {
          const content = data.assistantMessage?.content ?? ''
          updateLiveState(target, { pendingAssistant: { turn: data.turn, content } })
        }
      })
    }, [ws, updateLiveState])

    // The chat whose CLI run is starting — its id not known until the start
    // call answers. An update for a run no chat has claimed goes to it, and only
    // then: falling back to whichever chat was sending lasted a whole API turn,
    // and adopted any run streaming meanwhile — a resume in another chat, a
    // process step — as that chat's own.
    const cliStartingCtxRef = useRef<ChatCtx | null>(null)
    const whileCliRunStarts = useCallback(
      async <T,>(ctx: ChatCtx, start: () => Promise<T>): Promise<T> => {
        cliStartingCtxRef.current = ctx
        try {
          return await start()
        } finally {
          if (cliStartingCtxRef.current === ctx) cliStartingCtxRef.current = null
        }
      },
      [],
    )

    // Stream a CLI-backed run's transcript into the same `pendingAssistant`
    // live preview (the API path uses `completion:progress`; CLI runs broadcast
    // on `cli:run-update`). Routed to the in-flight chat via `inFlightCtxRef`.
    useEffect(() => {
      return ws.on('cli:run-update', (data) => {
        const parsed = parseCliRunUpdateEvent(data)
        if (!parsed) return
        // Ignore any event for a run we've already finalized (terminal handled,
        // or the chat was cleared/aborted) — a late stray event must not
        // re-mount a dead/cleared run.
        if (finalizedCliRunIdsRef.current.has(parsed.runId)) return
        // Route by runId (the run may be detached, past `inFlightCtxRef`'s
        // lifetime). Only fall back to the in-flight chat for a runId we have
        // never mapped — and never stamp an error through that fallback, since
        // it may resolve to a different chat (a second send in the race window).
        const mapped = cliRunCtxByRunIdRef.current.get(parsed.runId)
        const target = mapped ?? cliStartingCtxRef.current
        if (!target) return
        if (parsed.kind === 'terminal') {
          // Mark the run finalized so the post-202 registration doesn't re-add a
          // map entry / re-set a stale cliRunId if the terminal event beat it.
          finalizedCliRunIdsRef.current.add(parsed.runId)
          const userAborted = userAbortedRunIdsRef.current.delete(parsed.runId)
          // The run is over: stop the sending spinner and clear the live preview
          // state. Keep `cliRunId` set so the live run view stays mounted until
          // the persisted reply (carrying the same runId) lands on the next
          // refresh — the shared key then lets React move the instance in place
          // (no finish flash); `MessageList` drops the trailing live block once a
          // displayed message owns the runId.
          //
          // Surface a failure only for a GENUINE error/abort that we mapped to
          // this chat: a user-initiated Stop (userAborted) is a clean stop, not
          // an error, and a fallback-routed event isn't reliably this chat's.
          const surfaceError =
            !!mapped && !userAborted && (parsed.status === 'errored' || parsed.status === 'aborted')
          updateLiveState(target, {
            isSending: false,
            pendingAssistant: null,
            cliModel: null,
            cliStartedAt: null,
            ...(surfaceError
              ? {
                  sendError: new Error(
                    parsed.error && parsed.error.length > 0
                      ? parsed.error
                      : `The agent run ${parsed.status} without a reply.`,
                  ),
                }
              : {}),
          })
          cliRunCtxByRunIdRef.current.delete(parsed.runId)
          return
        }
        // Surface the run id so gated-action grants (usePendingToolGrants) can
        // query this run's pending approvals while it streams, and so the live
        // run view mounts. The transcript itself is NOT accumulated here: the run
        // view reads it from `useCliRunArtifact` (batched, and carrying tool rows
        // as well as prose), and a per-entry live-state write re-rendered every
        // chats-context consumer for text nothing rendered.
        updateLiveState(target, { cliRunId: parsed.runId, pendingAssistant: null })
      })
    }, [ws, updateLiveState])

    // Reconcile the optimistic `pendingAssistant` bubble against the persisted
    // messages: once the in-flight turn's assistant message is persisted (it now
    // renders as a normal row — pulled in by a mid-loop `chats:updated` refresh),
    // drop the trailing pending bubble so the same text doesn't double-render.
    useEffect(() => {
      const ctx = inFlightCtxRef.current
      if (!ctx) return
      const key = getChatContextKey(ctx)
      const pending = liveStateByKey.get(key)?.pendingAssistant
      if (!pending) return
      const messages = chats.find((c) => sameContext(c.context, ctx))?.messages ?? []
      let lastAssistant: string | undefined
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'assistant') {
          lastAssistant = messages[i].content ?? ''
          break
        }
      }
      if (lastAssistant !== undefined && lastAssistant === pending.content) {
        updateLiveState(ctx, { pendingAssistant: null })
      }
    }, [chats, liveStateByKey, updateLiveState])

    // Recover a detached CLI run whose terminal `cli:run-update` was lost (WS
    // drop/reconnect): a detached run keeps `isSending` true until that event
    // clears it. When the run's persisted reply (carrying its `cliRunId`) lands
    // on a refresh, the run is provably done — clear the stuck spinner even
    // though the terminal event never arrived. (No-op in the normal flow, where
    // the terminal event already cleared `isSending` before the reply lands.)
    useEffect(() => {
      for (const chat of chats) {
        const live = liveStateByKey.get(getChatContextKey(chat.context))
        if (!live?.isSending || !live.cliRunId) continue
        // The run's assistant message is persisted EMPTY at start (its runId
        // anchors the live run view); a non-empty content means the run finished
        // and its reply was finalized. Only the latter is a "done" signal — the
        // empty start-anchor must NOT clear the spinner mid-run.
        const replyFinalized = (chat.messages ?? []).some(
          (m) =>
            (m as { cliRunId?: string }).cliRunId === live.cliRunId &&
            typeof m.content === 'string' &&
            m.content.trim().length > 0,
        )
        if (!replyFinalized) continue
        finalizedCliRunIdsRef.current.add(live.cliRunId)
        cliRunCtxByRunIdRef.current.delete(live.cliRunId)
        updateLiveState(chat.context, { isSending: false, pendingAssistant: null })
      }
    }, [chats, liveStateByKey, updateLiveState])

    // On a WS (re)connect, resync any chat still mid-CLI-run: a terminal
    // `cli:run-update` that fired while the socket was down is lost (the
    // transport has no replay), which would otherwise strand `isSending`
    // forever. Fetch the authoritative run record and, if it has terminated,
    // clear the spinner + surface a genuine failure. This is the backstop for a
    // run that errored/aborted with no persisted reply (the reply-landed
    // reconcile above can't catch that case).
    useEffect(() => {
      const prev = prevWsStateRef.current
      prevWsStateRef.current = wsState
      if (wsState !== 'open' || prev === 'open') return
      for (const [runId, ctx] of cliRunCtxByRunIdRef.current) {
        const live = liveStateByKey.get(getChatContextKey(ctx))
        if (!live?.isSending) continue
        void getCliAgentRun({ path: { runId }, throwOnError: true })
          .then(({ data }) => {
            const run = data as {
              status?: string
              failure?: { message?: string }
              abortReason?: string
            }
            const status = run.status
            if (status !== 'succeeded' && status !== 'errored' && status !== 'aborted') return
            finalizedCliRunIdsRef.current.add(runId)
            cliRunCtxByRunIdRef.current.delete(runId)
            const userAborted = userAbortedRunIdsRef.current.delete(runId)
            const surfaceError = status === 'errored' || (status === 'aborted' && !userAborted)
            updateLiveState(ctx, {
              isSending: false,
              pendingAssistant: null,
              cliModel: null,
              cliStartedAt: null,
              ...(surfaceError
                ? {
                    sendError: new Error(
                      run.failure?.message ??
                        run.abortReason ??
                        `The agent run ${status} without a reply.`,
                    ),
                  }
                : {}),
            })
          })
          .catch(() => {})
      }
    }, [wsState, liveStateByKey, updateLiveState])

    // The project-level chat is the one scoped directly to the active project
    // (no story / feature / topic). It's what the chat sidebar pins at the top.
    // A project ALWAYS has a Project chat to land on: the backend creates the
    // persisted PROJECT chat lazily (on first message), so when none exists yet
    // we return a synthetic, sendable one (empty messages) rather than null —
    // every client then renders a tappable Project-chat row, and post-delete
    // navigation always has a concrete target.
    const projectChat = useMemo<ChatListEntry | null>(() => {
      if (!projectId) return null
      const existing = chats.find(
        (c) =>
          c.context.type === 'PROJECT' &&
          c.context.projectId === projectId &&
          !c.context.topicId &&
          !c.context.storyId &&
          !c.context.featureId,
      )
      if (existing) return existing
      return { context: { type: 'PROJECT', projectId }, messages: [] } as GetChatResponse
    }, [chats, projectId])

    const activeLLMConfig = activeChatConfig ?? llmConfigs[0] ?? null

    const getChat = useCallback(
      (ctx: ChatCtx): ChatListEntry | null =>
        chats.find((c) => sameContext(c.context, ctx)) ?? null,
      [chats],
    )

    /**
     * Build the per-context settings + system prompt forwarded to
     * send-with-tools — the server keeps them with the turn, so the turn goes on
     * with them once its asks are decided. The chat's own `completionSettings` —
     * including its one approval switch (`toolApprovalMode`) from the settings
     * dropdown — always wins when present. Which calls ask is the server's one
     * policy, the same for an API chat as for a CLI chat.
     */
    const buildToolSettings = useCallback(
      (context: ChatCtx): { settings: CompletionSettings; systemPrompt?: string } => {
        // Prefer the optimistic overlay (a toggle the user flipped this instant,
        // not yet persisted), then the REF (settings persisted moments ago,
        // before `chats` state caught up), then nothing.
        const perChat =
          pendingSettingsRef.current[getChatContextKey(context)] ??
          chatsRef.current.find((c) => sameContext(c.context, context))?.settings
        const typeEntry = chatSettings?.[context.type]
        // Per-chat completionSettings (the user's tool selection) take precedence over the per-type
        // template regardless of whether the chat also carries a custom system prompt.
        const base =
          perChat?.completionSettings ??
          typeEntry?.completionSettings ??
          FALLBACK_COMPLETION_SETTINGS
        // A chat carrying its own system prompt (e.g. set by an embedded app via createProjectTopic)
        // overrides the generic per-type template; otherwise fall back to it.
        const rawSystemPrompt = perChat?.systemPrompt || typeEntry?.systemPrompt
        // Interpolate `{{project_*}}` / `{{story_*}}` / `{{feature_*}}` / `{{group_*}}` BEFORE the prompt
        // goes on the wire — the model must receive the resolved context, not the raw template the viewer
        // renders separately.
        const vars = buildChatPromptVariables(context, {
          project,
          getStory,
          getFeature,
          getGroupById,
        })
        const systemPrompt = interpolateChatSystemPrompt(rawSystemPrompt, vars)
        return { settings: { ...base }, systemPrompt }
      },
      [chatSettings, project, getStory, getFeature, getGroupById],
    )

    // A CLI turn keeps streaming server-side after its 202 lands: route the run's
    // `cli:run-update` events to this chat by runId and mount the live run view.
    // Shared by the send and the restart paths, which detach identically.
    const registerDetachedCliRun = useCallback(
      (ctx: ChatCtx, runId: string | undefined) => {
        // Stop may have been clicked before the runId was known; consume the
        // intent now, whether or not the run below is still worth mounting.
        const wasPendingAbort = pendingCliAbortKeysRef.current.delete(getChatContextKey(ctx))
        // If the run's terminal event already arrived (it can win the race
        // against the 202 response for a fast-failing run), don't re-mount a dead
        // run: the terminal handler has finalized it.
        if (!runId || finalizedCliRunIdsRef.current.has(runId)) return
        cliRunCtxByRunIdRef.current.set(runId, ctx)
        updateLiveState(ctx, { cliRunId: runId })
        if (!wasPendingAbort) return
        userAbortedRunIdsRef.current.add(runId)
        void abortCliAgentRun({
          path: { runId },
          body: { reason: 'aborted by user' },
          throwOnError: false,
        }).catch(() => {})
      },
      [updateLiveState],
    )

    const sendMessage = useCallback(
      async (ctx: ChatCtx, content: string, attachments?: string[]): Promise<boolean> => {
        if (!activeLLMConfig) throw new Error('Configure an LLM before sending messages')
        const trimmed = content.trim()
        if (trimmed.length === 0 && (!attachments || attachments.length === 0)) return false

        // A send made while an earlier one is still out (a queued message sent
        // now) owns the chat's live state from here: the earlier call's cleanup
        // must not clear the spinner of the turn that replaced it.
        const sendKey = getChatContextKey(ctx)
        const sendSeq = (sendSeqRef.current.get(sendKey) ?? 0) + 1
        sendSeqRef.current.set(sendKey, sendSeq)
        let delivered = false
        updateLiveState(ctx, {
          isSending: true,
          sendError: null,
          pendingAssistant: null,
        })
        inFlightCtxRef.current = ctx
        // Set when the send dispatches a CLI run that keeps streaming after this
        // call resolves — the finally then leaves the live state (isSending /
        // cliRunId) for the run's terminal `cli:run-update` to clear.
        let detachedCli = false
        try {
          const userMessage = buildUserMessage(trimmed, attachments)
          const { settings, systemPrompt } = buildToolSettings(ctx)

          // CLI-backed chat: the fast route persists the user message, STARTS the
          // sandboxed CLI run, and returns its runId immediately (it does NOT
          // hold the connection open for the whole run). Progress streams on
          // `cli:run-update`; the assistant reply is persisted + a `chats:updated`
          // broadcast fires when the detached run completes. Stopping goes
          // through `abortChat` → the CLI abort route.
          const cliRunner = getChat(ctx)?.cliRunner
          if (cliRunner) {
            // Surface the model + start time so the live Agent-run message frames
            // itself like the persisted reply (same model chip + timestamp).
            updateLiveState(ctx, {
              cliModel: `cli-agent/${cliRunner.tool}/${cliRunner.model ?? ''}`,
              cliStartedAt: new Date().toISOString(),
            })
            // Optimistically show the user's message right away (the route also
            // persists it; `reloadChat` reconciles the copy).
            setChats((prev) =>
              prev.map((c) =>
                sameContext(c.context, ctx) ? withAppendedMessage(c, userMessage) : c,
              ),
            )
            const { data } = await whileCliRunStarts(ctx, () =>
              sendChatWithCli({
                body: {
                  chatContext: ctx,
                  llmConfig: activeLLMConfig,
                  message: userMessage,
                  settings,
                  ...(systemPrompt ? { systemPrompt } : {}),
                  runner: 'cli',
                  cliRunner: chatCliRunnerToDispatchOptions(cliRunner),
                },
                throwOnError: true,
              }),
            )
            // The run is now detached server-side: route its `cli:run-update`
            // stream to this chat by runId, and mount the live run view. The run
            // keeps `isSending` true (the spinner / Stop button stay) until its
            // terminal event clears it — `detachedCli` keeps the finally below
            // from prematurely clearing the live state.
            detachedCli = true
            delivered = true
            registerDetachedCliRun(ctx, data?.runId)
            // Reconcile the optimistic user message with the persisted copy.
            await reloadChat(ctx)
            return delivered
          }

          // Optimistically show the user's message immediately (mirrors the CLI
          // path) so the list never flashes empty / the system-prompt bubble in
          // the window before the persisted copy is pulled in by `reloadChat`.
          await ensureChatLoaded(ctx)
          setChats((prev) =>
            prev.map((c) =>
              sameContext(c.context, ctx) ? withAppendedMessage(c, userMessage) : c,
            ),
          )

          await addChatMessages({
            body: { context: ctx, messages: [userMessage] },
            throwOnError: true,
          })
          delivered = true

          await sendCompletionWithTools({
            body: {
              request: {
                chatContext: ctx,
                llmConfig: activeLLMConfig,
                ...(systemPrompt ? { systemPrompt } : {}),
              },
              settings,
            },
            throwOnError: true,
          })

          await reloadChat(ctx)
          return delivered
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('[chat] send failed:', err)
          updateLiveState(ctx, {
            sendError: err instanceof Error ? err : new Error(String(err)),
          })
          return delivered
        } finally {
          const superseded = sendSeqRef.current.get(sendKey) !== sendSeq
          if (!superseded && inFlightCtxRef.current && sameContext(inFlightCtxRef.current, ctx)) {
            inFlightCtxRef.current = null
          }
          // A detached CLI run is still streaming — leave isSending / cliRunId /
          // pendingAssistant for its terminal `cli:run-update` to clear (routing
          // now goes through the runId map, not inFlightCtxRef). For the API path
          // (and CLI start failures) the turn is done: clear the live markers.
          //
          // `cliModel` is cleared here too. It is set optimistically BEFORE the CLI
          // request, so a start failure would otherwise strand the tag on the chat
          // — and every later API turn would render "Preparing <that CLI>…" while
          // no CLI is involved at all.
          if (!detachedCli && !superseded) {
            updateLiveState(ctx, {
              isSending: false,
              pendingAssistant: null,
              cliRunId: null,
              cliModel: null,
              cliStartedAt: null,
            })
          }
        }
      },
      [
        activeLLMConfig,
        buildToolSettings,
        ensureChatLoaded,
        getChat,
        reloadChat,
        registerDetachedCliRun,
        updateLiveState,
      ],
    )

    const restartLastTurn = useCallback(
      async (ctx: ChatCtx) => {
        if (!activeLLMConfig) throw new Error('Configure an LLM before restarting a turn')
        // The turn being re-run is the one already stored. Nothing is appended
        // here and nothing is appended server-side, so the user's message stays
        // single — that is the whole difference from `sendMessage`.
        // Refuse a second restart while one is already going: two runs on one
        // chat means two placeholders and two transcripts racing into the same
        // view, and on the API path the second request aborts the first.
        if (getChatLiveState(ctx).isSending) return
        const messages = (await ensureChatLoaded(ctx)).messages ?? []
        if (!isRestartableChatTail(messages)) return

        updateLiveState(ctx, {
          isSending: true,
          sendError: null,
          pendingAssistant: null,
        })
        inFlightCtxRef.current = ctx
        let detachedCli = false
        try {
          const { settings, systemPrompt } = buildToolSettings(ctx)

          const cliRunner = getChat(ctx)?.cliRunner
          if (cliRunner) {
            updateLiveState(ctx, {
              cliModel: `cli-agent/${cliRunner.tool}/${cliRunner.model ?? ''}`,
              cliStartedAt: new Date().toISOString(),
            })
            // The CLI route appends the message on a normal send, so a restart
            // needs its own entry point rather than a second POST to that one.
            const { data } = await whileCliRunStarts(ctx, () =>
              restartChatWithCli({
                body: {
                  chatContext: ctx,
                  llmConfig: activeLLMConfig,
                  settings,
                  ...(systemPrompt ? { systemPrompt } : {}),
                  runner: 'cli',
                  cliRunner: chatCliRunnerToDispatchOptions(cliRunner),
                },
                throwOnError: true,
              }),
            )
            detachedCli = true
            registerDetachedCliRun(ctx, data?.runId)
            await reloadChat(ctx)
            return
          }

          await sendCompletionWithTools({
            body: {
              request: {
                chatContext: ctx,
                llmConfig: activeLLMConfig,
                ...(systemPrompt ? { systemPrompt } : {}),
              },
              settings,
            },
            throwOnError: true,
          })

          await reloadChat(ctx)
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('[chat] restart failed:', err)
          updateLiveState(ctx, {
            sendError: err instanceof Error ? err : new Error(String(err)),
          })
        } finally {
          if (inFlightCtxRef.current && sameContext(inFlightCtxRef.current, ctx)) {
            inFlightCtxRef.current = null
          }
          if (!detachedCli) {
            updateLiveState(ctx, {
              isSending: false,
              pendingAssistant: null,
              cliRunId: null,
              cliModel: null,
              cliStartedAt: null,
            })
          }
        }
      },
      [
        activeLLMConfig,
        buildToolSettings,
        ensureChatLoaded,
        getChat,
        reloadChat,
        registerDetachedCliRun,
        updateLiveState,
      ],
    )

    const abortChat = useCallback(
      async (ctx: ChatCtx, serverRunId?: string) => {
        // A CLI-backed chat runs in a sandbox: aborting the API completion does
        // nothing to it. Kill the run directly via its abort route — that fires
        // the run's AbortController, which SIGKILLs the workload container
        // mid-turn (so it stops immediately, not after the current tool burst).
        const live = getChatLiveState(ctx)
        // `serverRunId` is the run the BACKEND says this chat is running. Live
        // state only knows about a send this page made, so after a reload it is
        // empty while the agent is still going — without the fallback the stop
        // would silently degrade to the completion-only abort.
        const runId = live.cliRunId ?? serverRunId
        if (runId) {
          // Mark this as a user stop so the terminal event treats the resulting
          // `aborted` status as a clean stop (no error Alert).
          userAbortedRunIdsRef.current.add(runId)
          try {
            await abortCliAgentRun({
              path: { runId },
              body: { reason: 'aborted by user' },
              throwOnError: true,
            })
          } catch {
            // Run already finished / not found — harmless.
          }
          // Clear the spinner now. The terminal event normally also clears it,
          // but if that event was lost (WS drop) or the run already finished,
          // this is the only in-app recovery — otherwise the spinner sticks.
          updateLiveState(ctx, { isSending: false, pendingAssistant: null })
        } else if (live.isSending && getChat(ctx)?.cliRunner) {
          // The CLI run is starting but its id isn't known yet (pre-202) — record
          // the intent so `sendMessage` aborts it the instant the runId arrives.
          pendingCliAbortKeysRef.current.add(getChatContextKey(ctx))
        }
        try {
          await abortChatCompletion({ body: { context: ctx }, throwOnError: true })
        } catch {
          // 404 means no completion was in flight — harmless. Other errors
          // are intentionally swallowed: the user already chose to abort,
          // and the in-flight call (if any) will surface its own outcome.
        }
      },
      [getChatLiveState, getChat, updateLiveState],
    )

    const clearChat = useCallback(
      async (ctx: ChatCtx) => {
        // Drop ALL live/spoofed state for this chat (and abort an in-flight CLI
        // run) before clearing — otherwise the streaming run's messages and
        // spinner linger over the freshly-cleared chat until the next send.
        const live = getChatLiveState(ctx)
        if (live.cliRunId) {
          finalizedCliRunIdsRef.current.add(live.cliRunId)
          cliRunCtxByRunIdRef.current.delete(live.cliRunId)
          void abortCliAgentRun({
            path: { runId: live.cliRunId },
            body: { reason: 'chat cleared' },
            throwOnError: false,
          }).catch(() => {})
        }
        updateLiveState(ctx, {
          isSending: false,
          pendingAssistant: null,
          cliRunId: null,
          cliModel: null,
          cliStartedAt: null,
          sendError: null,
        })
        await clearChatApi({ body: { context: ctx }, throwOnError: true })
        await reloadChat(ctx)
      },
      [reloadChat, getChatLiveState, updateLiveState],
    )

    const setChatNotifyLevel = useCallback(
      async (ctx: ChatCtx, level: ChatNotifyLevel | undefined) => {
        const before = chatsRef.current.find((c) => sameContext(c.context, ctx))
        setChats((prev) =>
          prev.map((c) => (sameContext(c.context, ctx) ? withChatNotifyLevel(c, level) : c)),
        )
        try {
          await setChatNotifyLevelApi({
            body: { context: ctx, ...(level ? { notifyLevel: level } : {}) },
            throwOnError: true,
          })
        } catch (err) {
          if (before) {
            setChats((prev) => prev.map((c) => (sameContext(c.context, ctx) ? before : c)))
          }
          throw err
        }
      },
      [],
    )

    const [chatListNotice, setChatListNotice] = useState<ChatListNotice | null>(null)
    const dismissChatListNotice = useCallback(() => setChatListNotice(null), [])
    const setListHidden = useCallback(async (ctx: ChatCtx, listHiddenAt: string | undefined) => {
      const before = chatsRef.current.find((c) => sameContext(c.context, ctx))
      setChats((prev) =>
        prev.map((c) => (sameContext(c.context, ctx) ? withChatListHidden(c, listHiddenAt) : c)),
      )
      try {
        const body = { body: { context: ctx }, throwOnError: true } as const
        if (listHiddenAt === undefined) await showChatInListApi(body)
        else await hideChatFromListApi(body)
      } catch (err) {
        if (before) {
          setChats((prev) => prev.map((c) => (sameContext(c.context, ctx) ? before : c)))
        }
        throw err
      }
      return before
    }, [])
    const hideChatFromList = useCallback(
      async (ctx: ChatCtx) => {
        const before = await setListHidden(ctx, new Date().toISOString())
        setChatListNotice(chatListHiddenNotice(ctx, before?.title?.trim() || undefined))
      },
      [setListHidden],
    )
    const showChatInList = useCallback(
      async (ctx: ChatCtx) => {
        const before = await setListHidden(ctx, undefined)
        setChatListNotice(chatListBackNotice(ctx, before?.title?.trim() || undefined))
      },
      [setListHidden],
    )

    /**
     * Close a finished agent-run chat down: the backend summarises the work into
     * a NEW chat and archives this one. Returns the successor's context so the
     * caller can navigate the user straight into it — closing a chat and leaving
     * them staring at a read-only page would be a dead end.
     */
    const consolidateChat = useCallback(
      async (ctx: ChatCtx) => {
        const { data } = await consolidateChatApi({
          body: { context: ctx },
          throwOnError: true,
        })
        await reloadChat(ctx)
        if (data?.successorContext) await reloadChat(data.successorContext)
        return data?.successorContext
      },
      [reloadChat],
    )

    const deleteChat = useCallback(async (ctx: ChatCtx) => {
      await deleteChatApi({ body: { context: ctx }, throwOnError: true })
      setChats((prev) => prev.filter((c) => !sameContext(c.context, ctx)))
    }, [])

    const uploadAttachment = useCallback(
      async (ctx: ChatCtx, name: string, contentBase64: string): Promise<string> => {
        const body = { context: ctx, name, contentBase64 }
        const { data } = ctx.projectId
          ? await uploadChatAttachment({
              path: { projectId: ctx.projectId },
              body,
              throwOnError: true,
            })
          : await uploadAnyChatAttachment({ body, throwOnError: true })
        return data.path
      },
      [],
    )

    const deleteLastMessage = useCallback(
      async (ctx: ChatCtx) => {
        // A finished CLI run keeps its id in live state so the run view stays
        // mounted until the persisted reply lands. Deleting that reply removes
        // the message the view was handed over to, and the trailing live block
        // would remount the very turn the user just deleted — so drop the id
        // with it. A run still streaming re-asserts its id on the next update.
        updateLiveState(ctx, {
          cliRunId: null,
          cliModel: null,
          cliStartedAt: null,
          isDeleting: true,
        })
        // Trim LOCALLY first so the rows go the moment the click lands. The cut
        // uses the same rule the store applies, so the optimistic list matches
        // what comes back; `refresh()` below is the reconciliation, not the
        // thing the user is waiting on.
        setChats((prev) =>
          prev.map((c) => {
            if (!sameContext(c.context, ctx)) return c
            const from = lastMessageDeleteFromIndex(c.messages ?? [])
            return from === undefined ? c : { ...c, messages: (c.messages ?? []).slice(0, from) }
          }),
        )
        try {
          await deleteLastChatMessage({ body: { context: ctx }, throwOnError: true })
          // Reconcile ONE chat, not the whole corpus. `refresh()` re-fetches
          // every chat in every project WITH its full message array — tens of
          // megabytes here — which is what made a one-file delete feel slow.
          const { data } = await getChatApi({ body: { context: ctx }, throwOnError: true })
          setChats((prev) => prev.map((c) => (sameContext(c.context, ctx) ? { ...c, ...data } : c)))
        } catch {
          // The optimistic trim removed rows the server may still have: fall
          // back to the full reload so the user is never left looking at a
          // deletion that did not happen.
          await refresh()
        } finally {
          updateLiveState(ctx, { isDeleting: false })
        }
      },
      [refresh, updateLiveState],
    )

    const getChatTypeSettings = useCallback(
      (ctx: ChatCtx): ChatSettingsPatch => {
        const entry = chatSettings?.[ctx.type]
        return {
          systemPrompt: entry?.systemPrompt ?? '',
          completionSettings: entry?.completionSettings ?? FALLBACK_COMPLETION_SETTINGS,
        }
      },
      [chatSettings],
    )

    const getEffectiveChatSettings = useCallback(
      (ctx: ChatCtx): ChatSettingsPatch => {
        const key = getChatContextKey(ctx)
        const pending = pendingSettingsByKey[key]
        if (pending) return pending
        const chat = chats.find((c) => sameContext(c.context, ctx))
        if (chat?.settings) return chat.settings
        return getChatTypeSettings(ctx)
      },
      [chats, getChatTypeSettings, pendingSettingsByKey],
    )

    // Persist the latest overlay value for one key. Runs in the background (never
    // awaited by the caller): on success the inline refresh lands the stored copy
    // and we drop the overlay; on failure we mark the surface blocked and retry,
    // so a flaky backend can never strand the user on a stale toggle.
    const flushSettingsPersist = useCallback(
      async (ctx: ChatCtx, key: string) => {
        const seq = settingsPersistSeqRef.current[key]
        const merged = pendingSettingsRef.current[key]
        if (!merged) return
        try {
          await updateChat({
            body: { context: ctx, patch: { settings: merged } },
            throwOnError: true,
          })
          await reloadChat(ctx)
          // A newer edit landed mid-flight — its own flush owns the key now.
          if (settingsPersistSeqRef.current[key] !== seq) return
          delete pendingSettingsRef.current[key]
          setPendingSettingsByKey((prev) => {
            const { [key]: _dropped, ...rest } = prev
            return rest
          })
          settingsFailedKeysRef.current.delete(key)
          setSettingsBlocked(settingsFailedKeysRef.current.size > 0)
        } catch {
          if (settingsPersistSeqRef.current[key] !== seq) return
          settingsFailedKeysRef.current.add(key)
          setSettingsBlocked(true)
          settingsPersistTimersRef.current[key] = setTimeout(() => {
            void flushSettingsPersist(ctx, key)
          }, SETTINGS_PERSIST_RETRY_MS)
        }
      },
      [reloadChat],
    )

    const updateChatSettings = useCallback(
      async (ctx: ChatCtx, patch: Partial<ChatSettingsPatch>) => {
        const current = getEffectiveChatSettings(ctx)
        const merged: ChatSettingsPatch = {
          systemPrompt: patch.systemPrompt ?? current.systemPrompt,
          completionSettings: {
            ...current.completionSettings,
            ...(patch.completionSettings ?? {}),
          },
        }
        const key = getChatContextKey(ctx)
        // Flip the overlay synchronously so the control reflects the change with
        // zero latency.
        pendingSettingsRef.current[key] = merged
        setPendingSettingsByKey((prev) => ({ ...prev, [key]: merged }))
        settingsPersistSeqRef.current[key] = (settingsPersistSeqRef.current[key] ?? 0) + 1
        // Debounce the backend write — coalesce a burst of toggles into one.
        const existing = settingsPersistTimersRef.current[key]
        if (existing) clearTimeout(existing)
        settingsPersistTimersRef.current[key] = setTimeout(() => {
          void flushSettingsPersist(ctx, key)
        }, SETTINGS_PERSIST_DEBOUNCE_MS)
      },
      [getEffectiveChatSettings, flushSettingsPersist],
    )

    const createProjectTopic = useCallback(
      async (entityProjectId: string, title: string, systemPrompt?: string) => {
        const trimmed = title.trim()
        if (trimmed.length === 0) throw new Error('Title required')
        const { data } = await createTopicChat({
          body: { type: 'project', entityId: entityProjectId, title: trimmed },
          throwOnError: true,
        })
        // The backend broadcasts `chats:updated`, but the new chat goes in the
        // list inline so the caller can navigate to it without waiting for the WS.
        if (data) setChats((prev) => withChat(prev, healChatContexts([data])[0], chatKeyOf))
        if (systemPrompt && systemPrompt.trim() && data?.context) {
          await updateChatSettings(data.context, { systemPrompt: systemPrompt.trim() })
        }
        return data
      },
      [updateChatSettings],
    )

    const createGroupTopic = useCallback(async (groupId: string, title: string) => {
      const trimmed = title.trim()
      if (trimmed.length === 0) throw new Error('Title required')
      const { data } = await createTopicChat({
        body: { type: 'group', entityId: groupId, title: trimmed },
        throwOnError: true,
      })
      if (data) setChats((prev) => withChat(prev, healChatContexts([data])[0], chatKeyOf))
      return data
    }, [])

    const value = useMemo<ChatsContextValue>(
      () => ({
        isLoaded,
        loadError,
        chats,
        projectChat,
        activeLLMConfig,
        getChat,
        loadChat,
        findChat: refreshChat,
        getChatLiveState,
        getDraft,
        setDraft,
        clearDraft,
        getDraftState,
        updateDraftState,
        subscribeDraft,
        sendMessage,
        restartLastTurn,
        abortChat,
        clearChat,
        hideChatFromList,
        showChatInList,
        setChatNotifyLevel,
        chatListNotice,
        dismissChatListNotice,
        consolidateChat,
        deleteChat,
        deleteLastMessage,
        uploadAttachment,
        createProjectTopic,
        createGroupTopic,
        getEffectiveChatSettings,
        getChatTypeSettings,
        updateChatSettings,
        settingsBlocked,
        refresh,
      }),
      [
        isLoaded,
        loadError,
        chats,
        projectChat,
        activeLLMConfig,
        getChat,
        loadChat,
        refreshChat,
        getChatLiveState,
        getDraft,
        setDraft,
        clearDraft,
        getDraftState,
        updateDraftState,
        subscribeDraft,
        sendMessage,
        restartLastTurn,
        abortChat,
        clearChat,
        hideChatFromList,
        showChatInList,
        setChatNotifyLevel,
        chatListNotice,
        dismissChatListNotice,
        consolidateChat,
        deleteChat,
        deleteLastMessage,
        uploadAttachment,
        createProjectTopic,
        createGroupTopic,
        getEffectiveChatSettings,
        getChatTypeSettings,
        updateChatSettings,
        settingsBlocked,
        refresh,
      ],
    )

    return <ChatsContext.Provider value={value}>{children}</ChatsContext.Provider>
  }

  function useChats(): ChatsContextValue {
    const ctx = useContext(ChatsContext)
    if (!ctx) throw new Error('useChats must be used within ChatsProvider')
    return ctx
  }

  return { ChatsProvider, useChats }
}

/**
 * Pre-bound `{ ChatsProvider, useChats }` pair using the headless
 * `useLLMConfigs` / `useActiveProject`. Every app's `useLLMConfigs` is a
 * straight re-export of the headless one (the local file is a platform
 * `storage` adapter wrapper around `LLMConfigsProvider`), and
 * `useActiveProject` is shipped from headless — so a single shared instance
 * is identical across web, desktop, and mobile.
 */
const HeadlessBound = createChatsContext({ useLLMConfigs, useActiveProject })
export const ChatsProvider = HeadlessBound.ChatsProvider
export const useChats = HeadlessBound.useChats
