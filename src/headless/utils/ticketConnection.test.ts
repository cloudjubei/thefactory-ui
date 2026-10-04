import { describe, expect, it } from 'vitest'

import {
  describeTicketBinding,
  formatJiraProjectKeys,
  jiraConnectionsOf,
  parseJiraProjectKeys,
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
