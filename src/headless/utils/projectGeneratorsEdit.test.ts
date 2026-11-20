import { describe, expect, it } from 'vitest'

import {
  projectGeneratorSourceProjects,
  withoutProjectGeneratorAt,
  withProjectGeneratorAt,
  withProjectGeneratorInputFrom,
} from './projectGeneratorsEdit'

const a = { name: 'A', command: 'a', inputs: [], outputs: ['a'] }
const b = { name: 'B', command: 'b', inputs: [], outputs: ['b'] }

describe('withProjectGeneratorAt / withoutProjectGeneratorAt', () => {
  it('replaces and removes the generator at its place, leaving the rest', () => {
    expect(withProjectGeneratorAt([a, b], 1, { ...b, command: 'c' })).toEqual([
      a,
      { ...b, command: 'c' },
    ])
    expect(withoutProjectGeneratorAt([a, b], 0)).toEqual([b])
  })
})

describe('withProjectGeneratorInputFrom', () => {
  it('makes a path another project’s file, keeping one it already names', () => {
    expect(withProjectGeneratorInputFrom({ path: '../api/x.json' }, true)).toEqual({
      path: '../api/x.json',
      from: { projectId: '', path: '' },
    })
    const from = { projectId: 'api', path: 'x.json' }
    expect(withProjectGeneratorInputFrom({ path: '../api/x.json', from }, true)).toEqual({
      path: '../api/x.json',
      from,
    })
  })

  it('makes another project’s file a plain path', () => {
    expect(
      withProjectGeneratorInputFrom(
        { path: '../api/x.json', from: { projectId: 'api', path: 'x.json' } },
        false,
      ),
    ).toEqual({ path: '../api/x.json' })
  })
})

describe('projectGeneratorSourceProjects', () => {
  const from = (projectId: string) => ({ path: 'x', from: { projectId, path: 'y' } })

  it('offers every other project, sorted, never the one being edited', () => {
    expect(projectGeneratorSourceProjects(['web', 'api', 'self'], 'self', [])).toEqual([
      'api',
      'web',
    ])
  })

  it('keeps a project already chosen that the list does not hold, once', () => {
    const generators = [
      { ...a, inputs: [from('gone'), { path: 'local' }] },
      { ...b, inputs: [from('gone'), from('api'), from('')] },
    ]
    expect(projectGeneratorSourceProjects(['api'], undefined, generators)).toEqual(['api', 'gone'])
  })

  it('offers nothing when there is no other project and none is chosen', () => {
    expect(projectGeneratorSourceProjects(['self'], 'self', undefined)).toEqual([])
  })
})
