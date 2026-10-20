import { createFeatureRequest } from './generated'
import { extractErrorMessage } from './errorMessage'
import { featureRequestBody } from '../utils/appFeatureRequest'
import { APP_FEATURE_REQUEST_FAILED } from '../utils/appFeatureRequestConstants'
import type { AppFeatureRequestDraft } from '../utils/appFeatureRequestTypes'

/** Send the request an app asked for, once the person said Send; resolves to the request's id. */
export async function sendAppFeatureRequest(
  fromProjectId: string,
  draft: AppFeatureRequestDraft,
): Promise<string> {
  try {
    const { data } = await createFeatureRequest({
      body: featureRequestBody(fromProjectId, draft),
      throwOnError: true,
    })
    return data.id
  } catch (err) {
    throw new Error(extractErrorMessage(err, APP_FEATURE_REQUEST_FAILED))
  }
}
