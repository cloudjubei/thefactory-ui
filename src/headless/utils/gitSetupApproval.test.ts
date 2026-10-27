import { describe, expect, it } from 'vitest'
import {
  gitSetupDecisionMetadata,
  gitSetupFormFor,
  gitSetupFormProblem,
  gitSetupMilestone,
  gitSetupPlan,
  isGitSetupGrant,
  toolRowFellShort,
  toolRowMilestone,
} from './gitSetupApproval'

const args = { repoName: 'wargames', private: true, description: 'A war game' }

describe('isGitSetupGrant', () => {
  it('is a grant for setupProjectGitRepo, by its tool or its payload', () => {
    expect(isGitSetupGrant({ toolName: 'setupProjectGitRepo' })).toBe(true)
    expect(isGitSetupGrant({ detail: { tool: 'setupProjectGitRepo', args } })).toBe(true)
    expect(isGitSetupGrant({ toolName: 'writeProjectFile' })).toBe(false)
  })
})

describe('the form', () => {
  it('starts from what the agent asked for', () => {
    expect(gitSetupFormFor({ args }, 'wargames-project')).toEqual({
      repoName: 'wargames',
      private: true,
      description: 'A war game',
      owner: '',
    })
  })

  it('falls back to the project id, private, when the agent named nothing', () => {
    expect(gitSetupFormFor({ detail: { args: {} } }, 'car-buyer')).toEqual({
      repoName: 'car-buyer',
      private: true,
      description: '',
      owner: '',
    })
  })

  it('refuses a name or owner GitHub would refuse', () => {
    const form = gitSetupFormFor({ args }, 'p')
    expect(gitSetupFormProblem(form)).toBeUndefined()
    expect(gitSetupFormProblem({ ...form, repoName: '' })).toMatch(/name/i)
    expect(gitSetupFormProblem({ ...form, repoName: 'war games' })).toMatch(/letters/i)
    expect(gitSetupFormProblem({ ...form, repoName: '..' })).toMatch(/name/i)
    expect(gitSetupFormProblem({ ...form, owner: 'acme corp' })).toMatch(/owner/i)
  })

  it('sends a renamed repository even when the agent left the name to the default', () => {
    const form = gitSetupFormFor({ args: {} }, 'car-buyer')
    expect(gitSetupDecisionMetadata(form, {}, 'car-buyer')).toBeUndefined()
    expect(gitSetupDecisionMetadata({ ...form, repoName: 'cars' }, {}, 'car-buyer')).toEqual({
      args: { repoName: 'cars' },
    })
  })

  it('sends only what the user changed', () => {
    const form = gitSetupFormFor({ args }, 'p')
    expect(gitSetupDecisionMetadata(form, args, 'p')).toBeUndefined()
    expect(
      gitSetupDecisionMetadata({ ...form, repoName: 'war-games', owner: 'acme' }, args, 'p'),
    ).toEqual({
      args: { repoName: 'war-games', owner: 'acme' },
    })
    expect(gitSetupDecisionMetadata({ ...form, private: false }, args, 'p')).toEqual({
      args: { private: false },
    })
  })
})

describe('gitSetupPlan', () => {
  const form = gitSetupFormFor({ args }, 'p')

  it('names the repository it creates — account, name and visibility', () => {
    const plan = gitSetupPlan(form, { projectTitle: 'WarGames', account: 'octo' })
    expect(plan.createsRepo).toBe(true)
    expect(plan.target).toBe('octo/wargames')
    expect(plan.lines.join(' ')).toMatch(/private repository octo\/wargames/)
  })

  it('names an owner the user chose over the account', () => {
    expect(gitSetupPlan({ ...form, owner: 'acme' }, { account: 'octo' }).target).toBe(
      'acme/wargames',
    )
  })

  it('says plainly when it would make the code public', () => {
    expect(gitSetupPlan({ ...form, private: false }, {}).lines.join(' ')).toMatch(/PUBLIC/)
  })

  it('creates nothing when the project already has a remote', () => {
    const plan = gitSetupPlan(form, { existingRemote: 'https://github.com/octo/x.git' })
    expect(plan.createsRepo).toBe(false)
    expect(plan.lines.join(' ')).toContain('https://github.com/octo/x.git')
  })
})

describe('gitSetupMilestone', () => {
  const report = (over: Record<string, unknown>) =>
    JSON.stringify({ projectId: 'p', done: [], skipped: [], warnings: [], ...over })

  it('says the user is being asked while the call waits on them', () => {
    expect(gitSetupMilestone(undefined, 'running', true)).toMatchObject({ tone: 'waiting' })
  })

  it('marks the moment the repository was created, linking to it', () => {
    expect(
      gitSetupMilestone(
        report({
          createdRepo: { fullName: 'octo/wargames', private: true },
          pushedBranch: 'main',
          htmlUrl: 'https://github.com/octo/wargames',
        }),
        'success',
        false,
      ),
    ).toEqual({
      tone: 'success',
      title: 'Repository created: octo/wargames',
      detail: 'Private · main pushed',
      link: { url: 'https://github.com/octo/wargames', label: 'Open on GitHub' },
    })
  })

  it('says what was pushed to a remote that already existed', () => {
    expect(
      gitSetupMilestone(
        report({ pushedBranch: 'main', repoUrl: 'https://github.com/octo/x.git' }),
        'success',
        false,
      ),
    ).toMatchObject({ tone: 'success', title: 'Pushed main to https://github.com/octo/x.git' })
  })

  it('says when there was nothing to do, when it needs a credential, and when it failed', () => {
    expect(gitSetupMilestone(report({}), 'success', false)?.title).toMatch(/already set up/)
    expect(gitSetupMilestone(report({ needsCredentials: true }), 'success', false)).toMatchObject({
      tone: 'warning',
    })
    expect(gitSetupMilestone(report({ error: 'Name taken' }), 'success', false)).toMatchObject({
      tone: 'error',
      detail: 'Name taken',
    })
  })

  it('reads a report handed over as an object too, and nothing from a result it cannot read', () => {
    expect(gitSetupMilestone({ pushedBranch: 'main', repoUrl: 'u' }, 'success', false)?.title).toBe(
      'Pushed main to u',
    )
    expect(gitSetupMilestone('not json', 'success', false)).toBeUndefined()
    expect(gitSetupMilestone(undefined, 'running', false)).toBeUndefined()
  })
})

describe('toolRowMilestone', () => {
  it('gives a stopActivity row the outcome its action recorded', () => {
    const recorded = JSON.stringify({ activityId: 'a', outcome: 'noop', status: 'failed' })
    expect(toolRowMilestone('stopActivity', undefined, 'success', false, recorded)).toEqual({
      tone: 'neutral',
      title: 'Already failed — nothing changed',
    })
  })

  it('gives a submitFeatureQuestionAnswer row what the saved answer did', () => {
    const result = { answered: true, storyId: 's1', questionId: 'q1', carriedOn: true }
    expect(toolRowMilestone('submitFeatureQuestionAnswer', result, 'success', false)).toEqual({
      tone: 'success',
      title: 'Answer saved',
      detail: 'The work carried on',
    })
  })

  it('gives a tool with no line none', () => {
    expect(toolRowMilestone('readFile', { outcome: 'stopped' }, 'success', false)).toBeUndefined()
    expect(toolRowMilestone(undefined, { outcome: 'stopped' }, 'success', false)).toBeUndefined()
  })
})

describe('toolRowFellShort', () => {
  it('warns on a call that ran but whose milestone says it fell short', () => {
    expect(toolRowFellShort('success', { tone: 'warning', title: 'Not stopped' })).toBe(true)
    expect(toolRowFellShort('success', { tone: 'error', title: 'Failed' })).toBe(true)
  })

  it('keeps the tick for a milestone that did what was asked, or none', () => {
    expect(toolRowFellShort('success', { tone: 'success', title: 'Stopped' })).toBe(false)
    expect(toolRowFellShort('success', { tone: 'neutral', title: 'Already done' })).toBe(false)
    expect(toolRowFellShort('success', { tone: 'waiting', title: 'Waiting' })).toBe(false)
    expect(toolRowFellShort('success', undefined)).toBe(false)
  })

  it('leaves every other status to its own icon', () => {
    expect(toolRowFellShort('errored', { tone: 'warning', title: 'Not stopped' })).toBe(false)
    expect(toolRowFellShort(undefined, { tone: 'error', title: 'Failed' })).toBe(false)
  })
})
