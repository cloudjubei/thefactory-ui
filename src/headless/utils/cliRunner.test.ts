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
  filesEmittedArtifactOf,
  groupCachesByCli,
  loginAwaitsCode,
  parseCliAuthLoginEvent,
  parseCliRunUpdateEvent,
  parseLoginUrl,
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
    })
  })

  it('carries apiKeyCredentialId and omits absent credential', () => {
    expect(chatCliRunnerToDispatchOptions({ tool: 'codex', apiKeyCredentialId: 'llm-1' })).toEqual({
      cli: 'codex',
      apiKeyCredentialId: 'llm-1',
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
    })
  })

  it('forwards execMode so resident mode reaches the dispatch, and omits it when absent', () => {
    expect(
      chatCliRunnerToDispatchOptions({ tool: 'claude-code', credentialId: 'cli-1', execMode: 'resident' }),
    ).toEqual({ cli: 'claude-code', authCredentialId: 'cli-1', execMode: 'resident' })
    expect(chatCliRunnerToDispatchOptions({ tool: 'claude-code', credentialId: 'cli-1' })).not.toHaveProperty(
      'execMode',
    )
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
        event: { loginId: 'login_1', error: "cursor-agent login exited with code 1" },
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
      'Opening browser to sign in…\nIf the browser didn\'t open, visit: https://claude.com/cai/oauth/authorize?code=true&x=1\n'
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
          payload: { message: { content: [{ type: 'text', text: 'Hello ' }, { type: 'text', text: 'world' }] } },
        }),
      ),
    ).toBe('Hello world')
  })

  it("extracts Codex's agent_message item text", () => {
    expect(
      cliAssistantTextFromEntry(
        entry({
          kind: 'assistant',
          payload: { type: 'item.completed', item: { id: 'i0', type: 'agent_message', text: 'codex says hi' } },
        }),
      ),
    ).toBe('codex says hi')
  })

  it('ignores non-text blocks and non-assistant entries', () => {
    expect(
      cliAssistantTextFromEntry(
        entry({
          kind: 'assistant',
          payload: { message: { content: [{ type: 'tool_use', id: 't1' }, { type: 'text', text: 'kept' }] } },
        }),
      ),
    ).toBe('kept')
    expect(cliAssistantTextFromEntry(entry({ kind: 'result', payload: { result: 'final' } }))).toBe('')
    expect(cliAssistantTextFromEntry(entry({ kind: 'assistant', payload: undefined }))).toBe('')
    expect(cliAssistantTextFromEntry(entry({ kind: 'assistant', payload: { message: {} } }))).toBe('')
  })
})

describe('cliToolNameFromEntry', () => {
  it('reads a top-level name', () => {
    expect(cliToolNameFromEntry(entry({ kind: 'tool-call', payload: { name: 'Bash' } }))).toBe('Bash')
  })

  it("reads Claude's nested tool_use block name", () => {
    expect(
      cliToolNameFromEntry(
        entry({
          kind: 'tool-call',
          payload: { message: { content: [{ type: 'text', text: 'x' }, { type: 'tool_use', name: 'Edit' }] } },
        }),
      ),
    ).toBe('Edit')
  })

  it("reads Codex's item type (but not agent_message)", () => {
    expect(
      cliToolNameFromEntry(entry({ kind: 'tool-call', payload: { item: { type: 'command_execution' } } })),
    ).toBe('command_execution')
    expect(
      cliToolNameFromEntry(entry({ kind: 'tool-call', payload: { item: { type: 'agent_message' } } })),
    ).toBeUndefined()
  })

  it('returns undefined when no name is discoverable', () => {
    expect(cliToolNameFromEntry(entry({ kind: 'tool-call', payload: undefined }))).toBeUndefined()
    expect(cliToolNameFromEntry(entry({ kind: 'tool-call', payload: { message: {} } }))).toBeUndefined()
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
          payload: { message: { content: [{ type: 'thinking', thinking: 'let me reason' }, { type: 'text', text: 'answer' }] } },
        }),
      ),
    ).toBe('let me reason')
    expect(
      cliThinkingTextFromEntry(
        entry({ kind: 'assistant', payload: { message: { content: [{ type: 'text', text: 'hi' }] } } }),
      ),
    ).toBe('')
  })
})

describe('normalizeCliTranscript', () => {
  it('Claude: pairs tool_use with its later tool_result by id, keeps assistant prose', () => {
    const steps = normalizeCliTranscript([
      entry({ at: 1, kind: 'assistant', payload: { message: { content: [{ type: 'text', text: 'reading' }] } } }),
      entry({
        at: 2,
        kind: 'tool-call',
        payload: {
          message: { content: [{ type: 'tool_use', id: 'toolu_1', name: 'mcp__thefactory__readPaths', input: { paths: ['a.ts'] } }] },
        },
      }),
      entry({
        at: 3,
        kind: 'tool-result',
        payload: { message: { content: [{ type: 'tool_result', tool_use_id: 'toolu_1', content: '{"ok":true}' }] } },
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
      entry({ at: 1, kind: 'tool-call', payload: { type: 'tool_call', subtype: 'started', call_id: 'c1', tool_call: { readToolCall: { args: { path: '/x' } } } } }),
      entry({
        at: 2,
        kind: 'tool-result',
        payload: { type: 'tool_call', subtype: 'completed', call_id: 'c1', tool_call: { readToolCall: { args: { path: '/x' }, result: { success: { content: 'hi' } } } } },
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
      entry({ at: 1, kind: 'assistant', payload: { item: { type: 'agent_message', text: 'done' } } }),
      entry({ at: 2, kind: 'tool-call', payload: { type: 'item.started', item: { id: 'item_1', type: 'command_execution', command: 'ls' } } }),
      entry({
        at: 3,
        kind: 'tool-result',
        payload: { type: 'item.completed', item: { id: 'item_1', type: 'command_execution', command: 'ls', aggregated_output: 'a\nb', exit_code: 0 } },
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
      entry({ at: 1, kind: 'tool-call', payload: { type: 'item.started', item: { id: 'item_3', type: 'mcp_tool_call', server: 'thefactory', tool: 'searchKnowledgeMap', arguments: { query: 'slug' }, status: 'in_progress' } } }),
      entry({ at: 2, kind: 'tool-result', payload: { type: 'item.completed', item: { id: 'item_3', type: 'mcp_tool_call', server: 'thefactory', tool: 'searchKnowledgeMap', result: { content: [{ type: 'text', text: '[{"itemId":"l2_x"}]' }] }, status: 'completed' } } }),
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
      entry({ at: 1, kind: 'tool-call', payload: { item: { id: 'i9', type: 'mcp_tool_call', server: 'github', tool: 'create_issue', arguments: {} } } }),
      entry({ at: 2, kind: 'tool-result', payload: { item: { id: 'i9', type: 'mcp_tool_call', server: 'github', tool: 'create_issue', result: { content: [{ type: 'text', text: 'boom' }] }, status: 'failed' } } }),
    ])
    const tool = steps[0]
    if (tool.kind !== 'tool') throw new Error('expected tool step')
    expect(tool.origin).toBe('external-mcp')
    expect(tool.resultType).toBe('errored')
  })

  it('Codex file_change: renders as a file_change tool step paired by item.id', () => {
    const steps = normalizeCliTranscript([
      entry({ at: 1, kind: 'tool-call', payload: { item: { id: 'fc1', type: 'file_change', changes: [{ path: '/workspace/a.ts', kind: 'update' }], status: 'in_progress' } } }),
      entry({ at: 2, kind: 'tool-result', payload: { item: { id: 'fc1', type: 'file_change', changes: [{ path: '/workspace/a.ts', kind: 'update' }], status: 'completed' } } }),
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
      entry({ at: 1, kind: 'tool-call', payload: { item: { id: 'i9', type: 'command_execution', command: 'false' } } }),
      entry({ at: 2, kind: 'tool-result', payload: { item: { id: 'i9', type: 'command_execution', aggregated_output: '', exit_code: 1 } } }),
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
      entry({ at: 1, kind: 'tool-call', payload: { message: { content: [{ type: 'tool_use', id: 'a', name: 'mcp__thefactory__readPaths', input: {} }] } } }),
      // Claude: native built-in → native.
      entry({ at: 2, kind: 'tool-call', payload: { message: { content: [{ type: 'tool_use', id: 'b', name: 'Bash', input: { command: 'ls' } }] } } }),
      // Codex command_execution → native.
      entry({ at: 3, kind: 'tool-call', payload: { item: { id: 'c', type: 'command_execution', command: 'ls' } } }),
      // Cursor wraps a non-thefactory MCP server → external-mcp.
      entry({
        at: 4,
        kind: 'tool-call',
        payload: { type: 'tool_call', call_id: 'd', tool_call: { mcpToolCall: { toolName: 'create_issue', args: {}, providerIdentifier: 'github' } } },
      }),
    ])
    const origins = steps.map((s) => (s.kind === 'tool' ? s.origin : null))
    expect(origins).toEqual(['internal', 'native', 'native', 'external-mcp'])
  })

  it('records per-step durations: tool call→result time, and gap-to-next for others', () => {
    const steps = normalizeCliTranscript([
      entry({ at: 1000, kind: 'assistant', payload: { message: { content: [{ type: 'text', text: 'hi' }] } } }),
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

  it("Cursor MCP tool: reads the call echo nested under mcpToolCall.args and the result from its sibling .result (the real cursor stream-json shape)", () => {
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
        payload: { toolCallId: 'tc1', success: { content: [{ text: { text: '["x"]' } }], isError: false } },
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
        entry({ at: 1500, kind: 'assistant', payload: { message: { content: [{ type: 'text', text: 'reading' }] } } }),
        entry({
          at: 2000,
          kind: 'tool-call',
          payload: { message: { content: [{ type: 'tool_use', id: 't1', name: 'mcp__thefactory__readPaths', input: { paths: ['a'] } }] } },
        }),
        entry({
          at: 3000,
          kind: 'tool-result',
          payload: { message: { content: [{ type: 'tool_result', tool_use_id: 't1', content: '{"ok":true}' }] } },
        }),
        entry({ at: 3500, kind: 'result', payload: { type: 'result', subtype: 'success' } }),
      ],
      { model: 'cli-agent/cursor/composer' },
    )
    // system + result dropped; assistant + one merged tool message remain.
    expect(messages.map((m) => m.role)).toEqual(['assistant', 'tool'])
    expect(messages[0]).toMatchObject({ role: 'assistant', content: 'reading', model: 'cli-agent/cursor/composer' })
    expect(messages[1]).toMatchObject({
      role: 'tool',
      toolCall: { toolCallId: 't1', name: 'readPaths', arguments: { paths: ['a'] } },
      toolResult: { type: 'success', result: { ok: true } },
    })
  })

  it('propagates the tool origin onto the derived tool message', () => {
    const messages = cliTranscriptToMessages([
      entry({ at: 1, kind: 'tool-call', payload: { message: { content: [{ type: 'tool_use', id: 't1', name: 'Bash', input: { command: 'ls' } }] } } }),
    ])
    expect(messages[0]).toMatchObject({ role: 'tool', toolCall: { name: 'Bash', origin: 'native' } })
  })

  it('aggregates per-entry cost onto the first assistant message as usage', () => {
    const messages = cliTranscriptToMessages([
      entry({ at: 1000, kind: 'assistant', payload: { message: { content: [{ type: 'text', text: 'hi' }] } }, costUSD: 0.02 }),
      entry({ at: 2000, kind: 'assistant', payload: { message: { content: [{ type: 'text', text: 'bye' }] } }, costUSD: 0.03 }),
    ])
    // Only the first assistant message carries the run total (the chip anchor).
    expect(messages[0].usage).toEqual({ cost: 0.05 })
    expect(messages[1].usage).toBeUndefined()
  })

  it('attaches no usage when the run reported no cost', () => {
    const messages = cliTranscriptToMessages([
      entry({ at: 1, kind: 'assistant', payload: { message: { content: [{ type: 'text', text: 'hi' }] } } }),
    ])
    expect(messages[0].usage).toBeUndefined()
  })

  it('maps a thinking step to an assistant message carrying `thinking`', () => {
    const messages = cliTranscriptToMessages([
      entry({ at: 1, kind: 'assistant', payload: { message: { content: [{ type: 'thinking', thinking: 'hmm' }] } } }),
    ])
    expect(messages).toHaveLength(1)
    expect(messages[0]).toMatchObject({ role: 'assistant', content: 'hmm', thinking: 'hmm' })
  })

  it('summarizes system + result entries and falls back to raw for other', () => {
    const steps = normalizeCliTranscript([
      entry({ at: 1, kind: 'system', payload: { type: 'system', subtype: 'init', model: 'Composer 2' } }),
      entry({ at: 2, kind: 'result', payload: { type: 'result', subtype: 'success', duration_ms: 2500 } }),
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
    expect(parseCliAgentModelTag('cli-agent/codex/gpt-5.5')).toEqual({ cli: 'codex', modelId: 'gpt-5.5' })
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
        event: { entry: { at: 1, kind: 'assistant', payload: { message: { content: [{ type: 'text', text: 'hi' }] } } } },
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
    expect(parseCliRunUpdateEvent({ runId: 'r1', type: 'statusChanged', event: {} })).toMatchObject({
      kind: 'other',
    })
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
