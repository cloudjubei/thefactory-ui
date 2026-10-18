import { describe, expect, it } from 'vitest'

import type { ProjectCheckKnownFlake } from '../api/generated'
import { checkFlakyChip, projectFlakeRows } from './projectFlakes'

const HOUR = 3_600_000
const NOW = 100 * HOUR

const flake = (over: Partial<ProjectCheckKnownFlake>): ProjectCheckKnownFlake => ({
  key: 'src/a.test.ts › adds',
  suite: 'src/a.test.ts',
  name: 'adds',
  count: 1,
  firstSeenAt: NOW - 5 * HOUR,
  lastSeenAt: NOW - 2 * HOUR,
  runs: ['r1'],
  ...over,
})

describe('projectFlakeRows', () => {
  it('lists each flaky test, the most recently seen first, with its runs and any fix filed', () => {
    const rows = projectFlakeRows(
      [
        flake({}),
        flake({
          key: 'app:com.acme.SyncTest',
          suite: 'com.acme.SyncTest',
          module: 'app',
          name: undefined,
          runs: ['r1', 'r2', 'r3'],
          lastSeenAt: NOW - HOUR,
          feature: {
            storyId: 's',
            featureId: 'f',
            title: 'Fix flaky test file: com.acme.SyncTest',
            filedAt: 1,
          },
        }),
      ],
      NOW,
    )
    expect(rows).toEqual([
      {
        key: 'app:com.acme.SyncTest',
        test: 'com.acme.SyncTest',
        file: 'app:com.acme.SyncTest',
        seen: 'Seen in 3 runs',
        lastSeen: '1 hour ago',
        fix: 'Fix filed: Fix flaky test file: com.acme.SyncTest',
      },
      {
        key: 'src/a.test.ts › adds',
        test: 'adds',
        file: 'src/a.test.ts',
        seen: 'Seen in 1 run',
        lastSeen: '2 hours ago',
      },
    ])
  })

  it('lists nothing for a project with none', () => {
    expect(projectFlakeRows(undefined, NOW)).toEqual([])
    expect(projectFlakeRows([], NOW)).toEqual([])
  })
})

describe('checkFlakyChip', () => {
  it('counts the check’s flaky tests and names them on hover', () => {
    expect(
      checkFlakyChip({
        flakyTests: [{ suite: 'src/a.test.ts', name: 'adds' }, { suite: 'tests/test_b.py' }],
      }),
    ).toEqual({
      label: '2 flaky',
      detail: 'Failed in the full run, passed alone: adds, tests/test_b.py',
    })
  })

  it('shows nothing for a check with none', () => {
    expect(checkFlakyChip({})).toBeUndefined()
    expect(checkFlakyChip({ flakyTests: [] })).toBeUndefined()
  })
})
