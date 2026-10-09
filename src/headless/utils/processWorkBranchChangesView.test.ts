import { describe, expect, it } from 'vitest'
import { processWorkBranchChangeRows } from './processWorkBranchChangesView'

const change = (id: string, at: number) => ({
  id,
  at,
  operation: 'commit',
  summary: `Commit ${id}`,
  sha: `${id}`.padEnd(40, '0'),
  decidedBy: 'person' as const,
})

describe('processWorkBranchChangeRows', () => {
  it('lists the changes newest first, each with its commit', () => {
    expect(
      processWorkBranchChangeRows({ workBranchChanges: [change('a', 1), change('b', 2)] }),
    ).toEqual([
      { id: 'b', sha: 'b'.padEnd(40, '0'), summary: 'Commit b', at: 2 },
      { id: 'a', sha: 'a'.padEnd(40, '0'), summary: 'Commit a', at: 1 },
    ])
  })

  it('lists none for a run nobody changed from outside', () => {
    expect(processWorkBranchChangeRows({})).toEqual([])
  })
})
