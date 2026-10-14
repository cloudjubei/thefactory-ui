import { listProcessRuns, listStories, type GetStoryResponse } from './generated'
import { bridgeMessageName, type BridgeRequest } from '../utils/appBridge'

type StorySource = {
  stories: GetStoryResponse[]
  isLoaded: boolean
  loadError: Error | null
}

/** Read-only work summaries. Unowned messages pass through; credentials stay in the host. */
export async function dispatchWorkBridge(
  projectId: string | undefined,
  req: BridgeRequest,
  storySource?: StorySource,
): Promise<unknown> {
  const name = bridgeMessageName(req.type)
  if (name !== 'stories.list' && name !== 'runs.list') return undefined
  if (!projectId) return []

  try {
    if (name === 'stories.list') {
      if (storySource?.loadError) throw storySource.loadError
      // Use the live StoriesProvider snapshot when loaded. A request during initial
      // loading still reads the backend rather than reporting a false empty state.
      const stories = storySource?.isLoaded
        ? storySource.stories
        : (await listStories({ path: { projectId }, throwOnError: true })).data
      return (stories ?? []).map(({ id, title, status, features }) => ({
        id,
        title,
        status,
        features: features.map(({ id, title, status }) => ({ id, title, status })),
      }))
    }

    const { data } = await listProcessRuns({
      query: { projectId, rootOnly: true },
      throwOnError: true,
    })
    return (data ?? [])
      .filter((run) => run.projectId === projectId)
      .slice()
      .sort((a, b) => (b.startedAt ?? 0) - (a.startedAt ?? 0))
      .map(({ id, title, status, plan, storyId, cursor, park, updatedAt }) => ({
        id,
        title,
        status,
        processId: plan.definitionId,
        storyId,
        currentStepId: cursor?.stepId,
        ...(park ? { park } : {}),
        updatedAt,
      }))
  } catch (err) {
    throw workError(err)
  }
}

/** Lift the readable backend message out of an axios error, as projectsError does. */
function workError(err: unknown): Error {
  const e = err as { response?: { data?: { error?: unknown } }; message?: unknown }
  const detail = e?.response?.data?.error
  if (typeof detail === 'string' && detail.trim()) return new Error(detail)
  if (err instanceof Error) return err
  if (typeof e?.message === 'string' && e.message) return new Error(e.message)
  return new Error('Work request failed')
}
