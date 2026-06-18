import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { JSX, ReactNode } from 'react'
import {
  abortChatCompletion,
  addChatMessages,
  clearChat as clearChatApi,
  createTopicChat,
  deleteChat as deleteChatApi,
  deleteLastChatMessage,
  getChatsSettings,
  listChats,
  resumeCompletion,
  sendChatCompletionWithTools,
  sendCompletionWithTools,
  updateChat,
} from '../api'
import type {
  ChatContext as ChatCtx,
  ChatMessage,
  GetChatResponse,
  GetChatsSettingsResponse,
  GetLlmConfigResponse,
  SendCompletionWithToolsData,
  SendCompletionWithToolsResponse,
  UpdateChatData,
} from '../api'
import { useApi, useAuth } from '../api'
import { getChatContextKey } from 'thefactory-tools/utils'
import { chatCliRunnerToDispatchOptions, parseCliRunUpdateEvent } from '../utils/cliRunner'
import { buildChatPromptVariables, interpolateChatSystemPrompt } from '../utils/promptInterpolate'
import { useLLMConfigs } from './LLMConfigsContext'
import { useStories } from './StoriesContext'
import { useProjectsGroups } from './ProjectsGroupsContext'
import { useActiveProject } from './ProjectsContext'

type CompletionSettings = SendCompletionWithToolsData['body']['settings']
export type ChatSettingsPatch = NonNullable<
  NonNullable<UpdateChatData['body']['patch']>['settings']
>
type ProposedToolCall = SendCompletionWithToolsResponse['results'][number]['toolCalls'][number]

/**
 * Parameters captured from the in-flight `sendCompletionWithTools` so a
 * subsequent `resumeCompletion` can pick up where it left off. We persist
 * `settings` and `systemPrompt` here because the backend doesn't echo them
 * back; the user may grant tools minutes later and we must replay both
 * verbatim.
 */
export type PendingToolConfirmation = {
  toolCalls: ProposedToolCall[]
  settings: CompletionSettings
  systemPrompt?: string
  context: ChatCtx
}

/**
 * Per-chat live state. One entry per active chat context; mutations are
 * scoped so a slow project-chat send doesn't bleed its `Thinking…` into the
 * neighbouring story chat.
 */
export type ChatLiveState = {
  isSending: boolean
  pendingAssistant: { content: string; turn: number } | null
  pendingToolConfirmation: PendingToolConfirmation | null
  sendError: Error | null
  /** Active CLI run id for this chat (from the `cli:run-update` stream); null when idle. Drives gated-action grants. */
  cliRunId: string | null
  /** Model tag (`cli-agent/<tool>/<modelId>`) for the active CLI run, so the live
   * Agent-run message shows the same model chip as the persisted reply. */
  cliModel: string | null
  /** ISO start time of the active CLI run, for the live message's timestamp. */
  cliStartedAt: string | null
}

const EMPTY_LIVE_STATE: ChatLiveState = {
  isSending: false,
  pendingAssistant: null,
  pendingToolConfirmation: null,
  sendError: null,
  cliRunId: null,
  cliModel: null,
  cliStartedAt: null,
}

const FALLBACK_COMPLETION_SETTINGS: CompletionSettings = {
  maxTurns: 5,
  numberMessagesToSend: 30,
  availableTools: [],
  autoCallTools: [],
  forceFinishTools: [],
  finishTurnOnErrors: true,
  allowNoCallResponses: true,
  allowErrorResponses: true,
}

export type ChatsContextValue = {
  /** True once the first chat-list fetch for the active project has completed. */
  isLoaded: boolean
  loadError: Error | null

  /** Every chat belonging to the active project (any context type). */
  chats: GetChatResponse[]
  /** The project-level chat for the active project (context type `PROJECT`, no sub-ids). */
  projectChat: GetChatResponse | null
  /** The LLM config currently being used; `null` if none are configured. */
  activeLLMConfig: GetLlmConfigResponse | null

  /** Look up a chat by its `ChatContext`. Returns `null` if not yet created. */
  getChat: (ctx: ChatCtx) => GetChatResponse | null
  /**
   * Per-chat live state. Always returns a defaulted shape — never `null` —
   * so consumers can destructure directly.
   */
  getChatLiveState: (ctx: ChatCtx) => ChatLiveState

  /**
   * Per-chat in-memory draft text. Drafts survive context switches inside
   * a session but are intentionally not persisted — mirrors `overseer-local`'s
   * `useChatDrafts`. Read at the point you need the value (e.g. on chat open).
   */
  getDraft: (ctx: ChatCtx) => string
  setDraft: (ctx: ChatCtx, text: string) => void
  clearDraft: (ctx: ChatCtx) => void

  /**
   * Send a message in the given chat context. Persists the user message
   * first, then runs `sendCompletionWithTools`. The backend's chat
   * persistence callbacks write the assistant + tool messages into the
   * chat, so the call is followed by a `refresh()` to pull them in.
   *
   * `attachments` are project-relative paths of files uploaded via the
   * Files API; they ride on the user message's `files` field, which the
   * backend's `sendCompletionWithFiles` fetches and folds into the prompt.
   */
  sendMessage: (ctx: ChatCtx, content: string, attachments?: string[]) => Promise<void>
  /**
   * Resume the in-flight completion for `ctx`, granting the listed
   * tool-call ids. Tools not in `grantedToolCallIds` come back as
   * `not_allowed`. Pass `[]` to deny everything.
   */
  confirmTools: (ctx: ChatCtx, grantedToolCallIds: string[]) => Promise<void>
  /** Drop the pending tool confirmation for `ctx` without resuming. */
  cancelToolConfirmation: (ctx: ChatCtx) => void
  /** Clear all messages in the chat — keeps the chat record itself. Mirrors
   * desktop's `restartChat`. */
  clearChat: (ctx: ChatCtx) => Promise<void>
  /** Delete the chat entirely. Backend rejects deletion of the canonical
   * `PROJECT` chat — callers should guard against that case. */
  deleteChat: (ctx: ChatCtx) => Promise<void>
  /** Delete the last message in the chat. Used by the message-hover delete
   * affordance. */
  deleteLastMessage: (ctx: ChatCtx) => Promise<void>
  /**
   * Cancel the in-flight chat completion for `ctx`. No-op when nothing is
   * in flight. The HTTP call resolves with `resultType: 'aborted'` rather
   * than throwing — the upstream loop checks `abortSignal.aborted` between
   * turns and tool calls.
   */
  abortChat: (ctx: ChatCtx) => Promise<void>

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
   * Persist a settings patch on a chat. The backend stores them on the chat
   * itself; subsequent sends pick them up via `getChatsSettings`. The chat
   * must already exist server-side (typically true after the first message).
   */
  updateChatSettings: (ctx: ChatCtx, patch: Partial<ChatSettingsPatch>) => Promise<void>

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
 * Collect tool calls that need user grant from the latest turn of a
 * `CompletionResponseTurns` whose `resultType` is `require_confirmation`.
 * Returns the proposed `toolCalls` from the trailing turn — these carry the
 * `toolCallId`s the resume call's `toolsGranted` array references.
 */
function collectProposedToolCalls(result: SendCompletionWithToolsResponse): ProposedToolCall[] {
  const lastTurn = result.results[result.results.length - 1]
  return lastTurn?.toolCalls ?? []
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
  ChatsProvider: (props: { children: ReactNode }) => JSX.Element
  useChats: () => ChatsContextValue
} {
  const { useLLMConfigs, useActiveProject } = deps
  const ChatsContext = createContext<ChatsContextValue | null>(null)

  function ChatsProvider({ children }: { children: ReactNode }) {
    const { ws } = useApi()
    const { token } = useAuth()
    const { projectId, project } = useActiveProject()
    const { configs: llmConfigs, activeChatConfig } = useLLMConfigs()
    // Resolve the chat's story / feature / group so their prompt placeholders fill on the send path
    // (StoriesProvider + ProjectsGroupsProvider both wrap ChatsProvider in every app).
    const { getStory, getFeature } = useStories()
    const { getGroupById } = useProjectsGroups()

    const [chats, setChats] = useState<GetChatResponse[]>([])
    // Mirror of `chats` kept in sync SYNCHRONOUSLY (in `refresh`), so code that `await`s a refresh
    // — e.g. createProjectTopic → updateChatSettings → refresh, then sends — reads the just-persisted
    // per-chat system prompt immediately, instead of the stale render-state (which lagged the prompt
    // to the SECOND message).
    const chatsRef = useRef<GetChatResponse[]>([])
    const [chatSettings, setChatSettings] = useState<GetChatsSettingsResponse | null>(null)
    const [isLoaded, setIsLoaded] = useState(false)
    const [loadError, setLoadError] = useState<Error | null>(null)
    const [liveStateByKey, setLiveStateByKey] = useState<Map<string, ChatLiveState>>(
      () => new Map(),
    )

    /**
     * Tracks the chat context that currently has a `sendCompletionWithTools` /
     * `resumeCompletion` in flight, so the global `completion:progress` WS
     * stream can be routed back to the right per-chat `pendingAssistant`. The
     * backend's progress payload doesn't echo the chatContext today, so this
     * ref is the only way to disambiguate when multiple chats are visible.
     */
    const inFlightCtxRef = useRef<ChatCtx | null>(null)
    // Accumulates the in-flight CLI run's assistant text for the live preview
    // (the `cli:run-update` stream arrives entry-by-entry). Reset per send; the
    // final persisted message replaces it on `refresh()`.
    const cliStreamAccumRef = useRef('')

    // Per-chat draft text. Ref-based (no re-render on draft change) so a
    // sibling that doesn't read this chat's draft doesn't churn. Matches
    // `overseer-local`'s `useChatDrafts`.
    const draftsRef = useRef<Record<string, string>>({})
    const getDraft = useCallback((ctx: ChatCtx): string => {
      return draftsRef.current[getChatContextKey(ctx)] ?? ''
    }, [])
    const setDraft = useCallback((ctx: ChatCtx, text: string) => {
      draftsRef.current[getChatContextKey(ctx)] = text
    }, [])
    const clearDraft = useCallback((ctx: ChatCtx) => {
      delete draftsRef.current[getChatContextKey(ctx)]
    }, [])

    const updateLiveState = useCallback((ctx: ChatCtx, patch: Partial<ChatLiveState>) => {
      const key = getChatContextKey(ctx)
      setLiveStateByKey((prev) => {
        const next = new Map(prev)
        const cur = next.get(key) ?? EMPTY_LIVE_STATE
        next.set(key, { ...cur, ...patch })
        return next
      })
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
        // Load ALL chats (no projectId filter) so the sidebar can render
        // per-project unread / thinking badges for every project, not just
        // the active one. Without this the badges flash on project switch
        // and never settle for non-active projects.
        const { data } = await listChats({ signal: controller.signal, throwOnError: true })
        if (controller.signal.aborted) return
        chatsRef.current = data
        setChats(data)
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

    useEffect(() => ws.on('chats:updated', () => void refresh()), [ws, refresh])

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

    // Stream a CLI-backed run's transcript into the same `pendingAssistant`
    // live preview (the API path uses `completion:progress`; CLI runs broadcast
    // on `cli:run-update`). Routed to the in-flight chat via `inFlightCtxRef`.
    useEffect(() => {
      return ws.on('cli:run-update', (data) => {
        const target = inFlightCtxRef.current
        if (!target) return
        const parsed = parseCliRunUpdateEvent(data)
        if (!parsed) return
        if (parsed.kind === 'terminal') {
          updateLiveState(target, {
            pendingAssistant: null,
            cliRunId: null,
            cliModel: null,
            cliStartedAt: null,
          })
          return
        }
        // Surface the run id so gated-action grants (usePendingToolGrants) can
        // query this run's pending approvals while it streams.
        updateLiveState(target, { cliRunId: parsed.runId })
        if (parsed.kind === 'transcript' && parsed.text) {
          cliStreamAccumRef.current += parsed.text
          updateLiveState(target, {
            pendingAssistant: { turn: 0, content: cliStreamAccumRef.current },
          })
        }
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

    // The project-level chat is the one scoped directly to the active project
    // (no story / feature / topic). It's what the chat sidebar pins at the top.
    const projectChat = useMemo<GetChatResponse | null>(() => {
      if (!projectId) return null
      return (
        chats.find(
          (c) =>
            c.context.type === 'PROJECT' &&
            c.context.projectId === projectId &&
            !c.context.topicId &&
            !c.context.storyId &&
            !c.context.featureId,
        ) ?? null
      )
    }, [chats, projectId])

    const activeLLMConfig = activeChatConfig ?? llmConfigs[0] ?? null

    const getChat = useCallback(
      (ctx: ChatCtx): GetChatResponse | null =>
        chats.find((c) => sameContext(c.context, ctx)) ?? null,
      [chats],
    )

    /**
     * Build the per-context settings + system prompt forwarded to
     * send-with-tools (and reused for the resume request). The chat's own
     * `completionSettings` — including the user's `autoCallTools` selection from
     * the settings dropdown — always wins when present. Tools listed in
     * `autoCallTools` execute without prompting; every other proposed tool still
     * surfaces as `require_confirmation`.
     */
    const buildToolSettings = useCallback(
      (context: ChatCtx): { settings: CompletionSettings; systemPrompt?: string } => {
        // Read the REF, not `chats` state, so settings persisted moments before this send are visible.
        const perChat = chatsRef.current.find((c) => sameContext(c.context, context))?.settings
        const typeEntry = chatSettings?.[context.type]
        // Per-chat completionSettings (the user's tool selection) take precedence over the per-type
        // template regardless of whether the chat also carries a custom system prompt.
        const base =
          perChat?.completionSettings ?? typeEntry?.completionSettings ?? FALLBACK_COMPLETION_SETTINGS
        // A chat carrying its own system prompt (e.g. set by an embedded app via createProjectTopic)
        // overrides the generic per-type template; otherwise fall back to it.
        const rawSystemPrompt = perChat?.systemPrompt || typeEntry?.systemPrompt
        // Interpolate `{{project_*}}` / `{{story_*}}` / `{{feature_*}}` / `{{group_*}}` BEFORE the prompt
        // goes on the wire — the model must receive the resolved context, not the raw template the viewer
        // renders separately.
        const vars = buildChatPromptVariables(context, { project, getStory, getFeature, getGroupById })
        const systemPrompt = interpolateChatSystemPrompt(rawSystemPrompt, vars)
        return { settings: { ...base }, systemPrompt }
      },
      [chatSettings, project, getStory, getFeature, getGroupById],
    )

    const sendMessage = useCallback(
      async (ctx: ChatCtx, content: string, attachments?: string[]) => {
        if (!activeLLMConfig) throw new Error('Configure an LLM before sending messages')
        const trimmed = content.trim()
        if (trimmed.length === 0 && (!attachments || attachments.length === 0)) return

        updateLiveState(ctx, {
          isSending: true,
          sendError: null,
          pendingAssistant: null,
          pendingToolConfirmation: null,
        })
        inFlightCtxRef.current = ctx
        try {
          const userMessage = buildUserMessage(trimmed, attachments)
          const { settings, systemPrompt } = buildToolSettings(ctx)

          // CLI-backed chat: the runner-aware route appends the user message and
          // runs the turn on the sandboxed CLI agent (reply persisted back into
          // the chat); progress streams on `cli:run-update`. Do NOT pre-append
          // here — the route owns the append.
          const cliRunner = getChat(ctx)?.cliRunner
          if (cliRunner) {
            cliStreamAccumRef.current = ''
            // Surface the model + start time so the live Agent-run message frames
            // itself like the persisted reply (same model chip + timestamp).
            updateLiveState(ctx, {
              cliModel: `cli-agent/${cliRunner.tool}/${cliRunner.model ?? ''}`,
              cliStartedAt: new Date().toISOString(),
            })
            // Optimistically show the user's message right away. The runner-aware
            // route persists it server-side inside the (long) run, so unlike the
            // API path there's no early `chats:updated` to pull it in; `refresh()`
            // reconciles on completion (the persisted copy replaces this one).
            setChats((prev) =>
              prev.map((c) =>
                sameContext(c.context, ctx)
                  ? { ...c, messages: [...(c.messages ?? []), userMessage] }
                  : c,
              ),
            )
            const { data: cliResult } = await sendChatCompletionWithTools({
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
            })
            // A CLI run that ends without producing a reply (auth/model error,
            // immediate exit) comes back errored/aborted — surface it instead of
            // a silent blank turn.
            if (cliResult?.resultType === 'errored' || cliResult?.resultType === 'aborted') {
              const detail =
                typeof cliResult.error === 'string' && cliResult.error.length > 0
                  ? cliResult.error
                  : `The ${cliRunner.tool} run ${cliResult.resultType} without a reply.`
              // eslint-disable-next-line no-console
              console.error(
                `[cli-chat] ${cliRunner.tool} run ${cliResult.resultType}:`,
                detail,
                cliResult,
              )
              updateLiveState(ctx, { sendError: new Error(detail) })
            }
            await refresh()
            return
          }

          // Optimistically show the user's message immediately (mirrors the CLI
          // path) so the list never flashes empty / the system-prompt bubble in
          // the window before the persisted copy is pulled in by refresh().
          const priorMessages = getChat(ctx)?.messages ?? []
          setChats((prev) =>
            prev.map((c) =>
              sameContext(c.context, ctx)
                ? { ...c, messages: [...(c.messages ?? []), userMessage] }
                : c,
            ),
          )

          await addChatMessages({
            body: { context: ctx, messages: [userMessage] },
            throwOnError: true,
          })

          const { data: result } = await sendCompletionWithTools({
            body: {
              request: {
                chatContext: ctx,
                llmConfig: activeLLMConfig,
                messages: [...priorMessages, userMessage],
                ...(systemPrompt ? { systemPrompt } : {}),
              },
              settings,
            },
            throwOnError: true,
          })

          if (result.resultType === 'require_confirmation') {
            const proposed = collectProposedToolCalls(result)
            if (proposed.length > 0) {
              updateLiveState(ctx, {
                pendingToolConfirmation: {
                  toolCalls: proposed,
                  settings,
                  systemPrompt,
                  context: ctx,
                },
              })
            }
          }
          await refresh()
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('[chat] send failed:', err)
          updateLiveState(ctx, {
            sendError: err instanceof Error ? err : new Error(String(err)),
          })
        } finally {
          if (inFlightCtxRef.current && sameContext(inFlightCtxRef.current, ctx)) {
            inFlightCtxRef.current = null
          }
          updateLiveState(ctx, { isSending: false, pendingAssistant: null })
        }
      },
      [activeLLMConfig, buildToolSettings, getChat, refresh, updateLiveState],
    )

    const confirmTools = useCallback(
      async (ctx: ChatCtx, grantedToolCallIds: string[]) => {
        const live = getChatLiveState(ctx)
        const pending = live.pendingToolConfirmation
        if (!pending) return
        if (!activeLLMConfig) throw new Error('Configure an LLM before resuming')

        updateLiveState(ctx, {
          isSending: true,
          sendError: null,
          pendingAssistant: null,
        })
        inFlightCtxRef.current = ctx
        try {
          // Pull the latest chat so trailing `require_confirmation` tool
          // messages are included in the resume request — the backend's resume
          // flow scans messages from the end backwards.
          const { data: latest } = await listChats({
            query: projectId ? { projectId } : {},
            throwOnError: true,
          })
          setChats(latest)
          const target = latest.find((c) => sameContext(c.context, pending.context))
          if (!target) throw new Error('Chat for pending confirmation no longer exists')

          const { data: result } = await resumeCompletion({
            body: {
              request: {
                chatContext: target.context,
                llmConfig: activeLLMConfig,
                messages: target.messages ?? [],
                ...(pending.systemPrompt ? { systemPrompt: pending.systemPrompt } : {}),
              },
              settings: pending.settings,
              toolsGranted: grantedToolCallIds,
            },
            throwOnError: true,
          })

          if (result.resultType === 'require_confirmation') {
            const proposed = collectProposedToolCalls(result)
            updateLiveState(ctx, {
              pendingToolConfirmation:
                proposed.length > 0 ? { ...pending, toolCalls: proposed } : null,
            })
          } else {
            updateLiveState(ctx, { pendingToolConfirmation: null })
          }
          await refresh()
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('[chat] send failed:', err)
          updateLiveState(ctx, {
            sendError: err instanceof Error ? err : new Error(String(err)),
          })
        } finally {
          if (inFlightCtxRef.current && sameContext(inFlightCtxRef.current, ctx)) {
            inFlightCtxRef.current = null
          }
          updateLiveState(ctx, { isSending: false, pendingAssistant: null })
        }
      },
      [activeLLMConfig, getChatLiveState, projectId, refresh, updateLiveState],
    )

    const cancelToolConfirmation = useCallback(
      (ctx: ChatCtx) => {
        updateLiveState(ctx, { pendingToolConfirmation: null })
      },
      [updateLiveState],
    )

    const abortChat = useCallback(async (ctx: ChatCtx) => {
      try {
        await abortChatCompletion({ body: { context: ctx }, throwOnError: true })
      } catch {
        // 404 means no completion was in flight — harmless. Other errors
        // are intentionally swallowed: the user already chose to abort,
        // and the in-flight call (if any) will surface its own outcome.
      }
    }, [])

    const clearChat = useCallback(
      async (ctx: ChatCtx) => {
        await clearChatApi({ body: { context: ctx }, throwOnError: true })
        await refresh()
      },
      [refresh],
    )

    const deleteChat = useCallback(
      async (ctx: ChatCtx) => {
        await deleteChatApi({ body: { context: ctx }, throwOnError: true })
        await refresh()
      },
      [refresh],
    )

    const deleteLastMessage = useCallback(
      async (ctx: ChatCtx) => {
        await deleteLastChatMessage({ body: { context: ctx }, throwOnError: true })
        await refresh()
      },
      [refresh],
    )

    const getEffectiveChatSettings = useCallback(
      (ctx: ChatCtx): ChatSettingsPatch => {
        const chat = chats.find((c) => sameContext(c.context, ctx))
        if (chat?.settings) return chat.settings
        const entry = chatSettings?.[ctx.type]
        return {
          systemPrompt: entry?.systemPrompt ?? '',
          completionSettings: entry?.completionSettings ?? FALLBACK_COMPLETION_SETTINGS,
        }
      },
      [chats, chatSettings],
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
        await updateChat({
          body: { context: ctx, patch: { settings: merged } },
          throwOnError: true,
        })
        await refresh()
      },
      [getEffectiveChatSettings, refresh],
    )

    const createProjectTopic = useCallback(
      async (entityProjectId: string, title: string, systemPrompt?: string) => {
        const trimmed = title.trim()
        if (trimmed.length === 0) throw new Error('Title required')
        const { data } = await createTopicChat({
          body: { type: 'project', entityId: entityProjectId, title: trimmed },
          throwOnError: true,
        })
        // The backend broadcasts `chats:updated`, but we refresh inline so
        // the caller can navigate to the new chat without waiting for the WS.
        await refresh()
        if (systemPrompt && systemPrompt.trim() && data?.context) {
          await updateChatSettings(data.context, { systemPrompt: systemPrompt.trim() })
        }
        return data
      },
      [refresh, updateChatSettings],
    )

    const createGroupTopic = useCallback(
      async (groupId: string, title: string) => {
        const trimmed = title.trim()
        if (trimmed.length === 0) throw new Error('Title required')
        const { data } = await createTopicChat({
          body: { type: 'group', entityId: groupId, title: trimmed },
          throwOnError: true,
        })
        await refresh()
        return data
      },
      [refresh],
    )

    const value = useMemo<ChatsContextValue>(
      () => ({
        isLoaded,
        loadError,
        chats,
        projectChat,
        activeLLMConfig,
        getChat,
        getChatLiveState,
        getDraft,
        setDraft,
        clearDraft,
        sendMessage,
        confirmTools,
        cancelToolConfirmation,
        abortChat,
        clearChat,
        deleteChat,
        deleteLastMessage,
        createProjectTopic,
        createGroupTopic,
        getEffectiveChatSettings,
        updateChatSettings,
        refresh,
      }),
      [
        isLoaded,
        loadError,
        chats,
        projectChat,
        activeLLMConfig,
        getChat,
        getChatLiveState,
        getDraft,
        setDraft,
        clearDraft,
        sendMessage,
        confirmTools,
        cancelToolConfirmation,
        abortChat,
        clearChat,
        deleteChat,
        deleteLastMessage,
        createProjectTopic,
        createGroupTopic,
        getEffectiveChatSettings,
        updateChatSettings,
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
