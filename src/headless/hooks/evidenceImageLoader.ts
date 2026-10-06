export type EvidenceImageFetch = (
  projectId: string,
  id: string,
  mediaType: string,
) => Promise<string | undefined>

/** Turn a fetched body into a data URI usable by both `<img>` and RN `<Image>`. */
export function evidenceDataUri(data: unknown, mediaType: string): string | undefined {
  if (typeof data === 'string') {
    return data.startsWith('data:') ? data : `data:${mediaType};base64,${data}`
  }
  if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
    const bytes =
      data instanceof ArrayBuffer
        ? new Uint8Array(data)
        : new Uint8Array(data.buffer as ArrayBuffer, data.byteOffset, data.byteLength)
    let binary = ''
    for (const byte of bytes) binary += String.fromCharCode(byte)
    return `data:${mediaType};base64,${btoa(binary)}`
  }
  return undefined
}

/**
 * Decodes evidence images by id, each at most once per project. An evidence id is
 * immutable, so bytes are written whenever they arrive — a live re-pull of the
 * listing in the meantime changes nothing about them. Only a change of project
 * (or a reset) drops a late write, and forgets the request so it can be asked again.
 */
export class EvidenceImageLoader {
  private readonly _fetch: EvidenceImageFetch
  private readonly _onImage: (id: string, dataUri: string) => void
  private _projectId: string | undefined
  private _generation = 0
  private _requested = new Set<string>()

  constructor(fetch: EvidenceImageFetch, onImage: (id: string, dataUri: string) => void) {
    this._fetch = fetch
    this._onImage = onImage
  }

  setScope(projectId: string | undefined): void {
    if (projectId === this._projectId) return
    this._projectId = projectId
    this.reset()
  }

  reset(): void {
    this._generation += 1
    this._requested = new Set()
  }

  requestImage(id: string, mediaType: string): void {
    if (!this._projectId || this._requested.has(id)) return
    this._requested.add(id)
    void this.loadImage(id, mediaType)
  }

  async loadImage(id: string, mediaType: string): Promise<string | undefined> {
    const projectId = this._projectId
    if (!projectId) return undefined
    const generation = this._generation
    let dataUri: string | undefined
    try {
      dataUri = await this._fetch(projectId, id, mediaType)
    } catch {
      return undefined
    }
    if (dataUri && generation === this._generation) this._onImage(id, dataUri)
    return dataUri
  }
}
