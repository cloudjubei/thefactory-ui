import React, { useEffect, useRef, type ReactNode } from 'react'
import StatusControl from './StatusControl'
import { useStoryForm } from '../../headless/hooks/useStoryForm'
import type { StoryFormValues } from '../../headless/hooks/useStoryForm'

/**
 * Story form (presentational). Renders the same fields on both web and
 * desktop: a header with `StatusControl` + an optional project-chip slot,
 * a Title input (focused + selected on mount), and a Description textarea.
 *
 * State + validation lives in the headless `useStoryForm` hook so the
 * upcoming RN target can reuse the exact same machinery with native inputs.
 * Submit calls `onSubmit({ title, status, description })`; the host renders
 * the actual Save / Create / Delete buttons in the surrounding `<Modal
 * footer>` via the shared `formId`.
 */

export type { StoryFormValues }

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
  const form = useStoryForm({
    initialValues,
    onSubmit,
    onDirty: onDirtyChange,
  })

  const localTitleRef = useRef<HTMLInputElement>(null)
  const combinedTitleRef = titleRef ?? localTitleRef

  useEffect(() => {
    if (combinedTitleRef?.current) {
      combinedTitleRef.current.focus()
      combinedTitleRef.current.select?.()
    }
  }, [combinedTitleRef])

  return (
    <form
      id={formId}
      onSubmit={(e) => {
        e.preventDefault()
        void form.handleSubmit()
      }}
      onKeyDown={form.onKeyDown}
      className="space-y-4"
      aria-label={isCreate ? 'Create Story' : 'Edit Story'}
    >
      <div className="grid grid-cols-1 gap-3">
        <div className="flex justify-between items-center">
          <StatusControl status={form.values.status} onChange={form.setStatus} />
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
            value={form.values.title}
            onChange={(e) => form.setTitle(e.target.value)}
            disabled={submitting}
            className="w-full rounded-md border px-3 py-2 text-sm disabled:opacity-60"
            style={{
              background: 'var(--surface-raised)',
              borderColor: form.errors.title
                ? 'var(--status-stuck-soft-border)'
                : 'var(--border-default)',
              color: 'var(--text-primary)',
            }}
            aria-invalid={!!form.errors.title}
            aria-describedby={form.errors.title ? 'story-title-error' : undefined}
          />
          {form.errors.title ? (
            <div
              id="story-title-error"
              className="text-xs"
              style={{ color: 'var(--status-stuck-fg)' }}
            >
              {form.errors.title}
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
            value={form.values.description}
            onChange={(e) => form.setDescription(e.target.value)}
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
