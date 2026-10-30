import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  GIT_MERGE_TEXT,
  commitsToBringInLabel,
  formatDurationMs,
  mergeBlockedReason,
  mergeChecksOnByDefault,
  mergeSentence,
  mergeSourceOptions,
  useCommitsToBringIn,
  useDurationTimer,
  useGit,
  type MergeChecks,
} from '../../../../headless'
import { extractServerError, type GitMergeBranchResult } from '../../../../headless/api'
import { Alert, Button, Input, Modal } from '../../..'
import Spinner from '../../../primitives/Spinner'
import RefChip from '../../chips/RefChip'
import { BranchChip } from '../../BranchChip'
import MergeChecksResult from '../MergeChecksResult'

export type MergeBranchSheetProps = {
  isOpen: boolean
  onClose: () => void
  projectId: string | undefined
  /** The branch to merge in, picked already — a right-clicked branch's local or remote name. */
  initialSource?: string
  /** The local branch to merge into when it is not the checked-out one — "Merge in". */
  into?: string
  /** Called once git has merged, fast-forwarded, staged or stopped on conflicts; a refusal stays in the sheet. */
  onMerged: (outcome: GitMergeBranchResult) => void
}

/**
 * The Git view's "Merge…": pick a branch (local or remote) to merge into the
 * current one, say how, and merge. A right-click "Merge X into Y" opens this
 * same sheet with X picked, so both go through the same confirmation; "Merge
 * in" opens it with `into` set, merging into that branch, never checked out,
 * and committing right away. The
 * result can be built and type-checked before the branch moves — on by default
 * for a merge into the default branch; a result that fails stays here, with
 * its failing lines.
 */
export default function MergeBranchSheet({
  isOpen,
  onClose,
  projectId,
  initialSource,
  into,
  onMerged,
}: MergeBranchSheetProps) {
  const { branches, status, mergeBranch } = useGit()
  const current = branches.find((b) => b.current)?.name
  const target = into ?? current
  const [query, setQuery] = useState('')
  const [source, setSource] = useState<string | undefined>(initialSource)
  const [noFastForward, setNoFastForward] = useState(false)
  const [commitNow, setCommitNow] = useState(true)
  const [checkFirstPick, setCheckFirstPick] = useState<boolean | undefined>(undefined)
  const [submitting, setSubmitting] = useState(false)
  const [startedAt, setStartedAt] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [failedChecks, setFailedChecks] = useState<MergeChecks | null>(null)
  const now = useDurationTimer(submitting)

  useEffect(() => {
    if (!isOpen) return
    setQuery('')
    setSource(initialSource)
    setNoFastForward(false)
    setCommitNow(true)
    setCheckFirstPick(undefined)
    setError(null)
    setFailedChecks(null)
  }, [isOpen, initialSource])

  const options = useMemo(
    () => mergeSourceOptions(branches, current, query, into),
    [branches, current, query, into],
  )
  const blocked = mergeBlockedReason({
    current,
    merging: !!status?.merging,
    source,
    ...(into ? { into } : {}),
  })
  const bringIn = useCommitsToBringIn(isOpen ? projectId : undefined, target, source)
  const checkFirstByDefault = mergeChecksOnByDefault(branches, commitNow, into)
  const checkFirst = commitNow && (checkFirstPick ?? checkFirstByDefault)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!source || blocked) return
    setSubmitting(true)
    setStartedAt(Date.now())
    setError(null)
    setFailedChecks(null)
    try {
      const outcome = await mergeBranch({
        source,
        ...(into ? { into } : {}),
        noFastForward,
        commit: commitNow,
        checkFirst,
      })
      if (outcome.status === 'refused') {
        setError(outcome.reason ?? outcome.message)
        setFailedChecks(outcome.checks?.status === 'failed' ? outcome.checks : null)
        return
      }
      onMerged(outcome)
      onClose()
    } catch (err) {
      setError(extractServerError(err, 'The merge failed').message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={into ? GIT_MERGE_TEXT.sheetTitleInto(into) : GIT_MERGE_TEXT.sheetTitle}
      size="md"
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <Input
          autoFocus={!initialSource}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find a branch"
          aria-label="Find a branch"
        />
        <div
          role="listbox"
          aria-label="Branch to merge"
          className="flex max-h-60 flex-col overflow-y-auto rounded border border-(--border-subtle)"
        >
          {options.length === 0 ? (
            <div className="px-3 py-2 text-xs text-(--text-muted)">No branch matches.</div>
          ) : (
            options.map((o) => {
              const selected = o.ref === source
              return (
                <button
                  key={`${o.kind}:${o.ref}`}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  disabled={!!o.disabledReason}
                  title={o.disabledReason}
                  onClick={() => setSource(o.ref)}
                  className={`flex items-center gap-2 px-3 py-2 text-left text-xs border-b border-(--border-subtle) last:border-b-0 disabled:opacity-50 ${selected ? 'bg-sky-50 dark:bg-sky-900/25' : 'enabled:hover:bg-(--surface-muted)'}`}
                >
                  <RefChip kind="branch" value={o.ref} />
                  <span className="grow" />
                  {o.disabledReason ? (
                    <span className="text-[11px] text-(--text-muted)">{o.disabledReason}</span>
                  ) : null}
                  <BranchChip type={o.kind} size="xs" />
                </button>
              )
            })
          )}
        </div>

        {source && target ? (
          <div className="flex flex-col gap-1 rounded bg-(--surface-muted) px-3 py-2 text-sm">
            <span
              className="flex flex-wrap items-center gap-1.5"
              aria-label={mergeSentence(source, target)}
            >
              Merge <RefChip kind="branch" value={source} /> into{' '}
              <RefChip kind="branch" value={target} />
            </span>
            {bringIn.status === 'ready' ? (
              <span className="text-xs text-(--text-muted)">
                {commitsToBringInLabel(bringIn.count, bringIn.capped)}
              </span>
            ) : null}
          </div>
        ) : null}

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={noFastForward || !commitNow}
            disabled={!commitNow}
            onChange={(e) => setNoFastForward(e.target.checked)}
          />
          Create a merge commit even if fast-forward is possible
        </label>
        {into ? (
          <p className="text-xs text-(--text-muted)">{GIT_MERGE_TEXT.committedInto(into)}</p>
        ) : (
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={commitNow}
              onChange={(e) => setCommitNow(e.target.checked)}
            />
            <span className="flex flex-col">
              Commit the merge right away
              {!commitNow ? (
                <span className="text-xs text-(--text-muted)">
                  The merge is staged and left for you to commit, with its message prefilled.
                </span>
              ) : null}
            </span>
          </label>
        )}
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={checkFirst}
            disabled={!commitNow || submitting}
            onChange={(e) => setCheckFirstPick(e.target.checked)}
          />
          <span className="flex flex-col">
            {GIT_MERGE_TEXT.checkFirst}
            <span className="text-xs text-(--text-muted)">
              {!commitNow
                ? GIT_MERGE_TEXT.checkFirstNeedsCommit
                : target
                  ? [
                      GIT_MERGE_TEXT.checkFirstHint(target),
                      checkFirstByDefault ? GIT_MERGE_TEXT.checkFirstDefault(target) : '',
                    ]
                      .filter(Boolean)
                      .join(' ')
                  : null}
            </span>
          </span>
        </label>

        {submitting && checkFirst && target ? (
          <div className="flex items-center gap-2 rounded bg-(--surface-muted) px-3 py-2 text-xs text-(--text-secondary)">
            <Spinner size={14} />
            <span className="grow">{GIT_MERGE_TEXT.checking(target)}</span>
            <span className="tabular-nums text-(--text-muted)">
              {formatDurationMs(Math.max(0, now - startedAt))}
            </span>
          </div>
        ) : null}
        {blocked && (source || (!into && (!current || status?.merging))) ? (
          <Alert variant="info">{blocked}</Alert>
        ) : null}
        {error ? <Alert>{error}</Alert> : null}
        {failedChecks ? <MergeChecksResult checks={failedChecks} /> : null}

        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting} disabled={!!blocked || submitting}>
            Merge
          </Button>
        </div>
      </form>
    </Modal>
  )
}
