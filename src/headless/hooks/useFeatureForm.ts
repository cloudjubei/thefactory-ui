import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { StoryStatus } from '../../web/compound/StoryCard'

/**
 * Headless state machine for the "create / edit feature" form used by both
 * overseer-local and the web client (and the upcoming RN target). Owns:
 *   - field state for title / description / rejection / status / blockers /
 *     context-files
 *   - dirty tracking (compared against an initial snapshot)
 *   - validation (title required)
 *   - canSubmit + handleSubmit (calls back into the host)
 *   - context-file ↔ @mention sync (auto-add on mention, prune when
 *     mention removed from any text field)
 *   - blocker normalisation hook for `#refs` typed in the textarea
 *
 * No DOM, no HTTP, no context — the host renders the inputs and supplies
 * `normalizeDependency` + the submit callback. Returns a structured API
 * the host can spread onto its components.
 */

export type FeatureFormInitialValues = {
  title?: string
  description?: string
  rejection?: string
  status?: StoryStatus
  blockers?: ReadonlyArray<string>
  context?: ReadonlyArray<string>
}

export type FeatureFormValues = {
  title: string
  description: string
  rejection: string
  status: StoryStatus
  blockers: string[]
  context: string[]
}

export type UseFeatureFormOptions = {
  initialValues?: FeatureFormInitialValues
  onSubmit: (values: FeatureFormValues) => unknown | Promise<unknown>
  /** Called when blockers/dirty changes so the host can flip a "Save" button. */
  onDirty?: (dirty: boolean) => void
  /** Optional — host-side resolver for `#3.2` → canonical blocker id. Used
   *  when the user types a `#` reference in the description / rejection. */
  normalizeDependency?: (raw: string) => string
}

export type UseFeatureForm = {
  values: FeatureFormValues
  setTitle: (v: string) => void
  setDescription: (v: string) => void
  setRejection: (v: string) => void
  setStatus: (v: StoryStatus) => void
  setBlockers: (v: string[]) => void
  setContext: (v: string[]) => void
  addBlocker: (dep: string) => void
  removeBlockerAt: (idx: number) => void
  addContextFile: (path: string) => void
  removeContextAt: (idx: number) => void
  /** Set of context-file paths currently mentioned in any text field. */
  mentionedPaths: ReadonlySet<string>
  dirty: boolean
  error: string | null
  canSubmit: boolean
  /** Validates and (if valid) invokes `onSubmit` with the current values. */
  handleSubmit: () => Promise<void>
  /** Convenience: `(meta|ctrl)+Enter` submits — bind to the form keydown. */
  onKeyDown: (e: { key: string; metaKey?: boolean; ctrlKey?: boolean; preventDefault: () => void }) => void
}

const DEFAULTS: FeatureFormValues = {
  title: '',
  description: '',
  rejection: '',
  status: '-',
  blockers: [],
  context: [],
}

function seedValues(v?: FeatureFormInitialValues): FeatureFormValues {
  return {
    title: v?.title ?? DEFAULTS.title,
    description: v?.description ?? DEFAULTS.description,
    rejection: v?.rejection ?? DEFAULTS.rejection,
    status: (v?.status as StoryStatus) ?? DEFAULTS.status,
    blockers: v?.blockers ? [...v.blockers] : [],
    context: v?.context ? [...v.context] : [],
  }
}

function arraysEqual(a: ReadonlyArray<string>, b: ReadonlyArray<string>) {
  return a.length === b.length && a.every((x, i) => x === b[i])
}

export function useFeatureForm(opts: UseFeatureFormOptions): UseFeatureForm {
  const { initialValues, onSubmit, onDirty, normalizeDependency } = opts

  const seed = useMemo(() => seedValues(initialValues), [initialValues])
  const baselineRef = useRef<FeatureFormValues>(seed)

  const [title, setTitle] = useState(seed.title)
  const [description, setDescription] = useState(seed.description)
  const [rejection, setRejection] = useState(seed.rejection)
  const [status, setStatus] = useState<StoryStatus>(seed.status)
  const [blockers, setBlockers] = useState<string[]>(seed.blockers)
  const [context, setContext] = useState<string[]>(seed.context)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const combinedText = `${title}\n${description}\n${rejection}`

  const mentionedPaths = useMemo(() => {
    const out = new Set<string>()
    for (const p of context) if (combinedText.includes(`@${p}`)) out.add(p)
    return out
  }, [combinedText, context])

  // Prune context-file entries that no longer appear as `@path` in any
  // text field. Mirrors desktop/web behaviour: mentions are the source of
  // truth, the chip list is a view onto them.
  useEffect(() => {
    setContext((prev) => prev.filter((p) => combinedText.includes(`@${p}`)))
  }, [combinedText])

  const baseline = baselineRef.current
  const dirty =
    title !== baseline.title ||
    description !== baseline.description ||
    rejection !== baseline.rejection ||
    status !== baseline.status ||
    !arraysEqual(blockers, baseline.blockers) ||
    !arraysEqual(context, baseline.context)

  useEffect(() => {
    onDirty?.(dirty)
  }, [dirty, onDirty])

  const addBlocker = useCallback(
    (raw: string) => {
      const dep = normalizeDependency ? normalizeDependency(raw) : raw
      setBlockers((prev) => (prev.includes(dep) ? prev : [...prev, dep]))
    },
    [normalizeDependency],
  )

  const removeBlockerAt = useCallback(
    (idx: number) => setBlockers((prev) => prev.filter((_, i) => i !== idx)),
    [],
  )

  const addContextFile = useCallback(
    (path: string) =>
      setContext((prev) => (prev.includes(path) ? prev : [...prev, path])),
    [],
  )

  const removeContextAt = useCallback(
    (idx: number) => setContext((prev) => prev.filter((_, i) => i !== idx)),
    [],
  )

  const canSubmit = title.trim().length > 0 && !submitting

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) {
      setError('Title is required')
      return
    }
    setError(null)
    if (submitting) return
    setSubmitting(true)
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        rejection: rejection.trim(),
        status,
        blockers,
        context,
      })
    } finally {
      setSubmitting(false)
    }
  }, [title, description, rejection, status, blockers, context, onSubmit, submitting])

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
    values: { title, description, rejection, status, blockers, context },
    setTitle,
    setDescription,
    setRejection,
    setStatus,
    setBlockers,
    setContext,
    addBlocker,
    removeBlockerAt,
    addContextFile,
    removeContextAt,
    mentionedPaths,
    dirty,
    error,
    canSubmit,
    handleSubmit,
    onKeyDown,
  }
}
