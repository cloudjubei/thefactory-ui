import { describe, expect, it } from 'vitest'

import {
  UNCOMMITTED_COMMIT_HASH,
  computeCommitGraph,
  type GitLogCommitLike,
  type GitLogRefLike,
} from './gitCommitGraph'

const commit = (hash: string, parents: string[], refs: GitLogRefLike[] = []): GitLogCommitLike => ({
  hash,
  parents,
  subject: hash,
  authorName: 'a',
  authorEmail: 'a@x',
  authorDate: 0,
  refs,
})

const HEAD: GitLogRefLike = { type: 'HEAD', name: 'HEAD' }

/** A branch's commit newer than the checked-out one, as the log lists it first. */
const LOG = [
  commit('feature-tip', ['base']),
  commit('dev-tip', ['base'], [HEAD, { type: 'branch', name: 'dev' }]),
  commit('base', []),
]

describe('computeCommitGraph', () => {
  it('lays the log out one lane per open line', () => {
    const nodes = computeCommitGraph(LOG)
    expect(nodes.map((n) => [n.commit.hash, n.nodeLane])).toEqual([
      ['feature-tip', 0],
      ['dev-tip', 1],
      ['base', 0],
    ])
  })

  it('hangs uncommitted changes off the checked-out commit, not the newest one', () => {
    const nodes = computeCommitGraph(LOG, { uncommitted: true })
    expect(nodes[0].commit).toMatchObject({ hash: UNCOMMITTED_COMMIT_HASH, parents: ['dev-tip'] })
    expect(nodes.map((n) => [n.commit.hash, n.nodeLane])).toEqual([
      [UNCOMMITTED_COMMIT_HASH, 0],
      ['feature-tip', 1],
      ['dev-tip', 0],
      ['base', 0],
    ])
    expect(nodes[0].outgoingLanes).toEqual(['dev-tip'])
  })

  it('sits on the checked-out commit’s own line when it is the newest', () => {
    const nodes = computeCommitGraph([LOG[1], LOG[2]], { uncommitted: true })
    expect(nodes.map((n) => [n.commit.hash, n.nodeLane])).toEqual([
      [UNCOMMITTED_COMMIT_HASH, 0],
      ['dev-tip', 0],
      ['base', 0],
    ])
  })

  it('draws no line when the checked-out commit is not in the loaded log', () => {
    const nodes = computeCommitGraph([LOG[0]], { uncommitted: true })
    expect(nodes[0].commit.parents).toEqual([])
    expect(nodes[0].outgoingLanes).toEqual([])
    expect(nodes[1].nodeLane).toBe(0)
  })
})
