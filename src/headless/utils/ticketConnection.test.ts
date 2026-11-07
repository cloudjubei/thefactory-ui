import { describe, expect, it } from 'vitest'

import {
  chooseTicketConnection,
  connectorWriteBackOf,
  describeEffectiveTicketBinding,
  describeTicketBinding,
  effectiveTicketBinding,
  formatJiraProjectKeys,
  hasTicketProjects,
  parseJiraProjectKeys,
  ticketAccessCopy,
  ticketConnectionsOf,
  ticketTransitionChoiceOf,
  ticketTransitionChoices,
  ticketTransitionOfChoice,
  readTicketConnection,
  ticketTransitionStanding,
  withSignOffTransition,
  withTicketConnection,
} from './ticketConnection'
import {
  TICKET_PICKER_INHERIT,
  TICKET_PICKER_NONE,
  TICKET_TRANSITION_LEAVE,
  TICKET_TRANSITION_STANDING,
} from './ticketConnectionConstants'

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

describe('ticketConnectionsOf', () => {
  it('keeps what a binding can use: Azure DevOps stays out', () => {
    expect(
      ticketConnectionsOf([
        connection('a', 'jira'),
        connection('b', 'github'),
        connection('c', 'azure-devops'),
        connection('d', 'linear'),
      ]).map((c) => c.id),
    ).toEqual(['a', 'b'])
  })
})

describe('what a provider’s binding offers', () => {
  it('names projects for Jira alone', () => {
    expect(hasTicketProjects('jira')).toBe(true)
    expect(hasTicketProjects(undefined)).toBe(true)
    expect(hasTicketProjects('github')).toBe(false)
  })

  it('says what the access choice is about', () => {
    expect(ticketAccessCopy('jira').heading).toBe('What agents may do')
    expect(ticketAccessCopy(undefined).heading).toBe('What agents may do')
    expect(ticketAccessCopy('github').heading).toBe('What sign-off may do')
    expect(ticketAccessCopy('github').descriptions.read).toContain('no GitHub tools')
  })
})

describe('the transition list', () => {
  const statuses = ['Done', 'In Review']

  it('offers leaving it alone, then each status', () => {
    expect(ticketTransitionChoices(statuses, '')).toEqual([
      { value: TICKET_TRANSITION_LEAVE, label: 'Leave the ticket where it is' },
      { value: 'Done', label: 'Done' },
      { value: 'In Review', label: 'In Review' },
    ])
  })

  it('keeps a saved value the list does not hold', () => {
    const choices = ticketTransitionChoices(statuses, ' Shipped ')
    expect(choices.at(-1)).toEqual({ value: 'Shipped', label: 'Shipped (not on this list)' })
    expect(ticketTransitionChoiceOf(choices, ' Shipped ')).toBe('Shipped')
  })

  it('says nothing of a saved value while the list is on its way', () => {
    expect(ticketTransitionChoices(undefined, 'Done').at(-1)).toEqual({
      value: 'Done',
      label: 'Done',
    })
    expect(ticketTransitionChoices(undefined, 'closed', 'github').at(-1)?.label).toBe('Closed')
    expect(ticketTransitionChoices(undefined, '')).toHaveLength(1)
  })

  it('finds a saved status in any case, adding no row', () => {
    const choices = ticketTransitionChoices(statuses, 'done')
    expect(choices).toHaveLength(3)
    expect(ticketTransitionChoiceOf(choices, 'done')).toBe('Done')
  })

  it('sits on leaving it alone with nothing saved', () => {
    const choices = ticketTransitionChoices(statuses, '  ')
    expect(choices).toHaveLength(3)
    expect(ticketTransitionChoiceOf(choices, '  ')).toBe(TICKET_TRANSITION_LEAVE)
  })

  it('reads GitHub’s states as words, saving the state itself', () => {
    expect(ticketTransitionChoices(['open', 'closed'], '', 'github').slice(1)).toEqual([
      { value: 'open', label: 'Open' },
      { value: 'closed', label: 'Closed' },
    ])
    expect(ticketTransitionChoices(['open'], '', 'jira').at(-1)?.label).toBe('open')
  })

  it('saves nothing for leaving it alone, and the status for any other row', () => {
    expect(ticketTransitionOfChoice(TICKET_TRANSITION_LEAVE)).toBe('')
    expect(ticketTransitionOfChoice('Done')).toBe('Done')
  })
})

describe('describeTicketBinding', () => {
  const connections = [
    connection('jira-1', 'jira', 'Acme Jira'),
    connection('gh-1', 'github', 'Acme GitHub'),
  ]

  it('says nothing of projects on a GitHub binding', () => {
    expect(
      describeTicketBinding(
        { connectionId: 'gh-1', access: 'read-write', signOffTransition: 'closed' },
        connections,
      ),
    ).toBe('Acme GitHub · Read & write · Sign-off moves to closed')
  })

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

  it('reads a binding naming no connection as nothing — there is nothing it could use', () => {
    expect(readTicketConnection({ connectionId: '', access: 'read' })).toBeUndefined()
  })
})

describe('chooseTicketConnection', () => {
  const ids = [connection('c1', 'jira'), connection('c2', 'jira'), connection('g1', 'github')]

  it('follows the group, or opts out of it, for a project with a main group', () => {
    expect(
      chooseTicketConnection(TICKET_PICKER_INHERIT, OWN, { inherits: true, connections: ids }),
    ).toEqual({ value: undefined })
    expect(
      chooseTicketConnection(TICKET_PICKER_NONE, undefined, { inherits: true, connections: ids }),
    ).toEqual({ value: 'none' })
  })

  it('reads “not connected” as nothing to store where there is no group to opt out of', () => {
    expect(
      chooseTicketConnection(TICKET_PICKER_NONE, OWN, { inherits: false, connections: ids }),
    ).toEqual({ value: undefined })
  })

  it('drops Jira projects on a move to GitHub, which has none', () => {
    expect(chooseTicketConnection('g1', OWN, { inherits: true, connections: ids })).toEqual({
      value: { connectionId: 'g1', access: 'read-write' },
    })
  })

  it('binds a chosen connection, keeping the access and Jira projects already set', () => {
    expect(chooseTicketConnection('c1', OWN, { inherits: true, connections: ids })).toEqual({
      value: { connectionId: 'c1', access: 'read-write', projectKeys: ['ENG'] },
    })
    expect(chooseTicketConnection('c2', 'none', { inherits: true, connections: ids })).toEqual({
      value: { connectionId: 'c2', access: 'read' },
    })
  })

  it('keeps a binding to a deleted connection when that is what is picked again', () => {
    const gone = { connectionId: 'gone', access: 'read' as const }
    expect(chooseTicketConnection('gone', gone, { inherits: false, connections: ids })).toEqual({
      value: gone,
    })
  })

  // Observed: giving a project its first main group switched the picker from
  // "Not connected" to "Same as <group>"; Radix's hidden native select reported
  // that change as an empty value, which became a binding to connection '' — and
  // its "A deleted connection" item with value '' made Radix throw, blanking the app.
  it('is no choice at all for an empty value', () => {
    expect(
      chooseTicketConnection('', undefined, { inherits: true, connections: ids }),
    ).toBeUndefined()
  })

  it('is no choice at all for a value naming no known connection', () => {
    expect(chooseTicketConnection('c9', OWN, { inherits: true, connections: ids })).toBeUndefined()
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
    expect(describeEffectiveTicketBinding({ source: 'off' }, conns)).toBe('Tickets turned off here')
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

describe('withSignOffTransition', () => {
  const binding = { connectionId: 'c1', access: 'read-write' as const }

  it('sets the transition, trimmed', () => {
    expect(withSignOffTransition(binding, ' 31 ')).toEqual({ ...binding, signOffTransition: '31' })
  })

  it('drops the key on blank text: a blank one would be refused', () => {
    const next = withSignOffTransition({ ...binding, signOffTransition: '31' }, '   ')
    expect(next).toEqual(binding)
    expect('signOffTransition' in next).toBe(false)
  })
})

describe('chooseTicketConnection and the sign-off transition', () => {
  const own = { connectionId: 'c1', access: 'read-write' as const, signOffTransition: '31' }
  const options = {
    inherits: false,
    connections: [connection('c1', 'jira'), connection('c2', 'jira')],
  }

  it('keeps it when the same connection is picked again', () => {
    expect(chooseTicketConnection('c1', own, options)).toEqual({ value: own })
  })

  it('drops it with a new connection: its statuses belong to that one', () => {
    expect(chooseTicketConnection('c2', own, options)).toEqual({
      value: { connectionId: 'c2', access: 'read-write' },
    })
  })
})

describe('describeTicketBinding and the sign-off transition', () => {
  it('names the transition a binding moves tickets with', () => {
    expect(
      describeTicketBinding(
        { connectionId: 'jira-1', access: 'read-write', signOffTransition: '31' },
        [connection('jira-1', 'jira', 'Acme Jira')],
      ),
    ).toBe('Acme Jira · Read & write · all Jira projects · Sign-off moves to 31')
  })
})

describe('connectorWriteBackOf', () => {
  const on = { connectorWriteBack: true }
  const off = { connectorWriteBack: false }
  const main = (capabilities?: object) => ({
    id: 'g1',
    type: 'MAIN' as const,
    ...(capabilities ? { capabilities } : {}),
  })

  it('is off when nothing says so', () => {
    expect(connectorWriteBackOf({ metadata: {} }, [])).toBe(false)
  })

  it('follows the main group', () => {
    expect(connectorWriteBackOf({ mainGroupId: 'g1' }, [main(on)])).toBe(true)
  })

  it('lets the project say no over its group, and yes on its own', () => {
    expect(
      connectorWriteBackOf({ mainGroupId: 'g1', metadata: { capabilities: off } }, [main(on)]),
    ).toBe(false)
    expect(
      connectorWriteBackOf({ mainGroupId: 'g1', metadata: { capabilities: on } }, [main()]),
    ).toBe(true)
  })

  it('takes nothing from a scope group', () => {
    expect(
      connectorWriteBackOf({ mainGroupId: 'g1' }, [{ ...main(on), type: 'SCOPE' as const }]),
    ).toBe(false)
  })

  it('reads anything but true as off', () => {
    expect(
      connectorWriteBackOf({ metadata: { capabilities: { connectorWriteBack: 'yes' } } }, []),
    ).toBe(false)
  })
})

describe('ticketTransitionStanding on a GitHub connection', () => {
  const github = { provider: 'github', tokenSource: 'api-key' as const }
  const writable = { connectionId: 'g1', access: 'read-write' as const }

  it('takes a plain token, which the policy only refuses for Jira', () => {
    expect(
      ticketTransitionStanding({ binding: writable, connection: github, writeBack: true }),
    ).toBe(TICKET_TRANSITION_STANDING.commentOnly)
  })

  it('moves the issue when a state is set', () => {
    const binding = { ...writable, signOffTransition: 'closed' }
    expect(ticketTransitionStanding({ binding, connection: github, writeBack: true })).toBe(
      TICKET_TRANSITION_STANDING.moves,
    )
  })

  it('still needs Read & write, and write-back on', () => {
    const binding = { ...writable, access: 'read' as const }
    expect(ticketTransitionStanding({ binding, connection: github, writeBack: true })).toBe(
      TICKET_TRANSITION_STANDING.readOnly,
    )
    expect(ticketTransitionStanding({ binding, connection: github, writeBack: false })).toBe(
      TICKET_TRANSITION_STANDING.off,
    )
  })
})

describe('ticketTransitionStanding', () => {
  const writable = { connectionId: 'c1', access: 'read-write' as const, signOffTransition: '31' }
  const OAUTH = { id: 'c1', provider: 'jira', tokenSource: 'oauth' as const }
  const SCOPED = { id: 'c1', provider: 'jira', config: { jiraApiTokenMode: 'scoped' } }
  const CLASSIC = { id: 'c1', provider: 'jira' }

  it('says plainly that nothing moves while write-back is off, whatever else holds', () => {
    expect(
      ticketTransitionStanding({ binding: writable, connection: OAUTH, writeBack: false }),
    ).toEqual(TICKET_TRANSITION_STANDING.off)
    expect(
      ticketTransitionStanding({
        binding: { connectionId: 'c1', access: 'read' },
        connection: CLASSIC,
        writeBack: false,
      }),
    ).toEqual(TICKET_TRANSITION_STANDING.off)
  })

  it('reads a missing connection as blocked', () => {
    expect(ticketTransitionStanding({ binding: writable, writeBack: true })).toEqual(
      TICKET_TRANSITION_STANDING.noConnection,
    )
  })

  it('blocks a binding limited to Jira projects, first, as the write policy does', () => {
    expect(
      ticketTransitionStanding({
        binding: { ...writable, access: 'read', projectKeys: ['ENG'] },
        connection: OAUTH,
        writeBack: true,
      }),
    ).toEqual(TICKET_TRANSITION_STANDING.projectLimit)
  })

  it('blocks a classic API token', () => {
    expect(
      ticketTransitionStanding({ binding: writable, connection: CLASSIC, writeBack: true }),
    ).toEqual(TICKET_TRANSITION_STANDING.classicToken)
  })

  it('blocks a read-only binding', () => {
    expect(
      ticketTransitionStanding({
        binding: { ...writable, access: 'read' },
        connection: SCOPED,
        writeBack: true,
      }),
    ).toEqual(TICKET_TRANSITION_STANDING.readOnly)
  })

  it('says it moves the ticket when all holds', () => {
    expect(
      ticketTransitionStanding({ binding: writable, connection: OAUTH, writeBack: true }),
    ).toEqual(TICKET_TRANSITION_STANDING.moves)
    expect(
      ticketTransitionStanding({ binding: writable, connection: SCOPED, writeBack: true }),
    ).toEqual(TICKET_TRANSITION_STANDING.moves)
  })

  it('says it only comments when no transition is set', () => {
    expect(
      ticketTransitionStanding({
        binding: { connectionId: 'c1', access: 'read-write' },
        connection: OAUTH,
        writeBack: true,
      }),
    ).toEqual(TICKET_TRANSITION_STANDING.commentOnly)
  })
})
