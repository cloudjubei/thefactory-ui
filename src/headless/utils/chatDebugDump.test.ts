import { describe, expect, it } from 'vitest'
import {
  buildChatDebugDump,
  chatDebugText,
  fitsChatDebugBudget,
  serializeChatDebugDump,
  utf8ByteLength,
} from './chatDebugDump'
import {
  CHAT_DEBUG_DUMP_VERSION,
  CHAT_DEBUG_RAW_TRANSCRIPT_BUDGET_CHARS,
  CHAT_DEBUG_TEXT_PREFIX_CHARS,
  CHAT_DEBUG_UNSERIALIZABLE_PAYLOAD,
} from './chatDebugDumpConstants'
import type { Chat, ChatContext, CliRun, CliRunTranscriptEntry } from '../api/generated'

const context: ChatContext = { type: 'PROJECT', projectId: 'proj-1' }

const chatOf = (over: Partial<Chat> = {}): Chat => ({ context, ...over })

const runOf = (over: Partial<CliRun> = {}): CliRun => ({
  id: 'run-1',
  projectId: 'proj-1',
  status: 'succeeded',
  prompt: 'do the thing',
  policy: {} as CliRun['policy'],
  policyHistory: [],
  transcript: [],
  pendingActions: [],
  approvedActions: [],
  artifacts: [],
  createdAt: 1000,
  updatedAt: 2000,
  ...over,
})

const assistantEntry = (at: number, text: string): CliRunTranscriptEntry => ({
  at,
  kind: 'assistant',
  payload: { type: 'assistant', message: { content: [{ type: 'text', text }] } },
})

describe('chatDebugText', () => {
  it('keeps a value at exactly the prefix limit whole', () => {
    const value = 'x'.repeat(CHAT_DEBUG_TEXT_PREFIX_CHARS)
    expect(chatDebugText(value)).toEqual({
      length: CHAT_DEBUG_TEXT_PREFIX_CHARS,
      preview: value,
      truncated: false,
    })
  })

  it('cuts a value one character past the limit to the prefix', () => {
    const value = 'x'.repeat(CHAT_DEBUG_TEXT_PREFIX_CHARS + 1)
    const text = chatDebugText(value)
    expect(text.truncated).toBe(true)
    expect(text.preview).toBe('x'.repeat(CHAT_DEBUG_TEXT_PREFIX_CHARS))
    expect(text.preview.length).toBe(CHAT_DEBUG_TEXT_PREFIX_CHARS)
  })

  it('reports the original length of a cut value, not the preview length', () => {
    expect(chatDebugText('y'.repeat(CHAT_DEBUG_TEXT_PREFIX_CHARS + 500)).length).toBe(
      CHAT_DEBUG_TEXT_PREFIX_CHARS + 500,
    )
  })
})

describe('fitsChatDebugBudget', () => {
  it('admits a section that exactly fills the remaining allowance', () => {
    expect(fitsChatDebugBudget(10, 10)).toBe(true)
  })

  it('refuses a section one character over the remaining allowance', () => {
    expect(fitsChatDebugBudget(11, 10)).toBe(false)
  })

  it('refuses everything once the allowance is gone', () => {
    expect(fitsChatDebugBudget(1, 0)).toBe(false)
  })
})

describe('buildChatDebugDump — header', () => {
  it('stamps the context key derived from the chat context', () => {
    const dump = buildChatDebugDump({ context })
    expect(dump.chatContextKey).toBe('/projects/proj-1')
  })

  it('stamps the document kind and version', () => {
    const dump = buildChatDebugDump({ context })
    expect(dump.kind).toBe('chat-debug-dump')
    expect(dump.version).toBe(CHAT_DEBUG_DUMP_VERSION)
  })

  it('uses the supplied generatedAt so the document is reproducible', () => {
    const dump = buildChatDebugDump({ context, generatedAt: '2026-01-01T00:00:00.000Z' })
    expect(dump.generatedAt).toBe('2026-01-01T00:00:00.000Z')
  })

  it('reports the attached CLI runner', () => {
    const dump = buildChatDebugDump({
      context,
      chat: chatOf({
        cliRunner: { tool: 'claude-code', model: 'opus', execMode: 'resident', effort: 'high' },
      }),
    })
    expect(dump.cliRunner).toEqual({
      tool: 'claude-code',
      model: 'opus',
      effort: 'high',
      execMode: 'resident',
    })
  })

  it('omits the runner for an API-backed chat', () => {
    expect(buildChatDebugDump({ context, chat: chatOf() }).cliRunner).toBeUndefined()
  })

  it('defaults showThinking to true when the caller does not pass the preference', () => {
    expect(buildChatDebugDump({ context }).showThinking).toBe(true)
  })

  it('carries showThinking false through to the document', () => {
    expect(buildChatDebugDump({ context, showThinking: false }).showThinking).toBe(false)
  })

  it('publishes the caps it was built under', () => {
    expect(buildChatDebugDump({ context }).limits.textPrefixChars).toBe(
      CHAT_DEBUG_TEXT_PREFIX_CHARS,
    )
  })
})

describe('buildChatDebugDump — empty chat', () => {
  it('returns no messages for a chat that does not exist yet', () => {
    const dump = buildChatDebugDump({ context, chat: null })
    expect(dump.messages).toEqual([])
    expect(dump.counts.messages).toBe(0)
  })

  it('returns no runs for a chat with no CLI runs', () => {
    const dump = buildChatDebugDump({ context, chat: chatOf({ messages: [] }), runs: [] })
    expect(dump.runs).toEqual([])
    expect(dump.counts.cliRuns).toBe(0)
    expect(dump.counts.transcriptEntries).toBe(0)
  })

  it('is not marked truncated when nothing was dropped', () => {
    expect(buildChatDebugDump({ context, chat: chatOf({ messages: [] }) }).truncated).toBe(false)
  })
})

describe('buildChatDebugDump — stored messages', () => {
  it('flags an empty assistant placeholder as empty and keeps its run id', () => {
    const dump = buildChatDebugDump({
      context,
      chat: chatOf({
        messages: [
          {
            role: 'assistant',
            content: '',
            cliRunId: 'run-1',
            startedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      }),
    })
    expect(dump.messages[0]).toMatchObject({
      index: 0,
      role: 'assistant',
      contentEmpty: true,
      cliRunId: 'run-1',
      startedAt: '2026-01-01T00:00:00.000Z',
    })
  })

  it('does not flag a non-empty message as empty', () => {
    const dump = buildChatDebugDump({
      context,
      chat: chatOf({ messages: [{ role: 'user', content: 'hello' }] }),
    })
    expect(dump.messages[0].contentEmpty).toBe(false)
    expect(dump.messages[0].content.preview).toBe('hello')
  })

  it('truncates long message content to the bounded prefix', () => {
    const long = 'a'.repeat(CHAT_DEBUG_TEXT_PREFIX_CHARS + 42)
    const dump = buildChatDebugDump({
      context,
      chat: chatOf({ messages: [{ role: 'assistant', content: long }] }),
    })
    expect(dump.messages[0].content.truncated).toBe(true)
    expect(dump.messages[0].content.preview.length).toBe(CHAT_DEBUG_TEXT_PREFIX_CHARS)
    expect(dump.messages[0].content.length).toBe(long.length)
  })

  it('names the tool and its result type on a tool message', () => {
    const dump = buildChatDebugDump({
      context,
      chat: chatOf({
        messages: [
          {
            role: 'tool',
            content: '',
            toolCall: { toolCallId: 'tc-1', name: 'readPaths', arguments: { path: 'src' } },
            toolResult: { type: 'success', result: { ok: true }, durationMs: 12 },
          },
        ],
      }),
    })
    expect(dump.messages[0].toolCall).toEqual({
      toolCallId: 'tc-1',
      name: 'readPaths',
      arguments: { length: 14, preview: '{"path":"src"}', truncated: false },
    })
    expect(dump.messages[0].toolResult).toMatchObject({ type: 'success', durationMs: 12 })
  })

  it('keeps tool arguments verbatim below the prefix limit rather than redacting them', () => {
    const dump = buildChatDebugDump({
      context,
      chat: chatOf({
        messages: [
          {
            role: 'tool',
            content: '',
            toolCall: {
              toolCallId: 'tc-1',
              name: 'writeFile',
              arguments: { path: 'a.ts', content: 'secret-looking-but-needed' },
            },
          },
        ],
      }),
    })
    expect(dump.messages[0].toolCall?.arguments.preview).toContain('secret-looking-but-needed')
  })

  it('keeps the MOST RECENT messages when the budget cannot hold them all', () => {
    const big = 'b'.repeat(CHAT_DEBUG_TEXT_PREFIX_CHARS)
    const messages = Array.from({ length: 200 }, (_, i) => ({
      role: 'assistant' as const,
      content: `${i}-${big}`,
    }))
    const dump = buildChatDebugDump({ context, chat: chatOf({ messages }) })

    // The dump is opened to explain what JUST happened; keeping the oldest turns
    // drops exactly the part being investigated.
    const lastKept = dump.messages[dump.messages.length - 1]
    expect(lastKept?.index).toBe(messages.length - 1)
    expect(dump.messages[0]!.index).toBeGreaterThan(0)
  })

  it('keeps messages in conversation order, not newest-first', () => {
    const big = 'b'.repeat(CHAT_DEBUG_TEXT_PREFIX_CHARS)
    const messages = Array.from({ length: 200 }, () => ({
      role: 'assistant' as const,
      content: big,
    }))
    const indexes = buildChatDebugDump({ context, chat: chatOf({ messages }) }).messages.map(
      (m) => m.index,
    )
    expect(indexes).toEqual([...indexes].sort((a, b) => a - b))
  })

  it('drops messages that do not fit the message budget and counts them', () => {
    const big = 'b'.repeat(CHAT_DEBUG_TEXT_PREFIX_CHARS)
    const messages = Array.from({ length: 200 }, () => ({
      role: 'assistant' as const,
      content: big,
    }))
    const dump = buildChatDebugDump({ context, chat: chatOf({ messages }) })
    expect(dump.messages.length).toBeGreaterThan(0)
    expect(dump.messages.length).toBeLessThan(messages.length)
    expect(dump.counts.messagesOmitted).toBe(messages.length - dump.messages.length)
    expect(dump.truncated).toBe(true)
  })
})

describe('buildChatDebugDump — CLI runs', () => {
  it('carries the run identity and lifecycle fields', () => {
    const dump = buildChatDebugDump({
      context,
      runs: [
        runOf({
          id: 'run-9',
          status: 'errored',
          cli: { tool: 'codex', version: '1.2.3' },
          modelId: 'gpt-5',
          durationMs: 4321,
          exitCode: 1,
        }),
      ],
    })
    expect(dump.runs[0]).toMatchObject({
      id: 'run-9',
      status: 'errored',
      cli: { tool: 'codex', version: '1.2.3' },
      modelId: 'gpt-5',
      createdAt: 1000,
      updatedAt: 2000,
      durationMs: 4321,
      exitCode: 1,
    })
  })

  it('orders runs oldest first so the dump reads in turn order', () => {
    const dump = buildChatDebugDump({
      context,
      runs: [
        runOf({ id: 'late', createdAt: 5000 }),
        runOf({ id: 'early', createdAt: 100 }),
        runOf({ id: 'mid', createdAt: 900 }),
      ],
    })
    expect(dump.runs.map((r) => r.id)).toEqual(['early', 'mid', 'late'])
  })

  it('keeps raw transcript payloads intact — nested objects and long strings alike', () => {
    const payload = {
      type: 'assistant',
      message: {
        content: [
          { type: 'tool_use', id: 'tu-1', name: 'Bash', input: { command: 'x'.repeat(5000) } },
        ],
      },
      nested: { deep: { deeper: [1, 2, { three: true }] } },
    }
    const entry: CliRunTranscriptEntry = { at: 7, kind: 'tool-call', payload, costUSD: 0.5 }
    const dump = buildChatDebugDump({ context, runs: [runOf({ transcript: [entry] })] })
    expect(dump.runs[0].transcript).toEqual([entry])
    expect(dump.runs[0].transcript[0].payload).toEqual(payload)
  })

  it('replaces an unserializable payload rather than throwing', () => {
    const cyclic: Record<string, unknown> = { name: 'loop' }
    cyclic.self = cyclic
    const dump = buildChatDebugDump({
      context,
      runs: [runOf({ transcript: [{ at: 1, kind: 'other', payload: cyclic }] })],
    })
    expect(dump.runs[0].transcript[0].payload).toBe(CHAT_DEBUG_UNSERIALIZABLE_PAYLOAD)
  })

  it('stops embedding transcript entries once the raw budget is spent and counts the rest', () => {
    const oversized = Array.from({ length: 60 }, (_, i) =>
      assistantEntry(i, 'z'.repeat(CHAT_DEBUG_RAW_TRANSCRIPT_BUDGET_CHARS / 10)),
    )
    const dump = buildChatDebugDump({ context, runs: [runOf({ transcript: oversized })] })
    expect(dump.runs[0].transcript.length).toBeGreaterThan(0)
    expect(dump.runs[0].transcript.length).toBeLessThan(oversized.length)
    expect(dump.runs[0].transcriptEntryCount).toBe(oversized.length)
    expect(dump.runs[0].transcriptEntriesOmitted).toBe(
      oversized.length - dump.runs[0].transcript.length,
    )
    expect(dump.counts.transcriptEntriesOmitted).toBe(dump.runs[0].transcriptEntriesOmitted)
    expect(dump.truncated).toBe(true)
  })

  it('shares one raw budget across runs rather than granting each run its own', () => {
    const filler = () =>
      Array.from({ length: 20 }, (_, i) =>
        assistantEntry(i, 'z'.repeat(CHAT_DEBUG_RAW_TRANSCRIPT_BUDGET_CHARS / 10)),
      )
    const alone = buildChatDebugDump({
      context,
      runs: [runOf({ id: 'second', createdAt: 2, transcript: filler() })],
    })
    const shared = buildChatDebugDump({
      context,
      runs: [
        runOf({ id: 'first', createdAt: 1, transcript: filler() }),
        runOf({ id: 'second', createdAt: 2, transcript: filler() }),
      ],
    })
    expect(alone.runs[0].transcript.length).toBeGreaterThan(0)
    expect(shared.runs[1].transcript).toEqual([])
    expect(shared.runs[1].transcriptEntriesOmitted).toBe(20)
  })

  it('projects the normalized steps alongside the raw entries', () => {
    const dump = buildChatDebugDump({
      context,
      runs: [
        runOf({
          transcript: [
            {
              at: 1,
              kind: 'tool-call',
              payload: {
                type: 'assistant',
                message: {
                  content: [
                    { type: 'tool_use', id: 'tu-1', name: 'Bash', input: { command: 'ls' } },
                  ],
                },
              },
            },
          ],
        }),
      ],
    })
    expect(dump.runs[0].steps[0]).toMatchObject({
      kind: 'tool',
      toolName: 'Bash',
      toolCallId: 'tu-1',
      resultType: 'running',
    })
    expect(dump.runs[0].steps[0].input?.preview).toBe('{"command":"ls"}')
  })

  it('projects the derived chat messages the run renders as', () => {
    const dump = buildChatDebugDump({
      context,
      runs: [runOf({ transcript: [assistantEntry(1, 'the reply')] })],
    })
    expect(dump.runs[0].derivedMessages).toHaveLength(1)
    expect(dump.runs[0].derivedMessages[0]).toMatchObject({
      role: 'assistant',
      contentEmpty: false,
    })
    expect(dump.runs[0].derivedMessages[0].content.preview).toBe('the reply')
  })

  it('drops derived thinking messages when the chat renders with thinking off', () => {
    const thinking: CliRunTranscriptEntry = {
      at: 1,
      kind: 'assistant',
      payload: { message: { content: [{ type: 'thinking', thinking: 'pondering' }] } },
    }
    const on = buildChatDebugDump({ context, runs: [runOf({ transcript: [thinking] })] })
    const off = buildChatDebugDump({
      context,
      showThinking: false,
      runs: [runOf({ transcript: [thinking] })],
    })
    expect(on.runs[0].derivedMessageCount).toBe(1)
    expect(off.runs[0].derivedMessageCount).toBe(0)
  })

  it('reports the model tag the chat hands the transcript renderer', () => {
    const dump = buildChatDebugDump({
      context,
      chat: chatOf({
        messages: [
          {
            role: 'assistant',
            content: '',
            cliRunId: 'run-1',
            model: { model: 'cli-agent/codex/gpt-5', provider: 'openai' },
          },
        ],
      }),
      runs: [runOf({ id: 'run-1', transcript: [assistantEntry(1, 'hi')] })],
    })
    expect(dump.runs[0].renderedModelTag).toBe('cli-agent/codex/gpt-5')
    expect(dump.runs[0].derivedMessages[0].model).toBe('cli-agent/codex/gpt-5')
  })

  it('leaves the model tag unset when no stored message names the run', () => {
    const dump = buildChatDebugDump({ context, runs: [runOf({ id: 'run-1' })] })
    expect(dump.runs[0].renderedModelTag).toBeUndefined()
  })
})

describe('serializeChatDebugDump', () => {
  it('pretty-prints the document and reports its UTF-8 size', () => {
    const dump = buildChatDebugDump({ context, generatedAt: '2026-01-01T00:00:00.000Z' })
    const { json, byteSize } = serializeChatDebugDump(dump)
    expect(json.startsWith('{\n  "kind": "chat-debug-dump"')).toBe(true)
    expect(byteSize).toBe(utf8ByteLength(json))
  })

  it('round-trips back to the same document', () => {
    const dump = buildChatDebugDump({
      context,
      chat: chatOf({ messages: [{ role: 'user', content: 'hi' }] }),
      generatedAt: '2026-01-01T00:00:00.000Z',
    })
    expect(JSON.parse(serializeChatDebugDump(dump).json)).toEqual(dump)
  })
})

describe('utf8ByteLength', () => {
  it('counts ASCII as one byte each', () => {
    expect(utf8ByteLength('abc')).toBe(3)
  })

  it('counts a two-byte code point', () => {
    expect(utf8ByteLength('é')).toBe(2)
  })

  it('counts a three-byte code point', () => {
    expect(utf8ByteLength('€')).toBe(3)
  })

  it('counts a surrogate pair as four bytes, not six', () => {
    expect(utf8ByteLength('😀')).toBe(4)
  })

  it('counts an unpaired high surrogate as three bytes', () => {
    expect(utf8ByteLength('\ud83d')).toBe(3)
  })
})

describe('buildChatDebugDump — runs that could not be loaded', () => {
  it('records why the listing is missing, so empty is not read as none', () => {
    const dump = buildChatDebugDump({ context, runs: [], runsError: 'Request timed out' })
    expect(dump.runsError).toBe('Request timed out')
    expect(dump.counts.cliRuns).toBe(0)
  })

  it('says nothing about an error when the listing succeeded and was simply empty', () => {
    expect(buildChatDebugDump({ context, runs: [] }).runsError).toBeUndefined()
  })
})
