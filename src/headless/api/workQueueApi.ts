import type { WorkQueue, WorkQueueEntry, WorkQueueScope } from 'thefactory-tools/types'

import type { WorkQueueSlots } from '../utils/workQueueTypes'
import {
  addToGroupQueue,
  addToOverseerQueue,
  addToProjectQueue,
  getGroupQueue,
  getOverseerQueue,
  getProcessRunSlots,
  getProjectQueue,
  moveInGroupQueue,
  moveInOverseerQueue,
  moveInProjectQueue,
  removeFromGroupQueue,
  removeFromOverseerQueue,
  removeFromProjectQueue,
} from './generated'

/** A scope's queue, in the order it starts. */
export async function readWorkQueue(scope: WorkQueueScope): Promise<WorkQueue> {
  const { data } =
    scope.kind === 'project'
      ? await getProjectQueue({ path: { projectId: scope.projectId }, throwOnError: true })
      : scope.kind === 'group'
        ? await getGroupQueue({ path: { groupId: scope.groupId }, throwOnError: true })
        : await getOverseerQueue({ throwOnError: true })
  return data as WorkQueue
}

/** Queue `entry` at `index`, last when absent; the answer is the queue as it is now. */
export async function addToWorkQueue(
  scope: WorkQueueScope,
  entry: WorkQueueEntry,
  index?: number,
): Promise<WorkQueue> {
  const body = { entry, ...(index !== undefined ? { index } : {}) }
  const { data } =
    scope.kind === 'project'
      ? await addToProjectQueue({ path: { projectId: scope.projectId }, body, throwOnError: true })
      : scope.kind === 'group'
        ? await addToGroupQueue({ path: { groupId: scope.groupId }, body, throwOnError: true })
        : await addToOverseerQueue({ body, throwOnError: true })
  return data as WorkQueue
}

/** Move `entry`'s work to `index`, 0 first; the answer is the queue as it is now. */
export async function moveInWorkQueue(
  scope: WorkQueueScope,
  entry: WorkQueueEntry,
  index: number,
): Promise<WorkQueue> {
  const body = { entry, index }
  const { data } =
    scope.kind === 'project'
      ? await moveInProjectQueue({ path: { projectId: scope.projectId }, body, throwOnError: true })
      : scope.kind === 'group'
        ? await moveInGroupQueue({ path: { groupId: scope.groupId }, body, throwOnError: true })
        : await moveInOverseerQueue({ body, throwOnError: true })
  return data as WorkQueue
}

/** Take `entry`'s work off the queue; the answer is the queue as it is now. */
export async function removeFromWorkQueue(
  scope: WorkQueueScope,
  entry: WorkQueueEntry,
): Promise<WorkQueue> {
  const body = { entry }
  const { data } =
    scope.kind === 'project'
      ? await removeFromProjectQueue({
          path: { projectId: scope.projectId },
          body,
          throwOnError: true,
        })
      : scope.kind === 'group'
        ? await removeFromGroupQueue({ path: { groupId: scope.groupId }, body, throwOnError: true })
        : await removeFromOverseerQueue({ body, throwOnError: true })
  return data as WorkQueue
}

/** The run cap, the runs holding a slot and those waiting for one. */
export async function readRunSlots(): Promise<WorkQueueSlots> {
  const { data } = await getProcessRunSlots({ throwOnError: true })
  return data as WorkQueueSlots
}
