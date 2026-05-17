import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { StoryStatus } from '../../web/compound/StoryCard'

/**
 * Headless state machine for "create / edit story". Sister to `useFeatureForm`.
 * Owns title / status / description, dirty tracking against the initial
 * snapshot, validation, and submit. RN renders the same fields with native
 * inputs; web/desktop render with HTML inputs.
 */

export type StoryFormValues = {
  title: string
  status: StoryStatus
  description: string
}

export type StoryFormInitialValues = Partial<StoryFormValues>

export type UseStoryFormOptions = {
  initialValues?: StoryFormInitialValues
  onSubmit: (values: StoryFormValues) => unknown | Promise<unknown>
  onDirty?: (dirty: boolean) => void
}

export type UseStoryForm = {
  values: StoryFormValues
  setTitle: (v: string) => void
  setStatus: (v: StoryStatus) => void
  setDescription: (v: string) => void
  dirty: boolean
  errors: { title?: string }
  canSubmit: boolean
  handleSubmit: () => Promise<void>
  onKeyDown: (e: { key: string; metaKey?: boolean; ctrlKey?: boolean; preventDefault: () => void }) => void
}

function seed(v?: StoryFormInitialValues): StoryFormValues {
  return {
    title: v?.title ?? '',
    status: (v?.status as StoryStatus) ?? '-',
    description: v?.description ?? '',
  }
}

export function useStoryForm(opts: UseStoryFormOptions): UseStoryForm {
  const { initialValues, onSubmit, onDirty } = opts
  const initial = useMemo(() => seed(initialValues), [initialValues])
  const baselineRef = useRef<StoryFormValues>(initial)

  const [title, setTitle] = useState(initial.title)
  const [status, setStatus] = useState<StoryStatus>(initial.status)
  const [description, setDescription] = useState(initial.description)
  const [errors, setErrors] = useState<{ title?: string }>({})
  const [submitting, setSubmitting] = useState(false)

  const baseline = baselineRef.current
  const dirty =
    title !== baseline.title ||
    status !== baseline.status ||
    description !== baseline.description

  useEffect(() => {
    onDirty?.(dirty)
  }, [dirty, onDirty])

  const canSubmit = title.trim().length > 0 && !submitting

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) {
      setErrors({ title: 'Title is required' })
      return
    }
    setErrors({})
    if (submitting) return
    setSubmitting(true)
    try {
      await onSubmit({
        title: title.trim(),
        status,
        description: description.trim(),
      })
    } finally {
      setSubmitting(false)
    }
  }, [title, status, description, onSubmit, submitting])

  const onKeyDown = useCallback(
    (e: { key: string; metaKey?: boolean; ctrlKey?: boolean; preventDefault: () => void }) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'enter') {
        e.preventDefault()
        if (canSubmit) void handleSubmit()
      }
    },
    [canSubmit, handleSubmit],
  )

  return {
    values: { title, status, description },
    setTitle,
    setStatus,
    setDescription,
    dirty,
    errors,
    canSubmit,
    handleSubmit,
    onKeyDown,
  }
}
