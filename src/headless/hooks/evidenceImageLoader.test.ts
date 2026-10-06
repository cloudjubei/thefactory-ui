import { describe, expect, it, vi } from 'vitest'

import { EvidenceImageLoader, evidenceDataUri } from './evidenceImageLoader'

type Pending = { resolve: (uri: string | undefined) => void; reject: (err: unknown) => void }

function controlledFetch() {
  const pending = new Map<string, Pending>()
  const fetch = vi.fn(
    (_projectId: string, id: string) =>
      new Promise<string | undefined>((resolve, reject) => {
        pending.set(id, { resolve, reject })
      }),
  )
  return { fetch, pending }
}

function loaderWith(projectId: string | null = 'p1') {
  const { fetch, pending } = controlledFetch()
  const images: Record<string, string> = {}
  const loader = new EvidenceImageLoader(fetch, (id, uri) => {
    images[id] = uri
  })
  loader.setScope(projectId ?? undefined)
  return { loader, fetch, pending, images }
}

const flush = () => new Promise((r) => setTimeout(r, 0))

describe('EvidenceImageLoader.requestImage', () => {
  it('writes both frames of a pair when the after arrives long after the before', async () => {
    const { loader, pending, images } = loaderWith()
    loader.requestImage('before', 'image/png')
    loader.requestImage('after', 'image/png')
    pending.get('before')!.resolve('data:before')
    await flush()
    pending.get('after')!.resolve('data:after')
    await flush()
    expect(images).toEqual({ before: 'data:before', after: 'data:after' })
  })

  it('writes an image whose bytes arrive after the listing was re-pulled', async () => {
    const { loader, pending, images } = loaderWith()
    loader.requestImage('after', 'image/png')
    loader.setScope('p1')
    pending.get('after')!.resolve('data:after')
    await flush()
    expect(images.after).toBe('data:after')
  })

  it('fetches an id once however often it is asked for', () => {
    const { loader, fetch } = loaderWith()
    loader.requestImage('a', 'image/png')
    loader.requestImage('a', 'image/png')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('passes the scope project, the id and the media type to the fetch', () => {
    const { loader, fetch } = loaderWith('proj-9')
    loader.requestImage('a', 'image/jpeg')
    expect(fetch).toHaveBeenCalledWith('proj-9', 'a', 'image/jpeg')
  })

  it('fetches nothing without a project', () => {
    const { loader, fetch } = loaderWith(null)
    loader.requestImage('a', 'image/png')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('drops bytes that arrive after the project changed, and fetches the id again when asked', async () => {
    const { loader, fetch, pending, images } = loaderWith('p1')
    loader.requestImage('a', 'image/png')
    loader.setScope('p2')
    pending.get('a')!.resolve('data:old')
    await flush()
    expect(images.a).toBeUndefined()
    loader.requestImage('a', 'image/png')
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('forgets every request on reset, so the same id is fetched again', () => {
    const { loader, fetch } = loaderWith()
    loader.requestImage('a', 'image/png')
    loader.reset()
    loader.requestImage('a', 'image/png')
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('drops bytes that arrive after a reset', async () => {
    const { loader, pending, images } = loaderWith()
    loader.requestImage('a', 'image/png')
    loader.reset()
    pending.get('a')!.resolve('data:a')
    await flush()
    expect(images.a).toBeUndefined()
  })

  it('writes nothing for an unreadable body', async () => {
    const { loader, pending, images } = loaderWith()
    loader.requestImage('a', 'image/png')
    pending.get('a')!.resolve(undefined)
    await flush()
    expect(images).toEqual({})
  })

  it('survives a failed fetch without writing', async () => {
    const { loader, pending, images } = loaderWith()
    loader.requestImage('a', 'image/png')
    pending.get('a')!.reject(new Error('boom'))
    await flush()
    expect(images).toEqual({})
  })
})

describe('EvidenceImageLoader.loadImage', () => {
  it('resolves with the bytes even when the project changed meanwhile', async () => {
    const { loader, pending, images } = loaderWith('p1')
    const loading = loader.loadImage('a', 'image/png')
    loader.setScope('p2')
    pending.get('a')!.resolve('data:a')
    await expect(loading).resolves.toBe('data:a')
    expect(images.a).toBeUndefined()
  })

  it('resolves undefined when the fetch fails', async () => {
    const { loader, pending } = loaderWith()
    const loading = loader.loadImage('a', 'image/png')
    pending.get('a')!.reject(new Error('boom'))
    await expect(loading).resolves.toBeUndefined()
  })

  it('resolves undefined without a project', async () => {
    const { loader } = loaderWith(null)
    await expect(loader.loadImage('a', 'image/png')).resolves.toBeUndefined()
  })
})

describe('evidenceDataUri', () => {
  it('passes a data URI through', () => {
    expect(evidenceDataUri('data:image/png;base64,AA==', 'image/png')).toBe(
      'data:image/png;base64,AA==',
    )
  })

  it('wraps raw base64 text', () => {
    expect(evidenceDataUri('AQID', 'image/png')).toBe('data:image/png;base64,AQID')
  })

  it('encodes an ArrayBuffer', () => {
    expect(evidenceDataUri(new Uint8Array([1, 2, 3]).buffer, 'image/png')).toBe(
      'data:image/png;base64,AQID',
    )
  })

  it('encodes only the bytes a view covers, not its whole backing buffer', () => {
    const backing = new Uint8Array([9, 9, 1, 2, 3, 9])
    const view = backing.subarray(2, 5)
    expect(evidenceDataUri(view, 'image/png')).toBe('data:image/png;base64,AQID')
  })

  it('is undefined for anything else', () => {
    expect(evidenceDataUri({}, 'image/png')).toBeUndefined()
  })
})
