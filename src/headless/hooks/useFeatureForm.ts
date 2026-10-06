import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ProofKind, ProofPlan } from 'thefactory-tools/types'

import {
  proofPlanDraftOf,
  proofPlanDraftsEqual,
  proofPlanOfDraft,
  toggleProofPlanDraftKind,
} from '../utils/proofPlanView'
import type { ProofPlanDraft } from '../utils/proofPlanViewTypes'
import type { StoryStatus } from '../utils/status'

/**
 * Headless state machine for the "create / edit feature" form used by both
 * overseer-local and the web client (and the upcoming RN target). Owns:
 *   - field state for title / description / acceptance / proof plan /
 *     rejection / status / blockers / context-files
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
  acceptance?: string
  proofPlan?: ProofPlan
  rejection?: string
  status?: StoryStatus
  blockers?: ReadonlyArray<string>
  context?: ReadonlyArray<string>
}

export type FeatureFormValues = {
  title: string
  description: string
  /** What done means — empty when cleared. */
  acceptance: string
  /** How it will be shown to be right — `undefined` when no kind is picked. */
  proofPlan: ProofPlan | undefined
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
  /**
   * Turns what was typed (`#3.2`, `&qa-login`) into ids on save —
   * `References.canonicalize`. Given each field as it was, so only what is new
   * is turned.
   */
  canonicalize?: (text: string, before?: string) => string
  /**
   * Stored text as a person edits it — `#3.2`, `&qa-login` instead of ids —
   * `References.toTyped`. A field the person has not touched follows it as the
   * project's stories and notes load.
   */
  toTyped?: (text: string) => string
}

export type UseFeatureForm = {
  values: FeatureFormValues
  setTitle: (v: string) => void
  setDescription: (v: string) => void
  setAcceptance: (v: string) => void
  /** The proof plan as the editor toggles it — kinds in canonical order, notes as typed. */
  proofPlanDraft: ProofPlanDraft
  toggleProofKind: (kind: ProofKind) => void
  setProofNotes: (notes: string) => void
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
  onKeyDown: (e: {
    key: string
    metaKey?: boolean
    ctrlKey?: boolean
    preventDefault: () => void
  }) => void
}

const DEFAULTS: FeatureFormValues = {
  title: '',
  description: '',
  acceptance: '',
  proofPlan: undefined,
  rejection: '',
  status: 'pending',
  blockers: [],
  context: [],
}

function seedValues(v?: FeatureFormInitialValues): FeatureFormValues {
  return {
    title: v?.title ?? DEFAULTS.title,
    description: v?.description ?? DEFAULTS.description,
    acceptance: v?.acceptance ?? DEFAULTS.acceptance,
    proofPlan: v?.proofPlan,
    rejection: v?.rejection ?? DEFAULTS.rejection,
    status: (v?.status as StoryStatus) ?? DEFAULTS.status,
    blockers: v?.blockers ? [...v.blockers] : [],
    context: v?.context ? [...v.context] : [],
  }
}

function arraysEqual(a: ReadonlyArray<string>, b: ReadonlyArray<string>) {
  return a.length === b.length && a.every((x, i) => x === b[i])
}

const asTyped = (text: string): string => text

/** The text fields of a feature as a person edits them. */
type ShownText = { description: string; acceptance: string; rejection: string; notes: string }

/** The stored values with their text fields as shown — what "unchanged" is measured against. */
function withShownText(seed: FeatureFormValues, shown: ShownText): FeatureFormValues {
  return {
    ...seed,
    description: shown.description,
    acceptance: shown.acceptance,
    rejection: shown.rejection,
    proofPlan: seed.proofPlan ? { ...seed.proofPlan, notes: shown.notes } : undefined,
  }
}

export function useFeatureForm(opts: UseFeatureFormOptions): UseFeatureForm {
  const {
    initialValues,
    onSubmit,
    onDirty,
    normalizeDependency,
    canonicalize = asTyped,
    toTyped = asTyped,
  } = opts

  const seed = useMemo(() => seedValues(initialValues), [initialValues])
  const shown = useMemo<ShownText>(
    () => ({
      description: toTyped(seed.description),
      acceptance: toTyped(seed.acceptance),
      rejection: toTyped(seed.rejection),
      notes: toTyped(seed.proofPlan?.notes ?? ''),
    }),
    [seed, toTyped],
  )
  const baselineRef = useRef<FeatureFormValues>(withShownText(seed, shown))

  const [title, setTitle] = useState(seed.title)
  const [description, setDescription] = useState(shown.description)
  const [acceptance, setAcceptance] = useState(shown.acceptance)
  const [proofPlanDraft, setProofPlanDraft] = useState<ProofPlanDraft>(() => ({
    ...proofPlanDraftOf(seed.proofPlan),
    notes: shown.notes,
  }))
  const [rejection, setRejection] = useState(shown.rejection)

  // The stored text reads differently once the project's stories and notes
  // load; a field the person has not touched follows, one they have keeps
  // their edit.
  const shownRef = useRef(shown)
  useEffect(() => {
    const before = shownRef.current
    if (before === shown) return
    shownRef.current = shown
    baselineRef.current = withShownText(seed, shown)
    setDescription((v) => (v === before.description ? shown.description : v))
    setAcceptance((v) => (v === before.acceptance ? shown.acceptance : v))
    setRejection((v) => (v === before.rejection ? shown.rejection : v))
    setProofPlanDraft((d) => (d.notes === before.notes ? { ...d, notes: shown.notes } : d))
  }, [seed, shown])
  const [status, setStatus] = useState<StoryStatus>(seed.status)
  const [blockers, setBlockers] = useState<string[]>(seed.blockers)
  const [context, setContext] = useState<string[]>(seed.context)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const combinedText = `${title}\n${description}\n${acceptance}\n${rejection}`

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
    acceptance !== baseline.acceptance ||
    !proofPlanDraftsEqual(proofPlanDraft, proofPlanDraftOf(baseline.proofPlan)) ||
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
    (path: string) => setContext((prev) => (prev.includes(path) ? prev : [...prev, path])),
    [],
  )

  const removeContextAt = useCallback(
    (idx: number) => setContext((prev) => prev.filter((_, i) => i !== idx)),
    [],
  )

  const toggleProofKind = useCallback(
    (kind: ProofKind) => setProofPlanDraft((prev) => toggleProofPlanDraftKind(prev, kind)),
    [],
  )

  const setProofNotes = useCallback(
    (notes: string) => setProofPlanDraft((prev) => ({ ...prev, notes })),
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
        description: canonicalize(description.trim(), seed.description),
        acceptance: canonicalize(acceptance.trim(), seed.acceptance),
        proofPlan: proofPlanOfDraft({
          ...proofPlanDraft,
          notes: canonicalize(proofPlanDraft.notes, seed.proofPlan?.notes),
        }),
        rejection: canonicalize(rejection.trim(), seed.rejection),
        status,
        blockers,
        context,
      })
    } finally {
      setSubmitting(false)
    }
  }, [
    title,
    description,
    acceptance,
    proofPlanDraft,
    rejection,
    status,
    blockers,
    context,
    onSubmit,
    canonicalize,
    seed,
    submitting,
  ])

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
    values: {
      title,
      description,
      acceptance,
      proofPlan: proofPlanOfDraft(proofPlanDraft),
      rejection,
      status,
      blockers,
      context,
    },
    setTitle,
    setDescription,
    setAcceptance,
    proofPlanDraft,
    toggleProofKind,
    setProofNotes,
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
