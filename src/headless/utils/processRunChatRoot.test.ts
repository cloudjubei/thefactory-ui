import { describe, expect, it, vi } from 'vitest'

import { resolveProcessRunChatRoot } from './processRunChatRoot'
import type { ProcessRunTreeLink } from './processRunChatRootTypes'

const link = (id: string, parentRunId?: string | null, projectId = 'p1'): ProcessRunTreeLink => ({
  id,
  projectId,
  ...(parentRunId !== undefined ? { parentRunId } : {}),
})

const readerOf = (runs: readonly ProcessRunTreeLink[]) => {
  const byId = new Map(runs.map((run) => [run.id, run]))
  return vi.fn(async (runId: string) => byId.get(runId))
}

describe('resolveProcessRunChatRoot', () => {
  it('is the run itself when it has no parent, without reading anything', async () => {
    const read = readerOf([])
    await expect(resolveProcessRunChatRoot(link('story-run'), read)).resolves.toEqual(
      link('story-run'),
    )
    expect(read).not.toHaveBeenCalled()
  })

  it('treats a null parent as the top of the tree', async () => {
    const read = readerOf([])
    await expect(resolveProcessRunChatRoot(link('story-run', null), read)).resolves.toEqual(
      link('story-run', null),
    )
    expect(read).not.toHaveBeenCalled()
  })

  it('climbs one level from a feature run to its story run', async () => {
    const root = link('story-run', null, 'p2')
    const read = readerOf([root])
    await expect(resolveProcessRunChatRoot(link('feature-run', 'story-run'), read)).resolves.toBe(
      root,
    )
    expect(read).toHaveBeenCalledTimes(1)
  })

  it('climbs every level of a deep tree to the top', async () => {
    const root = link('a')
    const read = readerOf([root, link('b', 'a'), link('c', 'b')])
    await expect(resolveProcessRunChatRoot(link('d', 'c'), read)).resolves.toBe(root)
    expect(read.mock.calls.map(([id]) => id)).toEqual(['c', 'b', 'a'])
  })

  it('has no root when a parent on the way up cannot be read', async () => {
    const read = readerOf([link('b', 'gone')])
    await expect(resolveProcessRunChatRoot(link('c', 'b'), read)).resolves.toBeUndefined()
  })

  it('has no root when the parent links loop', async () => {
    const read = readerOf([link('a', 'b'), link('b', 'a')])
    await expect(resolveProcessRunChatRoot(link('c', 'a'), read)).resolves.toBeUndefined()
    expect(read).toHaveBeenCalledTimes(2)
  })

  it('has no root when a run names itself as its parent', async () => {
    const read = readerOf([link('a', 'a')])
    await expect(resolveProcessRunChatRoot(link('a', 'a'), read)).resolves.toBeUndefined()
  })

  it('has no root when a read fails', async () => {
    const read = vi.fn(async () => {
      throw new Error('offline')
    })
    await expect(resolveProcessRunChatRoot(link('c', 'b'), read)).resolves.toBeUndefined()
  })
})
