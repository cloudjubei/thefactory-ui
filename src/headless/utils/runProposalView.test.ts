import { describe, expect, it } from 'vitest'

import { isRunProposalGrant, runProposalArgs, runProposalView } from './runProposalView'
import {
  RUN_PROPOSAL_CHANGE,
  RUN_PROPOSAL_DEFER,
  RUN_PROPOSAL_FEATURE,
  RUN_PROPOSAL_NEW_STORY,
  RUN_PROPOSAL_RESOLVE,
} from './runProposalViewConstants'

describe('isRunProposalGrant', () => {
  it('knows a run chat’s proposals by the tool the grant names', () => {
    expect(isRunProposalGrant({ toolName: 'proposeRunFeature' })).toBe(true)
    expect(isRunProposalGrant({ toolName: 'resolveNeedsYouItem' })).toBe(true)
  })

  it('knows one by the tool its payload names', () => {
    expect(isRunProposalGrant({ detail: { tool: 'proposeFeatureChange', args: {} } })).toBe(true)
  })

  it('is false for any other tool', () => {
    expect(isRunProposalGrant({ toolName: 'addStory' })).toBe(false)
    expect(isRunProposalGrant({})).toBe(false)
  })
})

describe('runProposalArgs', () => {
  it('reads the grant’s own arguments first', () => {
    expect(runProposalArgs({ args: { a: 1 }, detail: { args: { b: 2 } } })).toEqual({ a: 1 })
  })

  it('falls back to the payload’s arguments', () => {
    expect(runProposalArgs({ detail: { args: { b: 2 } } })).toEqual({ b: 2 })
  })
})

describe('runProposalView', () => {
  it('shows a new feature with what it asks and how it is proven', () => {
    expect(
      runProposalView('proposeRunFeature', {
        title: 'Cap PDF size',
        description: 'Search skips big PDFs.',
        acceptance: 'A PDF over 8 MB is skipped.',
        proofPlan: { kinds: ['unit-tests', 'checks'], notes: 'Time it' },
        needsYouItemId: 'ny-1',
      }),
    ).toEqual({
      kind: 'feature',
      kindLabel: RUN_PROPOSAL_FEATURE.kindLabel,
      tone: 'review',
      title: 'Cap PDF size',
      featureId: undefined,
      storyId: undefined,
      needsYouItemId: 'ny-1',
      lines: [
        { label: 'Description', text: 'Search skips big PDFs.' },
        { label: 'Acceptance', text: 'A PDF over 8 MB is skipped.' },
        { label: 'Proof plan', text: 'unit-tests, checks — Time it' },
      ],
      effect: RUN_PROPOSAL_FEATURE.effect,
      approveLabel: RUN_PROPOSAL_FEATURE.approveLabel,
    })
  })

  it('shows a change with the feature, the new acceptance and the request', () => {
    const view = runProposalView(
      'proposeFeatureChange',
      {
        featureId: 'f1',
        acceptance: 'Only successes are cached.',
        note: 'Retry failures.',
        proofKinds: ['unit-tests'],
      },
      'Read PDFs',
    )!
    expect(view).toMatchObject({
      kind: 'change',
      kindLabel: RUN_PROPOSAL_CHANGE.kindLabel,
      tone: 'working',
      title: 'Read PDFs',
      featureId: 'f1',
      approveLabel: RUN_PROPOSAL_CHANGE.approveLabel,
    })
    expect(view.lines).toEqual([
      { label: 'Acceptance', text: 'Only successes are cached.' },
      { label: 'The request', text: 'Retry failures.' },
      { label: 'Proof required', text: 'unit-tests' },
    ])
  })

  it('titles a change by its feature id when the feature cannot be read', () => {
    expect(runProposalView('proposeFeatureChange', { featureId: 'f1', note: 'n' })?.title).toBe(
      'f1',
    )
  })

  it('shows a decision', () => {
    expect(
      runProposalView('resolveNeedsYouItem', { itemId: 'ny-1', decision: 'Keep caching.' }),
    ).toMatchObject({
      kind: 'resolve',
      kindLabel: RUN_PROPOSAL_RESOLVE.kindLabel,
      tone: 'done',
      title: 'Keep caching.',
      needsYouItemId: 'ny-1',
      lines: [],
      approveLabel: RUN_PROPOSAL_RESOLVE.approveLabel,
    })
  })

  it('shows a deferral', () => {
    expect(
      runProposalView('resolveNeedsYouItem', {
        itemId: 'ny-1',
        decision: 'Later.',
        kind: 'deferred',
      }),
    ).toMatchObject({ kindLabel: RUN_PROPOSAL_DEFER.kindLabel, approveLabel: 'Leave for later' })
  })

  it('shows a decision that was a new story outside the run', () => {
    expect(
      runProposalView('resolveNeedsYouItem', {
        itemId: 'ny-1',
        decision: 'Own story.',
        storyId: 's2',
      }),
    ).toMatchObject({ kindLabel: RUN_PROPOSAL_NEW_STORY.kindLabel, storyId: 's2' })
  })

  it('is undefined for any other tool', () => {
    expect(runProposalView('addStory', {})).toBeUndefined()
  })
})
