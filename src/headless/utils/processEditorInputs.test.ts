import { describe, expect, it } from 'vitest'
import type { ProcessDefinition, ProcessStep } from 'thefactory-tools/types'

import {
  blankProcessInput,
  blankProcessInputField,
  isSeededProcess,
  processDefinitionInputProblems,
  processExpandChoices,
  processExpandOf,
  processInputKindChoices,
  processStartsFromForm,
  setProcessInput,
  withProcessExpand,
} from './processEditorInputs'

const step: ProcessStep = { id: 's', name: 'S', kind: 'process', processId: 'p' }

const definition = (over: Partial<ProcessDefinition> = {}): ProcessDefinition => ({
  id: 'd',
  name: 'D',
  steps: [
    { ...step, expand: { input: 'variants' } },
    { ...step, id: 't', expand: 'features' },
  ],
  loops: [],
  version: 1,
  updatedAt: 0,
  inputs: [
    { name: 'variants', label: 'Variants', kind: 'variants', fields: [] },
    { name: 'days', label: 'Days', kind: 'number' },
  ],
  ...over,
})

describe('input kinds', () => {
  it('offers a nested field everything but variants', () => {
    expect(processInputKindChoices(false)).toContain('variants')
    expect(processInputKindChoices(true)).not.toContain('variants')
  })
})

describe('blanks', () => {
  it('start valid', () => {
    expect(processDefinitionInputProblems({ inputs: [blankProcessInput(1)] })).toEqual([])
    expect(
      processDefinitionInputProblems({
        inputs: [{ name: 'v', label: 'V', kind: 'variants', fields: [blankProcessInputField(1)] }],
      }),
    ).toEqual([])
  })
})

describe('setProcessInput', () => {
  it('makes a step follow the input it fans out over', () => {
    const next = setProcessInput(definition(), 0, { name: 'versions' })
    expect(next.inputs?.[0]?.name).toBe('versions')
    expect(next.steps[0]?.expand).toEqual({ input: 'versions' })
    expect(next.steps[1]?.expand).toBe('features')
  })

  it('stops a step fanning out over an input that is no longer variants', () => {
    const next = setProcessInput(definition(), 0, { kind: 'text' })
    expect(next.steps[0]?.expand).toBeUndefined()
    expect(next.inputs?.[0]).toEqual({ name: 'variants', label: 'Variants', kind: 'text' })
  })

  it('gives a new variants input fields to fill', () => {
    const next = setProcessInput(definition(), 1, { kind: 'variants' })
    expect(next.inputs?.[1]?.fields).toEqual([])
  })

  it('leaves a process alone for an input it does not have', () => {
    const before = definition()
    expect(setProcessInput(before, 9, { label: 'x' })).toBe(before)
  })

  it('leaves other steps as they were on a label change', () => {
    const before = definition()
    expect(setProcessInput(before, 0, { label: 'Versions' }).steps[0]).toBe(before.steps[0])
  })
})

describe('fan-out picker', () => {
  it('offers once, features and each variants input', () => {
    expect(processExpandChoices(definition()).map((c) => c.value)).toEqual([
      '',
      'features',
      'input:variants',
    ])
  })

  it('reads and writes each choice', () => {
    expect(processExpandOf(step)).toBe('')
    expect(processExpandOf({ expand: 'features' })).toBe('features')
    expect(processExpandOf({ expand: { input: 'v' } })).toBe('input:v')
    expect(withProcessExpand(step, 'features').expand).toBe('features')
    expect(withProcessExpand(step, 'input:v').expand).toEqual({ input: 'v' })
    expect('expand' in withProcessExpand({ ...step, expand: 'features' }, '')).toBe(false)
  })
})

describe('processDefinitionInputProblems', () => {
  it('says what a save would refuse', () => {
    const problems = processDefinitionInputProblems({
      inputs: [
        { name: 'a', label: 'A', kind: 'text' },
        { name: 'a', label: '', kind: 'text' },
      ],
    })
    expect(problems.length).toBeGreaterThanOrEqual(2)
  })

  it('has nothing to say of a process with no inputs', () => {
    expect(processDefinitionInputProblems({})).toEqual([])
  })
})

describe('isSeededProcess', () => {
  it('is true only for what ships as it is', () => {
    expect(isSeededProcess({ seeded: true })).toBe(true)
    expect(isSeededProcess({})).toBe(false)
  })
})

describe('processStartsFromForm', () => {
  it('is true for a process with inputs and no features to work', () => {
    expect(processStartsFromForm(definition({ steps: [] }))).toBe(true)
  })

  it('is false for one that works a story’s features, or asks for nothing', () => {
    expect(processStartsFromForm(definition())).toBe(false)
    expect(processStartsFromForm(definition({ steps: [], inputs: [] }))).toBe(false)
  })
})
