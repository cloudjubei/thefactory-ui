import { useEffect, useState } from 'react'

import {
  proofScreensPane,
  proofThumbnailFrame,
  type EvidenceTile,
  type ProofPairView,
  type ProofThumbnail,
  type ProofThumbnailSide,
  type ProofUnpairedView,
  type ScreenPair,
  type VerifyProofTone,
  type VerifyProofView,
} from '../../../headless'
import { IconChevronRight, IconDownload } from '../../icons'
import { Button } from '../../primitives/Button'
import SegmentedControl from '../../primitives/SegmentedControl'

export type ProofScreensProps = {
  view: VerifyProofView
  /** Opens the comparison overlay on a pair or new screen, by its key. */
  onOpen: (key: string) => void
  onRequestImage: (id: string, mediaType: string) => void
  /** Saves one proving pair — the download on each thumbnail and, for all of them, the pane's. */
  onSavePair?: (pair: ScreenPair) => void
}

const SUMMARY_TONE: Record<VerifyProofTone, string> = {
  done: 'text-(--status-done-soft-fg)',
  working: 'text-(--status-working-soft-fg)',
  stuck: 'text-(--status-stuck-soft-fg)',
  empty: 'text-(--text-secondary)',
}

/**
 * One capture, or what stands in its place — a pulse while its bytes decode,
 * and otherwise the headless word for why it is absent: still loading, a
 * listing that failed, or genuinely not in the store.
 */
function Frame({
  tile,
  absent,
  label,
  className,
}: {
  tile: EvidenceTile | undefined
  absent: string | undefined
  label: string
  className: string
}) {
  return (
    <span
      className={`relative block shrink-0 overflow-hidden rounded-md border border-(--border-default) bg-(--surface-muted) ${className}`}
    >
      {tile?.dataUri ? (
        <img
          src={tile.dataUri}
          alt={label}
          className="block h-full w-full object-cover object-top"
        />
      ) : tile ? (
        <span className="block h-full w-full animate-pulse bg-(--surface-muted)" />
      ) : (
        <span className="flex h-full w-full items-center justify-center border border-dashed border-(--border-default) p-1 text-center text-[9.5px] text-(--text-muted)">
          {absent}
        </span>
      )}
    </span>
  )
}

/**
 * Why a capture cannot be vouched for, in full, under what it did not count
 * for. Muted, not alarming: after a restart every earlier capture reads so.
 */
function UnvouchedLine({ text }: { text: string | undefined }) {
  return text ? <span className="text-[11px] text-(--text-muted)">{text}</span> : null
}

/**
 * A pair that did not count: small, muted, with its reason — secondary to the
 * proof — and, when a side cannot be vouched for, why.
 */
function UncountedPair({ pair, onOpen }: { pair: ProofPairView; onOpen: (key: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(pair.key)}
      aria-label={`Compare ${pair.subject} — did not count`}
      className="flex w-full items-start gap-2.5 rounded-md border border-(--border-subtle) bg-(--surface-base) p-2 text-left hover:border-(--border-default)"
    >
      <span className="flex shrink-0 gap-1 opacity-75">
        <Frame
          tile={pair.before}
          absent={pair.beforeAbsent}
          label={`${pair.subject} — before`}
          className="h-[80px] w-[45px]"
        />
        <Frame
          tile={pair.after}
          absent={pair.afterAbsent}
          label={`${pair.subject} — after`}
          className="h-[80px] w-[45px]"
        />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span
          className="truncate text-[12px] font-medium text-(--text-secondary)"
          title={pair.subject}
        >
          {pair.subject}
        </span>
        <span className="inline-flex items-start gap-1.5 text-[11.5px] text-(--text-secondary)">
          <span
            aria-hidden
            className="mt-1 size-2 shrink-0 rounded-full border-[1.5px] border-(--text-muted)"
          />
          <span>{pair.verdict}</span>
        </span>
        <UnvouchedLine text={pair.unvouched?.text} />
        <span className="text-[10.5px] text-(--text-muted)">
          {pair.change}
          {pair.sameScreen ? ` · ${pair.sameScreen}` : ''}
        </span>
      </span>
    </button>
  )
}

/** An after shown alone — no before of its subject, or a new screen that cannot be vouched for — with why, never as proof. */
function UnpairedAfter({
  item,
  onOpen,
}: {
  item: ProofUnpairedView
  onOpen: (key: string) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(item.key)}
      aria-label={`Open ${item.subject} — did not count`}
      className="flex w-full items-start gap-2.5 rounded-md border border-(--border-subtle) bg-(--surface-base) p-2 text-left hover:border-(--border-default)"
    >
      <span className="shrink-0 opacity-75">
        <Frame
          tile={item.after}
          absent={item.afterAbsent}
          label={`${item.subject} — after`}
          className="h-[80px] w-[45px]"
        />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span
          className="truncate text-[12px] font-medium text-(--text-secondary)"
          title={item.subject}
        >
          {item.subject}
        </span>
        <span className="inline-flex items-start gap-1.5 text-[11.5px] text-(--text-secondary)">
          <span
            aria-hidden
            className="mt-1 size-2 shrink-0 rounded-full border-[1.5px] border-(--text-muted)"
          />
          <span>{item.reason}</span>
        </span>
        <UnvouchedLine text={item.unvouched?.text} />
      </span>
    </button>
  )
}

/**
 * One thumbnail the proof rests on: the toggle's side of the pair, its change
 * marker in the corner, and a download revealed on hover (always shown where
 * there is no hover). The thumbnail opens the comparison, where the verdict,
 * the pixel and element stats and the diff are read.
 */
function Thumbnail({
  thumb,
  side,
  onOpen,
  onSave,
}: {
  thumb: ProofThumbnail
  side: ProofThumbnailSide
  onOpen: (key: string) => void
  onSave: ((pair: ScreenPair) => void) | undefined
}) {
  const frame = proofThumbnailFrame(thumb, side)
  const savable = onSave && (thumb.screen.before?.dataUri || thumb.screen.after?.dataUri)
  return (
    <div className="group/thumb relative flex w-[92px] shrink-0 flex-col gap-1.5">
      <button
        type="button"
        onClick={() => onOpen(thumb.key)}
        aria-label={`Compare ${thumb.subject}`}
        className="relative block w-[92px] overflow-hidden rounded-md border border-(--border-default) bg-(--surface-muted) text-left leading-none transition hover:border-(--accent-primary) hover:shadow-md"
      >
        {frame.tile?.dataUri ? (
          <img
            src={frame.tile.dataUri}
            alt={`${thumb.subject} — ${side}`}
            className="block h-auto w-full"
          />
        ) : frame.tile ? (
          <span className="block h-[164px] w-full animate-pulse bg-(--surface-muted)" />
        ) : (
          <span className="flex h-[164px] w-full items-center justify-center p-1 text-center text-[9.5px] leading-tight text-(--text-muted)">
            {frame.absent}
          </span>
        )}
        {thumb.marker ? (
          <span className="absolute bottom-1 right-1 rounded bg-(--accent-primary) px-1 text-[10px] font-bold leading-[1.4] tabular-nums text-white">
            {thumb.marker}
          </span>
        ) : null}
      </button>
      {savable ? (
        <button
          type="button"
          aria-label={`Save ${thumb.subject}`}
          title={`Save ${thumb.subject}`}
          onClick={() => onSave(thumb.screen)}
          className="absolute right-1 top-1 z-10 grid size-6 place-items-center rounded-md border border-(--border-default) bg-(--surface-overlay)/90 text-(--text-secondary) opacity-0 shadow-sm transition hover:border-(--accent-primary) hover:text-(--accent-primary) focus-visible:opacity-100 group-hover/thumb:opacity-100 [@media(hover:none)]:opacity-100"
        >
          <IconDownload className="size-3" />
        </button>
      ) : null}
      <span className="text-[10px] leading-tight text-(--text-muted) [overflow-wrap:anywhere]">
        {thumb.subject}
      </span>
    </div>
  )
}

/**
 * Exactly the screens a verify gate judged, as the agreed grid: one thumbnail
 * per pair the proof rests on — then each screen the change adds — with a
 * Before/After toggle and a download for all of them. Everything that did not
 * count folds into one quiet line that opens the list, each with its reason,
 * so what was rejected is one click away without reading as proof. What the
 * gate counted but the backend can no longer vouch for is among it.
 */
export default function ProofScreens({
  view,
  onOpen,
  onRequestImage,
  onSavePair,
}: ProofScreensProps) {
  const pane = proofScreensPane(view)
  const [side, setSide] = useState<ProofThumbnailSide>('after')
  const [foldOpen, setFoldOpen] = useState(false)
  const uncounted = view.pairs.filter((p) => !p.counted)

  useEffect(() => {
    for (const thumb of pane.thumbnails) {
      if (thumb.before) onRequestImage(thumb.before.ref.id, thumb.before.ref.mediaType)
      if (thumb.after) onRequestImage(thumb.after.ref.id, thumb.after.ref.mediaType)
    }
  }, [pane.thumbnails, onRequestImage])

  useEffect(() => {
    if (!foldOpen) return
    for (const pair of view.pairs) {
      if (pair.counted) continue
      if (pair.before) onRequestImage(pair.before.ref.id, pair.before.ref.mediaType)
      if (pair.after) onRequestImage(pair.after.ref.id, pair.after.ref.mediaType)
    }
    for (const item of view.unpaired) {
      if (item.after) onRequestImage(item.after.ref.id, item.after.ref.mediaType)
    }
  }, [foldOpen, view, onRequestImage])

  const savable = pane.thumbnails.filter((t) => t.screen.before?.dataUri || t.screen.after?.dataUri)
  const saveAll = onSavePair ? () => savable.forEach((t) => onSavePair(t.screen)) : undefined

  return (
    <div className="flex flex-col gap-3">
      {pane.summary ? (
        <span className={`text-[12.5px] font-semibold ${SUMMARY_TONE[pane.summary.tone]}`}>
          {pane.summary.text}
        </span>
      ) : null}

      {pane.thumbnails.length > 0 ? (
        <div className="flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center justify-end gap-2">
            {pane.hasBefore ? (
              <SegmentedControl
                size="sm"
                ariaLabel="What the thumbnails show"
                value={side}
                onChange={(v) => setSide(v as ProofThumbnailSide)}
                options={[
                  { value: 'before', label: 'Before' },
                  { value: 'after', label: 'After' },
                ]}
              />
            ) : null}
            {saveAll && savable.length > 0 ? (
              <Button
                variant="secondary"
                size="icon"
                aria-label={pane.saveAllLabel}
                title={pane.saveAllLabel}
                onClick={saveAll}
              >
                <IconDownload className="size-4" />
              </Button>
            ) : null}
          </div>
          <div className="flex flex-wrap items-start gap-2.5">
            {pane.thumbnails.map((t) => (
              <Thumbnail key={t.key} thumb={t} side={side} onOpen={onOpen} onSave={onSavePair} />
            ))}
          </div>
        </div>
      ) : null}

      {pane.notCounted ? (
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            aria-expanded={foldOpen}
            onClick={() => setFoldOpen((o) => !o)}
            className="inline-flex items-center gap-0.5 self-start text-left text-[11.5px] text-(--text-muted) hover:text-(--accent-primary)"
          >
            {pane.notCounted.label}
            <IconChevronRight
              className={`size-3 transition-transform ${foldOpen ? 'rotate-90' : ''}`}
            />
          </button>
          {foldOpen ? (
            <div className="flex flex-col gap-1.5">
              {uncounted.map((p) => (
                <UncountedPair key={p.key} pair={p} onOpen={onOpen} />
              ))}
              {view.unpaired.map((u) => (
                <UnpairedAfter key={u.key} item={u} onOpen={onOpen} />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
