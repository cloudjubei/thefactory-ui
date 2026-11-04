import { describe, expect, it } from 'vitest'
import {
  isMcpSignInPage,
  mcpServerDraftProblem,
  mcpServerHost,
  mcpServerInputOf,
  mcpServersIntro,
  mcpServerViews,
  mcpSignInRedirectUrl,
  mcpToolsSummary,
} from './mcpServers'
import type {
  McpOfferedTool,
  McpServerOwner,
  McpServerRow,
  McpServerStanding,
} from './mcpServersTypes'

const PROJECT: McpServerOwner = { kind: 'project', projectId: 'web' }
const GROUP: McpServerOwner = { kind: 'group', groupId: 'osc' }

const row = (over: Partial<McpServerRow> = {}): McpServerRow => ({
  id: 's1',
  name: 'Zenor',
  url: 'https://mcp.getzenor.com/mcp',
  authType: 'oauth',
  hasCredential: false,
  source: 'project',
  ...over,
})

const tool = (toolName: string, readOnly: boolean, description = ''): McpOfferedTool => ({
  name: `zenor_${toolName}`,
  toolName,
  description,
  readOnly,
})

const standing = (over: Partial<McpServerStanding> = {}): McpServerStanding => ({
  serverId: 's1',
  status: 'connected',
  toolCount: 0,
  omittedTools: 0,
  tools: [],
  ...over,
})

const views = (input: Partial<Parameters<typeof mcpServerViews>[0]> & { rows: McpServerRow[] }) =>
  mcpServerViews({ owner: PROJECT, standings: [], ...input })

describe('mcpSignInRedirectUrl', () => {
  it('puts the callback under the URL the client uses for the backend', () => {
    expect(mcpSignInRedirectUrl('http://127.0.0.1:7001')).toBe(
      'http://127.0.0.1:7001/api/v1/mcp-servers/oauth/callback',
    )
  })

  it('does not double a trailing slash', () => {
    expect(mcpSignInRedirectUrl('https://overseer.example.com///')).toBe(
      'https://overseer.example.com/api/v1/mcp-servers/oauth/callback',
    )
  })

  it('keeps a backend served under a path', () => {
    expect(mcpSignInRedirectUrl('https://example.com/overseer/')).toBe(
      'https://example.com/overseer/api/v1/mcp-servers/oauth/callback',
    )
  })

  it('has nothing to send before a backend is set', () => {
    expect(mcpSignInRedirectUrl(null)).toBeUndefined()
    expect(mcpSignInRedirectUrl('  ')).toBeUndefined()
  })
})

describe('isMcpSignInPage', () => {
  it('takes a web page', () => {
    expect(isMcpSignInPage('https://auth.example.com/authorize?a=1')).toBe(true)
    expect(isMcpSignInPage('HTTP://localhost:9000/a')).toBe(true)
  })

  it('refuses anything else an OS could act on', () => {
    for (const url of [
      'file:///etc/passwd',
      'javascript:alert(1)',
      'zoommtg://join',
      'https://',
      ' https://a.example.com',
      '',
    ]) {
      expect(isMcpSignInPage(url), url).toBe(false)
    }
  })
})

describe('mcpServersIntro', () => {
  it('says who gets the tools', () => {
    expect(mcpServersIntro(PROJECT, 'Web', undefined)).toMatch(/agents in Web/)
    expect(mcpServersIntro(GROUP, 'OSC', 'MAIN')).toMatch(/every project whose main group it is/)
    expect(mcpServersIntro(GROUP, 'Tools', 'SCOPE')).toMatch(/Its projects get servers from their/)
  })
})

describe('mcpServerHost', () => {
  it('shows a URL without its scheme or path', () => {
    expect(mcpServerHost('https://mcp.getzenor.com/mcp')).toBe('mcp.getzenor.com')
    expect(mcpServerHost('http://localhost:3845/sse?x=1')).toBe('localhost:3845')
  })

  it('leaves what is not a URL as it is', () => {
    expect(mcpServerHost('not a url')).toBe('not a url')
  })
})

describe('mcpServerDraftProblem', () => {
  const draft = { name: 'Zenor', url: 'https://mcp.getzenor.com/mcp', authType: 'oauth' as const }

  it('passes a named https server', () => {
    expect(mcpServerDraftProblem(draft, [])).toBeUndefined()
  })

  it('wants a name and a URL, ignoring spaces', () => {
    expect(mcpServerDraftProblem({ ...draft, name: '   ' }, [])).toBe('Give it a name.')
    expect(mcpServerDraftProblem({ ...draft, url: ' ' }, [])).toBe('Add its URL.')
  })

  it('refuses a name longer than the backend keeps, not one exactly as long', () => {
    expect(mcpServerDraftProblem({ ...draft, name: 'x'.repeat(64) }, [])).toBeUndefined()
    expect(mcpServerDraftProblem({ ...draft, name: 'x'.repeat(65) }, [])).toMatch(/under 65/)
  })

  it('takes https, and http only on this machine, as the backend does', () => {
    const problem = (url: string) => mcpServerDraftProblem({ ...draft, url }, [])
    expect(problem('HTTPS://mcp.example.com')).toBeUndefined()
    expect(problem('http://localhost:3845/mcp')).toBeUndefined()
    expect(problem('http://127.0.0.1/mcp')).toBeUndefined()
    expect(problem('http://[::1]:9000/mcp')).toBeUndefined()
    expect(problem('http://mcp.example.com')).toMatch(/Use https/)
    expect(problem('http://localhost.evil.com/mcp')).toMatch(/Use https/)
    expect(problem('ftp://mcp.example.com')).toMatch(/full address/)
    expect(problem('mcp.example.com')).toMatch(/full address/)
    expect(problem('https://')).toMatch(/full address/)
  })

  it('refuses a user or password in the URL', () => {
    expect(mcpServerDraftProblem({ ...draft, url: 'https://a:b@example.com/mcp' }, [])).toMatch(
      /user name and password/,
    )
    expect(mcpServerDraftProblem({ ...draft, url: 'https://token@example.com/mcp' }, [])).toMatch(
      /user name and password/,
    )
  })

  it('refuses a name or URL the owner already has, whatever the case', () => {
    const own = [row({ name: 'zenor ', url: 'https://mcp.getzenor.com/mcp/' })]
    expect(mcpServerDraftProblem({ ...draft, url: 'https://other.example.com' }, own)).toMatch(
      /that name/,
    )
    expect(mcpServerDraftProblem({ ...draft, name: 'Other' }, own)).toMatch(/that URL/)
  })
})

describe('mcpServerInputOf', () => {
  it('trims what the person typed', () => {
    expect(
      mcpServerInputOf({ name: ' Zenor ', url: ' https://a.example.com ', authType: 'bearer' }),
    ).toEqual({ name: 'Zenor', url: 'https://a.example.com', authType: 'bearer' })
  })
})

describe('mcpToolsSummary', () => {
  const tools = (asks: number, reads: number) => [
    ...Array.from({ length: asks }, () => ({ name: 'a', description: '', asks: true })),
    ...Array.from({ length: reads }, () => ({ name: 'r', description: '', asks: false })),
  ]

  it('says how many there are and how many ask', () => {
    expect(mcpToolsSummary(tools(3, 9))).toBe('12 tools, 3 ask first')
    expect(mcpToolsSummary(tools(1, 1))).toBe('2 tools, 1 asks first')
    expect(mcpToolsSummary(tools(0, 12))).toBe('12 tools')
    expect(mcpToolsSummary(tools(0, 1))).toBe('1 tool')
    expect(mcpToolsSummary(tools(2, 0))).toBe('2 tools, all ask first')
    expect(mcpToolsSummary(tools(1, 0))).toBe('1 tool, it asks first')
  })
})

describe('mcpServerViews', () => {
  it('shows nothing until the servers are read', () => {
    expect(views({ rows: [] })).toEqual([])
  })

  it('says it is checking until the status is read, and that it was not when that failed', () => {
    const [checking] = mcpServerViews({ owner: PROJECT, rows: [row()], standings: undefined })
    expect(checking).toMatchObject({ statusLabel: 'Checking…', statusTone: 'empty' })
    const [failed] = mcpServerViews({
      owner: PROJECT,
      rows: [row()],
      standings: undefined,
      statusFailed: true,
    })
    expect(failed).toMatchObject({ status: 'unknown', statusLabel: 'Not checked' })
  })

  it('calls a server the status does not mention not checked: it was added since', () => {
    const [view] = views({ rows: [row()], standings: [standing({ serverId: 'other' })] })
    expect(view).toMatchObject({ status: 'unknown', statusTone: 'empty' })
  })

  it('names each status', () => {
    const label = (status: McpServerStanding['status'], reason?: string) =>
      views({
        rows: [row()],
        standings: [standing({ status, ...(reason ? { reason } : {}) })],
      })[0]
    expect(label('connected')).toMatchObject({ statusLabel: 'Connected', statusTone: 'done' })
    expect(label('needs-sign-in')).toMatchObject({
      statusLabel: 'Needs sign-in',
      statusTone: 'onhold',
    })
    expect(label('unreachable', 'timed out')).toMatchObject({
      statusLabel: 'Can’t reach it',
      statusTone: 'stuck',
      reason: 'timed out',
    })
  })

  it('asks a token server for a token, not a sign-in', () => {
    const [view] = views({
      rows: [row({ authType: 'bearer' })],
      standings: [standing({ status: 'needs-sign-in' })],
    })
    expect(view?.statusLabel).toBe('Needs a token')
    expect(view?.access).toEqual({ kind: 'token', saved: false })
  })

  describe('the way in', () => {
    const access = (over: Partial<McpServerRow>, status: McpServerStanding['status']) =>
      views({ rows: [row(over)], standings: [standing({ status })] })[0]?.access

    it('offers Sign in, and Sign in again once it has one', () => {
      expect(access({ authType: 'oauth' }, 'needs-sign-in')).toEqual({
        kind: 'sign-in',
        label: 'Sign in',
      })
      expect(access({ authType: 'oauth', hasCredential: true }, 'connected')).toEqual({
        kind: 'sign-in',
        label: 'Sign in again',
      })
    })

    it('offers Sign in when a saved sign-in stopped working', () => {
      expect(access({ authType: 'oauth', hasCredential: true }, 'needs-sign-in')).toMatchObject({
        label: 'Sign in',
      })
    })

    it('says a token is saved', () => {
      expect(access({ authType: 'bearer', hasCredential: true }, 'connected')).toEqual({
        kind: 'token',
        saved: true,
      })
    })

    it('offers nothing for a server with no sign-in', () => {
      expect(access({ authType: 'none' }, 'connected')).toBeUndefined()
    })

    it('carries the page of a sign-in that was started', () => {
      const [view] = views({
        rows: [row()],
        standings: [standing({ status: 'needs-sign-in' })],
        signIns: { s1: 'https://auth.example.com/authorize' },
      })
      expect(view?.access).toEqual({
        kind: 'sign-in',
        label: 'Sign in',
        pendingUrl: 'https://auth.example.com/authorize',
      })
    })

    it('tells the person what to do when a server with no sign-in turns out to want one', () => {
      const [view] = views({
        rows: [row({ authType: 'none' })],
        standings: [standing({ status: 'needs-sign-in' })],
      })
      expect(view?.access).toBeUndefined()
      expect(view?.note).toMatch(/Remove it and add it again/)
    })
  })

  describe('a group’s server on a project', () => {
    const groupRow = row({ source: 'group', groupId: 'osc' })

    it('is read-only, saying where it is changed, and offers no way in', () => {
      const [view] = views({
        rows: [groupRow],
        standings: [standing({ status: 'needs-sign-in' })],
        groupTitles: { osc: 'OSC' },
      })
      expect(view).toMatchObject({
        readOnly: true,
        sourceLabel: 'From OSC',
        note: 'Set up on OSC. Change it in that group’s Settings.',
      })
      expect(view?.access).toBeUndefined()
    })

    it('still reads when the group’s title is not known', () => {
      const [view] = views({ rows: [groupRow] })
      expect(view).toMatchObject({ sourceLabel: 'From its group', readOnly: true })
    })

    it('never tells a project to remove a group’s server', () => {
      const [view] = views({
        rows: [row({ source: 'group', groupId: 'osc', authType: 'none' })],
        standings: [standing({ status: 'needs-sign-in' })],
        groupTitles: { osc: 'OSC' },
      })
      expect(view?.note).toMatch(/Change it in that group/)
      expect(view?.note).not.toMatch(/Remove/)
    })
  })

  it('leaves a server on its own group editable, with no source shown', () => {
    const [view] = views({
      owner: GROUP,
      rows: [row({ source: 'group', groupId: 'osc' })],
      groupTitles: { osc: 'OSC' },
    })
    expect(view?.readOnly).toBe(false)
    expect(view?.sourceLabel).toBeUndefined()
    expect(view?.access).toBeDefined()
  })

  describe('tools', () => {
    it('lists them by their name on the server, those that ask first, order otherwise kept', () => {
      const [view] = views({
        rows: [row()],
        standings: [
          standing({
            tools: [
              tool('read_a', true, 'Reads'),
              tool('write_b', false),
              tool('read_c', true),
              tool('write_d', false),
            ],
          }),
        ],
      })
      expect(view?.tools.map((t) => [t.name, t.asks])).toEqual([
        ['write_b', true],
        ['write_d', true],
        ['read_a', false],
        ['read_c', false],
      ])
      expect(view?.toolsSummary).toBe('4 tools, 2 ask first')
    })

    it('hands a description over as it came, as text', () => {
      const text = '<img src=x onerror=alert(1)> **bold**'
      const [view] = views({
        rows: [row()],
        standings: [standing({ tools: [tool('t', true, text)] })],
      })
      expect(view?.tools[0]?.description).toBe(text)
    })

    it('says a connected server offers none, and nothing for one that is not connected', () => {
      expect(views({ rows: [row()], standings: [standing()] })[0]?.toolsSummary).toBe(
        'It offers no tools.',
      )
      expect(
        views({ rows: [row()], standings: [standing({ status: 'unreachable' })] })[0]?.toolsSummary,
      ).toBeUndefined()
    })

    it('says when tools were left out', () => {
      const note = (omittedTools: number) =>
        views({ rows: [row()], standings: [standing({ omittedTools })] })[0]?.omittedNote
      expect(note(0)).toBeUndefined()
      expect(note(1)).toBe('1 more tool left out: agents can’t use it.')
      expect(note(3)).toBe('3 more tools left out: agents can’t use them.')
    })
  })

  describe('a test’s answer', () => {
    it('takes over from the recent status', () => {
      const [view] = views({
        rows: [row()],
        standings: [standing({ status: 'connected', tools: [tool('t', true)] })],
        tests: { s1: { status: 'unreachable', reason: 'refused', tools: [] } },
      })
      expect(view).toMatchObject({
        status: 'unreachable',
        reason: 'refused',
        testSummary: 'Can’t reach it just now.',
      })
      expect(view?.tools).toEqual([])
      expect(view?.toolsSummary).toBeUndefined()
    })

    it('fills in the tools of a server that had not answered before', () => {
      const [view] = views({
        rows: [row()],
        standings: [standing({ status: 'unreachable', reason: 'slow' })],
        tests: {
          s1: {
            status: 'connected',
            tools: [
              { name: 'read', description: 'Reads', readOnly: true },
              { name: 'write', readOnly: false },
            ],
          },
        },
      })
      expect(view?.status).toBe('connected')
      expect(view?.reason).toBeUndefined()
      expect(view?.tools).toEqual([
        { name: 'write', description: '', asks: true },
        { name: 'read', description: 'Reads', asks: false },
      ])
      expect(view?.testSummary).toBe('Connected just now. 2 tools, 1 asks first.')
    })

    it('keeps listing what agents get over the server’s raw list, and what was left out', () => {
      const [view] = views({
        rows: [row()],
        standings: [standing({ tools: [tool('offered', true)], omittedTools: 1 })],
        tests: {
          s1: {
            status: 'connected',
            tools: [
              { name: 'offered', readOnly: true },
              { name: 'unusable', readOnly: true },
            ],
          },
        },
      })
      expect(view?.tools.map((t) => t.name)).toEqual(['offered'])
      expect(view?.omittedNote).toMatch(/1 more tool/)
    })

    it('leaves out the note on tools left out once the server stops answering', () => {
      const [view] = views({
        rows: [row()],
        standings: [standing({ omittedTools: 2 })],
        tests: { s1: { status: 'unreachable', tools: [] } },
      })
      expect(view?.omittedNote).toBeUndefined()
    })

    it('says a connected server with nothing to offer offers nothing', () => {
      const [view] = views({ rows: [row()], tests: { s1: { status: 'connected', tools: [] } } })
      expect(view?.testSummary).toBe('Connected just now. It offers no tools.')
    })

    it('says so when the server wants a sign-in', () => {
      const [view] = views({
        rows: [row()],
        tests: { s1: { status: 'needs-sign-in', tools: [] } },
      })
      expect(view?.testSummary).toBe('It wants a sign-in.')
    })

    it('says a token server wants a token', () => {
      const [view] = views({
        rows: [row({ authType: 'bearer' })],
        tests: { s1: { status: 'needs-sign-in', tools: [] } },
      })
      expect(view?.testSummary).toBe('It wants a token.')
    })

    it('marks the server being tested', () => {
      const [waiting, other] = views({
        rows: [row(), row({ id: 's2', name: 'Other' })],
        testing: ['s1'],
      })
      expect(waiting?.testing).toBe(true)
      expect(other?.testing).toBe(false)
    })
  })

  it('shows the address short', () => {
    expect(views({ rows: [row()] })[0]?.host).toBe('mcp.getzenor.com')
  })
})
