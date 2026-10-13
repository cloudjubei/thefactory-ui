import { describe, it, expect } from 'vitest'
import {
  createCoalescedRefresh,
  isChatUpdateForProject,
  isRunStateUpdate,
  isRunUpdateForProject,
} from './runUpdateRefresh'

describe('isRunStateUpdate', () => {
  it('ignores a streamed transcript entry — it never changes a run’s status, review or evidence', () => {
    expect(isRunStateUpdate({ runId: 'r', type: 'transcriptAppend', event: {} })).toBe(false)
  })

  it('reacts to every other run update, and to an update of unknown shape', () => {
    for (const type of ['started', 'statusChanged', 'finished', 'reviewUpdated', 'actionDecided'])
      expect(isRunStateUpdate({ runId: 'r', type }), type).toBe(true)
    expect(isRunStateUpdate(undefined)).toBe(true)
  })
})

describe('isChatUpdateForProject', () => {
  it('passes over a chat of another project, whatever kind of chat it is', () => {
    for (const context of [
      { type: 'PROJECT', projectId: 'other' },
      { type: 'STORY', projectId: 'other', storyId: 's' },
      { type: 'AGENT_RUN_FEATURE', projectId: 'other', storyId: 's', featureId: 'f' },
    ]) {
      expect(isChatUpdateForProject({ action: 'messages_added', context }, 'mine')).toBe(false)
    }
    expect(
      isChatUpdateForProject({ action: 'data_location_changed', projectId: 'other' }, 'mine'),
    ).toBe(false)
  })

  it('reacts to a chat of this project', () => {
    expect(
      isChatUpdateForProject(
        { action: 'created', context: { type: 'PROJECT', projectId: 'mine' } },
        'mine',
      ),
    ).toBe(true)
    expect(
      isChatUpdateForProject({ action: 'data_location_changed', projectId: 'mine' }, 'mine'),
    ).toBe(true)
  })

  it('reacts to a chat that names no project, and to an update of unknown shape', () => {
    expect(
      isChatUpdateForProject(
        { action: 'created', context: { type: 'GROUP', groupId: 'g' } },
        'mine',
      ),
    ).toBe(true)
    expect(isChatUpdateForProject(undefined, 'mine')).toBe(true)
    expect(isChatUpdateForProject({ action: 'updated' }, 'mine')).toBe(true)
  })
})

describe('createCoalescedRefresh', () => {
  const deferred = () => {
    let resolve!: () => void
    const promise = new Promise<void>((r) => (resolve = r))
    return { promise, resolve }
  }

  it('never runs two refreshes at once, and folds a burst into ONE trailing refresh', async () => {
    const gates: ReturnType<typeof deferred>[] = []
    let running = 0
    let maxRunning = 0
    const refresh = createCoalescedRefresh(async () => {
      running++
      maxRunning = Math.max(maxRunning, running)
      const gate = deferred()
      gates.push(gate)
      await gate.promise
      running--
    })
    const first = refresh()
    for (let i = 0; i < 20; i++) void refresh()
    expect(gates).toHaveLength(1)
    gates[0]!.resolve()
    await first
    await Promise.resolve()
    expect(gates).toHaveLength(2)
    gates[1]!.resolve()
    await new Promise((r) => setTimeout(r, 0))
    expect(gates).toHaveLength(2)
    expect(maxRunning).toBe(1)
  })

  it('a call after everything settled runs again', async () => {
    let calls = 0
    const refresh = createCoalescedRefresh(async () => {
      calls++
    })
    await refresh()
    await refresh()
    expect(calls).toBe(2)
  })

  it('a failing refresh does not wedge later ones', async () => {
    let calls = 0
    const refresh = createCoalescedRefresh(async () => {
      calls++
      if (calls === 1) throw new Error('boom')
    })
    await expect(refresh()).rejects.toThrow('boom')
    await refresh()
    expect(calls).toBe(2)
  })
})

describe('isRunUpdateForProject', () => {
  it("passes over another project's run update", () => {
    expect(
      isRunUpdateForProject({ runId: 'r', type: 'finished', projectId: 'other' }, 'mine'),
    ).toBe(false)
    expect(
      isRunUpdateForProject(
        { runId: 'r', type: 'reviewUpdated', event: { runId: 'r', projectId: 'other' } },
        'mine',
      ),
    ).toBe(false)
  })

  it("reacts to its own project's run update", () => {
    expect(isRunUpdateForProject({ runId: 'r', type: 'started', projectId: 'mine' }, 'mine')).toBe(
      true,
    )
  })

  it('reacts to an update that names no project, or is of unknown shape', () => {
    expect(isRunUpdateForProject({ runId: 'r', type: 'actionDecided' }, 'mine')).toBe(true)
    expect(isRunUpdateForProject(undefined, 'mine')).toBe(true)
  })
})
