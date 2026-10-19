import { GIT_DIFF_SUPPRESSED_MESSAGE } from '../../../headless/utils/gitDiffConstants'
import RichText from '../files/RichText'
import ReferenceTextarea from '../files/ReferenceTextarea'
import { useCanonicalizeReferences } from '../../../headless/contexts/ReferenceRenderingContext'
import { useBranchCommits } from '../../../headless/hooks/useBranchCommits'
import { viewedFilesProgress } from '../../../headless/utils/runReview'
import { useEffect, useMemo, useRef, useState } from 'react'

import type { FilesEmittedFilePreview, GitDiffSummary } from '../../../headless/api'
import { answerFeatureQuestion } from '../../../headless/api'
import {
  aggregateTestCounts,
  approveActionDescriptors,
  PROCESS_INTEGRATION_SHADOW,
  censusFeatures,
  capabilitySetupHandler,
  checkMethodRows,
  earnedApproveActions,
  formatChangeRequestMessage,
  groupEvidence,
  handoffRequest,
  incompleteStoryReason,
  alreadyOnBaseView,
  isReviewReasonValid,
  commitReceiptFiles,
  landFailureSummary,
  mergeNotice,
  openFeatureQuestions,
  reviewActionMode,
  reviewChangeCounts,
  reviewTabOrder,
  reviewTabs,
  runReports,
  runReviewFacts,
  screenPairFileStem,
  screenPairs,
  signoffVerdict,
  useCliRunArtifact,
  useReviewEvidence,
  useRunChatDraft,
  useStories,
  verdictSummary,
  ranReviewChecks,
  reviewCheckGroups,
  type ApproveActionDescriptor,
  type CheckMethodId,
  type CheckActionHost,
  type CheckMethodRow,
  type HandoffPurpose,
  type HandoffRequest,
  type ReviewTabId,
  processStepFinishedView,
  chatChangesNotice,
  heldChatChangesNote,
  CHAT_CHANGES_COPY,
  chatChangesHeader,
  discardedEditPaths,
  openChangesNoticeView,
  reviewOnBaseOfferView,
  useChatOpenChanges,
  useReviewOnBase,
  withDiscardWarnings,
} from '../../../headless'
import { Input } from '../../primitives/Input'
import { Button } from '../../primitives/Button'
import Alert from '../../primitives/Alert'
import { Modal } from '../../primitives/Modal'
import Tooltip from '../../primitives/Tooltip'
import { AlreadyOnBaseLine } from './AlreadyOnBaseLine'
import { downloadDataUri, saveSideBySide } from './signoff/download'
import { OpenChangesNotice } from './OpenChangesNotice'
import { ReviewOnBaseOffer } from './ReviewOnBaseOffer'
import { RunChangesHead } from './RunChangesHead'
import { RunLandNotice } from './RunLandNotice'
import { RunVerdictLine } from './RunVerdictLine'
import {
  ChangesTab,
  CheckChipRow,
  ChecksTab,
  ComparisonOverlay,
  DecisionBar,
  ReportTab,
  ReviewTabBar,
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
  /**
   * Puts a message in this chat's composer for the person to edit and send —
   * how a missing check is offered to the agent to set up. A process-owned run
   * drafts into its run's chat instead, when the pipeline provides one.
   */
  onDraftMessage?: (text: string) => void
  /** Opens the run's review branch in the app's Git view, when the host has one. */
  onOpenGit?: () => void
  /**
   * Returns to the pipeline this run is a step of — a process-owned run decides
   * nothing here, so this is the way back to where its outcome and the next
   * stages live. Only meaningful (and only shown) when the run is process-owned.
   */
  onBackToPipeline?: (processRunId: string) => void
  /**
   * Drawn as a card of its own, with its head (the default) — or bare, filling
   * the review panel or screen it is opened in, whose own head says what it is.
   */
  framed?: boolean
}

const DANGER_TEXT = 'text-(--color-red-700) dark:text-(--color-red-300)'

const TEST_METHODS: readonly CheckMethodId[] = ['tests']
const BUILD_METHODS: readonly CheckMethodId[] = ['types', 'lint', 'format', 'build', 'uitests']

function toChangeFile(file: GitDiffSummary['files'][number]): ChangeFile {
  // Git already speaks in letters; renames, copies and the rest read as modified.
  const status: ChangeFile['status'] = file.status === 'A' ? 'A' : file.status === 'D' ? 'D' : 'M'
  return {
    path: file.path,
    status,
    ...(file.patch ? { patch: file.patch } : {}),
    ...(file.patch
      ? {}
      : {
          note: file.patchSuppressed
            ? GIT_DIFF_SUPPRESSED_MESSAGE
            : file.binary
              ? 'Binary file.'
              : 'No textual diff.',
        }),
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
  onDraftMessage,
  onOpenGit,
  onBackToPipeline,
  framed = true,
}: CliRunArtifactPanelProps) {
  const {
    artifact,
    review,
    verification,
    verdict,
    diffReview,
    reviewInProgress,
    storyId,
    chatContextId,
    processRunId,
    processRole,
    landFailure,
    runModel,
    cancelWork,
    startedAtMs,
    cost,
    durationMs,
    loading,
    preview,
    previewLoading,
    loadPreview,
    reload,
    apply,
    applying,
    applyResult,
    discard,
    discarding,
    reviewDiff,
    reviewLoading,
    loadReviewDiff,
    viewedFiles,
    setFileViewed,
    merging,
    mergeResult,
    verify,
    verifying,
    verificationApproaches,
    projectChecks,
    verificationPlatform,
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

  // A run OWNED by a process: its evidence is shown here read-only, but the
  // verdict and sign-off belong to the pipeline. So no standalone decision bar,
  // no story-completeness gate, no verdict headline, and viewing the diff never
  // files a "diff reviewed" proof nobody deliberately gave.
  const reportOnly = processRunId !== undefined
  const runChatDraft = useRunChatDraft()
  const onSetUp = capabilitySetupHandler(reportOnly ? runChatDraft : onDraftMessage, {
    ...(projectChecks ? { projectChecks } : {}),
    ...(verificationPlatform ? { platform: verificationPlatform } : {}),
    approaches: verificationApproaches,
    inRun: reportOnly,
  })

  const [reasonFor, setReasonFor] = useState<'rejected' | 'changes-requested' | undefined>()
  const [reason, setReason] = useState('')
  const canonicalize = useCanonicalizeReferences()
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
  // Only a run with something to sign off loads its proof. Most of a chat's
  // turns change nothing, and each one fetching its evidence and the
  // verification plan — again on every chat update — held up the turns' own
  // transcripts behind a queue of requests whose answer was never shown.
  // Changes a later turn captured again, or the person discarded, have no review
  // left: their sign-off says so and loads nothing.
  const settledNotice = chatChangesNotice(artifact)
  // A change its base already holds has nothing left to review: one line says
  // so, and nothing of a review loads behind it.
  const alreadyOnBase = alreadyOnBaseView(landFailure)
  const reviewable =
    settledNotice === undefined &&
    alreadyOnBase === undefined &&
    (artifact !== undefined || landFailure !== undefined || reportOnly)
  const evidence = useReviewEvidence(reviewable ? projectId : undefined, {
    runId,
    ...(storyId ? { storyId } : {}),
  })
  const openChanges = useChatOpenChanges(
    !reportOnly && settledNotice === undefined && artifact !== undefined && chatContextId
      ? { projectId, chatContextId }
      : undefined,
  )
  const onBase = useReviewOnBase(
    !reportOnly &&
      settledNotice === undefined &&
      review &&
      !review.shadow &&
      review.landedAt !== undefined &&
      review.mergedAt == null &&
      review.rejectedAt == null
      ? { runId, projectId }
      : undefined,
  )

  useEffect(() => {
    if (error || settledNotice !== undefined || alreadyOnBase !== undefined) return
    // Load eagerly (not gated on a tab) so the decision bar reflects the real diff
    // state from the start. `error` gates the retry so a failing load cannot
    // refire forever.
    if (review) {
      // Report-only (process-owned) loads the diff for VIEWING but never records
      // it as reviewed — the pipeline owns this run's verdict.
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
    reportOnly,
    settledNotice,
    alreadyOnBase,
  ])

  // The verification plan is what tells "not run" apart from "not set up", so
  // it loads with the panel rather than behind a link.
  useEffect(() => {
    if (reviewable && verificationApproaches.length === 0 && !planLoading)
      void loadVerificationPlan()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewable])

  const census = storyId ? censusFeatures(getStory(storyId)?.features ?? []) : undefined
  const storyIncomplete = census ? incompleteStoryReason(census) : undefined
  const openQuestions = storyId ? openFeatureQuestions(getStory(storyId)?.features ?? []) : []

  const methodRows = useMemo(
    () =>
      checkMethodRows({
        verification,
        approaches: verificationApproaches,
        evidence: evidence.refs,
        ...(verdict?.by ? { verdictBy: verdict.by } : {}),
        // Whether the change was actually READ, from its OWN record — the
        // `judge` step writes it, and so does opening the Changes tab. It was
        // once keyed off the verdict, which nothing ever set to
        // `reviewer-agent`, so `diff` could never pass and the headline could
        // never reach `proven` in any client however much evidence a run made.
        ...(diffReview ? { diffReview } : {}),
        ...(projectChecks ? { projectChecks, now: Date.now() } : {}),
      }),
    [verification, verificationApproaches, evidence.refs, verdict?.by, diffReview, projectChecks],
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
  const reports = runReports(evidence.tiles)
  const { tests: testChecks, build: buildChecks } = reviewCheckGroups(verification)
  // The Tests badge counts TESTS, not layers.
  const testTotals = aggregateTestCounts(testChecks)

  // The completion moment: the evidence changes underneath the reader. Say so in
  // a line at the top rather than yanking them anywhere — the chips above may
  // have moved while they were reading. ABOVE the early returns: a hook that
  // runs on only some renders is the "rendered more hooks" crash.
  // The branch's own commits, for the Changes header; without them the header
  // has no count and the diff still shows.
  const commits = useBranchCommits(projectId, review)

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
  // A verifier / judge / capture run changes no files, so it has no emitted
  // artifact — but it DID produce a verdict, checks and evidence. Report-only
  // (process-owned) runs must still render that review surface, or opening one
  // falls back to the raw transcript instead of the agreed report view.
  const hasReviewContent =
    verification !== undefined ||
    testChecks.length + buildChecks.length > 0 ||
    evidence.refs.length > 0
  if (!artifact && !landFailure && !(reportOnly && hasReviewContent)) return null
  if (settledNotice) {
    return (
      <div className="mt-2 rounded-md border border-(--border-subtle) bg-(--surface-base) px-3 py-2 text-[12px] text-(--text-secondary)">
        {settledNotice}
      </div>
    )
  }

  if (alreadyOnBase) {
    return (
      <AlreadyOnBaseLine
        text={alreadyOnBase.text}
        {...(alreadyOnBase.sha
          ? {
              change: {
                files: commitReceiptFiles(artifact?.payload.files ?? []),
                ...(alreadyOnBase.subject ? { message: alreadyOnBase.subject } : {}),
              },
            }
          : {})}
      />
    )
  }

  const files = artifact?.payload.files ?? []
  const counts = reviewChangeCounts(files)
  const changesHeader = chatChangesHeader({
    fileCount: counts.total,
    ...(review ? { branch: review.branch, shadow: review.shadow === true } : {}),
  })
  const noticeView = openChangesNoticeView({ runId, ...openChanges }, Date.now())
  // A process step that EMITTED FILES is the developer (or any editing step): its
  // job is to implement and HAND OFF, so its terminal view is a hand-off + its
  // diff — not the review surface. The "what was checked" chips and the
  // screens/report evidence are the VERIFIER's, filed against this run's id; they
  // belong on the verifier's own report-only panel (a fileless process run), not
  // stacked onto the developer's as a second "sign off".
  const finishedView = processStepFinishedView({
    changedFiles: artifact !== undefined,
    ...(processRole ? { role: processRole } : {}),
  })
  const isHandoffRun = reportOnly && finishedView.kind === 'handoff'
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

  const discarded = discardedEditPaths(artifact)
  const changeFiles: ChangeFile[] = withDiscardWarnings(
    review
      ? (reviewDiff?.files ?? []).map(toChangeFile)
      : (preview?.files ?? []).map((f) => previewToChangeFile(f, isApplied)),
    discarded,
  )
  const changesKnown = review ? reviewDiff !== undefined : preview !== undefined
  // GitHub's "Viewed": the user marks each file read; the change is read once all are.
  const viewedChanges =
    review?.headSha && reviewDiff
      ? {
          progress: viewedFilesProgress(
            changeFiles.map((f) => f.path),
            viewedFiles,
            review.headSha,
          ),
          onToggle: (path: string, viewed: boolean) => void setFileViewed(path, viewed),
        }
      : undefined
  const tabs = reviewTabs({
    screens: pairs.length,
    walkthroughs: recordings.length,
    reports: reports.length,
    testCount: testTotals?.total ?? 0,
    testChecks: ranReviewChecks(testChecks).length,
    buildChecks: ranReviewChecks(buildChecks).length,
    changedFiles: changesKnown ? changeFiles.length : files.length > 0 ? files.length : undefined,
  })
  const currentTab: ReviewTabId =
    activeTab && tabs.some((t) => t.id === activeTab) ? activeTab : (tabs[0]?.id ?? 'changes')

  const approveOptions = approveActionDescriptors({
    shadow: review?.shadow === true,
    branch: review?.branch ?? 'the review branch',
    baseBranch: 'the working branch',
    hasRemote: true,
    fileCount: counts.total,
  })
  const earned = earnedApproveActions(approveOptions, headline.key)
  const facts = runReviewFacts({ cost, durationMs })
  const notice = mergeNotice(mergeResult, { shadow: review?.shadow === true })
  const decided = verdict ? verdictSummary(verdict) : undefined
  const landing = landFailure ? landFailureSummary(landFailure) : undefined
  const actionMode = reviewActionMode({
    verdict,
    hasReviewBranch: !!review,
    partOfStoryRun: storyId !== undefined,
    ...(landFailure ? { landFailureReason: landFailure.reason } : {}),
  })
  const busy = merging || approving || rejecting || requestingChanges
  const onBaseView =
    actionMode === 'actions' && !isMerged && !decided ? reviewOnBaseOfferView(onBase) : undefined
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
  // One pair as a side-by-side sheet — fetch the bytes at save time rather than
  // relying on a thumbnail having decoded them, so a screen never scrolled to
  // still saves.
  const savePair = async (pair: (typeof pairs)[number]) => {
    const before = pair.before
      ? await evidence.loadImage(pair.before.ref.id, pair.before.ref.mediaType)
      : undefined
    const after = pair.after
      ? await evidence.loadImage(pair.after.ref.id, pair.after.ref.mediaType)
      : undefined
    await saveSideBySide(before, after, `${screenPairFileStem(pair)}-before-after.png`)
  }
  const saveAllScreens = async () => {
    for (const pair of pairs) {
      const stem = screenPairFileStem(pair)
      if (pair.before) {
        const uri = await evidence.loadImage(pair.before.ref.id, pair.before.ref.mediaType)
        if (uri) downloadDataUri(uri, `${stem}-before.png`)
      }
      if (pair.after) {
        const uri = await evidence.loadImage(pair.after.ref.id, pair.after.ref.mediaType)
        if (uri) downloadDataUri(uri, `${stem}-after.png`)
      }
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

  const checkActions: CheckActionHost = {
    canRequest: onSendMessage !== undefined,
    onRun: runMethod,
    onRequest: requestMethod,
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
    const answer = canonicalize((answers[q.questionId] ?? '').trim())
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
    const text = canonicalize(reason)
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
    <div
      className={
        framed
          ? 'mt-2 rounded-md border border-(--border-default) bg-(--surface-raised)'
          : undefined
      }
    >
      {framed ? (
        <RunChangesHead
          marker={reportOnly ? 'stage' : headline.key}
          title={
            reportOnly
              ? 'Stage output'
              : artifact
                ? changesHeader.title
                : 'Agent changes were not committed'
          }
          {...(!reportOnly && artifact ? { meta: changesHeader.meta } : {})}
          {...(review && !review.shadow ? { branch: review.branch } : {})}
          model={runModel}
          {...(facts.durationLabel ? { durationLabel: facts.durationLabel } : {})}
          {...(facts.costLabel ? { costLabel: facts.costLabel } : {})}
          {...(facts.cost ? { cost: facts.cost } : {})}
        />
      ) : null}

      <div className="flex flex-col gap-3 px-3 py-3">
        {noticeView ? (
          <OpenChangesNotice
            view={noticeView}
            onDiscard={() => void openChanges.discard()}
            onRebuild={() => void openChanges.rebuild()}
          />
        ) : null}
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
                  <span className="text-[12px] text-(--text-primary)">
                    <RichText text={q.question} />
                  </span>
                  <span className="text-[11px] text-(--text-secondary)">on {q.featureTitle}</span>
                  <div className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <ReferenceTextarea
                        rows={1}
                        value={answers[q.questionId] ?? ''}
                        placeholder="Your answer — this unblocks the feature"
                        onChange={(next) =>
                          setAnswers((prev) => ({ ...prev, [q.questionId]: next }))
                        }
                        onSubmit={() => void submitAnswer(q)}
                        className="text-[12px] py-1"
                      />
                    </div>
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

            {reportOnly ? (
              // A process step reports; it never decides. This surface shows what
              // the step did and changed — the verdict and sign-off happen in the
              // pipeline, so no verdict headline or decision is offered here, just
              // the way back to the pipeline to carry on to the next stage.
              <div className="flex flex-col gap-2 rounded-md border border-(--accent-soft-border) bg-(--accent-soft-bg) px-2.5 py-2">
                <div className="flex flex-col gap-1">
                  <span className="text-[12.5px] font-semibold text-(--accent-soft-fg)">
                    {finishedView.title}
                  </span>
                  <p className="max-w-[64ch] text-[12px] text-(--accent-soft-fg)">
                    {finishedView.detail}
                  </p>
                </div>
                {onBackToPipeline && processRunId ? (
                  <div>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onBackToPipeline(processRunId)}
                    >
                      Back to pipeline →
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : (
              <RunVerdictLine headline={headline} />
            )}

            {!reportOnly && census ? (
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                    census.signOffReady ? TONE_CHIP.positive : TONE_CHIP.warning
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

            {/* What was checked — the index of evidence, and the only place to ask
                for what has no tab. Hidden on a hand-off (developer) run: those
                checks + screens are the VERIFIER's, filed against this run's id,
                and belong on the verifier's panel, not the developer's. */}
            {!isHandoffRun ? (
              <div className="relative flex flex-col gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)">
                  What was checked
                </span>
                <CheckChipRow
                  tabOrder={reviewTabOrder()}
                  rows={methodRows}
                  branch={review?.branch}
                  busyId={busyMethod}
                  // Report-only: the evidence index stays readable, but running or
                  // requesting a check from here is not offered — verification is
                  // the process's own step.
                  onOpenProof={setActiveTab}
                  actions={reportOnly ? undefined : checkActions}
                  {...(onSetUp ? { onSetUp } : {})}
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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPendingHandoff(undefined)}
                      >
                        Not now
                      </Button>
                      <span className="ml-auto text-[11px] text-(--text-muted)">
                        no “always allow”
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {isHandoffRun ? (
              // Developer hand-off: show ONLY its diff, not the verifier's review tabs.
              <ChangesTab
                projectId={projectId}
                {...(viewedChanges ? { viewed: viewedChanges } : {})}
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
                onOpenGit={review?.shadow ? undefined : onOpenGit}
              />
            ) : tabs.length > 0 ? (
              <div className="flex flex-col gap-2.5">
                <ReviewTabBar tabs={tabs} active={currentTab} onChange={setActiveTab} />
                {currentTab === 'screens' ? (
                  <ScreensTab
                    pairs={pairs}
                    onOpen={setOpenPairKey}
                    capturedLabel={capturedLabel}
                    onSaveAll={pairs.length > 0 ? () => void saveAllScreens() : undefined}
                    onSavePair={(pair) => void savePair(pair)}
                    onRequestImage={evidence.requestImage}
                    capturing={working !== undefined}
                  />
                ) : currentTab === 'walkthrough' ? (
                  <WalkthroughTab projectId={projectId} recordings={recordings} />
                ) : currentTab === 'tests' ? (
                  <ChecksTab
                    methods={methodRows.filter((r) => TEST_METHODS.includes(r.id))}
                    checks={testChecks}
                    branch={review?.branch}
                    busyId={busyMethod}
                    actions={checkActions}
                    {...(onSetUp ? { onSetUp } : {})}
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
                    actions={checkActions}
                    {...(onSetUp ? { onSetUp } : {})}
                  />
                ) : currentTab === 'report' ? (
                  <ReportTab reports={reports} />
                ) : (
                  <ChangesTab
                    projectId={projectId}
                    {...(viewedChanges ? { viewed: viewedChanges } : {})}
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
                    onOpenGit={review?.shadow ? undefined : onOpenGit}
                  />
                )}
              </div>
            ) : null}

            {discarded.size > 0 ? (
              <div
                className={`rounded-md border px-2 py-1.5 text-[12px] font-medium ${TONE_CHIP.danger}`}
              >
                {CHAT_CHANGES_COPY.discardsUncommittedEditsCount(discarded.size)}
              </div>
            ) : null}

            {landing ? <RunLandNotice summary={landing} /> : null}
          </>
        )}
      </div>

      {/* Foot — the decision, or the work in flight that has replaced it.
          Hidden while a question is open: sign-off is final, so it must not be
          reachable until the agent has nothing left to settle. */}
      {openQuestions.length === 0 ? (
        <div
          className={`flex flex-col gap-2 border-t border-(--border-subtle) px-3 py-2 ${
            framed ? '' : 'sticky bottom-0 z-10 bg-(--surface-base)'
          }`}
        >
          {decided ? (
            <div className="flex flex-col gap-0.5">
              <div className={`text-[12px] font-medium ${TONE_TEXT[decided.tone]}`}>
                {decided.label} by {decided.byLabel}
              </div>
              {decided.notes ? (
                <div className="wrap-break-word text-[12px] text-(--text-secondary)">
                  <RichText text={decided.notes} typedReferences />
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
                    {review?.shadow ? PROCESS_INTEGRATION_SHADOW.done : 'Merged into your branch'}
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
                ) : heldChatChangesNote(artifact) ? (
                  <span className="text-[12px] text-(--text-secondary)">
                    {heldChatChangesNote(artifact)}
                  </span>
                ) : isApplied ? (
                  <span className="text-[12px] text-(--text-secondary)">Applied to project</span>
                ) : null}
              </div>

              {/* A process-owned run makes no standalone decision here — the pipeline signs the story off. */}
              {reportOnly ? null : actionMode === 'actions' ? (
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
                <div className="flex items-center gap-2">
                  {isApplied ? null : (
                    <Tooltip content={CHAT_CHANGES_COPY.discardDetail}>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => void discard()}
                        disabled={discarding || applying}
                      >
                        {discarding ? CHAT_CHANGES_COPY.discarding : CHAT_CHANGES_COPY.discard}
                      </Button>
                    </Tooltip>
                  )}
                  <Button
                    size="sm"
                    onClick={() => void apply()}
                    disabled={applying || discarding || isApplied || !preview}
                  >
                    {applying ? 'Applying…' : isApplied ? 'Applied' : 'Apply to project'}
                  </Button>
                </div>
              ) : null}
            </div>
          )}

          {onBaseView && !working ? (
            <ReviewOnBaseOffer view={onBaseView} onClose={(force) => void onBase.close(force)} />
          ) : null}

          {reasonFor ? (
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <ReferenceTextarea
                  rows={1}
                  autoFocus
                  value={reason}
                  placeholder={
                    reasonFor === 'rejected' ? 'Why is this rejected?' : 'What needs to change?'
                  }
                  onChange={setReason}
                  onSubmit={submitReason}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setReasonFor(undefined)
                  }}
                  className="text-[12px] py-1"
                />
              </div>
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
        onRequestImage={evidence.requestImage}
        projectId={projectId}
      />
    </div>
  )
}
