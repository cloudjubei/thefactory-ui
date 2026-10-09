import { useState } from 'react'
import { DESIGN_TEXT, designItemViewKind, type DesignCompareBaseline } from '../../../headless'
import type { DesignItem } from '../../../headless/api'
import { FullScreenOverlay } from '../../primitives/FullScreenOverlay'
import SegmentedControl from '../../primitives/SegmentedControl'
import Spinner from '../../primitives/Spinner'
import DesignItemBody from './DesignItemBody'
import { useObjectUrl } from './useObjectUrl'

export type DesignCompareOverlayProps = {
  /** The built version to compare; `undefined` keeps the compare closed. */
  built: DesignItem | undefined
  baseline: DesignCompareBaseline | undefined
  srcOf: (itemId: string) => string | undefined
  onClose: () => void
}

type Mode = 'side' | 'slider'

function Pane({ label, item, src }: { label: string; item: DesignItem; src: string | undefined }) {
  return (
    <figure className="flex min-h-0 min-w-0 flex-1 flex-col border-r border-(--border-subtle) last:border-r-0">
      <figcaption className="shrink-0 px-3 py-2 text-[12px] text-(--text-secondary)">
        <span className="font-semibold text-(--text-primary)">{label}</span> · {item.name}
      </figcaption>
      <div className="min-h-0 flex-1">
        <DesignItemBody item={item} src={src} />
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
        aria-label="Where the built version starts"
        className="w-full max-w-xl"
      />
    </div>
  )
}

/**
 * A built version beside what it is compared with — the approved design when
 * that is an image, else the built version before it — side by side, or, for
 * two images, one over the other with a slider.
 */
export default function DesignCompareOverlay({
  built,
  baseline,
  srcOf,
  onClose,
}: DesignCompareOverlayProps) {
  const [mode, setMode] = useState<Mode>('side')
  const open = built !== undefined && baseline !== undefined
  const canSlide =
    open && designItemViewKind(built) === 'image' && designItemViewKind(baseline.item) === 'image'
  const beforeSrc = baseline ? srcOf(baseline.item.id) : undefined
  const afterSrc = built ? srcOf(built.id) : undefined
  const shown: Mode = canSlide ? mode : 'side'
  return (
    <FullScreenOverlay
      isOpen={open}
      onClose={onClose}
      {...(built ? { title: `${DESIGN_TEXT.compare} · ${built.name}` } : {})}
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
            <Pane label={baseline.label} item={baseline.item} src={beforeSrc} />
            <Pane label="Built version" item={built} src={afterSrc} />
          </div>
        )
      ) : null}
    </FullScreenOverlay>
  )
}
