import { useEffect, useRef, useState, type ReactNode } from 'react'
import { DESIGN_TEXT } from '../../../headless'
import { Button } from '../../primitives/Button'
import { Input } from '../../primitives/Input'

/** A name edited in place: Enter saves, Escape or a blur with nothing changed cancels. */
export function InlineRename({
  value,
  onSave,
  onCancel,
  ariaLabel,
}: {
  value: string
  onSave: (name: string) => Promise<void>
  onCancel: () => void
  ariaLabel: string
}) {
  const [draft, setDraft] = useState(value)
  const [busy, setBusy] = useState(false)
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    ref.current?.focus()
    ref.current?.select()
  }, [])
  const save = async () => {
    const name = draft.trim()
    if (!name || name === value) return onCancel()
    setBusy(true)
    try {
      await onSave(name)
    } finally {
      setBusy(false)
    }
  }
  return (
    <form
      className="flex min-w-0 flex-1 items-center gap-1"
      onSubmit={(e) => {
        e.preventDefault()
        void save()
      }}
    >
      <Input
        ref={ref}
        size="sm"
        value={draft}
        aria-label={ariaLabel}
        disabled={busy}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation()
            onCancel()
          }
        }}
        className="min-w-0 flex-1"
      />
      <Button type="submit" size="sm" variant="primary" loading={busy}>
        Save
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
        Cancel
      </Button>
    </form>
  )
}

/** The in-page question before a delete, with what goes with it. */
export function InlineConfirm({
  message,
  onConfirm,
  onCancel,
}: {
  message: ReactNode
  onConfirm: () => Promise<void>
  onCancel: () => void
}) {
  const [busy, setBusy] = useState(false)
  return (
    <div
      role="alertdialog"
      className="flex flex-col gap-2 rounded-md border px-3 py-2 text-[12.5px]"
      style={{
        background: 'var(--status-stuck-soft-bg)',
        borderColor: 'var(--status-stuck-soft-border)',
        color: 'var(--text-primary)',
      }}
    >
      <span>{message}</span>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="danger"
          loading={busy}
          onClick={async () => {
            setBusy(true)
            try {
              await onConfirm()
            } finally {
              setBusy(false)
            }
          }}
        >
          {DESIGN_TEXT.delete}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

/** An app's kind, as a badge. */
export function KindBadge({ label }: { label: string }) {
  return (
    <span className="shrink-0 rounded-full border border-(--border-subtle) bg-(--surface-muted) px-1.5 py-px text-[10.5px] text-(--text-secondary)">
      {label}
    </span>
  )
}
