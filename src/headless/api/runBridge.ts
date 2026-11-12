import type { ProcessRun } from 'thefactory-tools/types'
import { getProcessRun, listProcessRuns } from './generated'
import { errorStatus, extractErrorMessage } from './errorMessage'
import { bridgeMessageName, type BridgeRequest } from '../utils/appBridge'
import { RUN_READ_MESSAGE } from '../utils/appBridgeConstants'
import { appRunQueryOf, appRunStateOf, openChildRunId } from '../utils/appRunState'
import {
  APP_RUN_NESTING_MAX,
  APP_RUN_NO_PROJECT,
  APP_RUN_OTHER_PROJECT,
  APP_RUN_READ_FAILED,
} from '../utils/appRunStateConstants'
import type { AppRunState } from '../utils/appRunStateTypes'
import { compareRunsNewestFirst } from '../utils/processRunOrder'

async function readRun(runId: string): Promise<ProcessRun | null> {
  try {
    return (await getProcessRun({ path: { runId }, throwOnError: true })).data as ProcessRun
  } catch (err) {
    if (errorStatus(err) === 404) return null
    throw err
  }
}

async function nestedRuns(projectId: string, run: ProcessRun): Promise<ProcessRun[]> {
  const chain = [run]
  while (chain.length < APP_RUN_NESTING_MAX) {
    const childId = openChildRunId(chain[chain.length - 1]!)
    const nested = childId ? await readRun(childId).catch(() => null) : null
    if (!nested || nested.projectId !== projectId) break
    chain.push(nested)
  }
  return chain
}

async function newestStoryRun(projectId: string, storyId: string): Promise<ProcessRun | null> {
  const { data } = await listProcessRuns({
    query: { projectId, storyId, rootOnly: true },
    throwOnError: true,
  })
  const own = (data ?? []).filter((r) => r.projectId === projectId && r.storyId === storyId)
  return (own.slice().sort(compareRunsNewestFirst)[0] as ProcessRun | undefined) ?? null
}

/**
 * `overseer:run.read {runId}` or `{storyId}`: where a run of the app's own project stands — work
 * it started, or any other — read live, `null` once it is gone or the story has none. Another
 * project's run is refused. Other messages pass through.
 */
export async function dispatchRunBridge(
  projectId: string | undefined,
  req: BridgeRequest,
): Promise<AppRunState | null | undefined> {
  if (bridgeMessageName(req.type) !== RUN_READ_MESSAGE) return undefined
  if (!projectId) throw new Error(APP_RUN_NO_PROJECT)
  const query = appRunQueryOf(req.payload)
  if ('error' in query) throw new Error(query.error)
  try {
    const run =
      'runId' in query ? await readRun(query.runId) : await newestStoryRun(projectId, query.storyId)
    if (!run) return null
    if (run.projectId !== projectId) throw new Error(APP_RUN_OTHER_PROJECT)
    return appRunStateOf(await nestedRuns(projectId, run), Date.now())
  } catch (err) {
    if (err instanceof Error && err.message === APP_RUN_OTHER_PROJECT) throw err
    throw new Error(extractErrorMessage(err, APP_RUN_READ_FAILED))
  }
}
