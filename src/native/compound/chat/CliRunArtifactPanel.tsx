import { useEffect, useMemo, useRef, useState } from 'react'
import { Pressable, Text, View } from 'react-native'

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
} from '../../../headless'
import { nativeAlpha, nativeRadii } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import { Input } from '../../primitives/Input'
import { Modal } from '../../primitives/Modal'
import Tooltip from '../../primitives/Tooltip'
import RefChip from '../chips/RefChip'
import {
  ChangesTab,
  CheckChipRow,
  ChecksTab,
  ComparisonOverlay,
  DecisionBar,
  DurationPill,
  ReportTab,
  ReviewTabBar,
  RunModelChip,
  ScreensTab,
  VerdictBadge,
  WalkthroughTab,
  WorkBar,
  toneChip,
  toneText,
  type ChangeFile,
  type SaveFileHandler,
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
  /**
   * Puts a file where the user can reach it. Omitted when the host has no way
   * to — every save affordance then stays hidden rather than failing on press.
   */
  onSaveFile?: SaveFileHandler
}

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
 * Everything it derives comes from headless, so it renders the same facts the
 * same way as the web panel.
 */
export default function CliRunArtifactPanel({
  runId,
  projectId,
  onSendMessage,
  onOpenGit,
  onSaveFile,
}: CliRunArtifactPanelProps) {
  const { theme, status } = useNativeTheme()
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
  const dangerText = toneText('danger', theme)

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
      <Text style={{ marginTop: 8, fontSize: 12, color: dangerText }}>
        Failed to load agent changes: {error}{' '}
        <Text style={{ textDecorationLine: 'underline' }} onPress={reload}>
          Retry
        </Text>
      </Text>
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

  const warning = toneChip('warning', theme, status)
  const headMarker =
    headline.key === 'proven'
      ? status.done
      : headline.key === 'failed'
        ? status.stuck
        : status.review

  const censusLook = census
    ? toneChip(census.complete ? 'positive' : 'warning', theme, status)
    : undefined
  const done = status.done

  // Only ever called for a row whose action is `run` — both call sites gate on
  // it — so every path here is the project's own verification pass.
  // Every capture in the set, each named by its walkthrough position so the
  // saved folder reads in the order the reviewer walked it.
  const saveAllScreens = () => {
    if (!onSaveFile) return
    for (const pair of pairs) {
      const stem = screenPairFileStem(pair)
      if (pair.before?.dataUri)
        void onSaveFile({ name: `${stem}-before.png`, dataUri: pair.before.dataUri })
      if (pair.after?.dataUri)
        void onSaveFile({ name: `${stem}-after.png`, dataUri: pair.after.dataUri })
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
    <View
      style={{
        marginTop: 8,
        borderRadius: nativeRadii[2],
        borderWidth: 1,
        borderColor: theme.border.default,
        backgroundColor: theme.surface.raised,
        overflow: 'hidden',
      }}
    >
      {/* Head — the run as a tool row: what, where, how long. */}
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderBottomWidth: 1,
          borderBottomColor: theme.border.subtle,
        }}
      >
        {/* The head carries the verdict's colour too, so the run's state is
            readable before the eye reaches the verdict line below. */}
        <View
          style={{
            width: 16,
            height: 16,
            borderRadius: nativeRadii.round,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: headMarker.bg,
          }}
        >
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: nativeRadii.round,
              backgroundColor: headMarker.fg,
            }}
          />
        </View>
        <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text.primary }}>
          {artifact ? 'Sign-off' : 'Agent changes were not landed'}
        </Text>
        {review ? (
          <Tooltip
            content={
              <Text style={{ fontSize: 12, color: theme.text.primary, maxWidth: 260 }}>
                The review branch — every commit this run made lives here. Your own branch is
                untouched until you approve.
              </Text>
            }
          >
            <RefChip kind="branch" value={review.branch} />
          </Tooltip>
        ) : null}
        <RunModelChip model={runModel} />
        {facts.costLabel ? (
          <Text style={{ fontSize: 11, color: theme.text.secondary }}>{facts.costLabel}</Text>
        ) : null}
        <View style={{ flex: 1 }} />
        {facts.durationLabel ? <DurationPill label={facts.durationLabel} /> : null}
      </View>

      <View style={{ gap: 12, paddingHorizontal: 12, paddingVertical: 12 }}>
        {sentHandoff ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              borderRadius: nativeRadii[2],
              borderWidth: 1,
              borderColor: done.softBorder,
              backgroundColor: done.softBg,
              paddingHorizontal: 10,
              paddingVertical: 6,
            }}
          >
            <Text style={{ flex: 1, fontSize: 12, color: done.softFg }}>{sentHandoff}</Text>
            <Pressable accessibilityRole="button" onPress={() => setSentHandoff(undefined)}>
              <Text style={{ fontSize: 11, textDecorationLine: 'underline', color: done.softFg }}>
                Dismiss
              </Text>
            </Pressable>
          </View>
        ) : null}

        {openQuestions.length > 0 ? (
          <>
            <Text style={{ fontSize: 12, color: theme.text.secondary }}>
              Sign-off is a final decision, so it waits until the agent has nothing left to settle.
              Answer this and the review opens.
            </Text>
            <View
              style={{
                gap: 8,
                padding: 8,
                borderRadius: nativeRadii[2],
                borderWidth: 1,
                borderColor: nativeAlpha(theme.accent.primary, 0.25),
                backgroundColor: nativeAlpha(theme.accent.primary, 0.05),
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '500', color: theme.text.secondary }}>
                {openQuestions.length === 1
                  ? 'The agent has a question'
                  : `The agent has ${openQuestions.length} questions`}
              </Text>
              {openQuestions.map((q) => (
                <View key={q.questionId} style={{ gap: 4 }}>
                  <Text style={{ fontSize: 12, color: theme.text.primary }}>{q.question}</Text>
                  <Text style={{ fontSize: 11, color: theme.text.secondary }}>
                    {`on ${q.featureTitle}`}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Input
                        size="sm"
                        value={answers[q.questionId] ?? ''}
                        placeholder="Your answer — this unblocks the feature"
                        onChangeText={(text) =>
                          setAnswers((prev) => ({ ...prev, [q.questionId]: text }))
                        }
                        onSubmitEditing={() => void submitAnswer(q)}
                      />
                    </View>
                    <Button
                      size="sm"
                      disabled={
                        answering === q.questionId ||
                        (answers[q.questionId] ?? '').trim().length === 0
                      }
                      onPress={() => void submitAnswer(q)}
                    >
                      {answering === q.questionId ? 'Sending…' : 'Answer'}
                    </Button>
                  </View>
                </View>
              ))}
            </View>
          </>
        ) : (
          <>
            {/* Verdict — the chip and the sentence say the same thing. */}
            <View style={{ gap: 4 }}>
              <View
                style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}
              >
                <VerdictBadge verdict={headline} />
                <Text
                  style={{
                    flexShrink: 1,
                    fontSize: 14,
                    fontWeight: '600',
                    color: theme.text.primary,
                  }}
                >
                  {headline.title}
                </Text>
              </View>
              <Text style={{ fontSize: 12, color: theme.text.secondary }}>{headline.detail}</Text>
            </View>

            {census && censusLook ? (
              <View
                style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}
              >
                <View
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: nativeRadii.round,
                    borderWidth: 1,
                    borderColor: censusLook.border,
                    backgroundColor: censusLook.bg,
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '500', color: censusLook.fg }}>
                    {census.label}
                  </Text>
                </View>
                {storyIncomplete ? (
                  <Text style={{ flexShrink: 1, fontSize: 11, color: theme.text.secondary }}>
                    {storyIncomplete}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {/* What was checked — the index of evidence, and the only place to ask for what has no tab. */}
            <View style={{ gap: 6 }}>
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '600',
                  letterSpacing: 0.8,
                  textTransform: 'uppercase',
                  color: theme.text.muted,
                }}
              >
                What was checked
              </Text>
              <CheckChipRow
                rows={methodRows}
                branch={review?.branch}
                busyId={busyMethod}
                canRequest={onSendMessage !== undefined}
                onOpenProof={setActiveTab}
                onRun={runMethod}
                onRequest={requestMethod}
              />
            </View>

            {tabs.length > 0 ? (
              <View style={{ gap: 10 }}>
                <ReviewTabBar tabs={tabs} active={currentTab} onChange={setActiveTab} />
                {currentTab === 'screens' ? (
                  <ScreensTab
                    pairs={pairs}
                    onOpen={setOpenPairKey}
                    capturedLabel={capturedLabel}
                    onSaveAll={onSaveFile && pairs.length > 0 ? saveAllScreens : undefined}
                  />
                ) : currentTab === 'walkthrough' ? (
                  <WalkthroughTab recordings={recordings} />
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
                  <ReportTab reports={reports} onSaveFile={onSaveFile} />
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
              </View>
            ) : null}

            {landing ? (
              <View
                style={{
                  gap: 2,
                  borderRadius: nativeRadii[2],
                  borderWidth: 1,
                  borderColor: warning.border,
                  backgroundColor: warning.bg,
                  paddingHorizontal: 8,
                  paddingVertical: 6,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '500', color: warning.fg }}>
                  {landing.title}
                </Text>
                <Text style={{ fontSize: 12, color: warning.fg }}>
                  {`The agent produced changes but they were not committed to a review branch — ${landing.message}.`}
                </Text>
              </View>
            ) : null}
          </>
        )}
      </View>

      {/* Foot — the decision, or the work in flight that has replaced it. */}
      {openQuestions.length === 0 ? (
        <View
          style={{
            gap: 8,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderTopWidth: 1,
            borderTopColor: theme.border.subtle,
          }}
        >
          {decided ? (
            <View style={{ gap: 2 }}>
              <Text
                style={{ fontSize: 12, fontWeight: '500', color: toneText(decided.tone, theme) }}
              >
                {`${decided.label} by ${decided.byLabel}`}
              </Text>
              {decided.notes ? (
                <Text style={{ fontSize: 12, color: theme.text.secondary }}>{decided.notes}</Text>
              ) : null}
            </View>
          ) : working ? (
            <WorkBar
              label={working}
              startedAtMs={startedAtMs}
              onCancel={reviewInProgress ? cancelReview : undefined}
              cancelling={cancelling}
            />
          ) : (
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <View style={{ flexShrink: 1, minWidth: 0 }}>
                {notice ? (
                  <Text style={{ fontSize: 12, color: toneText(notice.tone, theme) }}>
                    {notice.message}
                  </Text>
                ) : actionMode === 'actions' && isMerged ? (
                  <Text style={{ fontSize: 12, color: theme.text.secondary }}>
                    Merged into your branch
                  </Text>
                ) : applyResultData ? (
                  <Text style={{ fontSize: 12, color: theme.text.secondary }}>
                    {`${applyResultData.added.length} added, ${applyResultData.modified.length} modified, ${applyResultData.deleted.length} deleted${
                      applyResultData.errors.length > 0
                        ? `, ${applyResultData.errors.length} failed`
                        : ''
                    }`}
                  </Text>
                ) : conflictCount > 0 && !isApplied ? (
                  <Text style={{ fontSize: 12, color: dangerText }}>
                    {`${conflictCount} conflict${conflictCount === 1 ? '' : 's'} — applying overwrites local edits`}
                  </Text>
                ) : isApplied ? (
                  <Text style={{ fontSize: 12, color: theme.text.secondary }}>
                    Applied to project
                  </Text>
                ) : null}
              </View>

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
                  onPress={() => void apply()}
                  disabled={applying || isApplied || !preview}
                >
                  {applying ? 'Applying…' : isApplied ? 'Applied' : 'Apply to project'}
                </Button>
              ) : null}
            </View>
          )}

          {reasonFor ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Input
                  size="sm"
                  autoFocus
                  value={reason}
                  placeholder={
                    reasonFor === 'rejected' ? 'Why is this rejected?' : 'What needs to change?'
                  }
                  onChangeText={setReason}
                  onSubmitEditing={submitReason}
                />
              </View>
              <Button size="sm" onPress={submitReason} disabled={!reasonValid || busy}>
                {reasonFor === 'rejected' ? 'Reject' : 'Send'}
              </Button>
              <Button size="sm" variant="secondary" onPress={() => setReasonFor(undefined)}>
                Cancel
              </Button>
            </View>
          ) : null}
        </View>
      ) : null}

      {applyResultData && applyResultData.errors.length > 0 ? (
        <View
          style={{
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderTopWidth: 1,
            borderTopColor: theme.border.subtle,
          }}
        >
          {applyResultData.errors.map((e) => (
            <Text key={e.path} style={{ fontSize: 12, color: dangerText }}>
              {`${e.path}: ${e.reason}`}
            </Text>
          ))}
        </View>
      ) : null}

      {pendingApprove ? (
        <Modal
          isOpen
          onClose={() => setPendingApprove(undefined)}
          title={pendingApprove.title}
          size="sm"
        >
          <View style={{ gap: 12 }}>
            <View style={{ gap: 6 }}>
              {pendingApprove.effects.map((effect) => (
                <View key={effect} style={{ flexDirection: 'row', gap: 8 }}>
                  <Text style={{ fontSize: 13, color: theme.text.secondary }}>—</Text>
                  <Text style={{ flex: 1, fontSize: 13, color: theme.text.secondary }}>
                    {effect}
                  </Text>
                </View>
              ))}
            </View>
            <View style={{ gap: 4 }}>
              <Text style={{ fontSize: 12, color: theme.text.secondary }}>Note (optional)</Text>
              <Input
                size="sm"
                autoFocus
                value={approveNote}
                placeholder="Anything worth recording with this approval"
                onChangeText={setApproveNote}
              />
            </View>
            {approveResult && !approveResult.approved ? (
              <Alert variant="error">
                {approveResult.blockedReason ?? 'The approval was refused.'}
              </Alert>
            ) : null}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
              <Button
                variant="ghost"
                size="sm"
                onPress={() => setPendingApprove(undefined)}
                disabled={approving}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={approving}
                onPress={() => {
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
            </View>
          </View>
        </Modal>
      ) : null}

      {pendingHandoff ? (
        <Modal
          isOpen
          onClose={() => setPendingHandoff(undefined)}
          title={pendingHandoff.request.title}
          size="sm"
        >
          <View style={{ gap: 12 }}>
            <View style={{ gap: 4 }}>
              {pendingHandoff.request.facts.map((fact) => (
                <View key={fact.label} style={{ flexDirection: 'row', gap: 12 }}>
                  <Text style={{ width: 84, fontSize: 12, color: theme.text.muted }}>
                    {fact.label}
                  </Text>
                  <Text style={{ flex: 1, fontSize: 12, color: theme.text.secondary }}>
                    {fact.value}
                  </Text>
                </View>
              ))}
            </View>
            <Text style={{ fontSize: 12, color: theme.text.muted }}>
              {pendingHandoff.request.caveat}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ flex: 1, fontSize: 11, color: theme.text.muted }}>
                no “always allow”
              </Text>
              <Button variant="ghost" size="sm" onPress={() => setPendingHandoff(undefined)}>
                Not now
              </Button>
              <Button size="sm" onPress={confirmHandoff} disabled={!onSendMessage}>
                Start
              </Button>
            </View>
          </View>
        </Modal>
      ) : null}

      <ComparisonOverlay
        pairs={pairs}
        openKey={openPairKey}
        onClose={() => setOpenPairKey(undefined)}
        baseSha={review?.baseSha}
        headSha={review?.headSha}
        onSaveFile={onSaveFile}
      />
    </View>
  )
}
