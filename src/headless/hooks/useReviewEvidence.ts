import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'

import {
  getReviewEvidenceContent,
  listReviewEvidence,
  listReviewEvidenceTexts,
  type ReviewEvidenceRef,
} from '../api/generated'
import { useApi } from '../api/ApiContext'
import { LiveResourceStore } from '../utils/liveResourceStore'
import type { LiveResourceSnapshot } from '../utils/liveResourceStoreTypes'
import {
  EVIDENCE_IMAGE_CACHE_CAPACITY,
  EVIDENCE_NOTE_CACHE_CAPACITY,
  REVIEW_EVIDENCE_LINGER_MS,
} from '../utils/processViewCacheConstants'
import type { ReviewEvidenceSnapshot } from '../utils/processViewCacheTypes'
import { toEvidenceTile } from '../utils/reviewEvidenceView'
import {
  isChatUpdateForProject,
  isRunStateUpdate,
  isRunUpdateForProject,
} from '../utils/runUpdateRefresh'
import type { EvidenceTile } from '../utils/reviewEvidenceViewTypes'
import { EvidenceContentCache } from './evidenceContentCache'
import { EvidenceImageLoader, evidenceDataUri } from './evidenceImageLoader'
import { reviewEvidenceCache } from './processViewCache'

type EvidenceQuery = { runId?: string; storyId?: string; featureId?: string }

function evidenceQueryKey(projectId: string | undefined, query: EvidenceQuery): string {
  return [projectId, query.runId, query.storyId, query.featureId].map((p) => p ?? '').join('|')
}

function evidenceQueryOfKey(key: string): { projectId: string; query: EvidenceQuery } {
  const [projectId = '', runId, storyId, featureId] = key.split('|')
  return {
    projectId,
    query: {
      ...(runId ? { runId } : {}),
      ...(storyId ? { storyId } : {}),
      ...(featureId ? { featureId } : {}),
    },
  }
}

async function fetchEvidenceImage(
  projectId: string,
  evidenceId: string,
  mediaType: string,
): Promise<string | undefined> {
  const res = await getReviewEvidenceContent({
    path: { projectId, evidenceId },
    responseType: 'arraybuffer',
    throwOnError: true,
  } as never)
  return evidenceDataUri((res as { data?: unknown }).data, mediaType)
}

async function fetchEvidenceTexts(
  projectId: string,
  ids: string[],
): Promise<{ id: string; text: string }[]> {
  const { data } = await listReviewEvidenceTexts({
    path: { projectId },
    body: { ids },
    throwOnError: true,
  })
  return data ?? []
}

/** Evidence images and note texts read this session — shared by every panel showing them. */
const evidenceContent = new EvidenceContentCache(
  { image: fetchEvidenceImage, texts: fetchEvidenceTexts },
  { images: EVIDENCE_IMAGE_CACHE_CAPACITY, notes: EVIDENCE_NOTE_CACHE_CAPACITY },
)

/** A listing and the text of every note in it — the note text in one request after the listing. */
async function readEvidenceListing(key: string): Promise<ReviewEvidenceSnapshot> {
  const { projectId, query } = evidenceQueryOfKey(key)
  const { data } = await listReviewEvidence({ path: { projectId }, query, throwOnError: true })
  const refs = data ?? []
  return { refs, notes: await evidenceContent.noteTexts(projectId, refs) }
}

type WsLike = ReturnType<typeof useApi>['ws']

const stores = new WeakMap<WsLike, LiveResourceStore<ReviewEvidenceSnapshot>>()

/**
 * One listing per query for the whole app, kept live by one subscription: the
 * auto-review verifier files evidence in a SEPARATE run, so nothing in a
 * panel's own run stream announces it — any run state change, or a chat of
 * this project, re-reads it (folded into one read however many arrive). A
 * streamed transcript entry files nothing and is ignored.
 */
function reviewEvidenceStoreFor(ws: WsLike): LiveResourceStore<ReviewEvidenceSnapshot> {
  const existing = stores.get(ws)
  if (existing) return existing
  const store = new LiveResourceStore<ReviewEvidenceSnapshot>({
    load: readEvidenceListing,
    connect: (key, handle) => {
      const { projectId } = evidenceQueryOfKey(key)
      const offRun = ws.on('cli:run-update', (data: unknown) => {
        if (isRunStateUpdate(data) && isRunUpdateForProject(data, projectId)) {
          void handle.refresh()
        }
      })
      const offChat = ws.on('chats:updated', (data: unknown) => {
        if (isChatUpdateForProject(data, projectId)) void handle.refresh()
      })
      const offReconnect = ws.onReconnect(() => void handle.refresh())
      return () => {
        offRun()
        offChat()
        offReconnect()
      }
    },
    lingerMs: REVIEW_EVIDENCE_LINGER_MS,
    recall: (key) => reviewEvidenceCache.get(key),
    remember: (key, snapshot) => reviewEvidenceCache.set(key, snapshot),
  })
  stores.set(ws, store)
  return store
}

const IDLE_SNAPSHOT: LiveResourceSnapshot<ReviewEvidenceSnapshot> = {
  data: { refs: [], notes: {} },
  settled: true,
  error: null,
}
const NO_REFS: ReviewEvidenceRef[] = []
const NO_NOTES: Record<string, string> = {}
const unlistened = () => () => {}

export type UseReviewEvidence = {
  /** Everything recorded for the query, newest first. */
  refs: ReviewEvidenceRef[]
  /** Renderable tiles; an image's `dataUri` fills in once it has been requested. */
  tiles: EvidenceTile[]
  /** The first load for THIS query is still on its way — live re-reads never set it again. */
  loading: boolean
  /**
   * The first load for THIS query has finished (or a remembered listing stands
   * in for it). It stays true through live re-reads, so a view shows "loading"
   * once rather than flickering back to it on every event.
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
 * Image bytes are decoded LAZILY, one id at a time: a tile asks for its own
 * image as it renders, so nothing off screen is read and nothing on screen is
 * left blank. An evidence id is immutable, so what was decoded is shared by
 * every panel and kept across views (`EvidenceContentCache`).
 *
 * The listing is one per query for the whole app (`LiveResourceStore`): the
 * sign-off, a step's preview and its side panel asking for one story's
 * evidence share one read and one live subscription. Every note's text comes
 * with it, read in one request. The listing outlives the panel
 * (`processViewCache`), so reopening it is drawn at once and re-read behind.
 */
export function useReviewEvidence(
  projectId: string | undefined,
  query: EvidenceQuery,
): UseReviewEvidence {
  const { runId, storyId, featureId } = query
  const { ws } = useApi()
  const store = reviewEvidenceStoreFor(ws)
  const key =
    projectId && (runId || storyId || featureId)
      ? evidenceQueryKey(projectId, { runId, storyId, featureId })
      : undefined

  useEffect(() => (key ? store.retain(key) : undefined), [store, key])

  const listen = useCallback(
    (onChange: () => void) => (key ? store.listen(key, onChange) : unlistened()),
    [store, key],
  )
  const read = useCallback(() => (key ? store.snapshot(key) : IDLE_SNAPSHOT), [store, key])
  const snapshot = useSyncExternalStore(listen, read, read)
  const refs = snapshot.data?.refs ?? NO_REFS
  const notes = snapshot.data?.notes ?? NO_NOTES

  const [images, setImages] = useState<Record<string, string>>({})
  const [imageLoader] = useState(
    () =>
      new EvidenceImageLoader(
        (project, id, mediaType) => evidenceContent.loadImage(project, id, mediaType),
        (id, dataUri) => setImages((prev) => (prev[id] ? prev : { ...prev, [id]: dataUri })),
      ),
  )
  imageLoader.setScope(projectId)
  const imagesRef = useRef(images)
  imagesRef.current = images

  const loadImage = useCallback(
    async (id: string, mediaType: string): Promise<string | undefined> =>
      imagesRef.current[id] ?? imageLoader.loadImage(id, mediaType),
    [imageLoader],
  )

  const requestImage = useCallback(
    (id: string, mediaType: string) => imageLoader.requestImage(id, mediaType),
    [imageLoader],
  )

  const reload = useCallback(async () => {
    if (key) await store.refresh(key)
  }, [store, key])

  const tiles = useMemo(
    () =>
      refs.map((ref) => {
        const base = toEvidenceTile(ref)
        const dataUri =
          images[ref.id] ?? (projectId ? evidenceContent.image(projectId, ref.id) : undefined)
        const text = notes[ref.id]
        return {
          ...base,
          ...(dataUri ? { dataUri } : {}),
          ...(text ? { text } : {}),
        }
      }),
    [refs, images, notes, projectId],
  )

  return {
    refs,
    tiles,
    loading: !snapshot.settled,
    loaded: snapshot.settled,
    error: snapshot.error?.message,
    requestImage,
    loadImage,
    reload,
  }
}
