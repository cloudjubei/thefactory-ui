import type { ProcessTryBuildView } from '../utils/processTryBuildViewTypes'
import { client } from './generated/client.gen'

/** A run's phone build for the person to try. Written by hand until the SDK is generated from this route. */
export async function readProcessTryBuild(runId: string): Promise<ProcessTryBuildView> {
  const { data } = await client.get({
    url: `/api/v1/process-runs/${encodeURIComponent(runId)}/try-build`,
    throwOnError: true,
  })
  return data as ProcessTryBuildView
}
