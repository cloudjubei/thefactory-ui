import type { ReviewEvidenceRef } from '../api/generated'
import { BoundedCache } from '../utils/boundedCache'
import { EVIDENCE_TEXTS_PER_REQUEST } from '../utils/processViewCacheConstants'
import { isReadableNote } from '../utils/reviewEvidenceView'
import type {
  EvidenceContentCacheLimits,
  EvidenceImageRead,
  EvidenceTextsRead,
} from './evidenceContentCacheTypes'

function contentKey(projectId: string, id: string): string {
  return `${projectId}|${id}`
}

/**
 * Evidence images and note texts as read this session, shared by every view
 * that shows them: an evidence id's bytes never change, so the sign-off, the
 * step panel and a verify review showing one screenshot read it once between
 * them, and a note's text is read with every other note it is listed with in
 * one request. A failed read is not kept, so the next asker reads again.
 */
export class EvidenceContentCache {
  private readonly _read: { image: EvidenceImageRead; texts: EvidenceTextsRead }
  private readonly _images: BoundedCache<string>
  private readonly _notes: BoundedCache<string>
  private readonly _imageReads = new Map<string, Promise<string | undefined>>()
  private readonly _textsPerRequest: number

  constructor(
    read: { image: EvidenceImageRead; texts: EvidenceTextsRead },
    limits: EvidenceContentCacheLimits,
  ) {
    this._read = read
    this._images = new BoundedCache(limits.images)
    this._notes = new BoundedCache(limits.notes)
    this._textsPerRequest = Math.max(1, limits.textsPerRequest ?? EVIDENCE_TEXTS_PER_REQUEST)
  }

  /** An image already read, as a data URI. */
  image(projectId: string, id: string): string | undefined {
    return this._images.get(contentKey(projectId, id))
  }

  /** An image as a data URI — from what was read, else one read shared by everyone asking now. */
  loadImage(projectId: string, id: string, mediaType: string): Promise<string | undefined> {
    const key = contentKey(projectId, id)
    const held = this._images.get(key)
    if (held) return Promise.resolve(held)
    const inFlight = this._imageReads.get(key)
    if (inFlight) return inFlight
    const read = this._read
      .image(projectId, id, mediaType)
      .then((dataUri) => {
        if (dataUri) this._images.set(key, dataUri)
        return dataUri
      })
      .catch(() => undefined)
      .finally(() => this._imageReads.delete(key))
    this._imageReads.set(key, read)
    return read
  }

  /** The text of every readable note in `refs`: what is held, and the rest read in as few requests as the server takes. */
  async noteTexts(
    projectId: string,
    refs: readonly ReviewEvidenceRef[],
  ): Promise<Record<string, string>> {
    const texts: Record<string, string> = {}
    const missing: string[] = []
    for (const ref of refs) {
      if (!isReadableNote(ref)) continue
      const held = this._notes.get(contentKey(projectId, ref.id))
      if (held !== undefined) texts[ref.id] = held
      else missing.push(ref.id)
    }
    for (let at = 0; at < missing.length; at += this._textsPerRequest) {
      const ids = missing.slice(at, at + this._textsPerRequest)
      const read = await this._read.texts(projectId, ids).catch(() => [])
      for (const { id, text } of read) {
        this._notes.set(contentKey(projectId, id), text)
        texts[id] = text
      }
    }
    return Object.fromEntries(
      refs.filter((ref) => texts[ref.id] !== undefined).map((ref) => [ref.id, texts[ref.id]]),
    )
  }

  /** Forget everything — for a sign-out, and for tests. */
  clear(): void {
    this._images.clear()
    this._notes.clear()
    this._imageReads.clear()
  }
}
