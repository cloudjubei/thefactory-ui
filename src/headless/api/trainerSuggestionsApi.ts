import { client } from './generated/client.gen'

/** Person-initiated launch of a stored spec; never sends an agent-supplied spec. */
export async function launchTrainerSuggestion(
  projectId: string,
  suggestionId: string,
  project?: string,
): Promise<{ activityId: string; queued: boolean }> {
  const { data } = await client.post({
    url: `/api/v1/projects/${encodeURIComponent(projectId)}/trainer-suggestions/${encodeURIComponent(suggestionId)}/launch`,
    body: project ? { project } : {},
    headers: { 'Content-Type': 'application/json' },
    throwOnError: true,
  })
  if (
    !data ||
    typeof data !== 'object' ||
    !('activityId' in data) ||
    !('queued' in data) ||
    typeof data.activityId !== 'string' ||
    typeof data.queued !== 'boolean'
  ) {
    throw new Error('The launch response did not identify an activity.')
  }
  return { activityId: data.activityId, queued: data.queued }
}
