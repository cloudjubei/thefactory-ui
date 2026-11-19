import type { CatalogBuildProgress, CatalogItem, RecommendProgressData } from '../api/generated'

export interface RecommendProgressState {
  steps: Record<string, { progress: CatalogBuildProgress; items: CatalogItem[] }>
}

export const EMPTY_RECOMMEND_PROGRESS: RecommendProgressState = { steps: {} }

/** Checkpoints are deltas: upsert by product key, retaining earlier categories and revised items. */
export function applyRecommendProgress(
  state: RecommendProgressState,
  event: RecommendProgressData,
  target: { projectId: string; activityId: string; recordType: string },
  hydration?: { protectedKeys: ReadonlySet<string>; preserveProgress: boolean },
): RecommendProgressState {
  if (
    event.projectId !== target.projectId ||
    event.activityId !== target.activityId ||
    event.recordType !== target.recordType
  )
    return state
  const previous = state.steps[event.stepKey]
  const items = new Map(previous?.items.map((item) => [item.key, item]))
  for (const item of event.progress.categoryResult?.items ?? []) {
    if (!hydration?.protectedKeys.has(item.key)) items.set(item.key, item)
  }
  return {
    steps: {
      ...state.steps,
      [event.stepKey]: {
        progress: hydration?.preserveProgress && previous ? previous.progress : event.progress,
        items: [...items.values()],
      },
    },
  }
}

export function catalogItemName(item: CatalogItem): string {
  return typeof item.identity.name === 'string' ? item.identity.name : item.key
}

export function recommendPreviewHandle(args: unknown, result: unknown) {
  const input = args as Record<string, unknown> | undefined
  const output = result as Record<string, unknown> | undefined
  const activityId = output?.activityId ?? input?.activityId
  if (typeof activityId !== 'string' || !activityId) return undefined
  return {
    activityId,
    ...(typeof input?.projectId === 'string' ? { projectId: input.projectId } : {}),
    ...(typeof output?.recordType === 'string' ? { recordType: output.recordType } : {}),
  }
}

export const RECOMMEND_PREVIEW_TOOLS = [
  'buildProductCatalog',
  'findMoreProducts',
  'recommendProducts',
  'getActivity',
] as const
