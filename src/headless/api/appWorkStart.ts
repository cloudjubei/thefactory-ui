import { createFeature, createStory } from './generated'
import { extractErrorMessage } from './errorMessage'
import { workStartFeatures } from '../utils/appWorkStart'
import {
  APP_WORK_START_FAILED,
  APP_WORK_START_FEATURE_MISSING,
} from '../utils/appWorkStartConstants'
import type { AppWorkStartDraft, AppWorkStartProgress } from '../utils/appWorkStartTypes'

/**
 * Make the work an app asked for, once the person said Start: a story in the project and one
 * feature per asked feature (or the work as one). How it is worked is the person's next choice,
 * the same one every Run offers. Each step reports its progress, and a call given that progress
 * carries on from there, so Start after a failure never makes a second story.
 */
export async function makeAppWork(
  projectId: string,
  draft: AppWorkStartDraft,
  progress: AppWorkStartProgress,
  onProgress: (progress: AppWorkStartProgress) => void,
): Promise<{ storyId: string; featureIds: string[] }> {
  try {
    let storyId = progress.storyId
    if (!storyId) {
      const { data } = await createStory({
        path: { projectId },
        body: { title: draft.title.trim(), description: draft.description.trim() },
        throwOnError: true,
      })
      storyId = data.id
    }
    const featureIds = [...(progress.featureIds ?? [])]
    onProgress({ storyId, featureIds: [...featureIds] })
    for (const feature of workStartFeatures(draft).slice(featureIds.length)) {
      const { data } = await createFeature({
        path: { projectId, storyId },
        body: { ...feature, status: 'pending', context: [] },
        throwOnError: true,
      })
      const made = data.features.find((f) => !featureIds.includes(f.id))
      if (!made) throw new Error(APP_WORK_START_FEATURE_MISSING)
      featureIds.push(made.id)
      onProgress({ storyId, featureIds: [...featureIds] })
    }
    return { storyId, featureIds }
  } catch (err) {
    throw new Error(extractErrorMessage(err, APP_WORK_START_FAILED))
  }
}
