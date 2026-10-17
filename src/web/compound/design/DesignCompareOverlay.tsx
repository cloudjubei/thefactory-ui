import { useState } from 'react'
import { DESIGN_TEXT, designViewKind, type DesignShown } from '../../../headless'
import { FullScreenOverlay } from '../../primitives/FullScreenOverlay'
import SegmentedControl from '../../primitives/SegmentedControl'
import Spinner from '../../primitives/Spinner'
import DesignFileBody from './DesignFileBody'
import { useObjectUrl } from './useObjectUrl'

/** One side of a compare: a file and what it is. */
export type DesignCompareSide = { shown: DesignShown; label: string }

export type DesignCompareOverlayProps = {
  /** What is current; with `proposed`, `undefined` keeps the compare closed. */
  current: DesignCompareSide | undefined
  proposed: DesignCompareSide | undefined
  srcOf: (shown: DesignShown) => string | undefined
  onClose: () => void
}

type Mode = 'side' | 'slider'

function Pane({ side, src }: { side: DesignCompareSide; src: string | undefined }) {
  return (
    <figure className="flex min-h-0 min-w-0 flex-1 flex-col border-r border-(--border-subtle) last:border-r-0">
      <figcaption className="shrink-0 px-3 py-2 text-[12px] text-(--text-secondary)">
        <span className="font-semibold text-(--text-primary)">{side.label}</span> ·{' '}
        {side.shown.name}
      </figcaption>
      <div className="min-h-0 flex-1">
        <DesignFileBody shown={side.shown} src={src} />
      </div>
    </figure>
  )
}

function Slider({ before: beforeSrc, after: afterSrc }: { before: string; after: string }) {
  const [at, setAt] = useState(50)
  const before = useObjectUrl(beforeSrc).url
  const after = useObjectUrl(afterSrc).url
  if (!before || !after) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Spinner size={20} />
      </div>
    )
  }
  return (
    <div className="flex h-full min-h-0 w-full flex-col items-center gap-3 p-4">
      <div className="relative min-h-0 w-full flex-1">
        <img
          src={before}
          alt=""
          className="absolute inset-0 h-full w-full object-contain"
          draggable={false}
        />
        <img
          src={after}
          alt=""
          className="absolute inset-0 h-full w-full object-contain"
          style={{ clipPath: `inset(0 0 0 ${at}%)` }}
          draggable={false}
        />
        <div
          className="pointer-events-none absolute inset-y-0 w-0.5 bg-(--accent-primary)"
          style={{ left: `${at}%` }}
        />
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={at}
        onChange={(e) => setAt(Number(e.target.value))}
        aria-label="Where the proposed look starts"
        className="w-full max-w-xl"
      />
    </div>
  )
}

/**
 * A proposed look beside what is current — side by side, or, for two images,
 * one over the other with a slider.
 */
export default function DesignCompareOverlay({
  current,
  proposed,
  srcOf,
  onClose,
}: DesignCompareOverlayProps) {
  const [mode, setMode] = useState<Mode>('side')
  const open = current !== undefined && proposed !== undefined
  const canSlide =
    open &&
    designViewKind(current.shown.source) === 'image' &&
    designViewKind(proposed.shown.source) === 'image'
  const beforeSrc = current ? srcOf(current.shown) : undefined
  const afterSrc = proposed ? srcOf(proposed.shown) : undefined
  const shown: Mode = canSlide ? mode : 'side'
  return (
    <FullScreenOverlay
      isOpen={open}
      onClose={onClose}
      {...(proposed ? { title: `${DESIGN_TEXT.compareWithCurrent} · ${proposed.shown.name}` } : {})}
      {...(canSlide
        ? {
            headerActions: (
              <SegmentedControl
                size="sm"
                ariaLabel="Compare how"
                value={shown}
                onChange={(v) => setMode(v as Mode)}
                options={[
                  { value: 'side', label: DESIGN_TEXT.sideBySide },
                  { value: 'slider', label: DESIGN_TEXT.slider },
                ]}
              />
            ),
          }
        : {})}
    >
      {open ? (
        shown === 'slider' && beforeSrc && afterSrc ? (
          <Slider before={beforeSrc} after={afterSrc} />
        ) : (
          <div className="flex h-full min-h-0 w-full">
            <Pane side={current} src={beforeSrc} />
            <Pane side={proposed} src={afterSrc} />
          </div>
        )
      ) : null}
    </FullScreenOverlay>
  )
}
