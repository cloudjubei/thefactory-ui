import { describe, expect, it } from 'vitest'

import {
  blankProjectGenerator,
  projectGeneratorErrors,
  projectGeneratorLines,
  projectGeneratorsError,
  projectGeneratorsOf,
  withProjectGenerators,
} from './projectGenerators'

const client = {
  name: 'API client',
  command: 'npm run generate:api',
  inputs: [
    {
      path: '../api/swagger/swagger.json',
      from: { projectId: 'api', path: 'swagger/swagger.json' },
    },
  ],
  outputs: ['src/generated/api'],
}
const spec = {
  name: 'Spec',
  command: 'make spec',
  inputs: [{ path: 'src/routes' }],
  outputs: ['openapi.yaml'],
}

describe('projectGeneratorsOf', () => {
  it('reads the generators a project declares, and none when it declares none', () => {
    expect(projectGeneratorsOf({ generators: [client, spec] })).toEqual([client, spec])
    expect(projectGeneratorsOf({ generators: [] })).toBeUndefined()
    expect(projectGeneratorsOf({ generators: 'x' })).toBeUndefined()
    expect(projectGeneratorsOf(undefined)).toBeUndefined()
  })
})

describe('projectGeneratorErrors', () => {
  it('says why each generator cannot be saved, by its place, without the setting’s path', () => {
    const errors = projectGeneratorErrors([
      client,
      { ...spec, command: '', outputs: ['../elsewhere'] },
      { ...client, inputs: [{ path: '../api/x.json' }] },
    ])
    expect(errors[0]).toBeUndefined()
    expect(errors[1]).toEqual([
      'command must be a command line',
      'outputs[0] must be a path inside the project, outside .git and node_modules',
    ])
    expect(errors[2]).toEqual([
      'name "API client" is already used by another generator',
      "inputs[0].path leaves the project: say which project's file it is in from",
    ])
  })

  it('has nothing to say of generators that can be saved, or of none', () => {
    expect(projectGeneratorErrors([client, spec])).toEqual({})
    expect(projectGeneratorErrors(undefined)).toEqual({})
    expect(projectGeneratorErrors([])).toEqual({})
  })

  it('refuses a new generator until it is filled in', () => {
    expect(projectGeneratorErrors([blankProjectGenerator()])[0]).toEqual([
      'name must be a non-empty name',
      'command must be a command line',
      'outputs[0] must be a path inside the project, outside .git and node_modules',
    ])
  })
})

describe('projectGeneratorsError', () => {
  it('gives the first generator’s first reason, by its name or else its place', () => {
    expect(projectGeneratorsError([client, { ...spec, command: '' }])).toBe(
      'Spec: command must be a command line',
    )
    expect(projectGeneratorsError([client, { ...spec, name: ' ' }])).toBe(
      'Generator 2: name must be a non-empty name',
    )
    expect(projectGeneratorsError([client, spec])).toBeUndefined()
  })
})

describe('withProjectGenerators', () => {
  it('sets the generators, and drops the key once there are none', () => {
    expect(withProjectGenerators({ icon: 'x' }, [spec])).toEqual({ icon: 'x', generators: [spec] })
    expect(withProjectGenerators({ icon: 'x', generators: [spec] }, [])).toEqual({ icon: 'x' })
    expect(withProjectGenerators({ icon: 'x', generators: [spec] }, undefined)).toEqual({
      icon: 'x',
    })
  })
})

describe('projectGeneratorLines', () => {
  it('names another project’s input as that project’s file, and a path as it is', () => {
    expect(projectGeneratorLines([client, spec])).toEqual([
      {
        name: 'API client',
        command: 'npm run generate:api',
        reads: ['swagger/swagger.json of api'],
        writes: ['src/generated/api'],
      },
      { name: 'Spec', command: 'make spec', reads: ['src/routes'], writes: ['openapi.yaml'] },
    ])
    expect(projectGeneratorLines(undefined)).toEqual([])
  })
})
