import { getChatContextKey } from 'thefactory-tools/utils'
import type { Chat, CliRun, CliRunTranscriptEntry } from '../api/generated'
import type { ToolOrigin } from './chatTypes'
import {
  cliTranscriptToMessages,
  messageModelTag,
  normalizeCliTranscript,
  type CliTranscriptStep,
} from './cliRunner'
import {
  CHAT_DEBUG_DUMP_VERSION,
  CHAT_DEBUG_INTERPRETED_BUDGET_CHARS,
  CHAT_DEBUG_MESSAGES_BUDGET_CHARS,
  CHAT_DEBUG_RAW_TRANSCRIPT_BUDGET_CHARS,
  CHAT_DEBUG_TEXT_PREFIX_CHARS,
  CHAT_DEBUG_UNSERIALIZABLE_PAYLOAD,
} from './chatDebugDumpConstants'
import type {
  ChatDebugCliRun,
  ChatDebugCliRunner,
  ChatDebugDump,
  ChatDebugDumpInput,
  ChatDebugDumpSerialized,
  ChatDebugMessage,
  ChatDebugStep,
  ChatDebugText,
} from './chatDebugDumpTypes'

/**
 * The message shape both sources share: a stored `Chat` message and a
 * `ChatMessageLike` derived from a transcript project onto this without a cast.
 */
type ChatDebugSourceMessage = {
  role: string
  content?: string
  startedAt?: string
  completedAt?: string
  durationMs?: number
  cliRunId?: string
  thinking?: string
  error?: string
  model?: string | { model?: string } | null
  toolCall?: { toolCallId: string; name: string; arguments?: unknown; origin?: ToolOrigin }
  toolResult?: { type?: string; result?: unknown; durationMs?: number }
}

/**
 * Whether a section costing `cost` characters still fits `remaining`. A section
 * that exactly fills the allowance IS included — the cap is what may be kept,
 * not what must be beaten.
 */
export function fitsChatDebugBudget(cost: number, remaining: number): boolean {
  return cost <= remaining
}

/** A shrinking character allowance. A section is included only while it fits whole. */
class CharBudget {
  private _remaining: number

  constructor(limit: number) {
    this._remaining = limit
  }

  get remaining(): number {
    return this._remaining
  }

  spend(cost: number): boolean {
    if (!fitsChatDebugBudget(cost, this._remaining)) return false
    this._remaining -= cost
    return true
  }
}

function jsonLength(value: unknown): number {
  try {
    return (JSON.stringify(value) ?? '').length
  } catch {
    return 0
  }
}

function serializeDebugValue(value: unknown): string {
  if (value === undefined) return ''
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value) ?? String(value)
  } catch {
    return String(value)
  }
}

/** Cut a value to {@link CHAT_DEBUG_TEXT_PREFIX_CHARS}, keeping its true length. */
export function chatDebugText(value: string): ChatDebugText {
  const truncated = value.length > CHAT_DEBUG_TEXT_PREFIX_CHARS
  return {
    length: value.length,
    preview: truncated ? value.slice(0, CHAT_DEBUG_TEXT_PREFIX_CHARS) : value,
    truncated,
  }
}

function chatDebugValue(value: unknown): ChatDebugText {
  return chatDebugText(serializeDebugValue(value))
}

function debugMessage(message: ChatDebugSourceMessage, index: number): ChatDebugMessage {
  const content = message.content ?? ''
  const model = messageModelTag(message.model)
  const toolCall = message.toolCall
  const toolResult = message.toolResult
  return {
    index,
    role: message.role,
    contentEmpty: content.length === 0,
    content: chatDebugText(content),
    ...(message.startedAt ? { startedAt: message.startedAt } : {}),
    ...(message.completedAt ? { completedAt: message.completedAt } : {}),
    ...(message.durationMs != null ? { durationMs: message.durationMs } : {}),
    ...(message.cliRunId ? { cliRunId: message.cliRunId } : {}),
    ...(model ? { model } : {}),
    ...(message.thinking ? { thinking: chatDebugText(message.thinking) } : {}),
    ...(message.error ? { error: message.error } : {}),
    ...(toolCall
      ? {
          toolCall: {
            toolCallId: toolCall.toolCallId,
            name: toolCall.name,
            ...(toolCall.origin ? { origin: toolCall.origin } : {}),
            arguments: chatDebugValue(toolCall.arguments),
          },
        }
      : {}),
    ...(toolResult
      ? {
          toolResult: {
            type: toolResult.type ?? 'unknown',
            ...(toolResult.durationMs != null ? { durationMs: toolResult.durationMs } : {}),
            result: chatDebugValue(toolResult.result),
          },
        }
      : {}),
  }
}

function debugStep(step: CliTranscriptStep): ChatDebugStep {
  const base = {
    kind: step.kind,
    at: step.at,
    ...(step.durationMs != null ? { durationMs: step.durationMs } : {}),
  }
  if (step.kind === 'tool') {
    return {
      ...base,
      toolName: step.toolName,
      origin: step.origin,
      ...(step.toolCallId ? { toolCallId: step.toolCallId } : {}),
      input: chatDebugValue(step.input),
      result: chatDebugValue(step.result),
      resultType: step.resultType,
    }
  }
  if (step.kind === 'system' || step.kind === 'result') {
    return { ...base, summary: step.summary, raw: chatDebugText(step.raw) }
  }
  if (step.kind === 'raw') return { ...base, raw: chatDebugText(step.raw) }
  return { ...base, text: chatDebugText(step.text) }
}

/**
 * A transcript entry ready to embed, paired with what it costs. The entry is
 * returned by REFERENCE when it serializes — the raw payload is the ground truth
 * of what the CLI emitted, so nothing walks into it and rewrites it.
 */
function costedTranscriptEntry(entry: CliRunTranscriptEntry): {
  entry: CliRunTranscriptEntry
  cost: number
} {
  try {
    return { entry, cost: (JSON.stringify(entry) ?? '').length }
  } catch {
    const safe: CliRunTranscriptEntry = { ...entry, payload: CHAT_DEBUG_UNSERIALIZABLE_PAYLOAD }
    return { entry: safe, cost: jsonLength(safe) }
  }
}

type RunBudgets = {
  raw: CharBudget
  interpreted: CharBudget
}

function debugRun(
  run: CliRun,
  budgets: RunBudgets,
  options: { showThinking: boolean; modelTag?: string },
): ChatDebugCliRun {
  const entries = run.transcript ?? []
  const transcript: CliRunTranscriptEntry[] = []
  for (const source of entries) {
    const costed = costedTranscriptEntry(source)
    if (!budgets.raw.spend(costed.cost)) break
    transcript.push(costed.entry)
  }

  const allSteps = normalizeCliTranscript(entries)
  const steps: ChatDebugStep[] = []
  for (const source of allSteps) {
    const projected = debugStep(source)
    if (!budgets.interpreted.spend(jsonLength(projected))) break
    steps.push(projected)
  }

  const allDerived = cliTranscriptToMessages(entries, {
    ...(options.modelTag ? { model: options.modelTag } : {}),
    showThinking: options.showThinking,
  })
  const derivedMessages: ChatDebugMessage[] = []
  for (let i = 0; i < allDerived.length; i++) {
    const projected = debugMessage(allDerived[i], i)
    if (!budgets.interpreted.spend(jsonLength(projected))) break
    derivedMessages.push(projected)
  }

  return {
    id: run.id,
    status: run.status,
    ...(run.cli ? { cli: run.cli } : {}),
    ...(run.modelId ? { modelId: run.modelId } : {}),
    ...(run.effort ? { effort: run.effort } : {}),
    projectId: run.projectId,
    ...(run.chatContextId ? { chatContextId: run.chatContextId } : {}),
    ...(run.storyId ? { storyId: run.storyId } : {}),
    createdAt: run.createdAt,
    updatedAt: run.updatedAt,
    ...(run.durationMs != null ? { durationMs: run.durationMs } : {}),
    ...(run.costUSD != null ? { costUSD: run.costUSD } : {}),
    ...(run.exitCode != null ? { exitCode: run.exitCode } : {}),
    ...(run.abortReason ? { abortReason: run.abortReason } : {}),
    ...(options.modelTag ? { renderedModelTag: options.modelTag } : {}),
    transcriptEntryCount: entries.length,
    transcriptEntriesOmitted: entries.length - transcript.length,
    transcript,
    stepCount: allSteps.length,
    stepsOmitted: allSteps.length - steps.length,
    steps,
    derivedMessageCount: allDerived.length,
    derivedMessagesOmitted: allDerived.length - derivedMessages.length,
    derivedMessages,
  }
}

function debugCliRunner(chat: Chat | null | undefined): ChatDebugCliRunner | undefined {
  const runner = chat?.cliRunner
  if (!runner) return undefined
  return {
    tool: runner.tool,
    ...(runner.model ? { model: runner.model } : {}),
    ...(runner.effort ? { effort: runner.effort } : {}),
    ...(runner.execMode ? { execMode: runner.execMode } : {}),
  }
}

/**
 * Build the one-document diagnostic of how a chat renders: the chat's stored
 * messages, every CLI run belonging to it with its RAW transcript entries, and
 * the normalized steps + derived messages those entries produce — so the stream
 * a CLI emitted and the interpretation the chat renders can be read side by side.
 *
 * Pure. Bounded by three character budgets (stored messages, raw transcript,
 * interpreted views): a section is included whole or not at all, and whatever
 * did not fit is COUNTED rather than silently dropped. Individual texts and
 * serialized values are cut to a prefix; raw transcript payloads never are.
 */
export function buildChatDebugDump(input: ChatDebugDumpInput): ChatDebugDump {
  const { chat, context } = input
  const showThinking = input.showThinking ?? true
  const messagesBudget = new CharBudget(CHAT_DEBUG_MESSAGES_BUDGET_CHARS)
  const budgets: RunBudgets = {
    raw: new CharBudget(CHAT_DEBUG_RAW_TRANSCRIPT_BUDGET_CHARS),
    interpreted: new CharBudget(CHAT_DEBUG_INTERPRETED_BUDGET_CHARS),
  }

  // Newest-first while spending the budget, then restored to conversation order.
  // A diagnostic is opened to explain what JUST happened, so when the budget
  // cannot hold everything the turns to keep are the most recent ones — taking
  // them from the front drops exactly the part being investigated.
  const sourceMessages = chat?.messages ?? []
  const kept: ChatDebugMessage[] = []
  for (let i = sourceMessages.length - 1; i >= 0; i--) {
    const projected = debugMessage(sourceMessages[i], i)
    if (!messagesBudget.spend(jsonLength(projected))) break
    kept.push(projected)
  }
  const messages = kept.reverse()

  const modelTagByRunId = new Map<string, string>()
  for (const message of sourceMessages) {
    const tag = messageModelTag(message.model)
    if (message.cliRunId && tag) modelTagByRunId.set(message.cliRunId, tag)
  }

  const runs = [...(input.runs ?? [])]
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((run) => {
      const modelTag = modelTagByRunId.get(run.id)
      return debugRun(run, budgets, { showThinking, ...(modelTag ? { modelTag } : {}) })
    })

  const counts = {
    messages: sourceMessages.length,
    messagesOmitted: sourceMessages.length - messages.length,
    cliRuns: runs.length,
    transcriptEntries: runs.reduce((n, r) => n + r.transcriptEntryCount, 0),
    transcriptEntriesOmitted: runs.reduce((n, r) => n + r.transcriptEntriesOmitted, 0),
    steps: runs.reduce((n, r) => n + r.stepCount, 0),
    stepsOmitted: runs.reduce((n, r) => n + r.stepsOmitted, 0),
    derivedMessages: runs.reduce((n, r) => n + r.derivedMessageCount, 0),
    derivedMessagesOmitted: runs.reduce((n, r) => n + r.derivedMessagesOmitted, 0),
  }
  const cliRunner = debugCliRunner(chat)

  return {
    kind: 'chat-debug-dump',
    version: CHAT_DEBUG_DUMP_VERSION,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    chatContextKey: getChatContextKey(context),
    context,
    ...(chat?.title ? { chatTitle: chat.title } : {}),
    ...(chat?.state ? { chatState: chat.state } : {}),
    ...(cliRunner ? { cliRunner } : {}),
    showThinking,
    truncated:
      counts.messagesOmitted > 0 ||
      counts.transcriptEntriesOmitted > 0 ||
      counts.stepsOmitted > 0 ||
      counts.derivedMessagesOmitted > 0,
    counts,
    limits: {
      textPrefixChars: CHAT_DEBUG_TEXT_PREFIX_CHARS,
      messagesBudgetChars: CHAT_DEBUG_MESSAGES_BUDGET_CHARS,
      rawTranscriptBudgetChars: CHAT_DEBUG_RAW_TRANSCRIPT_BUDGET_CHARS,
      interpretedBudgetChars: CHAT_DEBUG_INTERPRETED_BUDGET_CHARS,
    },
    messages,
    runs,
    ...(input.runsError ? { runsError: input.runsError } : {}),
  }
}

function isLowSurrogate(code: number): boolean {
  return code >= 0xdc00 && code <= 0xdfff
}

/** UTF-8 byte length without `TextEncoder`, which RN's engine does not guarantee. */
export function utf8ByteLength(text: string): number {
  let bytes = 0
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    if (code < 0x80) {
      bytes += 1
    } else if (code < 0x800) {
      bytes += 2
    } else if (code >= 0xd800 && code <= 0xdbff && isLowSurrogate(text.charCodeAt(i + 1))) {
      bytes += 4
      i++
    } else {
      bytes += 3
    }
  }
  return bytes
}

/** Pretty-print a dump for the modal and the clipboard, with its transfer size. */
export function serializeChatDebugDump(dump: ChatDebugDump): ChatDebugDumpSerialized {
  const json = JSON.stringify(dump, null, 2)
  return { json, byteSize: utf8ByteLength(json) }
}
