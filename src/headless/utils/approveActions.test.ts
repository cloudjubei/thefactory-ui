import { describe, expect, it } from 'vitest'
import { approveActionDescriptors, earnedApproveActions } from './approveActions'

const base = { branch: 'run/abc', baseBranch: 'main', hasRemote: true, fileCount: 3 }

describe('approveActionDescriptors', () => {
  it('offers exactly the three ways to approve, in escalating order', () => {
    // Least-committal first: the rightmost button is the one that changes the
    // working tree, so a mis-click lands on the safest option.
    expect(approveActionDescriptors(base).map((d) => d.action)).toEqual([
      'leave-branch',
      'create-pr',
      'merge',
    ])
  })

  it('says where the work ends up, naming the actual branches', () => {
    const [leave, pr, merge] = approveActionDescriptors(base)
    expect(leave?.effects.join(' ')).toContain('run/abc')
    expect(pr?.effects.join(' ')).toContain('run/abc')
    expect(merge?.effects.join(' ')).toContain('main')
  })

  it('warns that create-pr PUSHES — the one outward-facing action', () => {
    const pr = approveActionDescriptors(base).find((d) => d.action === 'create-pr')
    expect(pr?.effects.some((e) => /push/i.test(e))).toBe(true)
    expect(pr?.hint).toMatch(/pull request/i)
  })

  it('states that leave-branch changes nothing in the working tree', () => {
    const leave = approveActionDescriptors(base).find((d) => d.action === 'leave-branch')
    expect(leave?.effects.some((e) => /nothing is merged|not.*merged|no changes/i.test(e))).toBe(
      true,
    )
  })

  it('mentions how many files land on a merge', () => {
    const merge = approveActionDescriptors({ ...base, fileCount: 7 }).find(
      (d) => d.action === 'merge',
    )
    expect(merge?.effects.join(' ')).toContain('7 file')
  })

  it('disables create-pr with a reason when the project has no remote', () => {
    const pr = approveActionDescriptors({ ...base, hasRemote: false }).find(
      (d) => d.action === 'create-pr',
    )
    expect(pr?.disabledReason).toMatch(/no remote/i)
    // The other two stay available — a missing remote is not a reason to block merging.
    const others = approveActionDescriptors({ ...base, hasRemote: false }).filter(
      (d) => d.action !== 'create-pr',
    )
    expect(others.every((d) => d.disabledReason === undefined)).toBe(true)
  })

  it('every action has a hint and a confirm label, so no button is unexplained', () => {
    for (const d of approveActionDescriptors(base)) {
      expect(d.hint.length).toBeGreaterThan(10)
      expect(d.confirmLabel.length).toBeGreaterThan(0)
      expect(d.effects.length).toBeGreaterThan(0)
    }
  })
})

describe('earnedApproveActions', () => {
  const all = approveActionDescriptors(base)

  it('lets a proven run merge from the front', () => {
    const earned = earnedApproveActions(all, 'proven')
    expect(earned?.primary.action).toBe('merge')
    expect(earned?.rest.map((d) => d.action)).toEqual(['leave-branch', 'create-pr'])
  })

  it('puts leave-branch in front of anything less than proven', () => {
    for (const key of ['partly', 'failed', 'not-run'] as const) {
      const earned = earnedApproveActions(all, key)
      expect(earned?.primary.action).toBe('leave-branch')
      expect(earned?.rest.map((d) => d.action)).toEqual(['create-pr', 'merge'])
    }
  })

  it('never drops an action — the menu holds everything that is not primary', () => {
    const earned = earnedApproveActions(all, 'partly')
    expect([earned?.primary, ...(earned?.rest ?? [])]).toHaveLength(all.length)
  })

  it('falls back to the first descriptor when the earned lead is missing', () => {
    const onlyPr = all.filter((d) => d.action === 'create-pr')
    expect(earnedApproveActions(onlyPr, 'proven')?.primary.action).toBe('create-pr')
  })

  it('is undefined with nothing to offer', () => {
    expect(earnedApproveActions([], 'proven')).toBeUndefined()
  })
})
