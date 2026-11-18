import { client } from './generated/client.gen'

export type ReviewEvidenceMediaUrl = {
  /** Server-relative URL carrying an evidence-scoped, short-lived grant. */
  url: string
  expiresAt: string
}

/** Authenticated grant request; the resulting URL needs no bearer header. */
export async function readReviewEvidenceMediaUrl(
  projectId: string,
  evidenceId: string,
): Promise<ReviewEvidenceMediaUrl> {
  const { data } = await client.post({
    url: `/api/v1/projects/${encodeURIComponent(projectId)}/review-evidence/${encodeURIComponent(evidenceId)}/media-url`,
    throwOnError: true,
  })
  return data as ReviewEvidenceMediaUrl
}
