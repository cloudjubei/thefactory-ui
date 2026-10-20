import { describe, expect, it } from 'vitest'
import type { ProcessProposal } from 'thefactory-tools/types'

import {
  agentTypeOptionView,
  agentTypeSlotRows,
  agentTypeSlotsMetadata,
  agentTypeSlotsOf,
} from './agentTypeSlotChoice'

const proposal = (over: Partial<ProcessProposal> = {}): ProcessProposal => ({
  processId: 'story-default',
  name: 'Story',
  steps: [
    {
      id: 'features:f1',
      name: 'Fonts',
      kind: 'process',
      agent: false,
      children: [
        { id: 'implement', name: 'Implement', kind: 'agent', agent: true, slot: 'implementer' },
        { id: 'verify', name: 'Verify', kind: 'agent', agent: true, slot: 'verifier' },
      ],
    },
  ],
  agentTypes: [
    { id: 'developer', label: 'developer', scope: 'builtin', baseRole: 'developer' },
    { id: 'verifier', label: 'verifier', scope: 'builtin', baseRole: 'verifier' },
    {
      id: 'screen-checker',
      label: 'Screen checker',
      description: 'Proves it on the device.',
      scope: 'project',
      baseRole: 'verifier',
    },
    { id: 'web-builder', label: 'Web builder', scope: 'group', baseRole: 'developer' },
  ],
  agentTypeSlots: [
    { slot: 'implementer', source: 'builtin', options: ['developer', 'web-builder'] },
    {
      slot: 'verifier',
      agentTypeId: 'screen-checker',
      source: 'project',
      options: ['verifier', 'screen-checker'],
    },
  ],
  ...over,
})

describe('agentTypeOptionView', () => {
  it('names a built-in role by its role, and a type by its own label with where it comes from', () => {
    expect(
      agentTypeOptionView({
        id: 'verifier',
        label: 'verifier',
        scope: 'builtin',
        baseRole: 'verifier',
      }),
    ).toEqual({
      id: 'verifier',
      label: 'Verifier',
      scope: 'builtin',
      scopeLabel: 'Built-in',
      baseRole: 'verifier',
      roleLabel: 'verifier',
    })
    expect(
      agentTypeOptionView({
        id: 'code-quality-maintainer',
        label: 'Code quality maintainer',
        scope: 'group',
        baseRole: 'verifier',
        proves: false,
      }),
    ).toMatchObject({
      label: 'Code quality maintainer',
      scopeLabel: 'Group',
      roleLabel: 'verifier',
      notProving: true,
    })
  })
})

describe('agentTypeSlotRows', () => {
  it('shows each slot with the type proposed for it and where it came from', () => {
    const rows = agentTypeSlotRows(proposal(), {})
    expect(rows.map((r) => [r.slotLabel, r.chosen.id, r.sourceLabel, r.changed])).toEqual([
      ['Implementer', 'developer', 'Built-in', false],
      ['Verifier', 'screen-checker', 'Project default', false],
    ])
    expect(rows[1]!.options.map((o) => [o.id, o.scopeLabel])).toEqual([
      ['verifier', 'Built-in'],
      ['screen-checker', 'Project'],
    ])
  })

  it('shows the person’s pick, only when it is one the slot takes', () => {
    const rows = agentTypeSlotRows(proposal(), {
      verifier: 'verifier',
      implementer: 'screen-checker',
    })
    expect(rows.map((r) => [r.chosen.id, r.sourceLabel, r.changed])).toEqual([
      ['developer', 'Built-in', false],
      ['verifier', 'Your pick', true],
    ])
  })

  it('counts a pick of the proposed type as no change', () => {
    const rows = agentTypeSlotRows(proposal(), { verifier: 'screen-checker' })
    expect(rows[1]).toMatchObject({ changed: false, sourceLabel: 'Project default' })
  })

  it('reads a type the offer does not list by its id, and nothing for a proposal offering none', () => {
    const rows = agentTypeSlotRows(
      proposal({
        agentTypeSlots: [
          { slot: 'verifier', agentTypeId: 'gone', source: 'group', options: ['verifier'] },
        ],
      }),
      {},
    )
    expect(rows[0]!.chosen).toMatchObject({ id: 'gone', label: 'gone', scope: 'project' })
    expect(agentTypeSlotRows(proposal({ agentTypeSlots: undefined }), {})).toEqual([])
    expect(agentTypeSlotRows(undefined, {})).toEqual([])
  })
})

describe('the slots a launch offers', () => {
  it('are only those a step of the plan fills, at any depth', () => {
    const selfVerified = proposal({
      steps: [
        {
          id: 'features:f1',
          name: 'Fonts',
          kind: 'process',
          agent: false,
          children: [{ id: 'implement', name: 'Implement', kind: 'agent', agent: true }],
        },
        { id: 'fix', name: 'Fix', kind: 'agent', agent: true, slot: 'verifier' },
      ],
    })
    expect(agentTypeSlotRows(selfVerified, {}).map((r) => r.slot)).toEqual(['verifier'])
    expect(
      agentTypeSlotsMetadata(selfVerified, { implementer: 'web-builder', verifier: 'verifier' }),
    ).toEqual({ agentTypeSlots: { verifier: 'verifier' } })
    expect(agentTypeSlotRows(proposal({ steps: [] }), {})).toEqual([])
  })
})

describe('agentTypeSlotsMetadata', () => {
  it('passes back the type each slot runs as approved — the proposed one, or the person’s pick', () => {
    expect(agentTypeSlotsMetadata(proposal(), {})).toEqual({
      agentTypeSlots: { verifier: 'screen-checker' },
    })
    expect(
      agentTypeSlotsMetadata(proposal(), { implementer: 'web-builder', verifier: 'verifier' }),
    ).toEqual({
      agentTypeSlots: { implementer: 'web-builder', verifier: 'verifier' },
    })
  })

  it('passes nothing when every slot runs its built-in and nobody picked', () => {
    const builtins = proposal({
      agentTypeSlots: [{ slot: 'verifier', source: 'builtin', options: ['verifier'] }],
    })
    expect(agentTypeSlotsMetadata(builtins, {})).toBeUndefined()
    expect(agentTypeSlotsMetadata(builtins, { verifier: 'not-an-option' })).toBeUndefined()
    expect(agentTypeSlotsMetadata(undefined, { verifier: 'verifier' })).toBeUndefined()
  })
})

describe('agentTypeSlotsOf', () => {
  it('reads the slots an ask proposed, keeping only slots named with an id', () => {
    expect(agentTypeSlotsOf({ implementer: ' web-builder ', verifier: '', reviewer: 'x' })).toEqual(
      {
        implementer: 'web-builder',
      },
    )
    expect(agentTypeSlotsOf(['verifier'])).toBeUndefined()
    expect(agentTypeSlotsOf({ verifier: 3 })).toBeUndefined()
    expect(agentTypeSlotsOf(undefined)).toBeUndefined()
  })
})
