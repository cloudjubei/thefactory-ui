import { useRef, useState } from 'react'

import type { ScreenPair, ScreenPairClass } from '../../../../headless'
import SegmentedControl from '../../../primitives/SegmentedControl'
import Tooltip from '../../../primitives/Tooltip'
import { IconChevronLeft, IconChevronRight } from '../../../icons'

export type ScreensTabProps = {
  pairs: readonly ScreenPair[]
  onOpen: (key: string) => void
  /** When the capture happened, as a label — the one fact the footer keeps. */
  capturedLabel: string | undefined
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
export default function ScreensTab({ pairs, onOpen, capturedLabel }: ScreensTabProps) {
  const [mode, setMode] = useState<ThumbMode>('after')
  const stripRef = useRef<HTMLDivElement | null>(null)
  const scrollBy = (dx: number) => stripRef.current?.scrollBy({ left: dx, behavior: 'smooth' })

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[12.5px] text-(--text-secondary)">
          <span className="font-semibold text-(--text-primary)">{pairs.length}</span>{' '}
          {pairs.length === 1 ? 'screen' : 'screens'} captured
        </span>
        <span className="flex-1" />
        <Tooltip
          content={
            <span className="text-xs">
              A pixel comparison has not been computed for this run yet, so there is no Diff view.
              Open a screen to compare it by eye.
            </span>
          }
          placement="top"
        >
          <span className="text-[11px] text-(--text-muted)">Diff · not computed</span>
        </Tooltip>
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
      </div>

      <div className="relative">
        <button
          type="button"
          aria-label="Scroll left"
          onClick={() => scrollBy(-SCROLL_STEP)}
          className="absolute -left-2 top-[92px] z-10 hidden h-[26px] w-[26px] place-items-center rounded-full border border-(--border-default) bg-(--surface-overlay) text-(--text-secondary) shadow-md hover:text-(--text-primary) md:grid"
        >
          <IconChevronLeft className="w-3.5 h-3.5" />
        </button>
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
                  onClick={() => onOpen(pair.key)}
                  aria-label={`Compare ${pair.title}`}
                  className="group relative block h-[196px] w-[110px] rounded-lg text-left"
                >
                  {hasBack ? (
                    <span className="absolute left-0 top-0 h-[184px] w-[96px] -translate-x-[3px] -translate-y-[3px] rounded-md border border-(--border-subtle) bg-(--surface-raised)" />
                  ) : null}
                  {pair.class === 'new' || pair.class === 'removed' ? (
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
                <span className="text-[10px] text-(--text-muted)">{META[pair.class]}</span>
              </div>
            )
          })}
        </div>
        <button
          type="button"
          aria-label="Scroll right"
          onClick={() => scrollBy(SCROLL_STEP)}
          className="absolute -right-2 top-[92px] z-10 hidden h-[26px] w-[26px] place-items-center rounded-full border border-(--border-default) bg-(--surface-overlay) text-(--text-secondary) shadow-md hover:text-(--text-primary) md:grid"
        >
          <IconChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {capturedLabel ? (
        <div className="border-t border-(--border-subtle) pt-1.5 text-[11px] text-(--text-muted)">
          captured {capturedLabel}
        </div>
      ) : null}
    </div>
  )
}
