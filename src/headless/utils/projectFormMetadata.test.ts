import { describe, expect, it } from 'vitest'

import { projectMetadataCarried } from './projectFormMetadata'
import { PROJECT_FORM_METADATA_KEYS } from './projectFormMetadataConstants'

describe('projectMetadataCarried', () => {
  it('keeps every key the editor has no field for, as the project holds it', () => {
    const evaluationDefaults = { stage: 'saturate', focusCapabilities: ['grow'] }
    const workspaceIncludes = ['node_modules', '.env.example']
    expect(
      projectMetadataCarried({
        icon: 'rocket',
        stableBranch: 'main',
        evaluationDefaults,
        workspaceIncludes,
        futureFlag: false,
        nothing: null,
      }),
    ).toEqual({ evaluationDefaults, workspaceIncludes, futureFlag: false, nothing: null })
  })

  it('leaves out every key the editor normalises itself', () => {
    const known = Object.fromEntries(PROJECT_FORM_METADATA_KEYS.map((k) => [k, 'x']))
    expect(projectMetadataCarried(known)).toEqual({})
  })

  it('carries nothing when the project has no metadata', () => {
    expect(projectMetadataCarried(undefined)).toEqual({})
    expect(projectMetadataCarried(null)).toEqual({})
    expect(projectMetadataCarried({})).toEqual({})
  })
})
