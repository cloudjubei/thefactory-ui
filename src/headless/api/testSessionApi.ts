import type { LaunchAgentPickMetadata } from '../utils/launchAgentPickTypes'
import type { TestSessionView } from '../utils/testSessionViewTypes'
import {
  getProcessRunTestSession,
  startProcessRunTestSession,
  stopProcessRunTestSession,
} from './generated'

/** A run's test session, and whether one can be started. */
export async function readTestSession(runId: string): Promise<TestSessionView> {
  const { data } = await getProcessRunTestSession({ path: { runId }, throwOnError: true })
  return data as TestSessionView
}

/** Start a run's test session and its helper, on the agent picked; one up already is answered as it is. */
export async function startTestSession(
  runId: string,
  agent: LaunchAgentPickMetadata = {},
): Promise<TestSessionView> {
  const { data } = await startProcessRunTestSession({
    path: { runId },
    body: { ...agent },
    throwOnError: true,
  })
  return data as TestSessionView
}

/** Stop a run's test session; one stopped already is answered as it is. */
export async function stopTestSession(runId: string): Promise<TestSessionView> {
  const { data } = await stopProcessRunTestSession({ path: { runId }, throwOnError: true })
  return data as TestSessionView
}
