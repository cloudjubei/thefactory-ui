import { useEffect, useRef, useState } from 'react'
import {
  AGENT_TYPE_NOT_PROVING_TAG,
  AGENT_TYPE_SLOT_NOTE,
  type AgentTypeOptionView,
  type AgentTypeSlotRowView,
} from '../../../headless'
import { IconChevron } from '../../icons'

export type AgentTypeSlotChooserProps = {
  /** The slot as the card shows it: the type it runs, where that came from, and what else may run there. */
  row: AgentTypeSlotRowView
  busy?: boolean
  onChoose: (agentTypeId: string) => void
}

type PopoverAnchor = { left: number; top?: number; bottom?: number }

/** Room the types need below the chip before they open above it instead. */
const POPOVER_ROOM_PX = 280
const POPOVER_GAP_PX = 6

function popoverAnchor(rect: DOMRect, viewportHeight: number): PopoverAnchor {
  const below = viewportHeight - rect.bottom
  return below >= POPOVER_ROOM_PX
    ? { left: rect.left, top: rect.bottom + POPOVER_GAP_PX }
    : { left: rect.left, bottom: viewportHeight - rect.top + POPOVER_GAP_PX }
}

function Tag({ children }: { children: string }) {
  return (
    <span className="shrink-0 rounded-full border border-(--border-default) px-1.5 text-[10px] text-(--text-secondary)">
      {children}
    </span>
  )
}

/**
 * The agent type one process slot runs, as one chip on the launch card: it
 * names the type — proposed, the project's default, its group's or the
 * built-in, and says which — and opens every type of the matching role, the
 * project's and its group's beside the built-ins. The person's choice, carried
 * on the launch decision. Native peer: `native/compound/chat/AgentTypeSlotChooser`.
 */
export default function AgentTypeSlotChooser({
  row,
  busy = false,
  onChoose,
}: AgentTypeSlotChooserProps) {
  const [anchor, setAnchor] = useState<PopoverAnchor>()
  const open = anchor !== undefined
  const rootRef = useRef<HTMLDivElement>(null)
  const chipRef = useRef<HTMLButtonElement>(null)
  const setOpen = (want: boolean) => {
    const rect = want ? chipRef.current?.getBoundingClientRect() : undefined
    setAnchor(rect ? popoverAnchor(rect, window.innerHeight) : undefined)
  }

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setAnchor(undefined)
    }
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

  const optionRow = (option: AgentTypeOptionView) => {
    const selected = option.id === row.chosen.id
    return (
      <button
        key={option.id}
        type="button"
        role="radio"
        aria-checked={selected}
        onClick={() => {
          onChoose(option.id)
          setAnchor(undefined)
        }}
        className={`flex w-full flex-col gap-0.5 rounded-md border px-2.5 py-1.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-(--accent-primary) ${
          selected
            ? 'border-(--accent-primary)/50 bg-(--accent-primary)/10'
            : 'border-transparent hover:bg-(--surface-raised)'
        }`}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="min-w-0 truncate text-[12.5px] font-medium text-(--text-primary)">
            {option.label}
          </span>
          <Tag>{option.scopeLabel}</Tag>
          {option.notProving ? <Tag>{AGENT_TYPE_NOT_PROVING_TAG}</Tag> : null}
        </span>
        {option.description ? (
          <span className="text-[11px] text-(--text-muted)">{option.description}</span>
        ) : null}
      </button>
    )
  }

  return (
    <div
      ref={rootRef}
      className="relative flex flex-col gap-1"
      onKeyDown={(e) => {
        if (e.key === 'Escape') setAnchor(undefined)
      }}
    >
      <button
        ref={chipRef}
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`${row.slotLabel}: ${row.chosen.label}, ${row.sourceLabel}`}
        title={AGENT_TYPE_SLOT_NOTE}
        disabled={busy}
        onClick={() => setOpen(!open)}
        className={`inline-flex h-[26px] max-w-[280px] items-center gap-1.5 rounded-full border px-2.5 text-[12px] text-(--text-primary) enabled:hover:border-(--accent-primary) disabled:opacity-50 ${
          row.changed
            ? 'border-(--accent-primary) bg-(--accent-primary)/15'
            : 'border-(--accent-primary)/40 bg-(--accent-primary)/10'
        }`}
      >
        <span className="text-(--text-secondary)">{row.slotLabel}</span>
        <span className="min-w-0 truncate font-medium">{row.chosen.label}</span>
        <span className="shrink-0 text-[10px] text-(--text-muted)">{row.sourceLabel}</span>
        <IconChevron
          className={`w-3 h-3 shrink-0 transition-transform ${open ? '-rotate-90' : 'rotate-90'}`}
        />
      </button>
      {open ? (
        <div
          role="radiogroup"
          aria-label={row.slotLabel}
          style={anchor}
          className="fixed z-50 flex max-h-[320px] w-[320px] max-w-[calc(100vw-32px)] flex-col gap-0.5 overflow-y-auto rounded-lg border border-(--border-default) bg-(--surface-overlay) p-1.5 shadow-lg"
        >
          {row.options.map(optionRow)}
          <span className="mt-1 border-t border-(--border-subtle) px-2.5 pt-1.5 pb-0.5 text-[10.5px] text-(--text-muted)">
            {AGENT_TYPE_SLOT_NOTE}
          </span>
        </div>
      ) : null}
    </div>
  )
}
