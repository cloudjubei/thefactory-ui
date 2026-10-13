import { describe, expect, it } from 'vitest'
import type { ProcessDefinition } from 'thefactory-tools/types'
import { referenceProcessesOf } from './referenceProcesses'

const definition = (over: Partial<ProcessDefinition>): ProcessDefinition =>
  ({
    id: 'd',
    name: 'D',
    steps: [],
    loops: [],
    version: 1,
    updatedAt: 0,
    ...over,
  }) as ProcessDefinition

describe('referenceProcessesOf', () => {
  it('keeps each process by id and name, with the names of the steps it runs, in order', () => {
    expect(
      referenceProcessesOf([
        definition({
          id: 'story-default',
          name: 'Story delivery',
          steps: [
            { id: 'plan', name: 'Plan', kind: 'agent' },
            { id: 'off', name: 'Switched off', kind: 'agent', enabled: false },
            { id: 'sign-off', name: 'Sign-off', kind: 'gate' },
          ] as ProcessDefinition['steps'],
        }),
        definition({ id: 'empty', name: 'Empty' }),
      ]),
    ).toEqual([
      { id: 'story-default', name: 'Story delivery', steps: ['Plan', 'Sign-off'] },
      { id: 'empty', name: 'Empty', steps: [] },
    ])
  })
})
