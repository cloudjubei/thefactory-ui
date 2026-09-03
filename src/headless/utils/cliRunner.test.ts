import { describe, it, expect } from 'vitest'
import {
  chatCliRunnerToDispatchOptions,
  chatCliRunnerToStartRunBody,
  cliAssistantTextFromEntry,
  cliToolNameFromEntry,
  cleanCliToolName,
  classifyToolOrigin,
  cliThinkingTextFromEntry,
  messageModelTag,
  normalizeCliTranscript,
  cliTranscriptToMessages,
  cliDotColor,
  cliLabel,
  parseCliAgentModelTag,
  shortCliModelLabel,
  enabledClis,
  deriveCliAuthWarning,
  filesEmittedArtifactOf,
  groupCachesByCli,
  loginAwaitsCode,
  parseCliAuthLoginEvent,
  parseCliRunUpdateEvent,
  parseLoginUrl,
  isAwaitingApprovalResult,
  isPlaceholderCliToolName,
  isEmptyToolInput,
  acpToolOrigin,
} from './cliRunner'
import type { CliRunTranscriptEntry } from '../api/generated'

const entry = (over: Partial<CliRunTranscriptEntry>): CliRunTranscriptEntry => ({
  at: 1,
  kind: 'assistant',
  payload: undefined,
  ...over,
})

describe('chatCliRunnerToDispatchOptions', () => {
  it('maps tool→cli and credentialId→authCredentialId', () => {
    expect(chatCliRunnerToDispatchOptions({ tool: 'claude-code', credentialId: 'cli-1' })).toEqual({
      cli: 'claude-code',
      authCredentialId: 'cli-1',
      execMode: 'resident',
    })
  })

  it('carries apiKeyCredentialId and omits absent credential', () => {
    expect(chatCliRunnerToDispatchOptions({ tool: 'codex', apiKeyCredentialId: 'llm-1' })).toEqual({
      cli: 'codex',
      apiKeyCredentialId: 'llm-1',
      execMode: 'resident',
    })
  })

  it('forwards the per-chat model + effort so the picked model reaches the run', () => {
    expect(
      chatCliRunnerToDispatchOptions({
        tool: 'claude-code',
        credentialId: 'cli-1',
        model: 'opus',
        effort: 'high',
      }),
    ).toEqual({
      cli: 'claude-code',
      authCredentialId: 'cli-1',
      model: 'opus',
      effort: 'high',
      execMode: 'resident',
    })
  })

  it('forwards an explicit execMode and defaults to resident when unset', () => {
    // Explicit per-turn is honored (user forced the cold path).
    expect(
      chatCliRunnerToDispatchOptions({
        tool: 'claude-code',
        credentialId: 'cli-1',
        execMode: 'per-turn',
      }),
    ).toEqual({ cli: 'claude-code', authCredentialId: 'cli-1', execMode: 'per-turn' })
    // Unset → resident by default (the runner degrades to per-turn if ineligible).
    expect(chatCliRunnerToDispatchOptions({ tool: 'claude-code', credentialId: 'cli-1' })).toEqual({
      cli: 'claude-code',
      authCredentialId: 'cli-1',
      execMode: 'resident',
    })
  })
})

describe('chatCliRunnerToStartRunBody', () => {
  it('maps tool→cli and credentialId→authCredentialId with prompt + project', () => {
    const body = chatCliRunnerToStartRunBody(
      { tool: 'claude-code', credentialId: 'cli-1' },
      { projectId: 'p1', prompt: 'hi', chatContextId: 'c1' },
    )
    expect(body).toEqual({
      projectId: 'p1',
      cli: 'claude-code',
      prompt: 'hi',
      chatContextId: 'c1',
      authCredentialId: 'cli-1',
    })
  })

  it('carries apiKeyCredentialId through and omits absent optionals', () => {
    const body = chatCliRunnerToStartRunBody(
      { tool: 'codex', apiKeyCredentialId: 'llm-1' },
      { projectId: 'p1', prompt: 'go' },
    )
    expect(body).toEqual({
      projectId: 'p1',
      cli: 'codex',
      prompt: 'go',
      apiKeyCredentialId: 'llm-1',
    })
    expect('chatContextId' in body).toBe(false)
    expect('authCredentialId' in body).toBe(false)
  })

  it('threads storyId when present', () => {
    const body = chatCliRunnerToStartRunBody(
      { tool: 'cursor-agent', credentialId: 'c' },
      { projectId: 'p1', prompt: 'x', storyId: 's1' },
    )
    expect(body.storyId).toBe('s1')
  })

  it('forwards model→modelId and effort onto the run body', () => {
    const body = chatCliRunnerToStartRunBody(
      { tool: 'claude-code', credentialId: 'cli-1', model: 'opus', effort: 'high' },
      { projectId: 'p1', prompt: 'go' },
    )
    expect(body.modelId).toBe('opus')
    expect(body.effort).toBe('high')
  })
})

describe('enabledClis', () => {
  it('returns the keys whose value is true', () => {
    expect(
      enabledClis({ enabled: { 'claude-code': true, codex: false, 'cursor-agent': true } }),
    ).toEqual(['claude-code', 'cursor-agent'])
  })

  it('returns [] for undefined / empty state', () => {
    expect(enabledClis(undefined)).toEqual([])
    expect(enabledClis(null)).toEqual([])
    expect(enabledClis({})).toEqual([])
    expect(enabledClis({ enabled: {} })).toEqual([])
  })
})

describe('groupCachesByCli', () => {
  it('buckets caches by their cli tag preserving order', () => {
    const caches = [
      { id: 'a', cli: 'claude-code' },
      { id: 'b', cli: 'codex' },
      { id: 'c', cli: 'claude-code' },
    ]
    expect(groupCachesByCli(caches)).toEqual({
      'claude-code': [
        { id: 'a', cli: 'claude-code' },
        { id: 'c', cli: 'claude-code' },
      ],
      codex: [{ id: 'b', cli: 'codex' }],
    })
  })

  it('returns {} for no caches', () => {
    expect(groupCachesByCli([])).toEqual({})
  })
})

describe('parseCliAuthLoginEvent', () => {
  it('extracts the chunk text from a chunk event (not the raw JSON envelope)', () => {
    expect(
      parseCliAuthLoginEvent({
        loginId: 'login_1',
        type: 'chunk',
        event: { loginId: 'login_1', chunk: 'Starting login process...\n' },
      }),
    ).toEqual({ loginId: 'login_1', kind: 'chunk', text: 'Starting login process...\n' })
  })

  it('extracts the credentialId from a completed event', () => {
    expect(
      parseCliAuthLoginEvent({
        loginId: 'login_1',
        type: 'completed',
        event: { loginId: 'login_1', credentialId: 'cred-9' },
      }),
    ).toEqual({ loginId: 'login_1', kind: 'completed', credentialId: 'cred-9' })
  })

  it('extracts the error message from an error event', () => {
    expect(
      parseCliAuthLoginEvent({
        loginId: 'login_1',
        type: 'error',
        event: { loginId: 'login_1', error: 'cursor-agent login exited with code 1' },
      }),
    ).toEqual({ loginId: 'login_1', kind: 'error', error: 'cursor-agent login exited with code 1' })
  })

  it('returns null for a payload without a loginId, an unknown type, or a non-object', () => {
    expect(parseCliAuthLoginEvent({ type: 'chunk', event: { chunk: 'x' } })).toBeNull()
    expect(parseCliAuthLoginEvent({ loginId: 'l', type: 'mystery', event: {} })).toBeNull()
    expect(parseCliAuthLoginEvent('nope')).toBeNull()
    expect(parseCliAuthLoginEvent(null)).toBeNull()
  })
})

describe('parseLoginUrl', () => {
  it('extracts the first sign-in URL from streamed output', () => {
    const out =
      "Opening browser to sign in…\nIf the browser didn't open, visit: https://claude.com/cai/oauth/authorize?code=true&x=1\n"
    expect(parseLoginUrl(out)).toBe('https://claude.com/cai/oauth/authorize?code=true&x=1')
  })

  it('strips trailing punctuation and returns null when no URL is present yet', () => {
    expect(parseLoginUrl('Open this link: https://cursor.com/loginDeepControl?c=abc).')).toBe(
      'https://cursor.com/loginDeepControl?c=abc',
    )
    expect(parseLoginUrl('Starting login…')).toBeNull()
  })
})

describe('loginAwaitsCode', () => {
  it('is true only when the output prompts for a pasted code', () => {
    expect(loginAwaitsCode('Paste code here if prompted >')).toBe(true)
    expect(loginAwaitsCode('Waiting for browser authentication...')).toBe(false)
    expect(loginAwaitsCode('Opening browser to sign in…')).toBe(false)
  })
})

describe('cliAssistantTextFromEntry', () => {
  it('joins the text blocks of an assistant entry', () => {
    expect(
      cliAssistantTextFromEntry(
        entry({
          kind: 'assistant',
          payload: {
            message: {
              content: [
                { type: 'text', text: 'Hello ' },
                { type: 'text', text: 'world' },
              ],
            },
          },
        }),
      ),
    ).toBe('Hello world')
  })

  it("extracts Codex's agent_message item text", () => {
    expect(
      cliAssistantTextFromEntry(
        entry({
          kind: 'assistant',
          payload: {
            type: 'item.completed',
            item: { id: 'i0', type: 'agent_message', text: 'codex says hi' },
          },
        }),
      ),
    ).toBe('codex says hi')
  })

  it('ignores non-text blocks and non-assistant entries', () => {
    expect(
      cliAssistantTextFromEntry(
        entry({
          kind: 'assistant',
          payload: {
            message: {
              content: [
                { type: 'tool_use', id: 't1' },
                { type: 'text', text: 'kept' },
              ],
            },
          },
        }),
      ),
    ).toBe('kept')
    expect(cliAssistantTextFromEntry(entry({ kind: 'result', payload: { result: 'final' } }))).toBe(
      '',
    )
    expect(cliAssistantTextFromEntry(entry({ kind: 'assistant', payload: undefined }))).toBe('')
    expect(cliAssistantTextFromEntry(entry({ kind: 'assistant', payload: { message: {} } }))).toBe(
      '',
    )
  })
})

describe('cliToolNameFromEntry', () => {
  it('reads a top-level name', () => {
    expect(cliToolNameFromEntry(entry({ kind: 'tool-call', payload: { name: 'Bash' } }))).toBe(
      'Bash',
    )
  })

  it("reads Claude's nested tool_use block name", () => {
    expect(
      cliToolNameFromEntry(
        entry({
          kind: 'tool-call',
          payload: {
            message: {
              content: [
                { type: 'text', text: 'x' },
                { type: 'tool_use', name: 'Edit' },
              ],
            },
          },
        }),
      ),
    ).toBe('Edit')
  })

  it("reads Codex's item type (but not agent_message)", () => {
    expect(
      cliToolNameFromEntry(
        entry({ kind: 'tool-call', payload: { item: { type: 'command_execution' } } }),
      ),
    ).toBe('command_execution')
    expect(
      cliToolNameFromEntry(
        entry({ kind: 'tool-call', payload: { item: { type: 'agent_message' } } }),
      ),
    ).toBeUndefined()
  })

  it('returns undefined when no name is discoverable', () => {
    expect(cliToolNameFromEntry(entry({ kind: 'tool-call', payload: undefined }))).toBeUndefined()
    expect(
      cliToolNameFromEntry(entry({ kind: 'tool-call', payload: { message: {} } })),
    ).toBeUndefined()
  })
})

describe('cleanCliToolName', () => {
  it('strips an MCP server prefix and leaves plain names untouched', () => {
    expect(cleanCliToolName('mcp__thefactory__readPaths')).toBe('readPaths')
    expect(cleanCliToolName('Bash')).toBe('Bash')
    expect(cleanCliToolName('readPaths')).toBe('readPaths')
  })

  it('strips the bare server-namespaced forms a CLI may surface', () => {
    expect(cleanCliToolName('thefactory-readPaths')).toBe('readPaths')
    expect(cleanCliToolName('thefactory__grepFiles')).toBe('grepFiles')
    expect(cleanCliToolName('mcp__thefactory__write_file')).toBe('write_file')
    expect(cleanCliToolName('command_execution')).toBe('command_execution')
  })
})

describe('classifyToolOrigin', () => {
  it('classifies thefactory MCP / namespaced names as internal', () => {
    expect(classifyToolOrigin('mcp__thefactory__readPaths')).toBe('internal')
    expect(classifyToolOrigin('thefactory-listContents')).toBe('internal')
    expect(classifyToolOrigin('thefactory__grepFiles')).toBe('internal')
  })

  it('classifies a non-thefactory MCP server as external-mcp', () => {
    expect(classifyToolOrigin('mcp__github__create_issue')).toBe('external-mcp')
    expect(classifyToolOrigin('mcp__linear__searchIssues')).toBe('external-mcp')
  })

  it('classifies plain CLI built-in tools as native', () => {
    expect(classifyToolOrigin('Bash')).toBe('native')
    expect(classifyToolOrigin('command_execution')).toBe('native')
    expect(classifyToolOrigin('Read')).toBe('native')
    expect(classifyToolOrigin(undefined)).toBe('native')
  })
})

describe('cliThinkingTextFromEntry', () => {
  it("extracts Claude 'thinking' content blocks, ignores plain assistants", () => {
    expect(
      cliThinkingTextFromEntry(
        entry({
          kind: 'assistant',
          payload: {
            message: {
              content: [
                { type: 'thinking', thinking: 'let me reason' },
                { type: 'text', text: 'answer' },
              ],
            },
          },
        }),
      ),
    ).toBe('let me reason')
    expect(
      cliThinkingTextFromEntry(
        entry({
          kind: 'assistant',
          payload: { message: { content: [{ type: 'text', text: 'hi' }] } },
        }),
      ),
    ).toBe('')
  })
})

describe('normalizeCliTranscript', () => {
  it('coalesces consecutive assistant deltas (streaming CLIs) into one growing message', () => {
    const steps = normalizeCliTranscript([
      entry({
        at: 1,
        kind: 'assistant',
        payload: { message: { content: [{ type: 'text', text: 'The ' }] } },
      }),
      entry({
        at: 2,
        kind: 'assistant',
        payload: { message: { content: [{ type: 'text', text: 'answer ' }] } },
      }),
      entry({
        at: 3,
        kind: 'assistant',
        payload: { message: { content: [{ type: 'text', text: 'is 4.' }] } },
      }),
    ])
    expect(steps).toHaveLength(1)
    expect(steps[0]).toMatchObject({ kind: 'assistant', text: 'The answer is 4.' })
  })

  it('keeps assistant segments split by a tool step distinct (no over-merge)', () => {
    const steps = normalizeCliTranscript([
      entry({
        at: 1,
        kind: 'assistant',
        payload: { message: { content: [{ type: 'text', text: 'let me check' }] } },
      }),
      entry({
        at: 2,
        kind: 'tool-call',
        payload: {
          message: { content: [{ type: 'tool_use', id: 't1', name: 'read', input: {} }] },
        },
      }),
      entry({
        at: 3,
        kind: 'assistant',
        payload: { message: { content: [{ type: 'text', text: 'done' }] } },
      }),
    ])
    expect(steps.map((s) => s.kind)).toEqual(['assistant', 'tool', 'assistant'])
  })

  it('Claude: pairs tool_use with its later tool_result by id, keeps assistant prose', () => {
    const steps = normalizeCliTranscript([
      entry({
        at: 1,
        kind: 'assistant',
        payload: { message: { content: [{ type: 'text', text: 'reading' }] } },
      }),
      entry({
        at: 2,
        kind: 'tool-call',
        payload: {
          message: {
            content: [
              {
                type: 'tool_use',
                id: 'toolu_1',
                name: 'mcp__thefactory__readPaths',
                input: { paths: ['a.ts'] },
              },
            ],
          },
        },
      }),
      entry({
        at: 3,
        kind: 'tool-result',
        payload: {
          message: {
            content: [{ type: 'tool_result', tool_use_id: 'toolu_1', content: '{"ok":true}' }],
          },
        },
      }),
    ])
    expect(steps.map((s) => s.kind)).toEqual(['assistant', 'tool'])
    const tool = steps[1]
    if (tool.kind !== 'tool') throw new Error('expected tool step')
    expect(tool.toolName).toBe('readPaths')
    expect(tool.toolCallId).toBe('toolu_1')
    expect(tool.input).toEqual({ paths: ['a.ts'] })
    expect(tool.resultType).toBe('success')
    expect(tool.result).toEqual({ ok: true }) // JSON-parsed from the MCP string result
  })

  it('Cursor: merges started + completed tool_call by call_id, reads result success/error', () => {
    const steps = normalizeCliTranscript([
      entry({
        at: 1,
        kind: 'tool-call',
        payload: {
          type: 'tool_call',
          subtype: 'started',
          call_id: 'c1',
          tool_call: { readToolCall: { args: { path: '/x' } } },
        },
      }),
      entry({
        at: 2,
        kind: 'tool-result',
        payload: {
          type: 'tool_call',
          subtype: 'completed',
          call_id: 'c1',
          tool_call: {
            readToolCall: { args: { path: '/x' }, result: { success: { content: 'hi' } } },
          },
        },
      }),
    ])
    expect(steps.length).toBe(1)
    const tool = steps[0]
    if (tool.kind !== 'tool') throw new Error('expected tool step')
    expect(tool.toolName).toBe('read')
    expect(tool.input).toEqual({ path: '/x' })
    expect(tool.resultType).toBe('success')
  })

  it('Codex: command_execution started+completed merge by item.id, exit_code drives resultType', () => {
    const steps = normalizeCliTranscript([
      entry({
        at: 1,
        kind: 'assistant',
        payload: { item: { type: 'agent_message', text: 'done' } },
      }),
      entry({
        at: 2,
        kind: 'tool-call',
        payload: {
          type: 'item.started',
          item: { id: 'item_1', type: 'command_execution', command: 'ls' },
        },
      }),
      entry({
        at: 3,
        kind: 'tool-result',
        payload: {
          type: 'item.completed',
          item: {
            id: 'item_1',
            type: 'command_execution',
            command: 'ls',
            aggregated_output: 'a\nb',
            exit_code: 0,
          },
        },
      }),
    ])
    expect(steps.map((s) => s.kind)).toEqual(['assistant', 'tool'])
    const tool = steps[1]
    if (tool.kind !== 'tool') throw new Error('expected tool step')
    expect(tool.toolName).toBe('command_execution')
    expect(tool.input).toEqual({ command: 'ls' })
    expect(tool.resultType).toBe('success')
    expect(tool.result).toEqual({ output: 'a\nb', exitCode: 0 })
  })

  it('Codex MCP tool: pairs mcp_tool_call by item.id, names it from item.tool, internal origin, unwraps result content', () => {
    const steps = normalizeCliTranscript([
      entry({
        at: 1,
        kind: 'tool-call',
        payload: {
          type: 'item.started',
          item: {
            id: 'item_3',
            type: 'mcp_tool_call',
            server: 'thefactory',
            tool: 'searchKnowledgeMap',
            arguments: { query: 'slug' },
            status: 'in_progress',
          },
        },
      }),
      entry({
        at: 2,
        kind: 'tool-result',
        payload: {
          type: 'item.completed',
          item: {
            id: 'item_3',
            type: 'mcp_tool_call',
            server: 'thefactory',
            tool: 'searchKnowledgeMap',
            result: { content: [{ type: 'text', text: '[{"itemId":"l2_x"}]' }] },
            status: 'completed',
          },
        },
      }),
    ])
    expect(steps.length).toBe(1)
    const tool = steps[0]
    if (tool.kind !== 'tool') throw new Error('expected tool step')
    expect(tool.toolName).toBe('searchKnowledgeMap')
    expect(tool.origin).toBe('internal')
    expect(tool.toolCallId).toBe('item_3')
    expect(tool.input).toEqual({ query: 'slug' })
    expect(tool.resultType).toBe('success')
    expect(tool.result).toEqual([{ itemId: 'l2_x' }])
  })

  it('Codex MCP tool: a non-thefactory server is external-mcp, and failed status marks errored', () => {
    const steps = normalizeCliTranscript([
      entry({
        at: 1,
        kind: 'tool-call',
        payload: {
          item: {
            id: 'i9',
            type: 'mcp_tool_call',
            server: 'github',
            tool: 'create_issue',
            arguments: {},
          },
        },
      }),
      entry({
        at: 2,
        kind: 'tool-result',
        payload: {
          item: {
            id: 'i9',
            type: 'mcp_tool_call',
            server: 'github',
            tool: 'create_issue',
            result: { content: [{ type: 'text', text: 'boom' }] },
            status: 'failed',
          },
        },
      }),
    ])
    const tool = steps[0]
    if (tool.kind !== 'tool') throw new Error('expected tool step')
    expect(tool.origin).toBe('external-mcp')
    expect(tool.resultType).toBe('errored')
  })

  it('Codex file_change: renders as a file_change tool step paired by item.id', () => {
    const steps = normalizeCliTranscript([
      entry({
        at: 1,
        kind: 'tool-call',
        payload: {
          item: {
            id: 'fc1',
            type: 'file_change',
            changes: [{ path: '/workspace/a.ts', kind: 'update' }],
            status: 'in_progress',
          },
        },
      }),
      entry({
        at: 2,
        kind: 'tool-result',
        payload: {
          item: {
            id: 'fc1',
            type: 'file_change',
            changes: [{ path: '/workspace/a.ts', kind: 'update' }],
            status: 'completed',
          },
        },
      }),
    ])
    expect(steps.length).toBe(1)
    const tool = steps[0]
    if (tool.kind !== 'tool') throw new Error('expected tool step')
    expect(tool.toolName).toBe('file_change')
    expect(tool.origin).toBe('native')
    expect(tool.input).toEqual({ changes: [{ path: '/workspace/a.ts', kind: 'update' }] })
  })

  it('Codex: non-zero exit_code marks the tool step errored', () => {
    const steps = normalizeCliTranscript([
      entry({
        at: 1,
        kind: 'tool-call',
        payload: { item: { id: 'i9', type: 'command_execution', command: 'false' } },
      }),
      entry({
        at: 2,
        kind: 'tool-result',
        payload: {
          item: { id: 'i9', type: 'command_execution', aggregated_output: '', exit_code: 1 },
        },
      }),
    ])
    const tool = steps[0]
    if (tool.kind !== 'tool') throw new Error('expected tool step')
    expect(tool.resultType).toBe('errored')
  })

  it('emits a standalone tool step for an orphan result, and a running step for an unmatched call', () => {
    const steps = normalizeCliTranscript([
      entry({ at: 1, kind: 'tool-call', payload: { name: 'doThing', id: 'x1', input: { a: 1 } } }),
      entry({ at: 2, kind: 'tool-result', payload: { id: 'other', result: { z: 9 } } }),
    ])
    expect(steps.length).toBe(2)
    const running = steps[0]
    const orphan = steps[1]
    if (running.kind !== 'tool' || orphan.kind !== 'tool') throw new Error('expected tool steps')
    // An unmatched call is in-flight → running (CLI tools run when called).
    expect(running.resultType).toBe('running')
    expect(orphan.result).toEqual({ z: 9 })
  })

  it('tags each tool step with its origin (internal MCP / native CLI / external MCP)', () => {
    const steps = normalizeCliTranscript([
      // Claude: our MCP tool → internal.
      entry({
        at: 1,
        kind: 'tool-call',
        payload: {
          message: {
            content: [{ type: 'tool_use', id: 'a', name: 'mcp__thefactory__readPaths', input: {} }],
          },
        },
      }),
      // Claude: native built-in → native.
      entry({
        at: 2,
        kind: 'tool-call',
        payload: {
          message: {
            content: [{ type: 'tool_use', id: 'b', name: 'Bash', input: { command: 'ls' } }],
          },
        },
      }),
      // Codex command_execution → native.
      entry({
        at: 3,
        kind: 'tool-call',
        payload: { item: { id: 'c', type: 'command_execution', command: 'ls' } },
      }),
      // Cursor wraps a non-thefactory MCP server → external-mcp.
      entry({
        at: 4,
        kind: 'tool-call',
        payload: {
          type: 'tool_call',
          call_id: 'd',
          tool_call: {
            mcpToolCall: { toolName: 'create_issue', args: {}, providerIdentifier: 'github' },
          },
        },
      }),
    ])
    const origins = steps.map((s) => (s.kind === 'tool' ? s.origin : null))
    expect(origins).toEqual(['internal', 'native', 'native', 'external-mcp'])
  })

  it('records per-step durations: tool call→result time, and gap-to-next for others', () => {
    const steps = normalizeCliTranscript([
      entry({
        at: 1000,
        kind: 'assistant',
        payload: { message: { content: [{ type: 'text', text: 'hi' }] } },
      }),
      entry({ at: 1500, kind: 'tool-call', payload: { name: 'doThing', id: 'x1', input: {} } }),
      entry({ at: 4000, kind: 'tool-result', payload: { id: 'x1', result: { ok: true } } }),
    ])
    // assistant: gap to the next step (1500 - 1000).
    expect(steps[0].durationMs).toBe(500)
    // tool: precise call→result time (4000 - 1500), not a gap.
    expect(steps[1].durationMs).toBe(2500)
  })

  it('leaves the trailing step open (no duration) so the live view can run a timer', () => {
    const steps = normalizeCliTranscript([
      entry({ at: 1, kind: 'tool-call', payload: { name: 'doThing', id: 'x1', input: {} } }),
    ])
    expect(steps[0].durationMs).toBeUndefined()
  })

  it('Cursor MCP tool: reads the call echo nested under mcpToolCall.args and the result from its sibling .result (the real cursor stream-json shape)', () => {
    // Cursor's real shape: the call metadata is a `.args` ECHO (carrying
    // providerIdentifier/toolName and, deeper, the real call args at `.args`)
    // and the result is a SIBLING at `mcpToolCall.result`. The previous fixture
    // modelled a flat shape that never occurs, hiding the result-rendering bug.
    const echo = {
      name: 'thefactory-listContents',
      args: { path: '.' },
      toolCallId: 'tool_e8',
      providerIdentifier: 'thefactory',
      toolName: 'listContents',
      smartModeApprovalOnly: false,
      skipApproval: false,
    }
    const steps = normalizeCliTranscript([
      entry({
        at: 1,
        kind: 'tool-call',
        payload: {
          type: 'tool_call',
          subtype: 'started',
          call_id: 'tool_e8',
          tool_call: { mcpToolCall: { args: echo } },
        },
      }),
      entry({
        at: 2,
        kind: 'tool-result',
        payload: {
          type: 'tool_call',
          subtype: 'completed',
          call_id: 'tool_e8',
          tool_call: {
            mcpToolCall: {
              args: echo,
              result: { success: { content: [{ text: { text: '["a","b"]' } }], isError: false } },
            },
          },
        },
      }),
    ])
    expect(steps.length).toBe(1)
    const tool = steps[0]
    if (tool.kind !== 'tool') throw new Error('expected tool step')
    expect(tool.toolName).toBe('listContents')
    expect(tool.origin).toBe('internal')
    // The real call args are the echo's `.args`, not the echo itself.
    expect(tool.input).toEqual({ path: '.' })
    expect(tool.resultType).toBe('success')
    // Regression: the result is the unwrapped tool output, NOT the call echo.
    expect(tool.result).toEqual(['a', 'b'])
    expect(tool.result).not.toMatchObject({ providerIdentifier: 'thefactory' })
  })

  it('flat MCP envelope: reads toolName/args/toolCallId and unwraps a success/content result', () => {
    const steps = normalizeCliTranscript([
      entry({
        at: 1,
        kind: 'tool-call',
        payload: {
          name: 'thefactory-listContents',
          toolName: 'listContents',
          args: { path: '.' },
          toolCallId: 'tc1',
          providerIdentifier: 'thefactory',
        },
      }),
      entry({
        at: 2,
        kind: 'tool-result',
        payload: {
          toolCallId: 'tc1',
          success: { content: [{ text: { text: '["x"]' } }], isError: false },
        },
      }),
    ])
    expect(steps.length).toBe(1)
    const tool = steps[0]
    if (tool.kind !== 'tool') throw new Error('expected tool step')
    expect(tool.toolName).toBe('listContents')
    expect(tool.input).toEqual({ path: '.' })
    expect(tool.result).toEqual(['x'])
  })

  it('surfaces a thinking block that precedes a tool call in the same message', () => {
    const steps = normalizeCliTranscript([
      entry({
        at: 1,
        kind: 'tool-call',
        payload: {
          message: {
            content: [
              { type: 'thinking', thinking: 'plan it' },
              { type: 'tool_use', id: 't1', name: 'readPaths', input: { paths: ['a'] } },
            ],
          },
        },
      }),
    ])
    expect(steps.map((s) => s.kind)).toEqual(['thinking', 'tool'])
    expect(steps[0]).toMatchObject({ kind: 'thinking', text: 'plan it' })
  })

  it('converts a transcript to API-shaped chat messages (assistant + tool), skipping protocol', () => {
    const messages = cliTranscriptToMessages(
      [
        entry({ at: 1000, kind: 'system', payload: { type: 'system', subtype: 'init' } }),
        entry({
          at: 1500,
          kind: 'assistant',
          payload: { message: { content: [{ type: 'text', text: 'reading' }] } },
        }),
        entry({
          at: 2000,
          kind: 'tool-call',
          payload: {
            message: {
              content: [
                {
                  type: 'tool_use',
                  id: 't1',
                  name: 'mcp__thefactory__readPaths',
                  input: { paths: ['a'] },
                },
              ],
            },
          },
        }),
        entry({
          at: 3000,
          kind: 'tool-result',
          payload: {
            message: {
              content: [{ type: 'tool_result', tool_use_id: 't1', content: '{"ok":true}' }],
            },
          },
        }),
        entry({ at: 3500, kind: 'result', payload: { type: 'result', subtype: 'success' } }),
      ],
      { model: 'cli-agent/cursor/composer' },
    )
    // system + result dropped; assistant + one merged tool message remain.
    expect(messages.map((m) => m.role)).toEqual(['assistant', 'tool'])
    expect(messages[0]).toMatchObject({
      role: 'assistant',
      content: 'reading',
      model: 'cli-agent/cursor/composer',
    })
    expect(messages[1]).toMatchObject({
      role: 'tool',
      toolCall: { toolCallId: 't1', name: 'readPaths', arguments: { paths: ['a'] } },
      toolResult: { type: 'success', result: { ok: true } },
    })
  })

  it('re-types an in-flight tool the run is blocked on as require_confirmation', () => {
    const messages = cliTranscriptToMessages(
      [
        entry({
          at: 1,
          kind: 'tool-call',
          payload: {
            message: {
              content: [{ type: 'tool_use', id: 't1', name: 'inspectProjectPath', input: {} }],
            },
          },
        }),
      ],
      { awaitingApprovalToolNames: ['inspectProjectPath'] },
    )
    expect(messages[0].toolResult?.type).toBe('require_confirmation')
  })

  it('leaves an in-flight tool nobody is waiting on as running', () => {
    const messages = cliTranscriptToMessages(
      [
        entry({
          at: 1,
          kind: 'tool-call',
          payload: {
            message: { content: [{ type: 'tool_use', id: 't1', name: 'readPaths', input: {} }] },
          },
        }),
      ],
      { awaitingApprovalToolNames: ['inspectProjectPath'] },
    )
    expect(messages[0].toolResult?.type).toBe('running')
  })

  it('leaves a completed tool alone even when its name matches a pending approval', () => {
    const messages = cliTranscriptToMessages(
      [
        entry({
          at: 1,
          kind: 'tool-call',
          payload: {
            message: {
              content: [{ type: 'tool_use', id: 't1', name: 'inspectProjectPath', input: {} }],
            },
          },
        }),
        entry({
          at: 2,
          kind: 'tool-result',
          payload: {
            message: {
              content: [{ type: 'tool_result', tool_use_id: 't1', content: '{"ok":true}' }],
            },
          },
        }),
      ],
      { awaitingApprovalToolNames: ['inspectProjectPath'] },
    )
    expect(messages[0].toolResult?.type).toBe('success')
  })

  it('propagates the tool origin onto the derived tool message', () => {
    const messages = cliTranscriptToMessages([
      entry({
        at: 1,
        kind: 'tool-call',
        payload: {
          message: {
            content: [{ type: 'tool_use', id: 't1', name: 'Bash', input: { command: 'ls' } }],
          },
        },
      }),
    ])
    expect(messages[0]).toMatchObject({
      role: 'tool',
      toolCall: { name: 'Bash', origin: 'native' },
    })
  })

  it('aggregates per-entry cost onto the (coalesced) assistant message as usage', () => {
    const messages = cliTranscriptToMessages([
      entry({
        at: 1000,
        kind: 'assistant',
        payload: { message: { content: [{ type: 'text', text: 'hi' }] } },
        costUSD: 0.02,
      }),
      entry({
        at: 2000,
        kind: 'assistant',
        payload: { message: { content: [{ type: 'text', text: 'bye' }] } },
        costUSD: 0.03,
      }),
    ])
    // Consecutive assistant deltas coalesce into ONE bubble; the run total (summed
    // across every entry's cost, not just the merged ones) lands on it as the chip anchor.
    expect(messages).toHaveLength(1)
    expect(messages[0].content).toBe('hibye')
    expect(messages[0].usage).toEqual({ cost: 0.05 })
  })

  it('attaches no usage when the run reported no cost', () => {
    const messages = cliTranscriptToMessages([
      entry({
        at: 1,
        kind: 'assistant',
        payload: { message: { content: [{ type: 'text', text: 'hi' }] } },
      }),
    ])
    expect(messages[0].usage).toBeUndefined()
  })

  it('maps a thinking step to an assistant message carrying `thinking`', () => {
    const messages = cliTranscriptToMessages([
      entry({
        at: 1,
        kind: 'assistant',
        payload: { message: { content: [{ type: 'thinking', thinking: 'hmm' }] } },
      }),
    ])
    expect(messages).toHaveLength(1)
    expect(messages[0]).toMatchObject({ role: 'assistant', content: 'hmm', thinking: 'hmm' })
  })

  it('summarizes system + result entries and falls back to raw for other', () => {
    const steps = normalizeCliTranscript([
      entry({
        at: 1,
        kind: 'system',
        payload: { type: 'system', subtype: 'init', model: 'Composer 2' },
      }),
      entry({
        at: 2,
        kind: 'result',
        payload: { type: 'result', subtype: 'success', duration_ms: 2500 },
      }),
      entry({ at: 3, kind: 'other', payload: { weird: true } }),
    ])
    expect(steps[0]).toMatchObject({ kind: 'system', summary: 'Session started · Composer 2' })
    expect(steps[1]).toMatchObject({ kind: 'result', summary: 'Completed in 2.5s' })
    expect(steps[2].kind).toBe('raw')
  })
})

describe('shortCliModelLabel', () => {
  it('shortens the documented cases', () => {
    expect(shortCliModelLabel('Auto (Cursor picks per turn)')).toBe('Auto')
    expect(shortCliModelLabel('Claude Opus (alias for latest)')).toBe('Opus latest')
    expect(shortCliModelLabel('Claude Sonnet (alias for latest)')).toBe('Sonnet latest')
    expect(shortCliModelLabel('Claude Sonnet 4.6')).toBe('Sonnet 4.6')
    expect(shortCliModelLabel('Claude Opus 4.8')).toBe('Opus 4.8')
    expect(shortCliModelLabel('Composer 2.5 Fast — account default')).toBe('Composer 2.5 Fast')
    expect(shortCliModelLabel('Composer 2.5 Fast - account default')).toBe('Composer 2.5 Fast')
  })

  it('leaves already-short labels untouched', () => {
    expect(shortCliModelLabel('Composer 2.5 Fast')).toBe('Composer 2.5 Fast')
    expect(shortCliModelLabel('GPT-5.5 1M')).toBe('GPT-5.5 1M')
    expect(shortCliModelLabel('auto')).toBe('auto')
  })
})

describe('cliLabel / cliDotColor', () => {
  it('labels and colours each CLI by brand', () => {
    expect(cliLabel('claude-code')).toBe('Claude Code')
    expect(cliLabel('cursor-agent')).toBe('Cursor')
    expect(cliLabel('codex')).toBe('Codex')
    expect(cliLabel('')).toBe('')
    expect(cliDotColor('claude-code')).toBe('#D97757')
    expect(cliDotColor('codex')).toBe('#8E8E93')
    expect(cliDotColor('cursor-agent')).toBe('#000000')
    expect(cliDotColor(undefined)).toBe('#8E8E93')
  })
})

describe('parseCliAgentModelTag', () => {
  it('parses cli + modelId from a cli-agent tag', () => {
    expect(parseCliAgentModelTag('cli-agent/codex/gpt-5.5')).toEqual({
      cli: 'codex',
      modelId: 'gpt-5.5',
    })
    expect(parseCliAgentModelTag('cli-agent/claude-code/claude-opus-4-8-high')).toEqual({
      cli: 'claude-code',
      modelId: 'claude-opus-4-8-high',
    })
  })

  it('returns cli with no modelId when the trailing segment is empty', () => {
    expect(parseCliAgentModelTag('cli-agent/cursor-agent/')).toEqual({ cli: 'cursor-agent' })
  })

  it('returns null for non-CLI model strings', () => {
    expect(parseCliAgentModelTag('claude-sonnet-4-6')).toBeNull()
    expect(parseCliAgentModelTag('')).toBeNull()
    expect(parseCliAgentModelTag(undefined)).toBeNull()
  })
})

describe('messageModelTag', () => {
  it('returns a string tag as-is and unwraps the object form', () => {
    expect(messageModelTag('cli-agent/cursor/composer')).toBe('cli-agent/cursor/composer')
    expect(messageModelTag({ provider: 'custom', model: 'cli-agent/codex/gpt-5.5' } as never)).toBe(
      'cli-agent/codex/gpt-5.5',
    )
  })

  it('returns undefined for missing / malformed model', () => {
    expect(messageModelTag(undefined)).toBeUndefined()
    expect(messageModelTag(null)).toBeUndefined()
    expect(messageModelTag({} as never)).toBeUndefined()
  })
})

describe('parseCliRunUpdateEvent', () => {
  it('extracts assistant text from a transcriptAppend event', () => {
    expect(
      parseCliRunUpdateEvent({
        runId: 'r1',
        type: 'transcriptAppend',
        event: {
          entry: {
            at: 1,
            kind: 'assistant',
            payload: { message: { content: [{ type: 'text', text: 'hi' }] } },
          },
        },
      }),
    ).toEqual({ runId: 'r1', kind: 'transcript', text: 'hi' })
  })

  it('marks finished and error events as terminal with status (+ error detail)', () => {
    // A finished event with no result defaults to succeeded.
    expect(parseCliRunUpdateEvent({ runId: 'r1', type: 'finished', event: {} })).toEqual({
      runId: 'r1',
      kind: 'terminal',
      status: 'succeeded',
    })
    // A finished event carries the run's terminal status + humanizable failure.
    expect(
      parseCliRunUpdateEvent({
        runId: 'r1',
        type: 'finished',
        event: { result: { status: 'errored', failure: { message: 'boom' } } },
      }),
    ).toEqual({ runId: 'r1', kind: 'terminal', status: 'errored', error: 'boom' })
    // An aborted run surfaces its abortReason when there's no classified failure.
    expect(
      parseCliRunUpdateEvent({
        runId: 'r1',
        type: 'finished',
        event: { result: { status: 'aborted', abortReason: 'user aborted' } },
      }),
    ).toEqual({ runId: 'r1', kind: 'terminal', status: 'aborted', error: 'user aborted' })
    // An `error` event is always errored, carrying its message.
    expect(
      parseCliRunUpdateEvent({ runId: 'r1', type: 'error', event: { error: 'kaboom' } }),
    ).toEqual({ runId: 'r1', kind: 'terminal', status: 'errored', error: 'kaboom' })
  })

  it('returns kind:other for unrelated run events and null for malformed payloads', () => {
    expect(parseCliRunUpdateEvent({ runId: 'r1', type: 'statusChanged', event: {} })).toMatchObject(
      {
        kind: 'other',
      },
    )
    expect(parseCliRunUpdateEvent(null)).toBeNull()
    expect(parseCliRunUpdateEvent({ type: 'finished' })).toBeNull()
    expect(parseCliRunUpdateEvent({ runId: 'r1' })).toBeNull()
  })
})

describe('filesEmittedArtifactOf', () => {
  it('finds the files-emitted artifact among others', () => {
    const artifacts = [
      { id: 'c1', kind: 'proposed-commit', at: 1, payload: { paths: [], message: 'm' } },
      { id: 'f1', kind: 'files-emitted', at: 2, payload: { files: [] } },
    ] as never
    expect(filesEmittedArtifactOf(artifacts)?.id).toBe('f1')
  })

  it('returns undefined for runs with no files-emitted artifact', () => {
    expect(filesEmittedArtifactOf([])).toBeUndefined()
    expect(filesEmittedArtifactOf(undefined)).toBeUndefined()
  })
})

describe('deriveCliAuthWarning', () => {
  it('no warning when no credential is selected', () => {
    expect(deriveCliAuthWarning(null, [])).toEqual({ needsReauth: false })
    expect(deriveCliAuthWarning(undefined, [])).toEqual({ needsReauth: false })
  })

  it('no warning when the credential is not in the list (unknown)', () => {
    expect(deriveCliAuthWarning('c1', [{ id: 'c2' }])).toEqual({ needsReauth: false })
  })

  it('no warning when the credential has never been checked (authStatus absent)', () => {
    expect(deriveCliAuthWarning('c1', [{ id: 'c1' }])).toEqual({ needsReauth: false })
  })

  it('no warning when the credential is authenticated', () => {
    expect(deriveCliAuthWarning('c1', [{ id: 'c1', authStatus: { authenticated: true } }])).toEqual(
      { needsReauth: false },
    )
  })

  it('warns (with reason + message) when the credential is explicitly unauthenticated', () => {
    expect(
      deriveCliAuthWarning('c1', [
        {
          id: 'c1',
          authStatus: {
            authenticated: false,
            reason: 'auth-expired',
            message: 'Authentication required.',
          },
        },
      ]),
    ).toEqual({ needsReauth: true, reason: 'auth-expired', message: 'Authentication required.' })
  })

  it('warns without optional fields when they are absent', () => {
    expect(
      deriveCliAuthWarning('c1', [{ id: 'c1', authStatus: { authenticated: false } }]),
    ).toEqual({ needsReauth: true })
  })
})

describe('normalizeCliTranscript — cursor over ACP', () => {
  it('interleaves text and tool calls in the order they happened', () => {
    const steps = normalizeCliTranscript([
      entry({
        at: 1,
        kind: 'assistant',
        payload: { message: { content: [{ type: 'text', text: 'Reading the manifest.' }] } },
      }),
      entry({
        at: 2,
        kind: 'tool-call',
        payload: {
          acp: {
            sessionUpdate: 'tool_call',
            toolCallId: 'tc-1',
            title: 'Read file',
            rawInput: { path: 'README.md' },
          },
        },
      }),
      entry({
        at: 3,
        kind: 'assistant',
        payload: { message: { content: [{ type: 'text', text: 'Now editing.' }] } },
      }),
    ])

    // This ordering IS the account of what the agent did.
    expect(steps.map((s) => s.kind)).toEqual(['assistant', 'tool', 'assistant'])
    expect(steps[1]).toMatchObject({ toolName: 'Read file', toolCallId: 'tc-1' })
    expect(steps[0]).toMatchObject({ text: 'Reading the manifest.' })
    expect(steps[2]).toMatchObject({ text: 'Now editing.' })
  })

  it('names the tool from rawInput when the ACP update carries one', () => {
    const steps = normalizeCliTranscript([
      entry({
        at: 1,
        kind: 'tool-call',
        payload: {
          acp: { toolCallId: 't', title: 'MCP', rawInput: { name: 'inspectProjectPath' } },
        },
      }),
    ])
    expect(steps[0]).toMatchObject({ toolName: 'inspectProjectPath' })
  })

  it('still shows a row when the update names the tool no way we expect', () => {
    // Requiring an exact shape is how cursor's tool calls went missing entirely.
    const steps = normalizeCliTranscript([
      entry({ at: 1, kind: 'tool-call', payload: { acp: { sessionUpdate: 'tool_call' } } }),
    ])
    expect(steps).toHaveLength(1)
    expect(steps[0].kind).toBe('tool')
  })

  it('reads reasoning emitted as a thinking block', () => {
    const steps = normalizeCliTranscript([
      entry({
        at: 1,
        kind: 'assistant',
        payload: { message: { content: [{ type: 'thinking', thinking: 'check the manifest' }] } },
      }),
    ])
    expect(steps[0]).toMatchObject({ kind: 'thinking', text: 'check the manifest' })
  })
})

describe('normalizeCliTranscript — streamed reasoning and ACP tool results', () => {
  const think = (at: number, text: string) =>
    entry({
      at,
      kind: 'assistant',
      payload: { message: { content: [{ type: 'thinking', thinking: text }] } },
    })

  it('coalesces streamed reasoning into ONE thought, not a column of fragments', () => {
    const steps = normalizeCliTranscript([
      think(1, 'I need to inspect how '),
      think(2, 'the app handles other '),
      think(3, 'fonts.'),
    ])
    expect(steps).toHaveLength(1)
    expect(steps[0]).toMatchObject({
      kind: 'thinking',
      text: 'I need to inspect how the app handles other fonts.',
    })
  })

  it('starts a new thought after something else happened in between', () => {
    const steps = normalizeCliTranscript([
      think(1, 'first thought'),
      entry({ at: 2, kind: 'tool-call', payload: { acp: { toolCallId: 't1', title: 'Read' } } }),
      think(3, 'second thought'),
    ])
    expect(steps.map((s) => s.kind)).toEqual(['thinking', 'tool', 'thinking'])
  })

  it('resolves a tool when its ACP update reports completion', () => {
    const steps = normalizeCliTranscript([
      entry({
        at: 1,
        kind: 'tool-call',
        payload: { acp: { toolCallId: 't1', title: 'Read file' } },
      }),
      entry({
        at: 5,
        kind: 'tool-result',
        payload: { acp: { toolCallId: 't1', status: 'completed', rawOutput: 'file contents' } },
      }),
    ])
    expect(steps).toHaveLength(1)
    expect(steps[0]).toMatchObject({ kind: 'tool', resultType: 'success', durationMs: 4 })
  })

  it('marks a failed tool as errored', () => {
    const steps = normalizeCliTranscript([
      entry({ at: 1, kind: 'tool-call', payload: { acp: { toolCallId: 't1', title: 'Read' } } }),
      entry({
        at: 2,
        kind: 'tool-result',
        payload: { acp: { toolCallId: 't1', status: 'failed' } },
      }),
    ])
    expect(steps[0]).toMatchObject({ resultType: 'errored' })
  })

  it('leaves the spinner alone for a progress update — in_progress is not done', () => {
    const steps = normalizeCliTranscript([
      entry({ at: 1, kind: 'tool-call', payload: { acp: { toolCallId: 't1', title: 'Read' } } }),
      entry({
        at: 2,
        kind: 'tool-result',
        payload: { acp: { toolCallId: 't1', status: 'in_progress' } },
      }),
    ])
    expect(steps).toHaveLength(1)
    expect(steps[0]).toMatchObject({ resultType: 'running' })
    // A duration would render as "finished in 1ms" under a live spinner.
    expect((steps[0] as { durationMs?: number }).durationMs).toBeUndefined()
  })

  it('does not invent a bare tool row from a non-terminal update with no matching call', () => {
    const steps = normalizeCliTranscript([
      entry({
        at: 1,
        kind: 'tool-result',
        payload: { acp: { toolCallId: 'x', status: 'pending' } },
      }),
    ])
    expect(steps).toHaveLength(0)
  })
})

describe('a gated call that returned "pending" reads as waiting, not finished', () => {
  it('marks the step awaiting approval from the tool result alone', () => {
    const steps = normalizeCliTranscript([
      entry({
        at: 1,
        kind: 'tool-call',
        payload: { acp: { toolCallId: 't1', title: 'startFeatureWork' } },
      }),
      entry({
        at: 2,
        kind: 'tool-result',
        payload: {
          acp: {
            toolCallId: 't1',
            status: 'completed',
            rawOutput: { outcome: 'pending', retryAfterSec: 30 },
          },
        },
      }),
    ])

    // The agent announced "waiting for your approval" while the row showed a
    // finished call — the transcript already knew, nothing was reading it.
    expect(steps).toHaveLength(1)
    expect(steps[0]).toMatchObject({ kind: 'tool', awaitingApproval: true })
    expect((steps[0] as { resultType: string }).resultType).not.toBe('success')
  })

  it('reads a pending result delivered as a JSON string', () => {
    expect(isAwaitingApprovalResult(JSON.stringify({ outcome: 'pending' }))).toBe(true)
  })

  it('leaves an ordinary result alone', () => {
    expect(isAwaitingApprovalResult({ ok: true })).toBe(false)
    expect(isAwaitingApprovalResult('plain text')).toBe(false)
    expect(isAwaitingApprovalResult(undefined)).toBe(false)
  })
})

// ──────────────────────────────────────────────────────────────────────────
// Cursor/ACP tool identity
//
// Fixtures are the shapes a real cursor-agent resident run recorded: the
// opening `tool_call` is an unnamed placeholder and the tool is only named in
// the `tool_call_update` that follows.
// ──────────────────────────────────────────────────────────────────────────

describe('isPlaceholderCliToolName', () => {
  it('treats the opening ACP title as unidentified', () => {
    expect(isPlaceholderCliToolName('MCP: tool')).toBe(true)
  })

  it('is case- and space-insensitive, since the title is display text', () => {
    expect(isPlaceholderCliToolName('  mcp: TOOL ')).toBe(true)
  })

  it('treats a real tool name as identified', () => {
    expect(isPlaceholderCliToolName('listStories')).toBe(false)
  })

  it('treats a missing name as unidentified', () => {
    expect(isPlaceholderCliToolName(undefined)).toBe(true)
  })
})

describe('isEmptyToolInput', () => {
  it('calls the opening call’s `rawInput: {}` empty', () => {
    expect(isEmptyToolInput({})).toBe(true)
  })

  it('does not call real arguments empty', () => {
    expect(isEmptyToolInput({ a: 1 })).toBe(false)
  })

  it('treats a blank string as empty', () => {
    expect(isEmptyToolInput('  ')).toBe(true)
  })

  it('treats 0 as a real value, not an absent one', () => {
    expect(isEmptyToolInput(0)).toBe(false)
  })
})

describe('acpToolOrigin', () => {
  it('reads our own MCP server off providerIdentifier, which the name never carries', () => {
    expect(acpToolOrigin('thefactory', 'listStories')).toBe('internal')
  })

  it('marks another MCP server as external', () => {
    expect(acpToolOrigin('someone-else', 'doThing')).toBe('external-mcp')
  })

  it('falls back to the name when no provider is given', () => {
    expect(acpToolOrigin(undefined, 'Bash')).toBe('native')
  })
})

describe('normalizeCliTranscript — ACP tool identity', () => {
  const opening = {
    at: 1000,
    kind: 'tool-call' as const,
    payload: {
      acp: {
        sessionUpdate: 'tool_call',
        toolCallId: 'tool_1',
        title: 'MCP: tool',
        kind: 'other',
        status: 'pending',
        rawInput: {},
      },
    },
  }
  const named = (status: string, at = 2000) => ({
    at,
    kind: 'tool-result' as const,
    payload: {
      acp: {
        sessionUpdate: 'tool_call_update',
        toolCallId: 'tool_1',
        title: 'thefactory: listStories',
        status,
        rawInput: { providerIdentifier: 'thefactory', toolName: 'listStories', args: { a: 1 } },
      },
    },
  })

  it('replaces the placeholder name once the update says which tool ran', () => {
    const steps = normalizeCliTranscript([opening, named('completed')])
    const tool = steps.find((s) => s.kind === 'tool')
    expect(tool && tool.kind === 'tool' && tool.toolName).toBe('listStories')
  })

  it('names the tool while it is still RUNNING, not only once it finishes', () => {
    // The reported symptom: rows sat on "MCP: tool" for the whole call.
    const steps = normalizeCliTranscript([opening, named('in_progress')])
    const tool = steps.find((s) => s.kind === 'tool')
    expect(tool && tool.kind === 'tool' && tool.toolName).toBe('listStories')
    expect(tool && tool.kind === 'tool' && tool.resultType).toBe('running')
  })

  it('adopts the arguments the opening call did not have', () => {
    const steps = normalizeCliTranscript([opening, named('completed')])
    const tool = steps.find((s) => s.kind === 'tool')
    expect(tool && tool.kind === 'tool' && tool.input).toEqual({ a: 1 })
  })

  it('badges it as one of ours rather than a CLI built-in', () => {
    const steps = normalizeCliTranscript([opening, named('completed')])
    const tool = steps.find((s) => s.kind === 'tool')
    expect(tool && tool.kind === 'tool' && tool.origin).toBe('internal')
  })

  it('upgrades a generic native tool row to the specific title the update carries', () => {
    // Real payloads: the call opens `Read File` with `rawInput: {}` and the
    // update names the actual file and line range. Showing the opening name is
    // what made a running agent unreadable.
    const call = {
      at: 1000,
      kind: 'tool-call' as const,
      payload: {
        acp: { sessionUpdate: 'tool_call', toolCallId: 't2', title: 'Read File', rawInput: {} },
      },
    }
    const update = {
      at: 2000,
      kind: 'tool-result' as const,
      payload: {
        acp: {
          sessionUpdate: 'tool_call_update',
          toolCallId: 't2',
          title: 'Read app/src/main/java/com/covision/ui/common/CommonUI.kt (1121 - 1370)',
          status: 'completed',
          rawInput: { path: '/workspace/app/src/main/java/com/covision/ui/common/CommonUI.kt' },
        },
      },
    }
    const tool = normalizeCliTranscript([call, update]).find((s) => s.kind === 'tool')
    expect(tool && tool.kind === 'tool' && tool.toolName).toContain('CommonUI.kt')
  })

  it('never lets a later, vaguer update take detail off a row', () => {
    const call = {
      at: 1000,
      kind: 'tool-call' as const,
      payload: {
        acp: {
          sessionUpdate: 'tool_call',
          toolCallId: 't3',
          title: 'grep "fontFamily|FontFamily"',
          rawInput: { pattern: 'fontFamily' },
        },
      },
    }
    const vague = {
      at: 2000,
      kind: 'tool-result' as const,
      payload: {
        acp: {
          sessionUpdate: 'tool_call_update',
          toolCallId: 't3',
          title: 'grep',
          status: 'completed',
        },
      },
    }
    const tool = normalizeCliTranscript([call, vague]).find((s) => s.kind === 'tool')
    expect(tool && tool.kind === 'tool' && tool.toolName).toBe('grep "fontFamily|FontFamily"')
  })
})
