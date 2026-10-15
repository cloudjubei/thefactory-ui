import { useEffect, useRef, useState } from 'react'
import type { ProcessBaseBranchOptions } from 'thefactory-tools/types'
import {
  BASE_BRANCH_ASKED_MISSING,
  BASE_BRANCH_CURRENT_TAG,
  BASE_BRANCH_FOLLOWS_OPEN_RUN,
  BASE_BRANCH_LABEL,
  BASE_BRANCH_NOTE,
  BASE_BRANCH_OTHERS_HEADING,
  baseBranchChoiceView,
  type BaseBranchRowView,
} from '../../../headless'
import { IconChevron } from '../../icons'

export type BaseBranchChooserProps = {
  /** The branches the launch preview offers; nothing is shown without them. */
  options: ProcessBaseBranchOptions | undefined
  /** The branch the agent asked for. */
  asked?: string
  /** The person's pick so far. */
  picked: string | undefined
  /** The work joins, or builds on, a run's open work, which decides its branch: nothing to choose. */
  followsOpenRun?: boolean
  busy?: boolean
  onChoose: (branch: string) => void
}

type PopoverAnchor = { left: number; top?: number; bottom?: number }

/** Room the branches need below the chip before they open above it instead. */
const POPOVER_ROOM_PX = 280
const POPOVER_GAP_PX = 6

/** Where the branches open: under the chip, or above it when the screen ends first. */
function popoverAnchor(rect: DOMRect, viewportHeight: number): PopoverAnchor {
  const below = viewportHeight - rect.bottom
  return below >= POPOVER_ROOM_PX
    ? { left: rect.left, top: rect.bottom + POPOVER_GAP_PX }
    : { left: rect.left, bottom: viewportHeight - rect.top + POPOVER_GAP_PX }
}

/**
 * The branch a launch works off, as one chip on the launch card: it names the
 * branch — the checkout's current one until the person picks — and opens the
 * project's branches, `dev`, `main` and the current one first. The person's
 * choice, carried on the launch decision. Native peer:
 * `native/compound/chat/BaseBranchChooser`.
 */
export default function BaseBranchChooser({
  options,
  asked,
  picked,
  followsOpenRun = false,
  busy = false,
  onChoose,
}: BaseBranchChooserProps) {
  const [anchor, setAnchor] = useState<PopoverAnchor>()
  const open = anchor !== undefined
  const rootRef = useRef<HTMLDivElement>(null)
  const chipRef = useRef<HTMLButtonElement>(null)
  const setOpen = (next: boolean | ((was: boolean) => boolean)) => {
    const want = typeof next === 'function' ? next(open) : next
    const rect = want ? chipRef.current?.getBoundingClientRect() : undefined
    setAnchor(rect ? popoverAnchor(rect, window.innerHeight) : undefined)
  }
  const view = baseBranchChoiceView(options, asked, picked)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    // Fixed to where the chip was, so a scroll would leave it behind: it closes.
    const closeOnScroll = (e: Event) => {
      if (!rootRef.current?.contains(e.target as Node)) setAnchor(undefined)
    }
    document.addEventListener('mousedown', close)
    window.addEventListener('scroll', closeOnScroll, true)
    return () => {
      document.removeEventListener('mousedown', close)
      window.removeEventListener('scroll', closeOnScroll, true)
    }
  }, [open])

  if (!options || !view.picked) return null

  if (followsOpenRun) {
    return (
      <span className="inline-flex h-[26px] items-center rounded-full border border-(--border-default) bg-(--surface-muted) px-2.5 text-[12px] text-(--text-secondary)">
        {BASE_BRANCH_FOLLOWS_OPEN_RUN}
      </span>
    )
  }

  const branchRow = (row: BaseBranchRowView) => {
    const selected = row.name === view.picked
    return (
      <button
        key={row.name}
        type="button"
        role="radio"
        aria-checked={selected}
        onClick={() => {
          onChoose(row.name)
          setOpen(false)
        }}
        className={`flex w-full items-center gap-2 rounded-md border px-2.5 py-1.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-(--accent-primary) ${
          selected
            ? 'border-(--accent-primary)/50 bg-(--accent-primary)/10'
            : 'border-transparent hover:bg-(--surface-raised)'
        }`}
      >
        <span className="min-w-0 truncate font-mono text-[12.5px] text-(--text-primary)">
          {row.name}
        </span>
        {row.current ? (
          <span className="shrink-0 rounded-full border border-(--border-default) px-1.5 text-[10px] text-(--text-secondary)">
            {BASE_BRANCH_CURRENT_TAG}
          </span>
        ) : null}
      </button>
    )
  }

  return (
    <div
      ref={rootRef}
      className="relative flex flex-col gap-1"
      onKeyDown={(e) => {
        if (e.key === 'Escape') setOpen(false)
      }}
    >
      <button
        ref={chipRef}
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`${BASE_BRANCH_LABEL}: ${view.picked}`}
        title={BASE_BRANCH_NOTE}
        disabled={busy}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-[26px] max-w-[240px] items-center gap-1.5 rounded-full border border-(--accent-primary)/40 bg-(--accent-primary)/10 px-2.5 text-[12px] text-(--text-primary) enabled:hover:border-(--accent-primary) disabled:opacity-50"
      >
        <span className="text-(--text-secondary)">{BASE_BRANCH_LABEL}</span>
        <span className="min-w-0 truncate font-mono font-medium">{view.picked}</span>
        <IconChevron
          className={`w-3 h-3 shrink-0 transition-transform ${open ? '-rotate-90' : 'rotate-90'}`}
        />
      </button>
      {view.askedMissing ? (
        <span className="text-[11px] text-(--status-working-soft-fg)">
          {BASE_BRANCH_ASKED_MISSING(view.askedMissing)}
        </span>
      ) : null}
      {open ? (
        <div
          role="radiogroup"
          aria-label={BASE_BRANCH_LABEL}
          style={anchor}
          className="fixed z-50 flex max-h-[320px] w-[300px] max-w-[calc(100vw-32px)] flex-col gap-0.5 overflow-y-auto rounded-lg border border-(--border-default) bg-(--surface-overlay) p-1.5 shadow-lg"
        >
          {view.usual.map(branchRow)}
          {view.others.length > 0 ? (
            <>
              <span className="px-2.5 pt-1.5 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)">
                {BASE_BRANCH_OTHERS_HEADING}
              </span>
              {view.others.map(branchRow)}
            </>
          ) : null}
          <span className="mt-1 border-t border-(--border-subtle) px-2.5 pt-1.5 pb-0.5 text-[10.5px] text-(--text-muted)">
            {BASE_BRANCH_NOTE}
          </span>
        </div>
      ) : null}
    </div>
  )
}
