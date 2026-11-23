import { describe, expect, it } from 'vitest'
import type { WorkQueue, WorkQueueEntry } from 'thefactory-tools/types'
import { workQueueMoveIndex, workQueueView } from './workQueue'

const story = (storyId: string, extra: Partial<WorkQueueEntry> = {}): WorkQueueEntry =>
  ({ kind: 'story', projectId: 'tools', storyId, ...extra }) as WorkQueueEntry
const group = (groupStoryId: string): WorkQueueEntry => ({
  kind: 'groupStory',
  groupId: 'factory',
  groupStoryId,
})
const queueOf = (...entries: WorkQueueEntry[]): WorkQueue => ({
  scope: { kind: 'project', projectId: 'tools' },
  entries,
})

describe('workQueueView', () => {
  it('reads an empty queue with no rows and the cap in use once the slots are read', () => {
    const view = workQueueView(queueOf(), { slots: { cap: 10, live: 3, waiting: [] } })
    expect(view.rows).toEqual([])
    expect(view.capLine).toBe('3 of 10 running')
    expect(view.capReached).toBe(false)
    expect(view.waitingLine).toBeUndefined()
  })

  it('says nothing of the cap before the slots are read', () => {
    const view = workQueueView(queueOf(story('a')), {})
    expect(view.capLine).toBeUndefined()
    expect(view.capReached).toBe(false)
  })

  it('names each entry’s state: done, running, waiting on blockers, next and waiting for a slot', () => {
    const view = workQueueView(
      queueOf(story('done'), story('live'), story('held'), story('first'), group('second')),
      {
        slots: { cap: 2, live: 1, waiting: [] },
        states: {
          'story:tools/done': { done: true },
          'story:tools/live': { running: true },
          'story:tools/held': { waitingOn: ['Login API', 'Schema'] },
          'story:tools/first': { ready: true },
          'groupStory:factory/second': {},
        },
        titles: { 'story:tools/first': 'Queue panel' },
      },
    )
    expect(view.rows.map((r) => [r.state, r.stateLabel])).toEqual([
      ['done', 'Done'],
      ['running', 'Running'],
      ['blocked', 'Waiting on blockers'],
      ['next', 'Next'],
      ['slot', 'Waiting for a slot'],
    ])
    expect(view.rows[2]?.detail).toBe('Waits on Login API, Schema')
    expect(view.rows[3]?.title).toBe('Queue panel')
    expect(view.rows[0]?.title).toBe('done')
    expect(view.rows[4]?.where).toBe('factory')
    expect(view.rows[3]?.tone).toBe('review')
  })

  it('holds back a story that is not ready only when planning is off for it', () => {
    const view = workQueueView(queueOf(story('plans'), story('skips', { planning: false })), {
      slots: { cap: 10, live: 0, waiting: [] },
      states: { 'story:tools/plans': { ready: false }, 'story:tools/skips': { ready: false } },
    })
    expect(view.rows.map((r) => r.state)).toEqual(['next', 'not-ready'])
    expect(view.rows[1]?.skipsPlanning).toBe(true)
    expect(view.rows[0]?.skipsPlanning).toBe(false)
    expect(view.rows[1]?.detail).toBe('Not ready, and planning is off for it')
  })

  it('reads an entry the host knows nothing of as queued', () => {
    const view = workQueueView(queueOf(story('a')), { slots: { cap: 10, live: 0, waiting: [] } })
    expect(view.rows[0]?.state).toBe('queued')
  })

  it('counts the runs waiting for a slot against the cap, as the picker does', () => {
    const view = workQueueView(queueOf(story('a')), {
      slots: {
        cap: 3,
        live: 2,
        waiting: [{ runId: 'r9', projectId: 'tools', title: 'Late', position: 1 }],
      },
      states: { 'story:tools/a': {} },
    })
    expect(view.capLine).toBe('2 of 3 running')
    expect(view.capReached).toBe(true)
    expect(view.waitingLine).toBe('1 run waiting for a slot')
    expect(view.rows[0]?.state).toBe('slot')
  })

  it('offers moving up everywhere but the top, and down everywhere but the bottom', () => {
    const view = workQueueView(queueOf(story('a'), story('b'), story('c')), {})
    expect(view.rows.map((r) => [r.index, r.canMoveUp, r.canMoveDown])).toEqual([
      [0, false, true],
      [1, true, true],
      [2, true, false],
    ])
  })
})

describe('workQueueMoveIndex', () => {
  const entries = [story('a'), story('b'), story('c')]

  it('moves an entry one place up or down', () => {
    expect(workQueueMoveIndex(entries, story('b'), -1)).toBe(0)
    expect(workQueueMoveIndex(entries, story('b'), 1)).toBe(2)
  })

  it('finds the entry by its work, whatever it says of planning', () => {
    expect(workQueueMoveIndex(entries, story('c', { planning: false }), -1)).toBe(1)
  })

  it('has nowhere to move past either end, or for work that is not queued', () => {
    expect(workQueueMoveIndex(entries, story('a'), -1)).toBeUndefined()
    expect(workQueueMoveIndex(entries, story('c'), 1)).toBeUndefined()
    expect(workQueueMoveIndex(entries, story('z'), 1)).toBeUndefined()
  })
})
