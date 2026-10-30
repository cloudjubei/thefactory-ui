import { describe, expect, it } from 'vitest'
import type { GitMergeBranchOutcome, GitUnifiedBranch } from '../api'
import type { MergeChecks, VerificationCheckResult } from 'thefactory-tools/types'
import {
  branchMenuItems,
  canPushBranch,
  commitsToBringInLabel,
  mergeBannerTitle,
  mergeBlockedReason,
  mergeChecksOnByDefault,
  mergeChecksView,
  mergeOutcomeLine,
  mergeSentence,
  mergeSourceOptions,
  mergeSourceRef,
} from './gitMerge'

function branch(over: Partial<GitUnifiedBranch> & { name: string }): GitUnifiedBranch {
  return { isLocal: false, isRemote: false, ...over }
}

const branches = [
  branch({
    name: 'feature/x',
    isLocal: true,
    isRemote: true,
    current: true,
    remoteName: 'origin/feature/x',
  }),
  branch({ name: 'dev', isLocal: true, isRemote: true, remoteName: 'origin/dev' }),
  branch({ name: 'main', isLocal: true }),
  branch({ name: 'release', isRemote: true }),
]

describe('mergeSourceRef', () => {
  it('merges a local branch by name and a remote one by its remote-tracking name', () => {
    expect(mergeSourceRef(branches[1]!, 'local')).toBe('dev')
    expect(mergeSourceRef(branches[1]!, 'remote')).toBe('origin/dev')
    expect(mergeSourceRef(branches[3]!, 'remote')).toBe('origin/release')
  })
})

describe('mergeSourceOptions', () => {
  it('offers every local branch, then every remote one, the current one disabled', () => {
    expect(mergeSourceOptions(branches, 'feature/x', '')).toEqual([
      { ref: 'feature/x', kind: 'local', disabledReason: 'This is the current branch.' },
      { ref: 'dev', kind: 'local' },
      { ref: 'main', kind: 'local' },
      { ref: 'origin/feature/x', kind: 'remote' },
      { ref: 'origin/dev', kind: 'remote' },
      { ref: 'origin/release', kind: 'remote' },
    ])
  })

  it('filters by what the person typed, ignoring case', () => {
    expect(mergeSourceOptions(branches, 'feature/x', 'DEV').map((o) => o.ref)).toEqual([
      'dev',
      'origin/dev',
    ])
  })
})

describe('mergeBlockedReason', () => {
  it('blocks a merge with nowhere to merge into, one already under way, and a merge into itself', () => {
    expect(mergeBlockedReason({ current: undefined, merging: false, source: 'dev' })).toBe(
      'HEAD is detached. Check out a branch to merge into.',
    )
    expect(mergeBlockedReason({ current: 'main', merging: true, source: 'dev' })).toBe(
      'A merge is in progress. Commit it or abort it first.',
    )
    expect(mergeBlockedReason({ current: 'main', merging: false, source: 'main' })).toBe(
      'This is the current branch.',
    )
    expect(mergeBlockedReason({ current: 'main', merging: false, source: 'dev' })).toBeUndefined()
    expect(mergeBlockedReason({ current: 'main', merging: false, source: undefined })).toBe(
      'Pick the branch to merge.',
    )
  })
})

describe('mergeSentence', () => {
  it('says what will be merged into what', () => {
    expect(mergeSentence('dev', 'feature/x')).toBe("Merge 'dev' into 'feature/x'")
  })
})

describe('branchMenuItems', () => {
  const base = {
    current: 'feature/x',
    merging: false,
    isDirty: false,
    canCreatePullRequest: false,
  }

  it('offers merging either way, checking out and deleting another local branch', () => {
    expect(branchMenuItems({ ...base, branch: branches[1]!, section: 'local' })).toEqual([
      { action: 'merge', label: 'Merge dev into feature/x' },
      { action: 'merge-in', label: 'Merge feature/x into dev' },
      { action: 'checkout', label: 'Check out dev' },
      { action: 'delete', label: 'Delete dev…', destructive: true },
    ])
  })

  it('offers pushing another local branch with commits its remote lacks, without checking it out', () => {
    const ahead = branch({ name: 'dev', isLocal: true, isRemote: true, ahead: 2 })
    expect(branchMenuItems({ ...base, branch: ahead, section: 'local' })).toEqual([
      { action: 'merge', label: 'Merge dev into feature/x' },
      { action: 'merge-in', label: 'Merge feature/x into dev' },
      { action: 'push', label: 'Push dev (2 commits)' },
      { action: 'checkout', label: 'Check out dev' },
      { action: 'delete', label: 'Delete dev…', destructive: true },
    ])
  })

  it('offers pushing a local branch the remote has never had', () => {
    expect(
      branchMenuItems({ ...base, branch: branches[2]!, section: 'local' }).find(
        (item) => item.action === 'push',
      ),
    ).toEqual({ action: 'push', label: 'Push main' })
  })

  it('offers no push for a branch the remote already has in full, or one shown as remote', () => {
    const ahead = branch({ name: 'dev', isLocal: true, isRemote: true, ahead: 1 })
    const actions = (b: GitUnifiedBranch, section: 'local' | 'remote') =>
      branchMenuItems({ ...base, branch: b, section }).map((item) => item.action)
    expect(actions(branches[1]!, 'local')).not.toContain('push')
    expect(actions(ahead, 'remote')).not.toContain('push')
  })

  it('merges a remote branch by its remote name and offers no checkout of it', () => {
    expect(branchMenuItems({ ...base, branch: branches[1]!, section: 'remote' })).toEqual([
      { action: 'merge', label: 'Merge origin/dev into feature/x' },
      { action: 'delete', label: 'Delete dev…', destructive: true },
    ])
  })

  it('disables merging the current branch into itself and offers nothing that would remove it', () => {
    expect(branchMenuItems({ ...base, branch: branches[0]!, section: 'local' })).toEqual([
      {
        action: 'merge',
        label: 'Merge feature/x into feature/x',
        disabledReason: 'This is the current branch.',
      },
    ])
  })

  it('disables merging and checking out while a merge is in progress', () => {
    const items = branchMenuItems({
      ...base,
      merging: true,
      branch: branches[1]!,
      section: 'local',
    })
    expect(items.find((i) => i.action === 'merge')?.disabledReason).toBe(
      'A merge is in progress. Commit it or abort it first.',
    )
    expect(items.find((i) => i.action === 'checkout')?.disabledReason).toBe(
      'A merge is in progress. Commit it or abort it first.',
    )
  })

  it('disables checking out over uncommitted changes, but not merging', () => {
    const items = branchMenuItems({
      ...base,
      isDirty: true,
      branch: branches[1]!,
      section: 'local',
    })
    expect(items.find((i) => i.action === 'checkout')?.disabledReason).toBe(
      'Commit or stash your changes before switching branches.',
    )
    expect(items.find((i) => i.action === 'merge')?.disabledReason).toBeUndefined()
  })

  it('names the detached HEAD when there is no current branch', () => {
    const items = branchMenuItems({
      ...base,
      current: undefined,
      branch: branches[1]!,
      section: 'local',
    })
    expect(items[0]).toEqual({
      action: 'merge',
      label: 'Merge dev',
      disabledReason: 'HEAD is detached. Check out a branch to merge into.',
    })
  })

  it('offers a pull request where the Git view can open one', () => {
    const items = branchMenuItems({
      ...base,
      canCreatePullRequest: true,
      branch: branches[1]!,
      section: 'local',
    })
    expect(items.map((i) => i.action)).toEqual([
      'merge',
      'merge-in',
      'checkout',
      'pull-request',
      'delete',
    ])
    expect(items[3]).toEqual({ action: 'pull-request', label: 'Create pull request for dev' })
  })
})

describe('branchMenuItems — merging the current branch in', () => {
  const base = { current: 'feature/x', isDirty: false, canCreatePullRequest: false }

  it('offers it on a local branch even while a merge is in progress in the checkout', () => {
    const items = branchMenuItems({
      ...base,
      merging: true,
      branch: branches[1]!,
      section: 'local',
    })
    expect(items.find((i) => i.action === 'merge-in')).toEqual({
      action: 'merge-in',
      label: 'Merge feature/x into dev',
    })
  })

  it('offers it on no remote branch, the current one, or a detached HEAD', () => {
    const actions = (input: Parameters<typeof branchMenuItems>[0]) =>
      branchMenuItems(input).map((i) => i.action)
    expect(
      actions({ ...base, merging: false, branch: branches[1]!, section: 'remote' }),
    ).not.toContain('merge-in')
    expect(
      actions({ ...base, merging: false, branch: branches[0]!, section: 'local' }),
    ).not.toContain('merge-in')
    expect(
      actions({
        ...base,
        current: undefined,
        merging: false,
        branch: branches[1]!,
        section: 'local',
      }),
    ).not.toContain('merge-in')
  })
})

describe('mergeBlockedReason — into a branch that is not checked out', () => {
  it('needs only a source other than that branch: a detached HEAD or a merge in progress do not matter', () => {
    expect(
      mergeBlockedReason({ current: undefined, merging: true, source: 'dev', into: 'main' }),
    ).toBeUndefined()
    expect(
      mergeBlockedReason({ current: 'dev', merging: false, source: undefined, into: 'main' }),
    ).toBe('Pick the branch to merge.')
    expect(
      mergeBlockedReason({ current: 'dev', merging: false, source: 'main', into: 'main' }),
    ).toBe('This is the branch being merged into.')
  })
})

describe('mergeSourceOptions — into a branch that is not checked out', () => {
  it('disables that branch, not the current one', () => {
    const options = mergeSourceOptions(branches, 'feature/x', '', 'main')
    expect(options.find((o) => o.kind === 'local' && o.ref === 'main')?.disabledReason).toBe(
      'This is the branch being merged into.',
    )
    expect(
      options.find((o) => o.kind === 'local' && o.ref === 'feature/x')?.disabledReason,
    ).toBeUndefined()
  })
})

describe('mergeOutcomeLine', () => {
  const into = { source: 'dev', into: 'feature/x' }
  const sha = 'a'.repeat(40)

  it('says how the result’s build and type check went under a merge that ran them', () => {
    const outcome = {
      ...into,
      status: 'merged' as const,
      mergedSha: sha,
      message: "Merge branch 'dev' into feature/x",
      checks: { status: 'passed' as const, summary: 'It builds.', checks: [] },
    }
    expect(mergeOutcomeLine(outcome)).toEqual({
      tone: 'success',
      text: 'Merged dev into feature/x.',
      sha,
      checksNote: 'It builds.',
    })
  })

  it('says a fast-forward built nothing', () => {
    expect(
      mergeOutcomeLine({
        ...into,
        status: 'fast-forward',
        mergedSha: sha,
        message: 'Fast-forwarded.',
        checks: { status: 'skipped', summary: 'Not built: a fast-forward.', checks: [] },
      }),
    ).toMatchObject({ checksNote: 'Not built: a fast-forward.' })
  })

  it('reports a merge commit with its sha', () => {
    const outcome: GitMergeBranchOutcome = {
      ...into,
      status: 'merged',
      mergedSha: sha,
      message: "Merge branch 'dev' into feature/x",
    }
    expect(mergeOutcomeLine(outcome)).toEqual({
      tone: 'success',
      text: 'Merged dev into feature/x.',
      sha,
    })
  })

  it('reports a fast-forward with the commit the branch moved to', () => {
    expect(
      mergeOutcomeLine({
        ...into,
        status: 'fast-forward',
        mergedSha: sha,
        message: 'Fast-forwarded feature/x to dev.',
      }),
    ).toEqual({ tone: 'success', text: 'Fast-forwarded feature/x to dev.', sha })
  })

  it('reports nothing to bring in', () => {
    expect(
      mergeOutcomeLine({
        ...into,
        status: 'up-to-date',
        message: 'feature/x already has every commit on dev.',
      }),
    ).toEqual({ tone: 'info', text: 'feature/x already has every commit on dev.' })
  })

  it('points a staged merge at the commit composer', () => {
    expect(mergeOutcomeLine({ ...into, status: 'staged', message: "Merge branch 'dev'" })).toEqual({
      tone: 'info',
      text: 'The merge of dev is staged. Review it, then commit it with the prepared message.',
    })
  })

  it('counts the files in conflict', () => {
    expect(
      mergeOutcomeLine({
        ...into,
        status: 'conflicts',
        conflictedFiles: ['a', 'b', 'c'],
        message: "Merge branch 'dev'",
      }),
    ).toEqual({ tone: 'warning', text: 'Merging dev into feature/x stopped: 3 files in conflict.' })
    expect(
      mergeOutcomeLine({ ...into, status: 'conflicts', conflictedFiles: ['a'], message: '' }).text,
    ).toBe('Merging dev into feature/x stopped: 1 file in conflict.')
  })

  it('gives git’s reason for a refusal', () => {
    expect(
      mergeOutcomeLine({ ...into, status: 'refused', message: 'nope', reason: 'Local changes.' }),
    ).toEqual({ tone: 'error', text: 'Local changes.' })
  })
})

describe('mergeBannerTitle', () => {
  it('names the merge and counts its conflicts', () => {
    expect(
      mergeBannerTitle(
        { source: 'dev', message: '', conflictedFiles: ['a', 'b', 'c'] },
        'feature/x',
      ),
    ).toBe('Merging dev into feature/x — 3 files in conflict')
    expect(
      mergeBannerTitle({ source: 'dev', message: '', conflictedFiles: ['a'] }, 'feature/x'),
    ).toBe('Merging dev into feature/x — 1 file in conflict')
  })

  it('says a merge with every conflict resolved is ready to commit', () => {
    expect(mergeBannerTitle({ source: 'dev', message: '', conflictedFiles: [] }, 'main')).toBe(
      'Merging dev into main — ready to commit',
    )
  })

  it('makes do without a source or a current branch', () => {
    expect(mergeBannerTitle({ message: '', conflictedFiles: [] }, 'main')).toBe(
      'Merging into main — ready to commit',
    )
    expect(mergeBannerTitle({ source: 'dev', message: '', conflictedFiles: [] }, undefined)).toBe(
      'Merging dev — ready to commit',
    )
  })
})

describe('commitsToBringInLabel', () => {
  it('counts what the merge would bring in, capped where the read stopped', () => {
    expect(commitsToBringInLabel(0, false)).toBe('Nothing to bring in')
    expect(commitsToBringInLabel(1, false)).toBe('1 commit to bring in')
    expect(commitsToBringInLabel(12, false)).toBe('12 commits to bring in')
    expect(commitsToBringInLabel(100, true)).toBe('100+ commits to bring in')
  })
})

describe('mergeChecksOnByDefault', () => {
  const on = [
    branch({ name: 'main', isLocal: true, current: true, isDefault: true }),
    branch({ name: 'dev', isLocal: true }),
  ]

  it('is on for a committed merge into the default branch', () => {
    expect(mergeChecksOnByDefault(on, true)).toBe(true)
  })

  it('is off for a merge left staged', () => {
    expect(mergeChecksOnByDefault(on, false)).toBe(false)
  })

  it('is off for a merge into any other branch', () => {
    expect(mergeChecksOnByDefault(branches, true)).toBe(false)
  })

  it('judges by the branch merged into when that is not the checked-out one', () => {
    expect(mergeChecksOnByDefault(on, true, 'dev')).toBe(false)
    const devOut = [
      branch({ name: 'main', isLocal: true, isDefault: true }),
      branch({ name: 'dev', isLocal: true, current: true }),
    ]
    expect(mergeChecksOnByDefault(devOut, true, 'main')).toBe(true)
  })
})

describe('mergeChecksView', () => {
  const result = (over: Partial<VerificationCheckResult>): VerificationCheckResult => ({
    id: 'build',
    label: 'Build',
    kind: 'command',
    status: 'passed',
    durationMs: 1200,
    summary: 'ok',
    category: 'build',
    ...over,
  })

  it('shows a chip per method that ran, and what the failed ones printed', () => {
    const checks: MergeChecks = {
      status: 'failed',
      summary: 'The merged result fails its type check.',
      sha: 'b'.repeat(40),
      checks: [
        result({ details: 'Output (last lines):\nbuilt in 3s' }),
        result({
          id: 'typecheck',
          label: 'Type check',
          category: 'typecheck',
          status: 'failed',
          details: 'Failing lines:\nsrc/a.ts(1,1): error TS2304',
        }),
      ],
    }
    const view = mergeChecksView(checks)
    expect(view.status).toBe('failed')
    expect(view.summary).toBe('The merged result fails its type check.')
    expect(view.chips.map((c) => [c.id, c.state])).toEqual([
      ['types', 'failed'],
      ['build', 'passed'],
    ])
    expect(view.failingOutput).toBe('Failing lines:\nsrc/a.ts(1,1): error TS2304')
  })

  it('has no failing output when nothing failed, and no chips when nothing ran', () => {
    const view = mergeChecksView({ status: 'skipped', summary: 'Not built.', checks: [] })
    expect(view).toEqual({ status: 'skipped', summary: 'Not built.', chips: [] })
  })
})

describe('canPushBranch', () => {
  it('pushes a local branch ahead of its remote, or one the remote has never had', () => {
    expect(canPushBranch(branch({ name: 'a', isLocal: true, isRemote: true, ahead: 1 }))).toBe(true)
    expect(canPushBranch(branch({ name: 'b', isLocal: true }))).toBe(true)
  })

  it('has nothing to push for a branch level with its remote, or one that is only remote', () => {
    expect(canPushBranch(branch({ name: 'a', isLocal: true, isRemote: true, ahead: 0 }))).toBe(
      false,
    )
    expect(canPushBranch(branch({ name: 'a', isLocal: true, isRemote: true }))).toBe(false)
    expect(canPushBranch(branch({ name: 'r', isRemote: true, ahead: 3 }))).toBe(false)
  })
})
