import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { WorkQueue, WorkQueueEntry, WorkQueueScope } from 'thefactory-tools/types'
import {
  withQueueEntryAdded,
  withQueueEntryMoved,
  withQueueEntryRemoved,
  workQueueEntryKey,
} from 'thefactory-tools/utils'

import { extractErrorMessage } from '../api/errorMessage'
import {
  addToWorkQueue,
  moveInWorkQueue,
  readRunSlots,
  readWorkQueue,
  removeFromWorkQueue,
} from '../api/workQueueApi'
import { workQueueMoveIndex, workQueueView } from '../utils/workQueue'
import { WORK_QUEUE_COPY } from '../utils/workQueueConstants'
import type {
  WorkQueueEntryStates,
  WorkQueueSlots,
  WorkQueueTitles,
  WorkQueueView,
} from '../utils/workQueueTypes'

export type UseWorkQueueOptions = {
  /** What the host knows of each entry: done, running, what it waits on, ready. */
  states?: WorkQueueEntryStates
  titles?: WorkQueueTitles
  /** Told why a change was refused, after it was taken back. */
  onError?: (message: string) => void
}

export type UseWorkQueue = {
  /** Absent until the queue is read, and without a scope. */
  view: WorkQueueView | undefined
  loading: boolean
  error?: string
  moveUp: (entry: WorkQueueEntry) => void
  moveDown: (entry: WorkQueueEntry) => void
  move: (entry: WorkQueueEntry, index: number) => void
  /** Queue it at `index`, last when absent; work already queued is left as it is. */
  add: (entry: WorkQueueEntry, index?: number) => void
  remove: (entry: WorkQueueEntry) => void
  refresh: () => void
}

/**
 * The ordered queue of a project, a group or the whole Overseer, with the run
 * cap in use. Every change shows at once, goes to the queue's route, and is
 * taken back when refused; a change that changes nothing sends nothing.
 */
export function useWorkQueue(
  scope: WorkQueueScope | undefined,
  { states, titles, onError }: UseWorkQueueOptions = {},
): UseWorkQueue {
  const scopeKey = scope ? JSON.stringify(scope) : undefined
  const scopeRef = useRef(scope)
  scopeRef.current = scope
  const onErrorRef = useRef(onError)
  onErrorRef.current = onError
  const [queue, setQueue] = useState<WorkQueue>()
  const [slots, setSlots] = useState<WorkQueueSlots>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>()
  const queueRef = useRef<WorkQueue | undefined>(undefined)
  queueRef.current = queue
  const change = useRef(0)

  const refresh = useCallback(() => {
    const current = scopeRef.current
    if (!current) return
    const at = ++change.current
    setLoading(true)
    void Promise.all([readWorkQueue(current), readRunSlots().catch(() => undefined)])
      .then(([read, readSlots]) => {
        if (at !== change.current) return
        setQueue(read)
        setSlots(readSlots)
        setError(undefined)
      })
      .catch((err: unknown) => {
        if (at === change.current) setError(extractErrorMessage(err, WORK_QUEUE_COPY.loadFailed))
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    setQueue(undefined)
    setSlots(undefined)
    setError(undefined)
    if (scopeKey) refresh()
  }, [scopeKey, refresh])

  const apply = useCallback(
    (
      next: WorkQueueEntry[],
      send: (current: WorkQueueScope) => Promise<WorkQueue>,
      failed: string,
    ) => {
      const current = scopeRef.current
      const before = queueRef.current
      if (!current || !before) return
      const at = ++change.current
      const shown = { ...before, entries: next }
      queueRef.current = shown
      setQueue(shown)
      send(current)
        .then((answer) => {
          if (at === change.current) setQueue(answer)
        })
        .catch((err: unknown) => {
          if (at === change.current) setQueue(before)
          onErrorRef.current?.(extractErrorMessage(err, failed))
        })
    },
    [],
  )

  const move = useCallback(
    (entry: WorkQueueEntry, index: number) => {
      const entries = queueRef.current?.entries ?? []
      const from = entries.findIndex((e) => workQueueEntryKey(e) === workQueueEntryKey(entry))
      if (from === -1 || from === index) return
      apply(
        withQueueEntryMoved(entries, entry, index),
        (current) => moveInWorkQueue(current, entry, index),
        WORK_QUEUE_COPY.moveFailed,
      )
    },
    [apply],
  )

  const step = useCallback(
    (entry: WorkQueueEntry, by: 1 | -1) => {
      const to = workQueueMoveIndex(queueRef.current?.entries ?? [], entry, by)
      if (to !== undefined) move(entry, to)
    },
    [move],
  )
  const moveUp = useCallback((entry: WorkQueueEntry) => step(entry, -1), [step])
  const moveDown = useCallback((entry: WorkQueueEntry) => step(entry, 1), [step])

  const add = useCallback(
    (entry: WorkQueueEntry, index?: number) => {
      const entries = queueRef.current?.entries ?? []
      if (entries.some((e) => workQueueEntryKey(e) === workQueueEntryKey(entry))) return
      apply(
        withQueueEntryAdded(entries, entry, index),
        (current) => addToWorkQueue(current, entry, index),
        WORK_QUEUE_COPY.addFailed,
      )
    },
    [apply],
  )

  const remove = useCallback(
    (entry: WorkQueueEntry) => {
      const entries = queueRef.current?.entries ?? []
      if (!entries.some((e) => workQueueEntryKey(e) === workQueueEntryKey(entry))) return
      apply(
        withQueueEntryRemoved(entries, entry),
        (current) => removeFromWorkQueue(current, entry),
        WORK_QUEUE_COPY.removeFailed,
      )
    },
    [apply],
  )

  const view = useMemo(
    () =>
      queue
        ? workQueueView(queue, {
            ...(slots ? { slots } : {}),
            ...(states ? { states } : {}),
            ...(titles ? { titles } : {}),
          })
        : undefined,
    [queue, slots, states, titles],
  )

  return {
    view,
    loading,
    ...(error ? { error } : {}),
    moveUp,
    moveDown,
    move,
    add,
    remove,
    refresh,
  }
}
