import { describe, expect, it } from 'vitest'
import type { ProcessBaseBranchOptions } from 'thefactory-tools/types'

import {
  baseBranchChoice,
  baseBranchChoiceView,
  baseBranchMetadata,
  groupBaseBranchMetadata,
} from './processBaseBranch'
import { BASE_BRANCH_ASKED_MISSING } from './processBaseBranchConstants'

const onTopic: ProcessBaseBranchOptions = {
  current: 'topic',
  preselected: 'topic',
  branches: ['dev', 'main', 'topic', 'alpha', 'zeta'],
}

describe('baseBranchChoice', () => {
  it('shows the preselected branch when nobody chose one', () => {
    expect(baseBranchChoice(onTopic, undefined, undefined)).toBe('topic')
  })

  it('shows the branch the agent asked for over the preselected one', () => {
    expect(baseBranchChoice(onTopic, 'dev', undefined)).toBe('dev')
  })

  it('shows the person’s pick over the agent’s ask', () => {
    expect(baseBranchChoice(onTopic, 'dev', 'main')).toBe('main')
  })

  it('passes over an ask or a pick the project does not have', () => {
    expect(baseBranchChoice(onTopic, 'develop', 'gone')).toBe('topic')
  })

  it('shows nothing for a project with no branches to offer', () => {
    expect(baseBranchChoice(undefined, 'dev', 'main')).toBeUndefined()
  })

  it('shows nothing when the project has nothing to preselect and nobody chose', () => {
    expect(baseBranchChoice({ branches: ['topic'] }, undefined, undefined)).toBeUndefined()
  })
})

describe('baseBranchChoiceView', () => {
  it('offers dev, main and the current branch first, marking the current one', () => {
    expect(baseBranchChoiceView(onTopic, undefined, undefined)).toEqual({
      picked: 'topic',
      usual: [
        { name: 'dev', current: false },
        { name: 'main', current: false },
        { name: 'topic', current: true },
      ],
      others: [
        { name: 'alpha', current: false },
        { name: 'zeta', current: false },
      ],
    })
  })

  it('offers the usual bases alone first on a detached checkout', () => {
    expect(
      baseBranchChoiceView({ preselected: 'main', branches: ['main', 'b'] }, undefined, undefined),
    ).toEqual({
      picked: 'main',
      usual: [{ name: 'main', current: false }],
      others: [{ name: 'b', current: false }],
    })
  })

  it('says when the agent asked for a branch the project does not have', () => {
    const view = baseBranchChoiceView(onTopic, 'develop', undefined)
    expect(view).toMatchObject({ picked: 'topic', askedMissing: 'develop' })
    expect(BASE_BRANCH_ASKED_MISSING('develop')).toBe(
      'The agent asked for develop, which this project does not have.',
    )
  })

  it('offers nothing for a project with no branches to offer', () => {
    expect(baseBranchChoiceView(undefined, 'dev', undefined)).toEqual({ usual: [], others: [] })
  })
})

describe('baseBranchMetadata', () => {
  it('carries the chosen branch', () => {
    expect(baseBranchMetadata('dev')).toEqual({ baseBranch: 'dev' })
  })

  it('carries nothing when no branch is chosen', () => {
    expect(baseBranchMetadata(undefined)).toBeUndefined()
  })
})

describe('groupBaseBranchMetadata', () => {
  const legs = [
    {
      projectId: 'web',
      baseBranches: { current: 'main', preselected: 'main', branches: ['dev', 'main'] },
      baseBranch: 'main',
    },
    {
      projectId: 'api',
      baseBranches: { current: 'dev', preselected: 'dev', branches: ['dev'] },
      baseBranch: 'dev',
    },
    { projectId: 'docs' },
  ]

  it('carries every leg’s branch as its card shows it, the person’s picks over the rest', () => {
    expect(groupBaseBranchMetadata(legs, { web: 'dev' })).toEqual({
      legBaseBranches: { web: 'dev', api: 'dev' },
    })
  })

  it('carries nothing when no leg’s project offers branches', () => {
    expect(groupBaseBranchMetadata([{ projectId: 'docs' }], {})).toBeUndefined()
  })
})
