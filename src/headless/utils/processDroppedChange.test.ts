import { describe, expect, it } from 'vitest'
import type { ProcessDroppedChangeAcceptance } from 'thefactory-tools/types'

import { processDroppedChangeRows } from './processDroppedChange'
import {
  PROCESS_DROPPED_CHANGE_LABEL,
  PROCESS_DROPPED_CHANGE_WHO,
} from './processDroppedChangeConstants'

const MERGE = 'cf9386d4e2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7'
const OTHER = '0a1b2c3d4e5f60718293a4b5c6d7e8f901234567'
const workBranch = { name: 'factory/approvals-1', baseRef: 'dev', baseSha: 'b'.repeat(40) }

const accepted = (
  over: Partial<ProcessDroppedChangeAcceptance> = {},
): ProcessDroppedChangeAcceptance => ({
  mergeSha: MERGE,
  files: [{ path: 'src/routes/completions.integration.test.ts', kept: 'base' }],
  note: 'dev removed the approval details this test covered, so its test goes too',
  at: 1000,
  stepId: 'checks',
  decidedBy: 'person',
  decidedVia: 'web',
  ...over,
})

describe('processDroppedChangeRows', () => {
  it('lists nothing for a run that accepted no dropped change', () => {
    expect(processDroppedChangeRows({})).toEqual([])
    expect(processDroppedChangeRows({ workBranch, droppedChangesAccepted: [] })).toEqual([])
  })

  it('says the person accepted dropping the work’s change, in which file, at which merge, and why', () => {
    expect(processDroppedChangeRows({ workBranch, droppedChangesAccepted: [accepted()] })).toEqual([
      {
        key: `${MERGE}:src/routes/completions.integration.test.ts`,
        path: 'src/routes/completions.integration.test.ts',
        mergeSha: MERGE,
        note: 'dev removed the approval details this test covered, so its test goes too',
        text: 'You accepted dropping the work’s change in src/routes/completions.integration.test.ts at merge cf9386d: dev removed the approval details this test covered, so its test goes too',
      },
    ])
  })

  it('names the base branch’s change when the merge kept the work, one row per file, oldest first', () => {
    const rows = processDroppedChangeRows({
      workBranch,
      droppedChangesAccepted: [
        accepted({
          files: [
            { path: 'src/a.ts', kept: 'work' },
            { path: 'src/b.ts', kept: 'base' },
          ],
          note: 'first',
        }),
        accepted({ mergeSha: OTHER, files: [{ path: 'src/c.ts', kept: 'work' }], note: 'second' }),
      ],
    })
    expect(rows.map((r) => r.text)).toEqual([
      'You accepted dropping dev’s change in src/a.ts at merge cf9386d: first',
      'You accepted dropping the work’s change in src/b.ts at merge cf9386d: first',
      'You accepted dropping dev’s change in src/c.ts at merge 0a1b2c3: second',
    ])
  })

  it('names a chat agent the person approved when an agent accepted it', () => {
    const [row] = processDroppedChangeRows({
      workBranch,
      droppedChangesAccepted: [accepted({ decidedBy: 'agent', decidedVia: 'tool' })],
    })
    expect(row?.text.startsWith('A chat agent, approved by you, accepted dropping')).toBe(true)
  })

  it('reads an acceptance that says no one as the person’s, and a run with no work branch by "the base"', () => {
    const {
      decidedBy: _by,
      decidedVia: _via,
      ...unattributed
    } = accepted({
      files: [{ path: 'src/a.ts', kept: 'work' }],
    })
    const [row] = processDroppedChangeRows({ droppedChangesAccepted: [unattributed] })
    expect(row?.text).toBe(
      'You accepted dropping the base’s change in src/a.ts at merge cf9386d: dev removed the approval details this test covered, so its test goes too',
    )
  })
})

describe('processDroppedChange constants', () => {
  it('keeps the record’s label short', () => {
    expect(PROCESS_DROPPED_CHANGE_LABEL).toBe('Dropped on purpose')
  })

  it('speaks to the person', () => {
    expect(PROCESS_DROPPED_CHANGE_WHO).toEqual({
      person: 'You',
      agent: 'A chat agent, approved by you,',
    })
  })
})
