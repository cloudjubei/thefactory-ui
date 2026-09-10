import { useEffect, useMemo, useRef, useState } from 'react'

import type { FilesEmittedFilePreview, GitDiffSummary } from '../../../headless/api'
import { answerFeatureQuestion, getGitLog } from '../../../headless/api'
import {
  aggregateTestCounts,
  approveActionDescriptors,
  censusFeatures,
  checkMethodRows,
  earnedApproveActions,
  formatChangeRequestMessage,
  groupEvidence,
  handoffRequest,
  incompleteStoryReason,
  isReviewReasonValid,
  landFailureSummary,
  mergeNotice,
  openFeatureQuestions,
  reviewActionMode,
  reviewChangeCounts,
  reviewTabs,
  runReviewFacts,
  commitsSinceBase,
  screenPairFileStem,
  screenPairs,
  signoffVerdict,
  useCliRunArtifact,
  useReviewEvidence,
  useStories,
  verdictSummary,
  verificationCheckRows,
  type ApproveActionDescriptor,
  type CheckMethodId,
  type CheckMethodRow,
  type HandoffPurpose,
  type HandoffRequest,
  type BranchCommit,
  type ReviewTabId,
  type SignoffVerdict,
} from '../../../headless'
import { Input } from '../../primitives/Input'
import { Button } from '../../primitives/Button'
import Alert from '../../primitives/Alert'
import { Modal } from '../../primitives/Modal'
import Tooltip from '../../primitives/Tooltip'
import { RefChip } from '../chips'
import { downloadDataUri } from './signoff/download'
import {
  ChangesTab,
  CheckChipRow,
  ChecksTab,
  ComparisonOverlay,
  DecisionBar,
  ReportTab,
  ReviewTabBar,
  RunModelChip,
  ScreensTab,
  WalkthroughTab,
  WorkBar,
  type ChangeFile,
  TONE_CHIP,
  TONE_TEXT,
} from './signoff'

export type CliRunArtifactPanelProps = {
  /** The CLI run whose workspace diff to surface (from the message's `cliRunId`). */
  runId: string
  /** Project whose checkout the diff previews against + applies onto. */
  projectId: string
  /**
   * Sends a message into the chat this panel sits in.
   *
   * Wired so "Request changes" and every hand-off reach the AGENT and not just
   * the run record: the notes are the whole point of the action, and a verdict
   * nobody is told about cannot produce the change the user asked for.
   */
  onSendMessage?: (text: string) => void | Promise<void>
  /** Opens the run's review branch in the app's Git view, when the host has one. */
  onOpenGit?: () => void
}

/**
 * The verdict word as a bold status badge.
 *
 * A verdict is always a SOLID pill; its absence signal is the hollow dot alone.
 * The dashed treatment belongs to the check CHIPS ("nobody looked") and putting
 * it on a headline verdict borrows a grammar that does not mean the same thing
 * there. Both undecided verdicts take review blue — the hue for "not proven" —
 * never the neutral grey that means "not set up".
 */
const VERDICT_BADGE: Record<SignoffVerdict['key'], string> = {
  proven: 'badge--done',
  partly: 'badge--review',
  failed: 'badge--stuck',
  'not-run': 'badge--review',
}

const DANGER_TEXT = 'text-(--color-red-700) dark:text-(--color-red-300)'

const TEST_METHODS: readonly CheckMethodId[] = ['tests']
const BUILD_METHODS: readonly CheckMethodId[] = ['types', 'lint', 'format', 'build']

function toChangeFile(file: GitDiffSummary['files'][number]): ChangeFile {
  // Git already speaks in letters; renames, copies and the rest read as modified.
  const status: ChangeFile['status'] = file.status === 'A' ? 'A' : file.status === 'D' ? 'D' : 'M'
  return {
    path: file.path,
    status,
    ...(file.patch ? { patch: file.patch } : {}),
    ...(file.patch ? {} : { note: file.binary ? 'Binary file.' : 'No textual diff.' }),
  }
}

function previewToChangeFile(file: FilesEmittedFilePreview, applied: boolean): ChangeFile {
  const status: ChangeFile['status'] =
    file.status === 'added' ? 'A' : file.status === 'deleted' ? 'D' : 'M'
  const note = file.unsafePath
    ? 'Unsafe path — will not be applied.'
    : file.contentUnavailable
      ? 'Binary or oversized content — cannot be applied from the artifact.'
      : file.unchanged
        ? 'No changes — already applied.'
        : undefined
  return {
    path: file.path,
    status,
    ...(file.patch ? { patch: file.patch } : {}),
    ...(note ? { note } : {}),
    ...(file.conflict && !applied
      ? { warning: 'conflict — this file changed in the project after the agent ran' }
      : {}),
  }
}

function timeLabel(epochMs: number | undefined): string | undefined {
  if (!epochMs) return undefined
  return new Date(epochMs).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

/**
 * The sign-off surface for a landed run: a verdict line, the nine-method
 * "what was checked" row, the evidence in tabs that exist only when that proof
 * was filed, and a decision bar whose primary action is earned by the evidence.
 * Everything it derives comes from headless, so the native panel renders the
 * same facts the same way.
 */
export default function CliRunArtifactPanel({
  runId,
  projectId,
  onSendMessage,
  onOpenGit,
}: CliRunArtifactPanelProps) {
  const {
    artifact,
    review,
    verification,
    verdict,
    reviewInProgress,
    storyId,
    landFailure,
    runModel,
    cancelWork,
    startedAtMs,
    costUSD,
    durationMs,
    loading,
    preview,
    previewLoading,
    loadPreview,
    reload,
    apply,
    applying,
    applyResult,
    reviewDiff,
    reviewLoading,
    loadReviewDiff,
    merging,
    mergeResult,
    verify,
    verifying,
    verificationApproaches,
    loadVerificationPlan,
    planLoading,
    requestReview,
    requestingReview,
    approve,
    approving,
    approveResult,
    reject,
    rejecting,
    requestChanges,
    requestingChanges,
    error,
  } = useCliRunArtifact(runId, projectId)

  const [reasonFor, setReasonFor] = useState<'rejected' | 'changes-requested' | undefined>()
  const [reason, setReason] = useState('')
  // Every hook stays ABOVE the early returns below — React counts hooks per
  // render, and a hook after `if (loading) return null` is the "rendered more
  // hooks than during the previous render" crash.
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [answering, setAnswering] = useState<string | undefined>()
  const [pendingApprove, setPendingApprove] = useState<ApproveActionDescriptor | undefined>()
  const [approveNote, setApproveNote] = useState('')
  const [pendingHandoff, setPendingHandoff] = useState<
    { row: CheckMethodRow; request: HandoffRequest } | undefined
  >()
  const [sentHandoff, setSentHandoff] = useState<string | undefined>()
  const [activeTab, setActiveTab] = useState<ReviewTabId | undefined>()
  const [openPairKey, setOpenPairKey] = useState<string | undefined>()
  const [cancelling, setCancelling] = useState(false)
  const { getStory } = useStories()
  const evidence = useReviewEvidence(projectId, { runId, ...(storyId ? { storyId } : {}) })

  useEffect(() => {
    if (error) return
    // Load eagerly (not gated on a tab) so the decision bar reflects the real diff
    // state from the start. `error` gates the retry so a failing load cannot
    // refire forever.
    if (review) {
      if (!reviewDiff && !reviewLoading) void loadReviewDiff()
    } else if (artifact && !preview && !previewLoading) {
      void loadPreview()
    }
  }, [
    review,
    reviewDiff,
    reviewLoading,
    loadReviewDiff,
    artifact,
    preview,
    previewLoading,
    error,
    loadPreview,
  ])

  // The verification plan is what tells "not run" apart from "not set up", so
  // it loads with the panel rather than behind a link.
  useEffect(() => {
    if (verificationApproaches.length === 0 && !planLoading) void loadVerificationPlan()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const census = storyId ? censusFeatures(getStory(storyId)?.features ?? []) : undefined
  const storyIncomplete = census ? incompleteStoryReason(census) : undefined
  const openQuestions = storyId ? openFeatureQuestions(getStory(storyId)?.features ?? []) : []

  const methodRows = useMemo(
    () =>
      checkMethodRows({
        verification,
        approaches: verificationApproaches,
        evidence: evidence.refs,
      }),
    [verification, verificationApproaches, evidence.refs],
  )
  const headline = useMemo(
    () =>
      signoffVerdict({
        rows: methodRows,
        verified: verification !== undefined,
        ...(storyIncomplete ? { storyIncomplete } : {}),
      }),
    [methodRows, verification, storyIncomplete],
  )
  const evidenceGroups = useMemo(() => groupEvidence(evidence.tiles), [evidence.tiles])
  const pairs = useMemo(() => screenPairs(evidenceGroups), [evidenceGroups])
  const recordings = evidence.tiles.filter((t) => t.ref.kind === 'recording')
  const reports = evidence.tiles.filter((t) => t.ref.kind === 'report')
  const checkRows = verificationCheckRows(verification)
  const testChecks = checkRows.filter((c) => c.kind === 'tests')
  // The Tests badge counts TESTS, not layers — the number comes out of each
  // layer's own summary line.
  const testTotals = aggregateTestCounts(testChecks.map((c) => c.summary))
  const buildChecks = checkRows.filter((c) => c.kind !== 'tests')

  // The completion moment: the evidence changes underneath the reader. Say so in
  // a line at the top rather than yanking them anywhere — the chips above may
  // have moved while they were reading. ABOVE the early returns: a hook that
  // runs on only some renders is the "rendered more hooks" crash.
  // The branch's own commits, for the Changes header. Loaded once the diff is
  // being shown; a failure leaves the header without a count rather than
  // blocking the diff itself.
  const [commits, setCommits] = useState<BranchCommit[]>([])
  useEffect(() => {
    const branch = review?.branch
    const baseSha = review?.baseSha
    if (!branch || !baseSha || !projectId) return
    let cancelled = false
    void getGitLog({ path: { projectId }, query: { ref: branch, maxCount: 100 } })
      .then(({ data }) => {
        if (!cancelled && data) setCommits(commitsSinceBase(data.commits, baseSha))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [review?.branch, review?.baseSha, projectId])

  const isWorking = reviewInProgress || verifying || requestingReview !== undefined
  const wasWorking = useRef(false)
  useEffect(() => {
    if (isWorking) {
      wasWorking.current = true
      return
    }
    if (!wasWorking.current) return
    wasWorking.current = false
    setSentHandoff(
      `The work finished and the evidence was re-filed at ${new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} — the chips above may have changed while you were reading.`,
    )
  }, [isWorking])

  if (loading) return null
  if (!artifact && error) {
    return (
      <div className={`mt-2 text-[12px] ${DANGER_TEXT}`}>
        Failed to load agent changes: {error}{' '}
        <button type="button" className="underline" onClick={reload}>
          Retry
        </button>
      </div>
    )
  }
  if (!artifact && !landFailure) return null

  const files = artifact?.payload.files ?? []
  const counts = reviewChangeCounts(files)
  const applyResultData = applyResult?.kind === 'files-emitted' ? applyResult : undefined
  const appliedOk =
    !!applyResultData &&
    applyResultData.errors.length === 0 &&
    applyResultData.added.length +
      applyResultData.modified.length +
      applyResultData.deleted.length >
      0
  const isApplied = appliedOk || artifact?.appliedAt != null
  const isMerged = mergeResult?.ok === true || review?.mergedAt != null
  const conflictCount = preview?.files.filter((f) => f.conflict).length ?? 0

  const changeFiles: ChangeFile[] = review
    ? (reviewDiff?.files ?? []).map(toChangeFile)
    : (preview?.files ?? []).map((f) => previewToChangeFile(f, isApplied))
  const changesKnown = review ? reviewDiff !== undefined : preview !== undefined
  const tabs = reviewTabs({
    screens: pairs.length,
    walkthroughs: recordings.length,
    reports: reports.length,
    testCount: testTotals?.total ?? 0,
    buildChecks: buildChecks.length,
    changedFiles: changesKnown ? changeFiles.length : files.length > 0 ? files.length : undefined,
  })
  const currentTab: ReviewTabId =
    activeTab && tabs.some((t) => t.id === activeTab) ? activeTab : (tabs[0]?.id ?? 'changes')

  const approveOptions = approveActionDescriptors({
    branch: review?.branch ?? 'the review branch',
    baseBranch: 'the working branch',
    hasRemote: true,
    fileCount: counts.total,
  })
  const earned = earnedApproveActions(approveOptions, headline.key)
  const facts = runReviewFacts({ costUSD, durationMs })
  const notice = mergeNotice(mergeResult)
  const decided = verdict ? verdictSummary(verdict) : undefined
  const landing = landFailure ? landFailureSummary(landFailure) : undefined
  const actionMode = reviewActionMode({
    verdict,
    hasReviewBranch: !!review,
    partOfStoryRun: storyId !== undefined,
  })
  const busy = merging || approving || rejecting || requestingChanges
  const reasonValid = isReviewReasonValid(reason)
  const capturedLabel = timeLabel(
    evidence.refs.length > 0 ? Math.min(...evidence.refs.map((r) => r.createdAt)) : undefined,
  )
  const busyMethod: CheckMethodId | undefined = verifying
    ? (methodRows.find((r) => r.action.kind === 'run' && r.state !== 'passed')?.id ?? 'types')
    : requestingReview
      ? methodRows.find(
          (r) => r.action.kind === 'request' && r.action.approachId === requestingReview,
        )?.id
      : undefined
  const working = reviewInProgress
    ? 'Verifying the change on a device'
    : verifying
      ? 'Running the configured checks'
      : requestingReview
        ? `Capturing ${methodRows.find((r) => r.id === busyMethod)?.noun ?? 'evidence'}`
        : undefined

  const approveDisabledReason =
    storyIncomplete ?? (!reviewDiff && review ? 'Loading the diff…' : undefined)

  // Only ever called for a row whose action is `run` — both call sites gate on
  // it — so every path here is the project's own verification pass.
  // Every capture in the set, each named by its walkthrough position so the
  // saved folder reads in the order the reviewer walked it.
  const saveAllScreens = () => {
    for (const pair of pairs) {
      const stem = screenPairFileStem(pair)
      if (pair.before?.dataUri) downloadDataUri(pair.before.dataUri, `${stem}-before.png`)
      if (pair.after?.dataUri) downloadDataUri(pair.after.dataUri, `${stem}-after.png`)
    }
  }

  const cancelReview = () => {
    setCancelling(true)
    void cancelWork().finally(() => setCancelling(false))
  }

  const runMethod = () => {
    void verify()
  }

  // EVERY hand-off confirms, capture included: it spends an agent run, and the
  // button's own ellipsis promises a step before anything happens.
  const requestMethod = (row: CheckMethodRow, purpose: HandoffPurpose) => {
    setPendingHandoff({ row, request: handoffRequest(row, purpose, { branch: review?.branch }) })
  }

  const confirmHandoff = () => {
    if (!pendingHandoff) return
    const { row, request } = pendingHandoff
    setPendingHandoff(undefined)
    const approachId = row.action.kind === 'request' ? row.action.approachId : undefined
    if (request.purpose === 'capture' && approachId) void requestReview(approachId, row.label)
    else if (onSendMessage) void onSendMessage(request.message)
    setSentHandoff(`Asked the agent — ${request.buttonLabel.replace(/^Ask the agent to /, '')}.`)
  }

  const submitAnswer = async (q: { questionId: string; featureId: string }) => {
    const answer = (answers[q.questionId] ?? '').trim()
    if (!projectId || !storyId || answer.length === 0) return
    setAnswering(q.questionId)
    try {
      await answerFeatureQuestion({
        path: { projectId, storyId, featureId: q.featureId },
        body: { questionId: q.questionId, answer },
        throwOnError: true,
      })
      setAnswers((prev) => ({ ...prev, [q.questionId]: '' }))
    } finally {
      setAnswering(undefined)
    }
  }

  const openReason = (decision: 'rejected' | 'changes-requested') => {
    setReasonFor(decision)
    setReason('')
  }

  const submitReason = () => {
    if (!reasonFor || !reasonValid) return
    const decision = reasonFor
    const text = reason
    setReasonFor(undefined)
    setReason('')
    if (decision === 'rejected') {
      void reject(text)
      return
    }
    void (async () => {
      await requestChanges(text)
      const message = formatChangeRequestMessage(text)
      if (message !== undefined) await onSendMessage?.(message)
    })()
  }

  return (
    <div className="mt-2 rounded-md border border-(--border-default) bg-(--surface-raised)">
      {/* Head — the run as a tool row: what, where, how long. */}
      <div className="flex flex-wrap items-center gap-2 border-b border-(--border-subtle) px-3 py-2">
        {/* The head carries the verdict's colour too, so the run's state is
            readable before the eye reaches the verdict line below. */}
        <span
          aria-hidden
          className={`badge badge--bold badge--sm ${VERDICT_BADGE[headline.key]} justify-center p-0`}
          style={{ width: 16, height: 16 }}
        >
          <span className="badge__dot" style={{ width: 6, height: 6 }} />
        </span>
        <span className="text-[13px] font-semibold text-(--text-primary)">
          {artifact ? 'Sign-off' : 'Agent changes were not landed'}
        </span>
        {review ? (
          <Tooltip
            placement="bottom"
            content={
              <div className="max-w-[260px] text-xs">
                <b className="mb-0.5 block font-semibold">The review branch</b>
                <span>
                  Every commit this run made lives here. Your own branch is untouched until you
                  approve.
                </span>
              </div>
            }
          >
            <span className="inline-flex">
              <RefChip kind="branch" value={review.branch} />
            </span>
          </Tooltip>
        ) : null}
        <RunModelChip model={runModel} />
        {facts.costLabel ? (
          <span className="text-[11px] text-(--text-secondary)">{facts.costLabel}</span>
        ) : null}
        <span className="flex-1" />
        {facts.durationLabel ? (
          <span className="inline-flex items-center rounded-full bg-blue-500/10 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-blue-600 dark:text-blue-400">
            {facts.durationLabel}
          </span>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 px-3 py-3">
        {openQuestions.length > 0 ? (
          <>
            <p className="text-[12px] text-(--text-secondary)">
              Sign-off is a final decision, so it waits until the agent has nothing left to settle.
              Answer this and the review opens.
            </p>
            <div className="flex flex-col gap-2 rounded-md border border-(--accent-primary)/25 bg-(--accent-primary)/5 p-2">
              <span className="text-[11px] font-medium text-(--text-secondary)">
                {openQuestions.length === 1
                  ? 'The agent has a question'
                  : `The agent has ${openQuestions.length} questions`}
              </span>
              {openQuestions.map((q) => (
                <div key={q.questionId} className="flex flex-col gap-1">
                  <span className="text-[12px] text-(--text-primary)">{q.question}</span>
                  <span className="text-[11px] text-(--text-secondary)">on {q.featureTitle}</span>
                  <div className="flex items-center gap-2">
                    <Input
                      size="sm"
                      value={answers[q.questionId] ?? ''}
                      placeholder="Your answer — this unblocks the feature"
                      onChange={(e) =>
                        setAnswers((prev) => ({ ...prev, [q.questionId]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') void submitAnswer(q)
                      }}
                    />
                    <Button
                      size="sm"
                      disabled={
                        answering === q.questionId ||
                        (answers[q.questionId] ?? '').trim().length === 0
                      }
                      onClick={() => void submitAnswer(q)}
                    >
                      {answering === q.questionId ? 'Sending…' : 'Answer'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            {sentHandoff ? (
              <div className="flex items-center gap-2 rounded-md border border-(--status-done-soft-border) bg-(--status-done-soft-bg) px-2.5 py-1.5 text-[12px] text-(--status-done-soft-fg)">
                <span>{sentHandoff}</span>
                <span className="flex-1" />
                <button
                  type="button"
                  className="text-[11px] underline"
                  onClick={() => setSentHandoff(undefined)}
                >
                  Dismiss
                </button>
              </div>
            ) : null}

            {/* Verdict — the chip and the sentence say the same thing. */}
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`badge badge--bold ${VERDICT_BADGE[headline.key]}`}>
                  <span className={`badge__dot ${headline.hollow ? 'badge__dot--hollow' : ''}`} />
                  {headline.word}
                </span>
                <span className="text-[14px] font-semibold text-(--text-primary)">
                  {headline.title}
                </span>
              </div>
              <p className="max-w-[64ch] text-[12.5px] text-(--text-secondary)">
                {headline.detail}
              </p>
            </div>

            {census ? (
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                    census.complete ? TONE_CHIP.positive : TONE_CHIP.warning
                  }`}
                >
                  {census.label}
                </span>
                {storyIncomplete ? (
                  <span className="min-w-0 text-[11px] text-(--text-secondary)">
                    {storyIncomplete}
                  </span>
                ) : null}
              </div>
            ) : null}

            {/* What was checked — the index of evidence, and the only place to ask for what has no tab. */}
            <div className="relative flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)">
                What was checked
              </span>
              <CheckChipRow
                rows={methodRows}
                branch={review?.branch}
                busyId={busyMethod}
                canRequest={onSendMessage !== undefined}
                onOpenProof={setActiveTab}
                onRun={runMethod}
                onRequest={requestMethod}
              />
              {pendingHandoff ? (
                // Anchored under the chips rather than centred over the panel:
                // the confirm is asking about evidence that must stay readable
                // while it is answered.
                <div className="absolute left-0 top-full z-40 mt-2 flex w-[322px] max-w-[80vw] flex-col gap-2.5 rounded-lg border border-(--border-default) bg-(--surface-overlay) p-3 shadow-lg">
                  <h4 className="m-0 text-[13px] font-semibold text-(--text-primary)">
                    {pendingHandoff.request.title}
                  </h4>
                  <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-[12px]">
                    {pendingHandoff.request.facts.map((fact) => (
                      <div key={fact.label} className="contents">
                        <dt className="text-(--text-muted)">{fact.label}</dt>
                        <dd className="m-0 text-(--text-secondary)">{fact.value}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="m-0 text-[12px] text-(--text-muted)">
                    {pendingHandoff.request.caveat}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={confirmHandoff}>
                      Start
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setPendingHandoff(undefined)}>
                      Not now
                    </Button>
                    <span className="ml-auto text-[11px] text-(--text-muted)">
                      no “always allow”
                    </span>
                  </div>
                </div>
              ) : null}
            </div>

            {tabs.length > 0 ? (
              <div className="flex flex-col gap-2.5">
                <ReviewTabBar tabs={tabs} active={currentTab} onChange={setActiveTab} />
                {currentTab === 'screens' ? (
                  <ScreensTab
                    pairs={pairs}
                    onOpen={setOpenPairKey}
                    capturedLabel={capturedLabel}
                    onSaveAll={pairs.length > 0 ? saveAllScreens : undefined}
                  />
                ) : currentTab === 'walkthrough' ? (
                  <WalkthroughTab projectId={projectId} recordings={recordings} />
                ) : currentTab === 'tests' ? (
                  <ChecksTab
                    methods={methodRows.filter((r) => TEST_METHODS.includes(r.id))}
                    checks={testChecks}
                    branch={review?.branch}
                    busyId={busyMethod}
                    canRequest={onSendMessage !== undefined}
                    onRun={runMethod}
                    onRequest={requestMethod}
                    emptyState={{
                      title: 'This project has no tests at all.',
                      body: 'Nothing here can be proven by running anything. Adding a suite is a code change, so it is work for the agent — and the one request from this panel that changes what every future run can prove.',
                    }}
                  />
                ) : currentTab === 'build' ? (
                  <ChecksTab
                    methods={methodRows.filter((r) => BUILD_METHODS.includes(r.id))}
                    checks={buildChecks}
                    branch={review?.branch}
                    busyId={busyMethod}
                    canRequest={onSendMessage !== undefined}
                    onRun={runMethod}
                    onRequest={requestMethod}
                  />
                ) : currentTab === 'report' ? (
                  <ReportTab reports={reports} />
                ) : (
                  <ChangesTab
                    review={review}
                    files={changeFiles}
                    commits={commits}
                    loading={review ? reviewLoading : previewLoading}
                    error={error}
                    onRetry={
                      review && !reviewDiff && !reviewLoading
                        ? () => void loadReviewDiff()
                        : !review && !preview && !previewLoading
                          ? () => void loadPreview()
                          : undefined
                    }
                    onOpenGit={onOpenGit}
                  />
                )}
              </div>
            ) : null}

            {landing ? (
              <div className={`rounded-md border px-2 py-1.5 text-[12px] ${TONE_CHIP.warning}`}>
                <div className="font-medium">{landing.title}</div>
                <div>
                  The agent produced changes but they were not committed to a review branch —{' '}
                  {landing.message}.
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>

      {/* Foot — the decision, or the work in flight that has replaced it.
          Hidden while a question is open: sign-off is final, so it must not be
          reachable until the agent has nothing left to settle. */}
      {openQuestions.length === 0 ? (
        <div className="flex flex-col gap-2 border-t border-(--border-subtle) px-3 py-2">
          {decided ? (
            <div className="flex flex-col gap-0.5">
              <div className={`text-[12px] font-medium ${TONE_TEXT[decided.tone]}`}>
                {decided.label} by {decided.byLabel}
              </div>
              {decided.notes ? (
                <div className="wrap-break-word text-[12px] text-(--text-secondary)">
                  {decided.notes}
                </div>
              ) : null}
            </div>
          ) : working ? (
            <WorkBar
              label={working}
              startedAtMs={startedAtMs}
              onCancel={reviewInProgress ? cancelReview : undefined}
              cancelling={cancelling}
            />
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                {notice ? (
                  <span className={`text-[12px] ${TONE_TEXT[notice.tone]}`}>{notice.message}</span>
                ) : actionMode === 'actions' && isMerged ? (
                  <span className="text-[12px] text-(--text-secondary)">
                    Merged into your branch
                  </span>
                ) : applyResultData ? (
                  <span className="text-[12px] text-(--text-secondary)">
                    {applyResultData.added.length} added, {applyResultData.modified.length}{' '}
                    modified, {applyResultData.deleted.length} deleted
                    {applyResultData.errors.length > 0
                      ? `, ${applyResultData.errors.length} failed`
                      : ''}
                  </span>
                ) : conflictCount > 0 && !isApplied ? (
                  <span className={`text-[12px] ${DANGER_TEXT}`}>
                    {conflictCount} conflict{conflictCount === 1 ? '' : 's'} — applying overwrites
                    local edits
                  </span>
                ) : isApplied ? (
                  <span className="text-[12px] text-(--text-secondary)">Applied to project</span>
                ) : null}
              </div>

              {actionMode === 'actions' ? (
                <DecisionBar
                  earned={earned}
                  approveDisabledReason={approveDisabledReason}
                  busy={busy}
                  isMerged={isMerged}
                  requestingChanges={requestingChanges}
                  rejecting={rejecting}
                  onApprove={setPendingApprove}
                  onRequestChanges={() => openReason('changes-requested')}
                  onReject={() => openReason('rejected')}
                />
              ) : actionMode === 'apply' && artifact ? (
                <Button
                  size="sm"
                  onClick={() => void apply()}
                  disabled={applying || isApplied || !preview}
                >
                  {applying ? 'Applying…' : isApplied ? 'Applied' : 'Apply to project'}
                </Button>
              ) : null}
            </div>
          )}

          {reasonFor ? (
            <div className="flex items-center gap-2">
              <Input
                size="sm"
                autoFocus
                value={reason}
                placeholder={
                  reasonFor === 'rejected' ? 'Why is this rejected?' : 'What needs to change?'
                }
                onChange={(e) => setReason(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitReason()
                  if (e.key === 'Escape') setReasonFor(undefined)
                }}
              />
              <Button size="sm" onClick={submitReason} disabled={!reasonValid || busy}>
                {reasonFor === 'rejected' ? 'Reject' : 'Send'}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setReasonFor(undefined)}>
                Cancel
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {applyResultData && applyResultData.errors.length > 0 ? (
        <div className={`border-t border-(--border-subtle) px-3 py-2 text-[12px] ${DANGER_TEXT}`}>
          {applyResultData.errors.map((e) => (
            <div key={e.path}>
              {e.path}: {e.reason}
            </div>
          ))}
        </div>
      ) : null}

      {pendingApprove ? (
        <Modal
          isOpen
          onClose={() => setPendingApprove(undefined)}
          title={pendingApprove.title}
          size="sm"
        >
          <div className="flex flex-col gap-3">
            <ul className="flex flex-col gap-1.5 text-[13px] text-(--text-secondary)">
              {pendingApprove.effects.map((effect) => (
                <li key={effect} className="flex gap-2">
                  <span aria-hidden>—</span>
                  <span>{effect}</span>
                </li>
              ))}
            </ul>
            <label className="flex flex-col gap-1 text-[12px] text-(--text-secondary)">
              Note (optional)
              <Input
                size="sm"
                autoFocus
                value={approveNote}
                placeholder="Anything worth recording with this approval"
                onChange={(e) => setApproveNote(e.target.value)}
              />
            </label>
            {approveResult && !approveResult.approved ? (
              <Alert variant="error">
                {approveResult.blockedReason ?? 'The approval was refused.'}
              </Alert>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPendingApprove(undefined)}
                disabled={approving}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={approving}
                onClick={() => {
                  const action = pendingApprove.action
                  const note = approveNote.trim()
                  void approve(action, note.length > 0 ? note : undefined).then(() => {
                    setPendingApprove(undefined)
                    setApproveNote('')
                  })
                }}
              >
                {approving ? 'Working…' : pendingApprove.confirmLabel}
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}

      <ComparisonOverlay
        pairs={pairs}
        openKey={openPairKey}
        onClose={() => setOpenPairKey(undefined)}
        baseSha={review?.baseSha}
        headSha={review?.headSha}
      />
    </div>
  )
}
