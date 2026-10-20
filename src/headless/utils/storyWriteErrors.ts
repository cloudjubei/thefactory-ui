import { extractErrorMessage } from '../api/errorMessage'
import { launchRefusalMessage } from './approvalGrant'
import { FEATURE_WRITE_FAILED, STORY_CHANGE_FAILED } from './storyWriteErrorsConstants'

/**
 * A failed feature change as an error saying why in the backend's words — a
 * refusal by the story's live run included — so every screen that edits a
 * feature can show it as it is. Pure.
 */
export function featureWriteError(err: unknown): Error {
  return new Error(launchRefusalMessage(err) ?? extractErrorMessage(err, FEATURE_WRITE_FAILED))
}

/**
 * Why a story or feature change failed, as the person reads it: the backend's
 * own words — a refusal by the story's live run included — or plain words. Pure.
 */
export function storyChangeErrorText(err: unknown): string {
  return launchRefusalMessage(err) ?? extractErrorMessage(err, STORY_CHANGE_FAILED)
}

/**
 * Make a story or feature change whose failure the person is shown: clears the
 * last error, makes the change, and on a failure reports why instead of
 * throwing. Answers whether the change went through.
 */
export async function attemptStoryChange(
  change: () => Promise<unknown>,
  report: (error: string | undefined) => void,
): Promise<boolean> {
  report(undefined)
  try {
    await change()
    return true
  } catch (err) {
    report(storyChangeErrorText(err))
    return false
  }
}
