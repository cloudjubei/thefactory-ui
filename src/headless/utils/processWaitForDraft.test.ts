import { describe, expect, it } from 'vitest'
import type { ProcessProposal } from 'thefactory-tools/types'

import {
  addProcessWaitForDraft,
  launchLegWaitsForMetadata,
  launchWaitsForMetadata,
  processProposalWaitLine,
  processWaitForDraftRows,
  processWaitForDraftsOf,
  processWaitForDraftsProblem,
  processWaitForOfDraft,
  processWaitForTargetKind,
  processWaitsForOfDrafts,
  removeProcessWaitForDraft,
  updateProcessWaitForDraft,
} from './processWaitForDraft'
import type { ProcessWaitForDrafts } from './processWaitForDraftTypes'

const filled: ProcessWaitForDrafts = {
  rows: [{ key: 'w0', label: 'ZNR-780', target: 'znr-780-persona-evals' }],
  nextKey: 1,
  edited: true,
}

describe('processWaitForTargetKind', () => {
  it('reads a link as a pull request, 7 to 40 hex characters as a commit, anything else as a branch', () => {
    expect(processWaitForTargetKind('https://github.com/o/r/pull/9')).toBe('pull-request')
    expect(processWaitForTargetKind('HTTP://host/pr/1')).toBe('pull-request')
    expect(processWaitForTargetKind('abc1234')).toBe('commit')
    expect(processWaitForTargetKind('  ABCDEF0123456789abcdef0123456789abcdef01 ')).toBe('commit')
    expect(processWaitForTargetKind('abc123')).toBe('branch')
    expect(processWaitForTargetKind('feature/znr-780')).toBe('branch')
    expect(processWaitForTargetKind('   ')).toBeUndefined()
  })
})

describe('processWaitForOfDraft', () => {
  it('names what git looks for by its kind, trimmed, with the project when one was picked', () => {
    expect(processWaitForOfDraft({ key: 'k', label: ' ZNR-780 ', target: ' znr-780 ' })).toEqual({
      label: 'ZNR-780',
      branch: 'znr-780',
    })
    expect(
      processWaitForOfDraft({ key: 'k', label: 'A', target: 'abc1234', projectId: 'osc-web' }),
    ).toEqual({ label: 'A', commit: 'abc1234', projectId: 'osc-web' })
    expect(processWaitForOfDraft({ key: 'k', label: 'A', target: 'https://x/pull/1' })).toEqual({
      label: 'A',
      pullRequestUrl: 'https://x/pull/1',
    })
  })

  it('keeps a row with only a label, and leaves out a row with nothing in it', () => {
    expect(processWaitForOfDraft({ key: 'k', label: 'A', target: '' })).toEqual({ label: 'A' })
    expect(processWaitForOfDraft({ key: 'k', label: ' ', target: ' ' })).toBeUndefined()
  })
})

describe('processWaitsForOfDrafts', () => {
  it('is every filled row in order', () => {
    expect(
      processWaitsForOfDrafts({
        rows: [
          { key: 'a', label: 'A', target: 'a-branch' },
          { key: 'b', label: '', target: '' },
          { key: 'c', label: 'C', target: 'abc1234' },
        ],
        nextKey: 3,
        edited: true,
      }),
    ).toEqual([
      { label: 'A', branch: 'a-branch' },
      { label: 'C', commit: 'abc1234' },
    ])
  })
})

describe('processWaitForDraftsProblem', () => {
  it('is nothing for filled rows or none', () => {
    expect(processWaitForDraftsProblem(filled)).toBeUndefined()
    expect(processWaitForDraftsProblem({ rows: [], nextKey: 0, edited: false })).toBeUndefined()
  })

  it('says, in the launch’s own words, what is missing or wrong', () => {
    expect(
      processWaitForDraftsProblem({
        rows: [{ key: 'a', label: 'ZNR-780', target: '' }],
        nextKey: 1,
        edited: true,
      }),
    ).toMatch(/ZNR-780.*names nothing git can look for/)
    expect(
      processWaitForDraftsProblem({
        rows: [{ key: 'a', label: '', target: 'x' }],
        nextKey: 1,
        edited: true,
      }),
    ).toMatch(/needs a `label`/)
    expect(
      processWaitForDraftsProblem({
        rows: [
          { key: 'a', label: 'A', target: 'x' },
          { key: 'b', label: 'a', target: 'y' },
        ],
        nextKey: 2,
        edited: true,
      }),
    ).toMatch(/named twice/)
  })
})

describe('processWaitForDraftsOf', () => {
  it('starts the rows from what the launch already names, marked not edited', () => {
    expect(
      processWaitForDraftsOf([
        { label: 'ZNR-780', branch: 'b', pullRequestUrl: 'https://x/pull/1' },
        { label: 'ZNR-781', commit: 'abc1234', projectId: 'osc-web' },
        { label: 'ZNR-782', pullRequestUrl: 'https://x/pull/2' },
        { label: 'ZNR-783' },
      ]),
    ).toEqual({
      rows: [
        { key: 'w0', label: 'ZNR-780', target: 'b' },
        { key: 'w1', label: 'ZNR-781', target: 'abc1234', projectId: 'osc-web' },
        { key: 'w2', label: 'ZNR-782', target: 'https://x/pull/2' },
        { key: 'w3', label: 'ZNR-783', target: '' },
      ],
      nextKey: 4,
      edited: false,
    })
    expect(processWaitForDraftsOf(undefined)).toEqual({ rows: [], nextKey: 0, edited: false })
  })
})

describe('adding, changing and removing rows', () => {
  const start: ProcessWaitForDrafts = { rows: [], nextKey: 0, edited: false }

  it('adds an empty row with a fresh key, marked edited', () => {
    const once = addProcessWaitForDraft(start)
    expect(once).toEqual({ rows: [{ key: 'w0', label: '', target: '' }], nextKey: 1, edited: true })
    expect(addProcessWaitForDraft(once).rows.map((r) => r.key)).toEqual(['w0', 'w1'])
  })

  it('changes one row by its key, leaving the others', () => {
    const two = addProcessWaitForDraft(addProcessWaitForDraft(start))
    const changed = updateProcessWaitForDraft(two, 'w1', { label: 'ZNR-781' })
    expect(changed.rows).toEqual([
      { key: 'w0', label: '', target: '' },
      { key: 'w1', label: 'ZNR-781', target: '' },
    ])
    expect(changed.edited).toBe(true)
  })

  it('takes the project off a row when it is set back to the run’s own', () => {
    const row = {
      rows: [{ key: 'w0', label: 'A', target: 'b', projectId: 'p' }],
      nextKey: 1,
      edited: false,
    }
    expect(updateProcessWaitForDraft(row, 'w0', { projectId: undefined }).rows[0]).toStrictEqual({
      key: 'w0',
      label: 'A',
      target: 'b',
    })
  })

  it('removes one row by its key, marked edited', () => {
    const two = addProcessWaitForDraft(addProcessWaitForDraft(start))
    expect(removeProcessWaitForDraft(two, 'w0')).toEqual({
      rows: [{ key: 'w1', label: '', target: '' }],
      nextKey: 2,
      edited: true,
    })
  })
})

describe('processWaitForDraftRows', () => {
  it('says what each row’s target was read as', () => {
    expect(
      processWaitForDraftRows({
        rows: [
          { key: 'a', label: 'A', target: 'feature/x' },
          { key: 'b', label: 'B', target: 'abc1234' },
          { key: 'c', label: 'C', target: 'https://x/pull/1' },
          { key: 'd', label: 'D', target: '' },
        ],
        nextKey: 4,
        edited: true,
      }).map((r) => r.kindLabel),
    ).toEqual(['branch', 'commit', 'pull request', undefined])
  })
})

describe('launchWaitsForMetadata', () => {
  it('sends the rows only once the person changed them', () => {
    expect(launchWaitsForMetadata(filled)).toEqual({
      waitsFor: [{ label: 'ZNR-780', branch: 'znr-780-persona-evals' }],
    })
    expect(launchWaitsForMetadata({ ...filled, edited: false })).toEqual({})
    expect(launchWaitsForMetadata({ rows: [], nextKey: 1, edited: true })).toEqual({ waitsFor: [] })
  })
})

describe('launchLegWaitsForMetadata', () => {
  it('sends every leg the person changed, by project', () => {
    expect(
      launchLegWaitsForMetadata({
        'osc-be': filled,
        'osc-web': { ...filled, edited: false },
      }),
    ).toEqual({
      legWaitsFor: { 'osc-be': [{ label: 'ZNR-780', branch: 'znr-780-persona-evals' }] },
    })
    expect(launchLegWaitsForMetadata({ 'osc-web': { ...filled, edited: false } })).toEqual({})
    expect(launchLegWaitsForMetadata({})).toEqual({})
  })
})

describe('processProposalWaitLine', () => {
  const proposal = (over: Partial<ProcessProposal>): ProcessProposal =>
    ({
      processId: 'p',
      name: 'Story',
      steps: [
        { id: 'features', name: 'Features', kind: 'process', agent: false },
        {
          id: 'wait-for-work',
          name: 'Wait for other work',
          kind: 'check',
          agent: false,
          waitsForWork: true,
        },
        { id: 'report', name: 'Report', kind: 'report', agent: true },
      ],
      ...over,
    }) as ProcessProposal

  it('says what the run waits for, at which step and before which', () => {
    expect(
      processProposalWaitLine(proposal({ waitsFor: [{ label: 'ZNR-780' }, { label: 'ZNR-781' }] })),
    ).toBe('Waits for ZNR-780 and ZNR-781 at “Wait for other work”, before Report')
  })

  it('leaves the next step out when the wait is last, and the step out when the plan has none', () => {
    const last = proposal({
      waitsFor: [{ label: 'A' }],
      steps: [
        {
          id: 'wait-for-work',
          name: 'Wait for other work',
          kind: 'check',
          agent: false,
          waitsForWork: true,
        },
      ],
    })
    expect(processProposalWaitLine(last)).toBe('Waits for A at “Wait for other work”')
    expect(processProposalWaitLine(proposal({ waitsFor: [{ label: 'A' }], steps: [] }))).toBe(
      'Waits for A before its proof',
    )
  })

  it('is nothing when the launch waits for nothing', () => {
    expect(processProposalWaitLine(proposal({}))).toBeUndefined()
    expect(processProposalWaitLine(proposal({ waitsFor: [] }))).toBeUndefined()
    expect(processProposalWaitLine(undefined)).toBeUndefined()
  })
})
