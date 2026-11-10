import { describe, expect, it } from 'vitest'
import {
  chatTicketSite,
  splitTicketLinks,
  ticketLinkOf,
  ticketSiteOf,
  ticketUrlOnSite,
} from './ticketLinks'
import type { TicketSite } from './ticketLinksTypes'

const SITE: TicketSite = { baseUrl: 'https://acme.atlassian.net', projectKeys: [] }

describe('ticketSiteOf', () => {
  it.each([
    ['https://acme.atlassian.net', 'https://acme.atlassian.net'],
    ['https://acme.atlassian.net/', 'https://acme.atlassian.net'],
    ['https://ACME.atlassian.net///', 'https://acme.atlassian.net'],
    ['https://jira.acme.com/jira/', 'https://jira.acme.com/jira'],
    ['http://localhost:8080', 'http://localhost:8080'],
  ])('reads %s as %s', (baseUrl, expected) => {
    expect(ticketSiteOf(baseUrl)).toEqual({ baseUrl: expected, projectKeys: [] })
  })

  it('keeps the Jira projects a binding names, upper case, each once', () => {
    expect(ticketSiteOf('https://acme.atlassian.net', ['znr', ' ENG ', 'ZNR', ''])).toEqual({
      baseUrl: 'https://acme.atlassian.net',
      projectKeys: ['ZNR', 'ENG'],
    })
  })

  it.each([
    [undefined],
    [''],
    ['acme.atlassian.net'],
    ['ftp://acme.atlassian.net'],
    ['javascript:alert(1)'],
    ['https://user:pw@acme.atlassian.net'],
  ])('is no site for %j', (baseUrl) => {
    expect(ticketSiteOf(baseUrl)).toBeUndefined()
  })
})

describe('ticketLinkOf', () => {
  it.each([
    ['a browse link', 'https://acme.atlassian.net/browse/ZNR-780', 'ZNR-780'],
    ['a trailing slash', 'https://acme.atlassian.net/browse/ZNR-780/', 'ZNR-780'],
    ['a query', 'https://acme.atlassian.net/browse/ZNR-780?focusedCommentId=10042', 'ZNR-780'],
    ['a fragment', 'https://acme.atlassian.net/browse/ZNR-780#comment-1', 'ZNR-780'],
    ['a lower-case key', 'https://acme.atlassian.net/browse/znr-780', 'ZNR-780'],
    ['a host in another case', 'https://ACME.Atlassian.NET/browse/ZNR-780', 'ZNR-780'],
    ['a key with digits and an underscore', 'https://acme.atlassian.net/browse/A1_B-7', 'A1_B-7'],
  ])('reads %s', (_name, url, key) => {
    expect(ticketLinkOf(url, SITE)).toEqual({ key, url })
  })

  it.each([
    ['another host', 'https://other.atlassian.net/browse/ZNR-780'],
    ['a host that only starts the same', 'https://acme.atlassian.net.evil.com/browse/ZNR-780'],
    ['the site as a user name', 'https://acme.atlassian.net@evil.com/browse/ZNR-780'],
    ['a user name on the site', 'https://me@acme.atlassian.net/browse/ZNR-780'],
    ['another port', 'https://acme.atlassian.net:8443/browse/ZNR-780'],
    ['another scheme', 'http://acme.atlassian.net/browse/ZNR-780'],
    ['no key', 'https://acme.atlassian.net/browse/'],
    ['a key with no number', 'https://acme.atlassian.net/browse/ZNR'],
    ['a number alone', 'https://acme.atlassian.net/browse/780'],
    ['more path after the key', 'https://acme.atlassian.net/browse/ZNR-780/edit'],
    ['a path before browse', 'https://acme.atlassian.net/wiki/browse/ZNR-780'],
    ['a board', 'https://acme.atlassian.net/jira/software/projects/ZNR/boards/1'],
    ['the key in the query alone', 'https://acme.atlassian.net/issues/?jql=key=ZNR-780'],
    ['an encoded slash in the key', 'https://acme.atlassian.net/browse/ZNR-780%2Fedit'],
    ['a key that starts with a digit', 'https://acme.atlassian.net/browse/1AB-2'],
    ['a key with no project', 'https://acme.atlassian.net/browse/-5'],
    ['what is not a link', 'ZNR-780'],
    ['nothing', ''],
  ])('leaves %s a plain link', (_name, url) => {
    expect(ticketLinkOf(url, SITE)).toBeUndefined()
  })

  it('reads no link at all with no site', () => {
    expect(ticketLinkOf('https://acme.atlassian.net/browse/ZNR-780', undefined)).toBeUndefined()
  })

  it('holds a site under a path to that path', () => {
    const site = ticketSiteOf('https://jira.acme.com/jira')!
    expect(ticketLinkOf('https://jira.acme.com/jira/browse/ZNR-1', site)?.key).toBe('ZNR-1')
    expect(ticketLinkOf('https://jira.acme.com/browse/ZNR-1', site)).toBeUndefined()
    expect(ticketLinkOf('https://jira.acme.com/jirax/browse/ZNR-1', site)).toBeUndefined()
    expect(ticketLinkOf('https://jira.acme.com/wiki/browse/ZNR-1', site)).toBeUndefined()
  })

  it('keeps to the Jira projects the binding names', () => {
    const site = ticketSiteOf('https://acme.atlassian.net', ['ZNR'])!
    expect(ticketLinkOf('https://acme.atlassian.net/browse/znr-1', site)?.key).toBe('ZNR-1')
    expect(ticketLinkOf('https://acme.atlassian.net/browse/OPS-1', site)).toBeUndefined()
    expect(ticketLinkOf('https://acme.atlassian.net/browse/ZNRX-1', site)).toBeUndefined()
  })
})

describe('splitTicketLinks', () => {
  const T = 'https://acme.atlassian.net/browse/ZNR-780'

  it('reads a written link to a ticket as that ticket', () => {
    expect(splitTicketLinks(`See [ZNR-780](${T}) first`, SITE)).toEqual([
      { type: 'text', value: 'See ' },
      { type: 'ticket', key: 'ZNR-780', url: T },
      { type: 'text', value: ' first' },
    ])
  })

  it('trusts the link over its label', () => {
    expect(splitTicketLinks(`[ZNR-1](${T})`, SITE)).toEqual([
      { type: 'ticket', key: 'ZNR-780', url: T },
    ])
    expect(splitTicketLinks('[ZNR-780](https://example.com/browse/ZNR-780)', SITE)).toEqual([
      { type: 'link', label: 'ZNR-780', url: 'https://example.com/browse/ZNR-780' },
    ])
  })

  it('reads a bare ticket address in the text', () => {
    expect(splitTicketLinks(`Blocked by ${T}?focusedCommentId=1 for now`, SITE)).toEqual([
      { type: 'text', value: 'Blocked by ' },
      { type: 'ticket', key: 'ZNR-780', url: `${T}?focusedCommentId=1` },
      { type: 'text', value: ' for now' },
    ])
  })

  it.each([['.'], [','], [')'], ['!'], ['?'], [';'], [':'], ['."'], [').']])(
    'leaves the %s that ends a sentence out of a bare address',
    (tail) => {
      expect(splitTicketLinks(`It is ${T}${tail}`, SITE)).toEqual([
        { type: 'text', value: 'It is ' },
        { type: 'ticket', key: 'ZNR-780', url: T },
        { type: 'text', value: tail },
      ])
    },
  )

  it('reads several, written and bare, in the order they stand', () => {
    const other = 'https://acme.atlassian.net/browse/ENG-2'
    expect(splitTicketLinks(`${T} then [two](${other})\n${other}`, SITE)).toEqual([
      { type: 'ticket', key: 'ZNR-780', url: T },
      { type: 'text', value: ' then ' },
      { type: 'ticket', key: 'ENG-2', url: other },
      { type: 'text', value: '\n' },
      { type: 'ticket', key: 'ENG-2', url: other },
    ])
  })

  it('leaves any other bare address as the text it is', () => {
    const text = 'Read https://example.com/browse/ZNR-780 and https://acme.atlassian.net/wiki'
    expect(splitTicketLinks(text, SITE)).toEqual([{ type: 'text', value: text }])
  })

  it('reads as plain links do with no site', () => {
    expect(splitTicketLinks(`[a](${T}) ${T}`, undefined)).toEqual([
      { type: 'link', label: 'a', url: T },
      { type: 'text', value: ` ${T}` },
    ])
  })

  it('answers nothing for empty text', () => {
    expect(splitTicketLinks('', SITE)).toEqual([])
  })
})

describe('chatTicketSite', () => {
  const connections = [
    { id: 'jira-1', provider: 'jira', baseUrl: 'https://acme.atlassian.net/' },
    { id: 'jira-2', provider: 'jira', baseUrl: 'https://other.atlassian.net' },
    { id: 'gh-1', provider: 'github', baseUrl: 'https://github.com' },
  ]
  const groups = [
    {
      id: 'g1',
      title: 'OSC',
      ticketConnection: { connectionId: 'jira-1', access: 'read' as const },
    },
    {
      id: 'g2',
      title: 'Other',
      ticketConnection: {
        connectionId: 'jira-2',
        access: 'read-write' as const,
        projectKeys: ['OPS'],
      },
    },
    { id: 'g3', title: 'Bare' },
    { id: 'g4', title: 'Git', ticketConnection: { connectionId: 'gh-1', access: 'read' as const } },
  ]
  const projects = [
    { id: 'p1', mainGroupId: 'g1' },
    {
      id: 'p2',
      mainGroupId: 'g1',
      metadata: {
        ticketConnection: { connectionId: 'jira-2', access: 'read', projectKeys: ['WEB'] },
      },
    },
    { id: 'p3', mainGroupId: 'g1', metadata: { ticketConnection: 'none' } },
    { id: 'p4', mainGroupId: null },
  ]
  const of = (scope: { projectId?: string; groupId?: string }) =>
    chatTicketSite({ ...scope, projects, groups, connections })

  it('is the site of a group chat’s own binding', () => {
    expect(of({ groupId: 'g1' })).toEqual({
      baseUrl: 'https://acme.atlassian.net',
      projectKeys: [],
    })
    expect(of({ groupId: 'g2' })).toEqual({
      baseUrl: 'https://other.atlassian.net',
      projectKeys: ['OPS'],
    })
  })

  it('is the site of a project chat’s effective binding: its own, else its main group’s', () => {
    expect(of({ projectId: 'p1' })?.baseUrl).toBe('https://acme.atlassian.net')
    expect(of({ projectId: 'p2' })).toEqual({
      baseUrl: 'https://other.atlassian.net',
      projectKeys: ['WEB'],
    })
  })

  it('reads a chat with both by its project, as the backend does', () => {
    expect(of({ projectId: 'p2', groupId: 'g1' })?.baseUrl).toBe('https://other.atlassian.net')
  })

  it.each([
    ['a project with tickets turned off', { projectId: 'p3' }],
    ['a project with no group', { projectId: 'p4' }],
    ['a project that is not loaded', { projectId: 'nope' }],
    ['a group with no binding', { groupId: 'g3' }],
    ['a group bound to something other than Jira', { groupId: 'g4' }],
    ['a group that is not loaded', { groupId: 'nope' }],
    ['a chat of neither', {}],
  ])('has no site for %s', (_name, scope) => {
    expect(of(scope)).toBeUndefined()
  })

  it('has no site while the connections are not loaded', () => {
    expect(chatTicketSite({ groupId: 'g1', projects, groups, connections: [] })).toBeUndefined()
    expect(chatTicketSite({ groupId: 'g1' })).toBeUndefined()
  })
})

describe('ticketUrlOnSite', () => {
  it('addresses a ticket key on the site', () => {
    expect(ticketUrlOnSite('https://acme.atlassian.net/', 'ZNR-780')).toBe(
      'https://acme.atlassian.net/browse/ZNR-780',
    )
  })

  it.each([
    ['a path', '../admin'],
    ['a number', '10042'],
    ['words', 'fix login'],
    ['nothing', ''],
  ])('addresses nothing for %s', (_name, key) => {
    expect(ticketUrlOnSite('https://acme.atlassian.net', key)).toBeUndefined()
  })

  it('addresses nothing with no site', () => {
    expect(ticketUrlOnSite(undefined, 'ZNR-780')).toBeUndefined()
    expect(ticketUrlOnSite('not a site', 'ZNR-780')).toBeUndefined()
  })
})
