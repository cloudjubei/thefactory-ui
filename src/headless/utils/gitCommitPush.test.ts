import { describe, expect, it, vi } from 'vitest'

import { GitPushAfterCommitError, commitButtonLabel, commitThenPush } from './gitCommitPush'
import type { GitCommitPushPhase } from './gitCommitPushTypes'

const never = () => new Promise<never>(() => {})

function steps(overrides: Partial<Parameters<typeof commitThenPush>[0]> = {}) {
  const calls: string[] = []
  const phases: GitCommitPushPhase[] = []
  return {
    calls,
    phases,
    steps: {
      commit: vi.fn(async () => void calls.push('commit')),
      push: vi.fn(async () => void calls.push('push')),
      reload: vi.fn(async () => void calls.push('reload')),
      onPhase: (phase: GitCommitPushPhase) => phases.push(phase),
      ...overrides,
    },
  }
}

describe('commitThenPush', () => {
  it('pushes as soon as the commit is made, without waiting for the graph to reload', async () => {
    const run = steps({ reload: vi.fn(never) })
    await commitThenPush(run.steps, { push: true })
    expect(run.calls).toEqual(['commit', 'push'])
    expect(run.steps.reload).toHaveBeenCalledTimes(1)
    expect(run.phases).toEqual(['committing', 'pushing'])
  })

  it('reloads the graph once, after the last request', async () => {
    const run = steps()
    await commitThenPush(run.steps, { push: true })
    await Promise.resolve()
    expect(run.calls).toEqual(['commit', 'push', 'reload'])
  })

  it('only commits when no push was asked for', async () => {
    const run = steps()
    await commitThenPush(run.steps, { push: false })
    expect(run.steps.push).not.toHaveBeenCalled()
    expect(run.phases).toEqual(['committing'])
    expect(run.steps.reload).toHaveBeenCalledTimes(1)
  })

  it('stops at a refused commit, with nothing pushed or reloaded', async () => {
    const refused = new Error('hook said no')
    const run = steps({ commit: vi.fn(async () => Promise.reject(refused)) })
    await expect(commitThenPush(run.steps, { push: true })).rejects.toBe(refused)
    expect(run.steps.push).not.toHaveBeenCalled()
    expect(run.steps.reload).not.toHaveBeenCalled()
  })

  it('says a failed push came after a commit that was made, and still reloads', async () => {
    const rejected = new Error('git push failed: rejected')
    const run = steps({ push: vi.fn(async () => Promise.reject(rejected)) })
    const failure = await commitThenPush(run.steps, { push: true }).catch((err: unknown) => err)
    expect(failure).toBeInstanceOf(GitPushAfterCommitError)
    expect((failure as GitPushAfterCommitError).cause).toBe(rejected)
    expect(run.steps.reload).toHaveBeenCalledTimes(1)
  })

  it('never lets a failed reload fail the commit', async () => {
    const run = steps({ reload: vi.fn(async () => Promise.reject(new Error('timed out'))) })
    await expect(commitThenPush(run.steps, { push: false })).resolves.toBeUndefined()
  })
})

describe('commitButtonLabel', () => {
  it.each([
    [{ amend: false, merging: false, push: false }, 'Commit'],
    [{ amend: false, merging: false, push: true }, 'Commit & Push'],
    [{ amend: true, merging: false, push: true }, 'Amend & Push'],
    [{ amend: true, merging: true, push: false }, 'Commit merge'],
    [{ amend: false, merging: false, push: true, phase: 'committing' as const }, 'Committing…'],
    [{ amend: false, merging: false, push: true, phase: 'pushing' as const }, 'Pushing…'],
  ])('%o reads %s', (input, label) => {
    expect(commitButtonLabel(input)).toBe(label)
  })
})
