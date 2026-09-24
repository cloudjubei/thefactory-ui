import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  getReviewEvidenceContent,
  listReviewEvidence,
  type ReviewEvidenceRef,
} from '../api/generated'
import { useApi } from '../api/ApiContext'
import { notesToRead, toEvidenceTile, type EvidenceTile } from '../utils/reviewEvidenceView'

/** Turn a fetched body into a data URI usable by both `<img>` and RN `<Image>`. */
function toDataUri(data: unknown, mediaType: string): string | undefined {
  if (typeof data === 'string') {
    // Already a data URI (some transports hand one back); otherwise treat as raw base64.
    return data.startsWith('data:') ? data : `data:${mediaType};base64,${data}`
  }
  if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
    const bytes =
      data instanceof ArrayBuffer
        ? new Uint8Array(data)
        : new Uint8Array(data.buffer as ArrayBuffer)
    let binary = ''
    for (const byte of bytes) binary += String.fromCharCode(byte)
    return `data:${mediaType};base64,${btoa(binary)}`
  }
  return undefined
}

type EvidenceQuery = { runId?: string; storyId?: string; featureId?: string }

function evidenceQueryKey(projectId: string | undefined, query: EvidenceQuery): string {
  return [projectId, query.runId, query.storyId, query.featureId].map((p) => p ?? '').join('|')
}

async function readNoteText(projectId: string, evidenceId: string): Promise<string | undefined> {
  try {
    const res = await getReviewEvidenceContent({
      path: { projectId, evidenceId },
      responseType: 'text',
      throwOnError: true,
    } as never)
    const text = (res as { data?: unknown }).data
    return typeof text === 'string' && text.length > 0 ? text : undefined
  } catch {
    return undefined
  }
}

export type UseReviewEvidence = {
  /** Everything recorded for the query, newest first. */
  refs: ReviewEvidenceRef[]
  /** Renderable tiles; an image's `dataUri` fills in once it has been requested. */
  tiles: EvidenceTile[]
  /** A load is in flight — including the live re-pulls every run/chat event triggers. */
  loading: boolean
  /**
   * The first load for THIS query has finished. Unlike `loading` it stays true
   * through live re-pulls, so a view can show "loading" once rather than
   * flickering back to it on every event while nothing has been filed yet.
   */
  loaded: boolean
  error: string | undefined
  /**
   * Ask for one image's bytes to be decoded into the cache.
   *
   * Idempotent and cheap to call every render — a tile calls it as it renders, so
   * exactly the images on screen are decoded, in whatever order the layout shows
   * them. This is what killed the old "decode the newest twelve" cap: a story
   * sign-off renders its features oldest-first, so the twelve it decoded were the
   * twelve it never showed, and every visible tile above the fold stayed blank.
   */
  requestImage: (id: string, mediaType: string) => void
  /** Decode one image now and resolve with its data URI — for a save that needs the bytes. */
  loadImage: (id: string, mediaType: string) => Promise<string | undefined>
  reload: () => Promise<void>
}

/**
 * The proof a run produced, ready to put on screen.
 *
 * Images are fetched through the API client rather than linked directly: the
 * backend is bearer-authenticated, so an `<img src>` pointing at the content
 * endpoint would simply 401. Data URIs also work unchanged on React Native,
 * where object URLs do not.
 *
 * Image bytes are decoded LAZILY, one id at a time, and cached for the life of
 * the panel: a tile asks for its own image as it renders, so nothing off screen
 * is held in memory and nothing on screen is left blank. An evidence id is
 * immutable, so the cache survives the live re-pulls below without a flicker.
 */
export function useReviewEvidence(
  projectId: string | undefined,
  query: EvidenceQuery,
): UseReviewEvidence {
  const [refs, setRefs] = useState<ReviewEvidenceRef[]>([])
  const [images, setImages] = useState<Record<string, string>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [loadedKey, setLoadedKey] = useState<string | undefined>()
  const [error, setError] = useState<string | undefined>()
  const epochRef = useRef(0)
  // An id is requested at most once per hook instance — its bytes never change,
  // so a re-pull that leaves the id present must not refetch it.
  const requestedRef = useRef<Set<string>>(new Set())
  // The notes whose text is held or on its way — the same rule for text.
  const notesHeldRef = useRef<Set<string>>(new Set())
  // A live mirror of the cache so `loadImage` can answer from it without taking
  // the cache as a dependency (which would rebuild the callback every decode).
  const imagesRef = useRef(images)
  imagesRef.current = images
  const { ws } = useApi()

  const { runId, storyId, featureId } = query
  const loaded = loadedKey === evidenceQueryKey(projectId, { runId, storyId, featureId })

  const loadImage = useCallback(
    async (id: string, mediaType: string): Promise<string | undefined> => {
      if (!projectId) return undefined
      const cached = imagesRef.current[id]
      if (cached) return cached
      const epoch = epochRef.current
      try {
        const res = await getReviewEvidenceContent({
          path: { projectId, evidenceId: id },
          responseType: 'arraybuffer',
          throwOnError: true,
        } as never)
        const dataUri = toDataUri((res as { data?: unknown }).data, mediaType)
        if (!dataUri) return undefined
        // Only write into state while the query is still the one that asked; the
        // bytes are still returned, so a racing save gets them regardless.
        if (epoch === epochRef.current) {
          setImages((prev) => (prev[id] ? prev : { ...prev, [id]: dataUri }))
        }
        return dataUri
      } catch {
        // One unreadable file must not blank the whole gallery.
        return undefined
      }
    },
    [projectId],
  )

  const requestImage = useCallback(
    (id: string, mediaType: string) => {
      if (requestedRef.current.has(id)) return
      requestedRef.current.add(id)
      void loadImage(id, mediaType)
    },
    [loadImage],
  )

  const reload = useCallback(async () => {
    const key = evidenceQueryKey(projectId, { runId, storyId, featureId })
    if (!projectId || (!runId && !storyId && !featureId)) {
      setRefs([])
      setImages({})
      setNotes({})
      requestedRef.current = new Set()
      notesHeldRef.current = new Set()
      setLoadedKey(key)
      return
    }
    const epoch = ++epochRef.current
    setLoading(true)
    setError(undefined)
    try {
      const { data } = await listReviewEvidence({
        path: { projectId },
        query: {
          ...(runId ? { runId } : {}),
          ...(storyId ? { storyId } : {}),
          ...(featureId ? { featureId } : {}),
        },
        throwOnError: true,
      })
      if (epoch !== epochRef.current) return
      const found = data ?? []
      setRefs(found)

      // Fetch note/report text so the verifier's written findings are READABLE
      // inline — not just a labelled tile. This is the whole evidence when a
      // screenshot could not be captured, so it must be visible, not a dead link.
      // Notes are small, so they load eagerly; images wait for a tile to ask.
      const held = notesHeldRef.current
      for (const note of notesToRead(found, held)) {
        held.add(note.id)
        const text = await readNoteText(projectId, note.id)
        if (text === undefined) held.delete(note.id)
        else setNotes((prev) => ({ ...prev, [note.id]: text }))
        if (epoch !== epochRef.current) return
      }
    } catch (err: unknown) {
      if (epoch === epochRef.current) setError(err instanceof Error ? err.message : String(err))
    } finally {
      if (epoch === epochRef.current) {
        setLoading(false)
        setLoadedKey(key)
      }
    }
  }, [projectId, runId, storyId, featureId])

  useEffect(() => {
    void reload()
    return () => {
      // Invalidate in-flight loads so a late response cannot write decoded
      // images into an unmounted panel's state.
      epochRef.current += 1
    }
  }, [reload])

  // Live-refresh: the auto-review verifier files evidence in a SEPARATE run, so
  // nothing in this panel's own run stream announces it — without this the newly
  // filed screenshots/notes only appeared after navigating away and back. Any run
  // or chat activity is a cheap, idempotent trigger to re-pull (epoch-guarded).
  useEffect(() => {
    const offRun = ws.on('cli:run-update', () => void reload())
    const offChat = ws.on('chats:updated', () => void reload())
    return () => {
      offRun()
      offChat()
    }
  }, [ws, reload])

  const tiles = useMemo(
    () =>
      refs.map((ref) => {
        const base = toEvidenceTile(ref)
        const dataUri = images[ref.id]
        const text = notes[ref.id]
        return {
          ...base,
          ...(dataUri ? { dataUri } : {}),
          ...(text ? { text } : {}),
        }
      }),
    [refs, images, notes],
  )

  return { refs, tiles, loading, loaded, error, requestImage, loadImage, reload }
}
