import { useEffect, useRef, useState } from 'react'
import {
  FEATURE_PROCESS_DEFAULT_TAG,
  FEATURE_PROCESS_EXTEND_NOTE,
  FEATURE_PROCESS_FIX_NOTE,
  FEATURE_PROCESS_QUESTION,
  featureProcessOptions,
} from '../../../headless'
import { IconChevron } from '../../icons'

export type FeatureProcessChooserProps = {
  /** The way chosen so far — the story process's own until the person picks. */
  choice: string | undefined
  /** The way the story's process works its features when nobody picks. */
  defaultChoice?: string
  /** The new features join an open run, which works them its own way: nothing to choose. */
  joinsOpenRun?: boolean
  busy?: boolean
  onChoose: (processId: string) => void
}

/**
 * How the story's features are worked, as one chip on the launch card: it
 * names the way chosen — the default until the person picks — and opens the
 * other ways, each with what it means. The person's choice, carried on the
 * launch decision. Native peer: `native/compound/chat/FeatureProcessChooser`.
 */
type PopoverAnchor = { left: number; top?: number; bottom?: number }

/** Where the options open: under the chip, or above it when the screen ends first. */
function popoverAnchor(rect: DOMRect, viewportHeight: number): PopoverAnchor {
  const below = viewportHeight - rect.bottom
  return below >= POPOVER_ROOM_PX
    ? { left: rect.left, top: rect.bottom + POPOVER_GAP_PX }
    : { left: rect.left, bottom: viewportHeight - rect.top + POPOVER_GAP_PX }
}

/** Room the options need below the chip before they open above it instead. */
const POPOVER_ROOM_PX = 240
const POPOVER_GAP_PX = 6

export default function FeatureProcessChooser({
  choice,
  defaultChoice,
  joinsOpenRun = false,
  busy = false,
  onChoose,
}: FeatureProcessChooserProps) {
  const [anchor, setAnchor] = useState<PopoverAnchor>()
  const open = anchor !== undefined
  const rootRef = useRef<HTMLDivElement>(null)
  const chipRef = useRef<HTMLButtonElement>(null)
  const setOpen = (next: boolean | ((was: boolean) => boolean)) => {
    const want = typeof next === 'function' ? next(open) : next
    const rect = want ? chipRef.current?.getBoundingClientRect() : undefined
    setAnchor(rect ? popoverAnchor(rect, window.innerHeight) : undefined)
  }
  const options = featureProcessOptions()
  const picked = options.find((o) => o.processId === choice) ?? options[0]

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    // Fixed to where the chip was, so a scroll would leave it behind: it closes.
    const closeOnScroll = () => setAnchor(undefined)
    document.addEventListener('mousedown', close)
    window.addEventListener('scroll', closeOnScroll, true)
    return () => {
      document.removeEventListener('mousedown', close)
      window.removeEventListener('scroll', closeOnScroll, true)
    }
  }, [open])

  if (joinsOpenRun) {
    return (
      <span className="inline-flex h-[26px] items-center rounded-full border border-(--border-default) bg-(--surface-muted) px-2.5 text-[12px] text-(--text-secondary)">
        {FEATURE_PROCESS_EXTEND_NOTE}
      </span>
    )
  }

  return (
    <div
      ref={rootRef}
      className="relative"
      onKeyDown={(e) => {
        if (e.key === 'Escape') setOpen(false)
      }}
    >
      <button
        ref={chipRef}
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`${FEATURE_PROCESS_QUESTION}: ${picked?.label ?? ''}`}
        disabled={busy}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-[26px] items-center gap-1.5 rounded-full border border-(--accent-primary)/40 bg-(--accent-primary)/10 px-2.5 text-[12px] font-medium text-(--text-primary) enabled:hover:border-(--accent-primary) disabled:opacity-50"
      >
        {picked?.label}
        <IconChevron
          className={`w-3 h-3 transition-transform ${open ? '-rotate-90' : 'rotate-90'}`}
        />
      </button>
      {open ? (
        <div
          role="radiogroup"
          aria-label={FEATURE_PROCESS_QUESTION}
          style={anchor}
          className="fixed z-50 flex w-[360px] max-w-[calc(100vw-32px)] flex-col gap-1 rounded-lg border border-(--border-default) bg-(--surface-overlay) p-1.5 shadow-lg"
        >
          {options.map((option) => {
            const selected = option.processId === picked?.processId
            return (
              <button
                key={option.processId}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => {
                  onChoose(option.processId)
                  setOpen(false)
                }}
                className={`flex w-full flex-col items-start gap-0.5 rounded-md border px-2.5 py-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-(--accent-primary) ${
                  selected
                    ? 'border-(--accent-primary)/50 bg-(--accent-primary)/10'
                    : 'border-transparent hover:bg-(--surface-raised)'
                }`}
              >
                <span className="flex items-center gap-2 text-[12.5px] font-semibold text-(--text-primary)">
                  {option.label}
                  {option.processId === defaultChoice ? (
                    <span className="rounded-full border border-(--border-default) px-1.5 text-[10px] font-normal text-(--text-secondary)">
                      {FEATURE_PROCESS_DEFAULT_TAG}
                    </span>
                  ) : null}
                </span>
                <span className="text-[11.5px] leading-snug text-(--text-secondary)">
                  {option.detail}
                </span>
              </button>
            )
          })}
          <span className="border-t border-(--border-subtle) px-2.5 pt-1.5 pb-0.5 text-[10.5px] text-(--text-muted)">
            {FEATURE_PROCESS_FIX_NOTE}
          </span>
        </div>
      ) : null}
    </div>
  )
}
