import { describe, expect, it } from 'vitest'

import { gitBranchTipSha } from './gitBranchTip'

describe('gitBranchTipSha', () => {
  const branch = { current: false, localSha: 'local-1', remoteSha: 'remote-1' }

  it('is the local tip for a local row, the remote tip for a remote row', () => {
    expect(gitBranchTipSha(branch, 'local', false)).toBe('local-1')
    expect(gitBranchTipSha(branch, 'remote', false)).toBe('remote-1')
  })

  it('falls back to the side that exists', () => {
    expect(gitBranchTipSha({ ...branch, localSha: undefined }, 'local', false)).toBe('remote-1')
    expect(gitBranchTipSha({ ...branch, remoteSha: undefined }, 'remote', false)).toBe('local-1')
  })

  it('is the uncommitted changes for the current branch’s local row while the tree is dirty', () => {
    const current = { ...branch, current: true }
    expect(gitBranchTipSha(current, 'local', true)).toBe('UNCOMMITTED')
    expect(gitBranchTipSha(current, 'remote', true)).toBe('remote-1')
    expect(gitBranchTipSha(current, 'local', false)).toBe('local-1')
  })

  it('is nothing for a branch with no tip', () => {
    expect(gitBranchTipSha({ current: false }, 'local', false)).toBeUndefined()
  })
})
