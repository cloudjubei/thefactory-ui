import React, { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import StatusControl from './StatusControl'
import type { StoryStatus } from './StoryCard'

/**
 * Story form (presentational). Renders the same fields on both web and
 * desktop: a header with `StatusControl` + an optional project-chip slot,
 * a Title input (focused + selected on mount), and a Description textarea.
 *
 * The form is pure UI — it doesn't know about the SDK, the project list,
 * or routing. Submitting calls `onSubmit({ title, status, description })`;
 * the host renders the actual Save / Create / Delete buttons in the
 * surrounding `<Modal footer>` via the shared `formId`.
 */

export type StoryFormValues = {
  title: string
  status: StoryStatus
  description?: string
}

export type StoryFormProps = {
  initialValues?: Partial<StoryFormValues>
  onSubmit: (values: StoryFormValues) => void | Promise<void>
  submitting?: boolean
  isCreate?: boolean
  titleRef?: React.RefObject<HTMLInputElement | null>
  onDirtyChange?: (dirty: boolean) => void
  /** Unique `id` shared with a `<button type="submit" form={formId}>` rendered
   *  in the host's modal footer. */
  formId?: string
  /** Slot for the host's `ProjectChip` (or any other context-aware chip). */
  renderProjectChip?: () => ReactNode
}

export default function StoryForm({
  initialValues,
  onSubmit,
  submitting = false,
  isCreate = false,
  titleRef,
  onDirtyChange,
  formId,
  renderProjectChip,
}: StoryFormProps) {
  const [title, setTitle] = useState<string>(initialValues?.title ?? '')
  const [status, setStatus] = useState<StoryStatus>(initialValues?.status ?? '-')
  const [description, setDescription] = useState<string>(initialValues?.description ?? '')
  const [errors, setErrors] = useState<{ title?: string }>({})

  const localTitleRef = useRef<HTMLInputElement>(null)
  const combinedTitleRef = titleRef ?? localTitleRef

  // Baseline snapshot for dirty tracking — captured once so the parent
  // can render "discard unsaved changes" dialogs without prop-thrashing.
  const initialSnapshotRef = useRef<{
    title: string
    status: StoryStatus
    description: string
  } | null>(null)
  if (initialSnapshotRef.current === null) {
    initialSnapshotRef.current = {
      title: initialValues?.title ?? '',
      status: initialValues?.status ?? '-',
      description: initialValues?.description ?? '',
    }
  }

  useEffect(() => {
    if (combinedTitleRef?.current) {
      combinedTitleRef.current.focus()
      combinedTitleRef.current.select?.()
    }
  }, [combinedTitleRef])

  useEffect(() => {
    const baseline = initialSnapshotRef.current!
    const dirty =
      title !== baseline.title ||
      status !== baseline.status ||
      description !== baseline.description
    onDirtyChange?.(dirty)
  }, [title, status, description, onDirtyChange])

  const canSubmit = useMemo(() => title.trim().length > 0 && !submitting, [title, submitting])

  function validate(): boolean {
    const next: { title?: string } = {}
    if (!title.trim()) next.title = 'Title is required'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault()
    if (!validate()) return
    await onSubmit({
      title: title.trim(),
      status,
      description: description?.trim() || '',
    })
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'enter') {
      e.preventDefault()
      if (canSubmit) handleSubmit()
    }
  }

  return (
    <form
      id={formId}
      onSubmit={handleSubmit}
      onKeyDown={onKeyDown}
      className="space-y-4"
      aria-label={isCreate ? 'Create Story' : 'Edit Story'}
    >
      <div className="grid grid-cols-1 gap-3">
        <div className="flex justify-between items-center">
          <StatusControl status={status} onChange={(next) => setStatus(next)} />
          <div>{renderProjectChip ? renderProjectChip() : null}</div>
          <div className="w-6"></div>
        </div>
        <div className="flex flex-col gap-1">
          <label
            htmlFor="story-title"
            className="text-xs"
            style={{ color: 'var(--text-secondary)' }}
          >
            Title
          </label>
          <input
            id="story-title"
            ref={combinedTitleRef}
            type="text"
            placeholder="Give your story a clear title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={submitting}
            className="w-full rounded-md border px-3 py-2 text-sm disabled:opacity-60"
            style={{
              background: 'var(--surface-raised)',
              borderColor: errors.title
                ? 'var(--status-stuck-soft-border)'
                : 'var(--border-default)',
              color: 'var(--text-primary)',
            }}
            aria-invalid={!!errors.title}
            aria-describedby={errors.title ? 'story-title-error' : undefined}
          />
          {errors.title ? (
            <div
              id="story-title-error"
              className="text-xs"
              style={{ color: 'var(--status-stuck-fg)' }}
            >
              {errors.title}
            </div>
          ) : null}
        </div>
        <div className="flex flex-col gap-1">
          <label
            htmlFor="story-description"
            className="text-xs"
            style={{ color: 'var(--text-secondary)' }}
          >
            Description
          </label>
          <textarea
            id="story-description"
            rows={4}
            placeholder="Optional description or details"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={submitting}
            className="w-full rounded-md border px-3 py-2 text-sm disabled:opacity-60 resize-y max-h-64"
            style={{
              background: 'var(--surface-raised)',
              borderColor: 'var(--border-default)',
              color: 'var(--text-primary)',
            }}
          />
        </div>
      </div>
    </form>
  )
}
