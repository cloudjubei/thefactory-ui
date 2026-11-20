import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'

import {
  useReviewEvidenceMediaUrl,
  VIDEO_PAIRS_COPY,
  type EvidenceTile,
  type ProofVideoPairView,
} from '../../../../headless'
import { Button } from '../../../primitives/Button'
import { IconDownload, IconMaximize } from '../../../icons'
import { downloadDataUri } from './download'
import TraceDownload from './TraceDownload'

export type WalkthroughTabProps = {
  projectId: string
  recordings: readonly EvidenceTile[]
  /** The before/after recordings a proof judged, each pair played side by side above the rest. */
  videoPairs?: readonly ProofVideoPairView[]
  /** What each recording says under itself: whether it counts as proof. */
  renderFooter?: (tile: EvidenceTile) => ReactNode
}

export type WalkthroughRecordingProps = {
  projectId: string
  /** The recording: its item's id and media type, and what it is called. */
  tile: { ref: Pick<EvidenceTile['ref'], 'id' | 'mediaType'>; caption: string }
  /** Shown in place of the recording's own caption — a pair's "Before" or "After". */
  label?: string
  footer?: ReactNode
  /** Set while mounted: plays on from a moment. */
  seekRef?: { current: ((atSec: number) => void) | null }
  /** Where the playhead is, and how long the recording runs, as they become known. */
  onProgress?: (atSec: number, durationSec: number) => void
  /** Opens at this moment and plays from it — a reference to a moment of the recording. */
  startAt?: number
}

/** One recording, played by the browser's own player, with its fullscreen and save. */
export function WalkthroughRecording({
  projectId,
  tile,
  label,
  footer,
  seekRef,
  onProgress,
  startAt,
}: WalkthroughRecordingProps) {
  const { url, loading } = useReviewEvidenceMediaUrl(projectId, tile.ref.id)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const positionRef = useRef(startAt ?? 0)
  const playingRef = useRef(startAt !== undefined)
  const restoringRef = useRef(false)

  useEffect(() => {
    if (!seekRef) return
    seekRef.current = (atSec) => {
      const video = videoRef.current
      if (!video) return
      video.currentTime = atSec
      void video.play().catch(() => {})
    }
    return () => {
      seekRef.current = null
    }
  }, [seekRef])

  // Assign src only after fencing transport events. A declarative src update can
  // queue pause/timeupdate at zero before metadata arrives for the new grant.
  useLayoutEffect(() => {
    const video = videoRef.current
    if (!video || !url) return
    restoringRef.current = true
    video.src = url
  }, [url])

  const finishRestore = (video: HTMLVideoElement) => {
    restoringRef.current = false
    if (playingRef.current) void video.play().catch(() => {})
  }
  const stem = tile.caption.replace(/[^a-z0-9-]+/gi, '-').toLowerCase() || 'walkthrough'
  const ext = tile.ref.mediaType.split('/')[1] ?? 'mp4'

  return (
    <section className="flex flex-col gap-2 rounded-md border border-(--border-subtle) bg-(--surface-raised) p-2.5">
      <div className="flex items-center gap-2">
        <span className="min-w-0 truncate text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)">
          {label ?? tile.caption}
        </span>
        <span className="flex-1" />
        <Button
          variant="secondary"
          size="icon"
          aria-label="Fullscreen"
          title="Fullscreen"
          disabled={!url}
          onClick={() => void videoRef.current?.requestFullscreen?.()}
        >
          <IconMaximize className="w-4 h-4" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          aria-label="Save the recording"
          title="Save the recording"
          disabled={!url}
          onClick={() => url && downloadDataUri(`${url}&download=true`, `${stem}.${ext}`)}
        >
          <IconDownload className="w-4 h-4" />
        </Button>
      </div>
      {url ? (
        // The browser's own transport: play, time, scrubber, and the settings
        // gear that hides everything else — the standard every player follows.
        <video
          ref={videoRef}
          preload="metadata"
          onTimeUpdate={(event) => {
            const video = event.currentTarget
            if (!restoringRef.current) positionRef.current = video.currentTime
            onProgress?.(video.currentTime, video.duration)
          }}
          onDurationChange={(event) =>
            onProgress?.(event.currentTarget.currentTime, event.currentTarget.duration)
          }
          onPlay={() => {
            if (!restoringRef.current) playingRef.current = true
          }}
          onPause={() => {
            if (!restoringRef.current) playingRef.current = false
          }}
          onLoadedMetadata={(event) => {
            const video = event.currentTarget
            if (!restoringRef.current) return
            if (video.currentTime !== positionRef.current) {
              video.currentTime = positionRef.current
              // Keep ignoring reload events until the restoring seek completes.
            } else {
              finishRestore(video)
            }
          }}
          onSeeked={(event) => {
            if (restoringRef.current) finishRestore(event.currentTarget)
          }}
          controls
          playsInline
          className="max-h-[420px] w-full rounded-md border border-(--border-default) bg-black"
        />
      ) : (
        <div className="grid h-[210px] place-items-center rounded-md border border-(--border-default) bg-black/90 text-xs text-white/60">
          {loading ? 'Loading the recording…' : 'The recording could not be loaded.'}
        </div>
      )}
      {footer}
    </section>
  )
}

/** One side of a recording pair: the recording, or why it is not here. */
function PairSide({
  projectId,
  tile,
  label,
  absent,
}: {
  projectId: string
  tile: EvidenceTile | undefined
  label: string
  absent: string | undefined
}) {
  if (tile) return <WalkthroughRecording projectId={projectId} tile={tile} label={label} />
  return (
    <section className="flex flex-col gap-2 rounded-md border border-(--border-subtle) bg-(--surface-raised) p-2.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)">
        {label}
      </span>
      <div className="grid h-[210px] place-items-center rounded-md border border-(--border-default) bg-black/90 text-xs text-white/60">
        {absent}
      </div>
    </section>
  )
}

/** A before and an after recording of one path, side by side — a new screen's after alone. */
function VideoPair({ projectId, pair }: { projectId: string; pair: ProofVideoPairView }) {
  return (
    <section
      aria-label={pair.subject}
      className="@container flex flex-col gap-2 rounded-lg border border-(--border-subtle) bg-(--surface-base) p-2.5"
    >
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="min-w-0 truncate text-[12.5px] font-semibold text-(--text-primary)">
          {pair.subject}
        </span>
        <span
          className={`text-[11.5px] ${pair.counted ? 'text-(--status-done-soft-fg)' : 'text-(--text-secondary)'}`}
        >
          {pair.verdict}
        </span>
      </div>
      <div className={`grid grid-cols-1 gap-2 ${pair.newScreen ? '' : '@md:grid-cols-2'}`}>
        {pair.newScreen ? null : (
          <PairSide
            projectId={projectId}
            tile={pair.before}
            label={VIDEO_PAIRS_COPY.before}
            absent={pair.beforeAbsent}
          />
        )}
        <PairSide
          projectId={projectId}
          tile={pair.after}
          label={VIDEO_PAIRS_COPY.after}
          absent={pair.afterAbsent}
        />
      </div>
      {pair.note ? (
        <span className="text-[11.5px] text-(--text-secondary)">{pair.note}</span>
      ) : null}
    </section>
  )
}

/**
 * The verifier's screen recordings — proof of the PATH through the app, not
 * just its screens: the before/after pairs a proof judged first, each played
 * side by side, then every other recording.
 */
export default function WalkthroughTab({
  projectId,
  recordings,
  videoPairs = [],
  renderFooter,
}: WalkthroughTabProps) {
  return (
    <div className="flex flex-col gap-2">
      {videoPairs.length > 0 ? (
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)">
              {VIDEO_PAIRS_COPY.heading}
            </span>
            <span className="text-[11.5px] text-(--text-secondary)">{VIDEO_PAIRS_COPY.hint}</span>
          </div>
          {videoPairs.map((pair) => (
            <VideoPair key={pair.key} projectId={projectId} pair={pair} />
          ))}
        </div>
      ) : null}
      {recordings.map((tile) =>
        tile.ref.kind === 'trace' ? (
          <TraceDownload key={tile.ref.id} projectId={projectId} tile={tile} />
        ) : (
          <WalkthroughRecording
            key={tile.ref.id}
            projectId={projectId}
            tile={tile}
            {...(renderFooter ? { footer: renderFooter(tile) } : {})}
          />
        ),
      )}
    </div>
  )
}
