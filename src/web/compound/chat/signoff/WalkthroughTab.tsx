import { useRef } from 'react'

import { useReviewEvidenceImage, type EvidenceTile } from '../../../../headless'
import { Button } from '../../../primitives/Button'
import { IconDownload, IconMaximize } from '../../../icons'
import { downloadDataUri } from './download'

export type WalkthroughTabProps = {
  projectId: string
  recordings: readonly EvidenceTile[]
}

function Recording({ projectId, tile }: { projectId: string; tile: EvidenceTile }) {
  const { dataUri, loading } = useReviewEvidenceImage(projectId, tile.ref.id, tile.ref.mediaType)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const stem = tile.caption.replace(/[^a-z0-9-]+/gi, '-').toLowerCase() || 'walkthrough'
  const ext = tile.ref.mediaType.split('/')[1] ?? 'mp4'

  return (
    <section className="flex flex-col gap-2 rounded-md border border-(--border-subtle) bg-(--surface-raised) p-2.5">
      <div className="flex items-center gap-2">
        <span className="min-w-0 truncate text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)">
          {tile.caption}
        </span>
        <span className="flex-1" />
        <Button
          variant="secondary"
          size="icon"
          aria-label="Fullscreen"
          title="Fullscreen"
          disabled={!dataUri}
          onClick={() => void videoRef.current?.requestFullscreen?.()}
        >
          <IconMaximize className="w-4 h-4" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          aria-label="Save the recording"
          title="Save the recording"
          disabled={!dataUri}
          onClick={() => dataUri && downloadDataUri(dataUri, `${stem}.${ext}`)}
        >
          <IconDownload className="w-4 h-4" />
        </Button>
      </div>
      {dataUri ? (
        // The browser's own transport: play, time, scrubber, and the settings
        // gear that hides everything else — the standard every player follows.
        <video
          ref={videoRef}
          src={dataUri}
          controls
          playsInline
          className="max-h-[420px] w-full rounded-md border border-(--border-default) bg-black"
        />
      ) : (
        <div className="grid h-[210px] place-items-center rounded-md border border-(--border-default) bg-black/90 text-xs text-white/60">
          {loading ? 'Loading the recording…' : 'The recording could not be loaded.'}
        </div>
      )}
    </section>
  )
}

/** The verifier's screen recordings — proof of the PATH through the app, not just its screens. */
export default function WalkthroughTab({ projectId, recordings }: WalkthroughTabProps) {
  return (
    <div className="flex flex-col gap-2">
      {recordings.map((tile) => (
        <Recording key={tile.ref.id} projectId={projectId} tile={tile} />
      ))}
    </div>
  )
}
