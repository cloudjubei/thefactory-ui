import { describe, expect, it } from 'vitest'

import { launchOverlapView } from './launchOverlap'

describe('launchOverlapView', () => {
  it('warns of each live run, then the base branch, under one heading', () => {
    expect(
      launchOverlapView({
        runs: [
          {
            runId: 'ed34ace8',
            title: 'Provenance-aware accounting',
            files: ['src/workflow/workflowUtils.ts'],
          },
        ],
        base: { baseRef: 'dev', commits: 3, files: ['src/workflow/workflowTypes.ts'] },
      }),
    ).toEqual({
      heading: 'Overlaps other work',
      lines: [
        '“Provenance-aware accounting” is also changing src/workflow/workflowUtils.ts',
        'dev has 3 new commits in src/workflow/workflowTypes.ts',
      ],
    })
  })

  it('warns of nothing when nothing overlaps', () => {
    expect(launchOverlapView(undefined)).toBeUndefined()
    expect(launchOverlapView({ runs: [] })).toBeUndefined()
  })
})
