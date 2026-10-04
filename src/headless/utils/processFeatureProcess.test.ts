import { describe, expect, it } from 'vitest'
import type { ProcessProposal } from 'thefactory-tools/types'

import {
  featureProcessChoice,
  featureProcessLabel,
  featureProcessMetadata,
  featureProcessOptions,
  proposalFeatureProcessId,
} from './processFeatureProcess'

const proposal = (featureProcessId: string | undefined): ProcessProposal => ({
  processId: 'story-default',
  name: 'Story',
  steps: [
    ...(featureProcessId
      ? [
          {
            id: 'features:f1',
            name: 'Fonts',
            kind: 'process' as const,
            agent: false,
            subject: { kind: 'feature' as const, id: 'f1', title: 'Fonts' },
            processId: featureProcessId,
          },
        ]
      : []),
    { id: 'fix', name: 'Fix', kind: 'process', agent: false, processId: 'fix-default' },
    { id: 'sign-off', name: 'Sign-off', kind: 'gate', agent: false },
  ],
})

describe('featureProcessOptions', () => {
  it('offers developer then verifier first, and the developer-verifier second, each in one line', () => {
    expect(featureProcessOptions()).toEqual([
      {
        processId: 'feature-default',
        label: 'Developer, then Verifier',
        detail: 'One agent writes the change, a separate verifier proves it on the device.',
      },
      {
        processId: 'feature-self-verified',
        label: 'Developer + verifier in one',
        detail:
          'One agent writes, checks and proves its own change, and hands over only when it is done and proven.',
      },
    ])
  })
})

describe('proposalFeatureProcessId', () => {
  it('reads the process the feature nodes nest — never the fix’s', () => {
    expect(proposalFeatureProcessId(proposal('feature-self-verified'))).toBe(
      'feature-self-verified',
    )
  })

  it('is nothing for a proposal that works no features one by one, or none at all', () => {
    expect(proposalFeatureProcessId(proposal(undefined))).toBeUndefined()
    expect(proposalFeatureProcessId(undefined)).toBeUndefined()
  })
})

describe('featureProcessChoice', () => {
  it('shows the story process’s own feature process until the person picks', () => {
    expect(featureProcessChoice(proposal('feature-default'), undefined)).toBe('feature-default')
  })

  it('shows the person’s pick over it', () => {
    expect(featureProcessChoice(proposal('feature-default'), 'feature-self-verified')).toBe(
      'feature-self-verified',
    )
  })

  it('shows nothing chosen for a nested process not offered, until the person picks', () => {
    expect(featureProcessChoice(proposal('feature-android-fork'), undefined)).toBeUndefined()
  })

  it('offers no choice at all for a process that works no features one by one', () => {
    expect(featureProcessChoice(proposal(undefined), 'feature-self-verified')).toBeUndefined()
  })
})

describe('featureProcessMetadata', () => {
  it('carries a choice offered', () => {
    expect(featureProcessMetadata('feature-self-verified')).toEqual({
      featureProcessId: 'feature-self-verified',
    })
  })

  it('carries nothing for no choice or one not offered', () => {
    expect(featureProcessMetadata(undefined)).toBeUndefined()
    expect(featureProcessMetadata('single')).toBeUndefined()
  })
})

describe('featureProcessLabel', () => {
  const plan = (processId: string) => ({
    steps: [
      {
        id: 'features:f1',
        name: 'Fonts',
        kind: 'process' as const,
        processId,
        subject: { kind: 'feature' as const, id: 'f1', title: 'Fonts' },
      },
    ],
  })

  it('names how a run’s features were worked, in the approval’s words', () => {
    expect(featureProcessLabel(plan('feature-self-verified'))).toBe('Developer + verifier in one')
    expect(featureProcessLabel(plan('feature-default'))).toBe('Developer, then Verifier')
  })

  it('names nothing for a nested process the approval does not offer, or no feature steps', () => {
    expect(featureProcessLabel(plan('feature-android-fork'))).toBeUndefined()
    expect(featureProcessLabel({ steps: [] })).toBeUndefined()
  })
})
