import { describe, expect, it } from 'vitest'

import {
  describeEffectiveTicketBinding,
  describeTicketBinding,
  effectiveTicketBinding,
  formatJiraProjectKeys,
  jiraConnectionsOf,
  parseJiraProjectKeys,
  readTicketConnection,
  withTicketConnection,
} from './ticketConnection'

const connection = (id: string, provider: string, name = id) => ({
  id,
  name,
  provider,
  token: 't',
  createdAt: 't0',
  updatedAt: 't0',
})

describe('parseJiraProjectKeys', () => {
  it('splits on commas and spaces, upper-cases and drops duplicates', () => {
    expect(parseJiraProjectKeys('eng, OPS  ops,,web')).toEqual(['ENG', 'OPS', 'WEB'])
  })

  it('reads blank text as no keys', () => {
    expect(parseJiraProjectKeys('  ')).toEqual([])
  })
})

describe('formatJiraProjectKeys', () => {
  it('joins keys for editing', () => {
    expect(formatJiraProjectKeys(['ENG', 'OPS'])).toBe('ENG, OPS')
  })

  it('formats no keys as blank', () => {
    expect(formatJiraProjectKeys(undefined)).toBe('')
  })
})

describe('jiraConnectionsOf', () => {
  it('keeps only Jira connections', () => {
    expect(
      jiraConnectionsOf([connection('a', 'jira'), connection('b', 'github')]).map((c) => c.id),
    ).toEqual(['a'])
  })
})

describe('describeTicketBinding', () => {
  const connections = [connection('jira-1', 'jira', 'Acme Jira')]

  it('names the connection, the access and every Jira project', () => {
    expect(describeTicketBinding({ connectionId: 'jira-1', access: 'read' }, connections)).toBe(
      'Acme Jira · Read only · all Jira projects',
    )
  })

  it('names the Jira projects it is limited to', () => {
    expect(
      describeTicketBinding(
        { connectionId: 'jira-1', access: 'read-write', projectKeys: ['ENG', 'OPS'] },
        connections,
      ),
    ).toBe('Acme Jira · Read & write · ENG, OPS')
  })

  it('says when the bound connection no longer exists', () => {
    expect(describeTicketBinding({ connectionId: 'gone', access: 'read' }, connections)).toBe(
      'A deleted connection · Read only · all Jira projects',
    )
  })
})

const BINDING = { connectionId: 'c1', access: 'read' as const }
const OWN = { connectionId: 'c2', access: 'read-write' as const, projectKeys: ['ENG'] }
const OSC = { id: 'g1', title: 'OSC', ticketConnection: BINDING }

describe('readTicketConnection', () => {
  it('reads a stored binding, an explicit opt-out, or nothing', () => {
    expect(readTicketConnection(BINDING)).toEqual(BINDING)
    expect(readTicketConnection('none')).toBe('none')
    expect(readTicketConnection(undefined)).toBeUndefined()
  })

  it('reads a malformed value as nothing, so the project follows its group', () => {
    expect(readTicketConnection({ connectionId: 'c1' })).toBeUndefined()
    expect(readTicketConnection('nope')).toBeUndefined()
  })
})

describe('effectiveTicketBinding', () => {
  it('follows the main group when the project chose nothing', () => {
    expect(effectiveTicketBinding({ mainGroupId: 'g1', metadata: {} }, [OSC])).toEqual({
      source: 'group',
      binding: BINDING,
      groupTitle: 'OSC',
    })
  })

  it('uses the project’s own binding over its group’s', () => {
    expect(
      effectiveTicketBinding({ mainGroupId: 'g1', metadata: { ticketConnection: OWN } }, [OSC]),
    ).toEqual({ source: 'project', binding: OWN })
  })

  it('keeps a project that opted out off Jira, even under a connected group', () => {
    expect(
      effectiveTicketBinding({ mainGroupId: 'g1', metadata: { ticketConnection: 'none' } }, [OSC]),
    ).toEqual({ source: 'off' })
  })

  it('is unconnected when neither the project nor its group has a binding', () => {
    expect(
      effectiveTicketBinding({ mainGroupId: 'g1', metadata: {} }, [{ id: 'g1', title: 'OSC' }]),
    ).toEqual({ source: 'none' })
    expect(effectiveTicketBinding({ metadata: undefined }, [OSC])).toEqual({ source: 'none' })
  })
})

describe('describeEffectiveTicketBinding', () => {
  const conns = [connection('c1', 'jira', 'Zenor Jira'), connection('c2', 'jira', 'Other')]

  it('names the group a project follows, and what that gives it', () => {
    expect(
      describeEffectiveTicketBinding(
        { source: 'group', binding: BINDING, groupTitle: 'OSC' },
        conns,
      ),
    ).toBe('Same as OSC — Zenor Jira · Read only · all Jira projects')
  })

  it('says a project chose its own', () => {
    expect(describeEffectiveTicketBinding({ source: 'project', binding: OWN }, conns)).toBe(
      'Its own — Other · Read & write · ENG',
    )
  })

  it('says plainly when a project has no Jira', () => {
    expect(describeEffectiveTicketBinding({ source: 'off' }, conns)).toBe('Jira turned off here')
    expect(describeEffectiveTicketBinding({ source: 'none' }, conns)).toBe('Not connected')
  })
})

describe('withTicketConnection', () => {
  it('stores a binding, keeping the rest of the metadata', () => {
    expect(withTicketConnection({ icon: 'rocket' }, OWN)).toEqual({
      icon: 'rocket',
      ticketConnection: OWN,
    })
  })

  it('stores an opt-out', () => {
    expect(withTicketConnection({ ticketConnection: OWN }, 'none')).toEqual({
      ticketConnection: 'none',
    })
  })

  it('drops the key to follow the group again — the update replaces metadata whole', () => {
    expect(withTicketConnection({ icon: 'rocket', ticketConnection: OWN }, undefined)).toEqual({
      icon: 'rocket',
    })
    expect(withTicketConnection(undefined, undefined)).toEqual({})
  })
})
