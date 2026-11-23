import type { WorkQueueScope } from 'thefactory-tools/types'

import type { ScopeStop, SupervisorRecord } from '../utils/supervisorPanelTypes'
import {
  getGroupSupervisor,
  getOverseerSupervisor,
  getProjectSupervisor,
  listStops,
  setGroupSupervisor,
  setOverseerSupervisor,
  setProjectSupervisor,
} from './generated'

/** A scope's supervisor: its switch, what it did, and its fallback model. */
export async function readSupervisor(scope: WorkQueueScope): Promise<SupervisorRecord> {
  const { data } =
    scope.kind === 'project'
      ? await getProjectSupervisor({ path: { projectId: scope.projectId }, throwOnError: true })
      : scope.kind === 'group'
        ? await getGroupSupervisor({ path: { groupId: scope.groupId }, throwOnError: true })
        : await getOverseerSupervisor({ throwOnError: true })
  return data as SupervisorRecord
}

/** Switch a scope's supervisor on or off; the answer is its record as it is now. */
export async function switchSupervisor(
  scope: WorkQueueScope,
  enabled: boolean,
): Promise<SupervisorRecord> {
  const body = { enabled }
  const { data } =
    scope.kind === 'project'
      ? await setProjectSupervisor({
          path: { projectId: scope.projectId },
          body,
          throwOnError: true,
        })
      : scope.kind === 'group'
        ? await setGroupSupervisor({ path: { groupId: scope.groupId }, body, throwOnError: true })
        : await setOverseerSupervisor({ body, throwOnError: true })
  return data as SupervisorRecord
}

/** Every stop in a scope, why, and what the supervisor makes of it. */
export async function readScopeStops(scope: WorkQueueScope): Promise<ScopeStop[]> {
  const { data } = await listStops({
    query:
      scope.kind === 'overseer'
        ? { scope: 'overseer' }
        : scope.kind === 'project'
          ? { scope: 'project', id: scope.projectId }
          : { scope: 'group', id: scope.groupId },
    throwOnError: true,
  })
  return (data as { stops: ScopeStop[] }).stops
}
