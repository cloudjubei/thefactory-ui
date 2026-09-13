import { useEffect, useRef, useState } from 'react'

import type { ScreenPair, ScreenPairClass } from '../../../../headless'
import SegmentedControl from '../../../primitives/SegmentedControl'
import Tooltip from '../../../primitives/Tooltip'
import { IconChevronLeft, IconChevronRight, IconDownload } from '../../../icons'
import { Button } from '../../../primitives/Button'

export type ScreensTabProps = {
  pairs: readonly ScreenPair[]
  onOpen: (key: string) => void
  /** When the capture happened, as a label — the one fact the footer keeps. */
  capturedLabel: string | undefined
  /** Saves every capture; omitted when the host cannot put a file anywhere. */
  onSaveAll?: () => void
  /**
   * A capture is still RUNNING, so what is here is partial.
   *
   * Evidence lands one file at a time. Mid-capture the strip flickered as tiles
   * arrived, and a pair whose `after` had not been filed yet was labelled "only
   * on the base" — a CONCLUSION, and a false one: the after was still being
   * taken. Opening the gallery on that half-state was what broke.
   */
  capturing?: boolean
}

type ThumbMode = 'before' | 'after'

const META: Record<ScreenPairClass, string> = {
  pair: 'before / after',
  new: 'only on the branch',
  removed: 'only on the base',
  single: 'single capture',
}

const SCROLL_STEP = 366

function Frame({ src, alt }: { src: string | undefined; alt: string }) {
  return src ? (
    <img src={src} alt={alt} className="block h-full w-full object-cover object-top" />
  ) : (
    <div className="h-full w-full animate-pulse bg-(--surface-muted)" />
  )
}

/**
 * Every captured screen, in walkthrough order, as a scroll-snapped strip — so
 * a reviewer can walk them one by one on a phone as easily as on a desktop.
 * Each tile is a stacked card: the base peeks out behind the branch. There is
 * no changed/unchanged split here yet, because nothing has compared pixels;
 * the tile number is the walkthrough position and never renumbers.
 */
export default function ScreensTab({
  pairs,
  onOpen,
  capturedLabel,
  onSaveAll,
  capturing = false,
}: ScreensTabProps) {
  // With nothing captured on the base there is no "before" to switch to, and a
  // segment that changes nothing reads as broken.
  const hasBefore = pairs.some((p) => p.before !== undefined)
  const [mode, setMode] = useState<ThumbMode>('after')
  const stripRef = useRef<HTMLDivElement | null>(null)
  const scrollBy = (dx: number) => stripRef.current?.scrollBy({ left: dx, behavior: 'smooth' })
  // Arrows only when there is somewhere to scroll — a strip that already fits
  // should not offer two controls that do nothing.
  const [overflowing, setOverflowing] = useState(false)
  useEffect(() => {
    const el = stripRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const measure = () => setOverflowing(el.scrollWidth > el.clientWidth + 1)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [pairs.length])

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[12.5px] text-(--text-secondary)">
          <span className="font-semibold text-(--text-primary)">{pairs.length}</span>{' '}
          {pairs.length === 1 ? 'screen' : 'screens'} {capturing ? 'so far' : 'captured'}
        </span>
        {/* Say it is still running. Without this the strip looks finished and a
            partial set reads as the whole answer. */}
        {capturing ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-(--status-review-soft-bg) px-2 py-0.5 text-[11px] font-medium text-(--status-review-fg)">
            <span className="size-1.5 animate-pulse rounded-full bg-current" />
            Still capturing
          </span>
        ) : null}
        <span className="flex-1" />
        {/* Mode control first, download LAST — it is the row's trailing action,
            not something wedged between the label and the control it acts on.
            The "Diff · not computed" label that used to sit here is gone: no
            pixel comparison exists to compute, so it announced the absence of a
            feature rather than the outcome of one. */}
        {hasBefore ? (
          <SegmentedControl
            size="sm"
            ariaLabel="What the thumbnails show"
            value={mode}
            onChange={(v) => setMode(v as ThumbMode)}
            options={[
              { value: 'before', label: 'Before' },
              { value: 'after', label: 'After' },
            ]}
          />
        ) : null}
        {onSaveAll && !capturing ? (
          <Tooltip
            placement="top"
            content={
              <span className="text-xs">
                Saves every capture in this set, named by its walkthrough position.
              </span>
            }
          >
            <Button variant="secondary" size="icon" aria-label="Save screens" onClick={onSaveAll}>
              <IconDownload className="w-4 h-4" />
            </Button>
          </Tooltip>
        ) : null}
      </div>

      <div className="relative">
        {overflowing ? (
          <button
            type="button"
            aria-label="Scroll left"
            onClick={() => scrollBy(-SCROLL_STEP)}
            className="strip-nav absolute -left-2 top-[92px] z-10 h-[26px] w-[26px] place-items-center rounded-full border border-(--border-default) bg-(--surface-overlay) text-(--text-secondary) shadow-md hover:text-(--text-primary)"
          >
            <IconChevronLeft className="w-3.5 h-3.5" />
          </button>
        ) : null}
        <div
          ref={stripRef}
          className="flex snap-x snap-proximity gap-3 overflow-x-auto scroll-smooth px-0.5 pb-2.5 pt-1.5 [scrollbar-width:thin]"
        >
          {pairs.map((pair) => {
            const front =
              mode === 'before' ? (pair.before ?? pair.after) : (pair.after ?? pair.before)
            const hasBack = pair.class === 'pair' && mode === 'after'
            return (
              <div key={pair.key} className="flex w-[110px] shrink-0 snap-start flex-col gap-1">
                <button
                  type="button"
                  // Not openable mid-capture: the gallery would show a pair whose
                  // after has not landed, and re-render underneath the reader as
                  // it does.
                  disabled={capturing}
                  onClick={() => onOpen(pair.key)}
                  aria-label={
                    capturing ? `${pair.title} — still capturing` : `Compare ${pair.title}`
                  }
                  className="group relative block h-[196px] w-[110px] rounded-lg text-left disabled:cursor-default"
                >
                  {hasBack ? (
                    <span className="absolute left-0 top-0 h-[184px] w-[96px] -translate-x-[3px] -translate-y-[3px] rounded-md border border-(--border-subtle) bg-(--surface-raised)" />
                  ) : null}
                  {/* No CONCLUSION while the capture is still running. "Only on
                      the base" is a claim about the branch, and mid-capture it is
                      simply the after not having arrived yet. */}
                  {!capturing && (pair.class === 'new' || pair.class === 'removed') ? (
                    <span
                      className={`absolute left-2.5 top-2.5 z-10 rounded px-1 text-[8.5px] font-bold uppercase tracking-wide ${
                        pair.class === 'new'
                          ? 'bg-(--status-review-bg) text-(--status-review-fg)'
                          : 'bg-(--status-queued-bg) text-(--status-queued-fg)'
                      }`}
                    >
                      {pair.class === 'new' ? 'New' : 'Removed'}
                    </span>
                  ) : null}
                  <span className="absolute left-1.5 top-1.5 block h-[184px] w-[96px] overflow-hidden rounded-md border border-(--border-default) bg-(--surface-muted) shadow-sm transition-shadow group-hover:shadow-md group-hover:border-(--accent-primary)">
                    <Frame src={front?.dataUri} alt={`${pair.title} — ${mode}`} />
                  </span>
                </button>
                <span className="truncate text-[10.5px] text-(--text-secondary)" title={pair.title}>
                  <span className="tabular-nums text-(--text-muted)">
                    {String(pair.index).padStart(2, '0')}
                  </span>{' '}
                  · {pair.title}
                </span>
                <span className="text-[10px] text-(--text-muted)">
                  {capturing ? 'capturing…' : META[pair.class]}
                </span>
              </div>
            )
          })}
        </div>
        {overflowing ? (
          <button
            type="button"
            aria-label="Scroll right"
            onClick={() => scrollBy(SCROLL_STEP)}
            className="strip-nav absolute -right-2 top-[92px] z-10 h-[26px] w-[26px] place-items-center rounded-full border border-(--border-default) bg-(--surface-overlay) text-(--text-secondary) shadow-md hover:text-(--text-primary)"
          >
            <IconChevronRight className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>

      {capturedLabel ? (
        <div className="border-t border-(--border-subtle) pt-1.5 text-[11px] text-(--text-muted)">
          captured {capturedLabel}
        </div>
      ) : null}
    </div>
  )
}
