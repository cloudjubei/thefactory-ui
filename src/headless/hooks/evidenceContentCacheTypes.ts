/** Read one evidence image as a data URI. */
export type EvidenceImageRead = (
  projectId: string,
  id: string,
  mediaType: string,
) => Promise<string | undefined>

/** Read the text of many evidence notes in one request. */
export type EvidenceTextsRead = (
  projectId: string,
  ids: string[],
) => Promise<{ id: string; text: string }[]>

/** How much an {@link EvidenceContentCache} keeps, and how many notes it asks for at once. */
export type EvidenceContentCacheLimits = {
  images: number
  notes: number
  textsPerRequest?: number
}
