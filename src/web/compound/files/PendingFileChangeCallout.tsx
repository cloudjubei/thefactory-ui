import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTooltipState } from '../../../headless/hooks/useTooltipState'
import {
  PENDING_FILE_CHANGE_LABEL,
  pendingFileChangeActions,
  pendingFileChangeSummary,
  type PendingFileChange,
  type PendingFileChangeActions,
} from '../../../headless/utils/pendingFileChange'
import { IconWarningTriangle } from '../../icons/IconWarningTriangle'
import { Button } from '../../primitives/Button'

export function PendingFileChangeCallout({
  change,
  color,
  actions,
}: {
  change: PendingFileChange
  color: string
  actions?: PendingFileChangeActions
}) {
  const { open, show, hide } = useTooltipState({ delayMs: 150, closeDelayMs: 220 })
  const [pinned, setPinned] = useState(false)
  const [position, setPosition] = useState<{
    left: number
    top?: number
    bottom?: number
    maxHeight: number
  }>()
  const trigger = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const id = useId()
  const { headline, overlap, source } = pendingFileChangeSummary(change)
  const actionItems = pendingFileChangeActions(change)

  useLayoutEffect(() => {
    if (!open) return
    const place = () => {
      const anchor = trigger.current?.getBoundingClientRect()
      if (!anchor) return
      const width = Math.min(320, window.innerWidth - 16)
      const left = Math.max(
        8,
        Math.min(anchor.left + (anchor.width - width) / 2, window.innerWidth - width - 8),
      )
      const below = window.innerHeight - anchor.bottom
      setPosition(
        below >= Math.min(220, anchor.top)
          ? { left, top: anchor.bottom + 4, maxHeight: below - 12 }
          : { left, bottom: window.innerHeight - anchor.top + 4, maxHeight: anchor.top - 12 },
      )
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return
      if (trigger.current?.contains(event.target) || panel.current?.contains(event.target)) return
      setPinned(false)
      hide(true)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (panel.current?.contains(document.activeElement)) trigger.current?.focus()
      setPinned(false)
      hide(true)
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('keydown', escape)
    }
  }, [open, hide])

  const leave = () => {
    if (!pinned && !panel.current?.contains(document.activeElement)) hide()
  }

  return (
    <>
      <Button
        ref={trigger}
        type="button"
        size="icon"
        variant="ghost"
        className="shrink-0"
        aria-label={PENDING_FILE_CHANGE_LABEL[change.kind]}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-haspopup="dialog"
        onPointerEnter={(event) => {
          if (event.pointerType === 'mouse') show()
        }}
        onPointerLeave={leave}
        onClick={(event) => {
          if (pinned) {
            setPinned(false)
            hide(true)
          } else {
            setPinned(true)
            show(true)
            if (event.detail === 0) {
              requestAnimationFrame(() => panel.current?.focus())
            }
          }
        }}
        onKeyDown={(event) => {
          if (event.key === 'Tab' && !event.shiftKey && panel.current) {
            event.preventDefault()
            panel.current.focus()
          }
        }}
      >
        <span role="img" aria-label={PENDING_FILE_CHANGE_LABEL[change.kind]}>
          <IconWarningTriangle className="size-5" color={color} />
        </span>
      </Button>
      {open &&
        position &&
        createPortal(
          <div
            ref={panel}
            id={id}
            role="dialog"
            aria-labelledby={`${id}-title`}
            tabIndex={-1}
            className="ui-tooltip flex w-80 max-w-[calc(100vw-16px)] flex-col gap-3 overflow-auto p-3 text-sm"
            style={{ position: 'fixed', ...position }}
            onPointerEnter={() => show(true)}
            onPointerLeave={leave}
            onBlur={(event) => {
              if (event.currentTarget.contains(event.relatedTarget)) return
              setPinned(false)
              hide(true)
            }}
          >
            <div>
              <p id={`${id}-title`} className="font-semibold">
                {headline}
              </p>
              {overlap && <p className="wrap-anywhere text-(--text-secondary)">{overlap}</p>}
              {source && <p className="mt-1 wrap-anywhere text-xs text-(--text-muted)">{source}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              {actionItems.map((action) => {
                const run = actions?.[action.key]
                const primary = 'primary' in action
                return (
                  <Button
                    key={action.key}
                    type="button"
                    size="sm"
                    variant={primary ? 'primary' : 'secondary'}
                    className={primary && actionItems.length > 2 ? 'w-full' : undefined}
                    title={'detail' in action ? action.detail : undefined}
                    disabled={!run || actions?.disabled}
                    onClick={() => {
                      if (!run) return
                      if (panel.current?.contains(document.activeElement)) trigger.current?.focus()
                      setPinned(false)
                      hide(true)
                      run()
                    }}
                  >
                    {action.label}
                  </Button>
                )
              })}
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
