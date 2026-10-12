import { Fragment, useCallback, useEffect, useState, type ReactNode } from 'react'
import {
  choiceTakesNote,
  computeChatRowStatus,
  markSeen,
  processRunChatContext,
  RUN_CHAT_OPEN_LABEL,
  RunChatDraftProvider,
  RunNeedsYouProvider,
  runNeedsYouDiscussDraft,
  useChats,
  usePendingAsksByChat,
  fileNameSlug,
  formatProcessDuration,
  isIntegratingApproval,
  isReflectedPark,
  isResumeParkChoice,
  PROCESS_PARK_ASK_AGENT_COPY,
  processParkAskableStepId,
  REQUEST_PROOF_CHOICES,
  parkNoteRequired,
  processAmendmentView,
  processNodeBadge,
  processNodeLook,
  processNodeState,
  type ProcessNodeLook,
  processRetryChoiceOf,
  processRetryPickStart,
  processRetryTurnLimitView,
  processRunParkChoices,
  processRunIntegrationModes,
  processRunBadge,
  processRunHeaderModel,
  processRunManagerView,
  processRunPersonEnding,
  processRunRevivable,
  processRunSendBackGateId,
  PROCESS_SEND_BACK_COPY,
  PROCESS_REVIVE_COPY,
  PROCESS_STOP_CONFIRM_COPY,
  processRunSpend,
  processRunWorkMs,
  processStepCostLabel,
  processStepCostTitle,
  processStepModelChip,
  processStepRowView,
  processStepWorkMs,
  processTimeDetailsView,
  processStepStates,
  processWaitingView,
  signoffMergeHold,
  SIGNOFF_GROUP_CHIP_LABEL,
  SIGNOFF_GROUP_CHIP_TITLE,
  useAppSettings,
  useDurationTimer,
  useProcessGroupRun,
  useProcessRun,
  useProjects,
  useStories,
  waitingNoteCopy,
  type ProcessIntegrationDecision,
  type ProofKind,
  type ProcessNodeRunRef,
  type ProcessResumeChoice,
  type ProcessRetryPick,
  type ProcessRun,
  type ProcessRunManagerView,
  type ProcessStatusTone,
  type ProcessTurnLimit,
  type ProcessWaitingView,
  type RunNeedsYouActions,
} from '../../../headless'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import { Modal } from '../../primitives/Modal'
import {
  IconChat,
  IconChevronLeft,
  IconChevronRight,
  IconCopy,
  IconDelete,
  IconDownload,
  IconGroup,
} from '../../icons'
import OverflowMenu, { type OverflowMenuItem } from '../OverflowMenu'
import CostChip from '../chips/CostChip'
import DurationChip from '../chips/DurationChip'
import { downloadDataUri } from '../chat/signoff/download'
import RunModelChip from '../chat/signoff/RunModelChip'
import DependencyBullet from '../stories/DependencyBullet'
import RunPendingChanges from './RunPendingChanges'
import BaseMovedNote from './BaseMovedNote'
import WorkBranchChangesNote from './WorkBranchChangesNote'
import IntegrationResult from './IntegrationResult'
import ParkNoteComposer from './ParkNoteComposer'
import RetryChoiceOptions from './RetryChoiceOptions'
import RunClosurePanel from './RunClosurePanel'
import RunTurnLimitChip from './RunTurnLimitChip'
import { RunManagerChip } from './RunManagerChip'
import RunManagerPanel from './RunManagerPanel'
import RunDiagnosticsView from './RunDiagnosticsView'
import RunChatDrawer from './RunChatDrawer'
import { readChatsSeen, useChatsSeen, writeChatsSeen } from '../notifications/chatsSeen'
import StorySignoffReview from './StorySignoffReview'
import StepPreview from './pipeline/StepPreview'
import StepSidePanel, { type StepPanelTarget } from './pipeline/StepSidePanel'
import { type ProcessRunBranch } from '../../../headless'
import type { ChatContext } from '../../../headless/api'
import { getChatContextKey } from 'thefactory-tools/utils'

export type ProcessPipelineProps = {
  /** The top-level run. Drilling into a nested node stays inside this component. */
  runId: string
  /**
   * Open the agent-run chat a leaf owns as a full page — the side panel's ↗.
   * The pipeline never renders a transcript itself; the host knows how.
   */
  onOpenAgentRun?: (ref: ProcessNodeRunRef) => void
  /**
   * Render a leaf's agent-run chat inside the side panel. `onBack` closes the
   * panel — hand it to anything in the content that offers the way back.
   */
  renderAgentRun?: (ref: ProcessNodeRunRef, onBack: () => void) => ReactNode
  /**
   * Open a chat by its context — where a waiting agent's ask went when the
   * person handed it to another agent. The host owns chat navigation.
   */
  onOpenChat?: (context: ChatContext) => void
  /** Open the group run a project's run is a leg of. */
  onOpenGroupRun?: (groupRunId: string) => void
  /**
   * Render the run's own chat inside the run's chat drawer. `onClose` closes
   * the drawer. Without it the chat opens through `onOpenChat`.
   */
  renderChat?: (context: ChatContext, onClose: () => void) => ReactNode
}

/** The run sits at its story's sign-off — the whole page leads with the decision. */
function isStorySignoff(run: ProcessRun): boolean {
  return run.status === 'parked' && run.park?.reason === 'gate' && !!run.storyId
}

/**
 * The surface a process run is watched on — a pipeline, not a transcript.
 *
 * At a story's sign-off the decision leads, above the steps. Each step is one
 * line — its status, its name (a feature by its chip), what it came to, its time
 * and cost — and a chevron when it produced something: a preview of its output
 * opens the full view in a side panel. Skipped steps are grey and inert.
 * Drilling into a feature's own pipeline stays inside this component with a
 * breadcrumb.
 */
export default function ProcessPipeline({
  runId,
  onOpenAgentRun,
  renderAgentRun,
  onOpenChat,
  onOpenGroupRun,
  renderChat,
}: ProcessPipelineProps) {
  const [stack, setStack] = useState<string[]>([])
  const [panel, setPanel] = useState<StepPanelTarget | null>(null)
  const [reportText, setReportText] = useState<string | undefined>()
  const currentId = stack[stack.length - 1] ?? runId
  const {
    isLoaded,
    loadError,
    actionError,
    run,
    resume,
    setTurnLimit,
    setManager,
    delegate,
    retryIntegration,
    resolveIntegrationConflict,
    sendBack,
    revive,
    cancel,
    listBranches,
    deleteRun,
    openChat,
    askAgent,
    resolveNeedsYou,
    startChanges,
    withdrawChange,
  } = useProcessRun(currentId)
  const { settings } = useAppSettings()
  const showDiagnostics = settings.userPreferences.showRunDiagnostics === true
  const { group } = useProcessGroupRun(run?.groupRunId)
  const integrationModes = run ? processRunIntegrationModes(run, group) : undefined
  const { projects } = useProjects()
  const { getChat, setDraft } = useChats()
  const [chat, setChat] = useState<{ context: ChatContext; version: number } | null>(null)
  const [chatOpening, setChatOpening] = useState(false)
  const runChat = processRunChatContext({ id: runId, projectId: run?.projectId ?? '' })
  const runChatKey = getChatContextKey(runChat)
  const chatsSeen = useChatsSeen()
  const runChatAsks = usePendingAsksByChat().get(runChatKey) ?? 0
  const runChatUnread = computeChatRowStatus({
    context: runChat,
    contextKey: runChatKey,
    chat: getChat(runChat),
    isSending: false,
    seen: chatsSeen,
    pendingAsks: runChatAsks,
  }).isUnread
  const canChat = stack.length === 0 && !run?.parentRunId && (!!renderChat || !!onOpenChat)

  const showRunChat = useCallback(
    (context: ChatContext) => {
      if (renderChat) {
        setChat((prev) => ({ context, version: (prev?.version ?? 0) + 1 }))
      } else {
        onOpenChat?.(context)
      }
    },
    [renderChat, onOpenChat],
  )
  const openRunChat = useCallback(
    async (draft?: string) => {
      setChatOpening(true)
      const opened = await openChat()
      setChatOpening(false)
      if (!opened) return
      if (draft) setDraft(opened.context, draft)
      showRunChat(opened.context)
    },
    [openChat, setDraft, showRunChat],
  )
  const askAgentAboutStep = useCallback(async () => {
    setChatOpening(true)
    const opened = await askAgent()
    setChatOpening(false)
    if (opened) showRunChat(opened.context)
  }, [askAgent, showRunChat])
  const closeChat = useCallback(() => {
    writeChatsSeen(markSeen(readChatsSeen(), runChatKey, new Date().toISOString()))
    setChat(null)
  }, [runChatKey])

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmStop, setConfirmStop] = useState(false)
  const [branches, setBranches] = useState<ProcessRunBranch[]>([])
  const [alsoBranches, setAlsoBranches] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleted, setDeleted] = useState(false)

  const now = useDurationTimer(run?.totals?.ticking === true)

  const drillTo = useCallback((childId: string) => {
    setPanel(null)
    setStack((s) => [...s, childId])
  }, [])
  const popTo = useCallback((depth: number) => {
    setPanel(null)
    setStack((s) => s.slice(0, depth))
  }, [])
  const closePanel = useCallback(() => setPanel(null), [])

  const openDelete = useCallback(() => {
    setAlsoBranches(false)
    setBranches([])
    setConfirmDelete(true)
    void listBranches()
      .then(setBranches)
      .catch(() => setBranches([]))
  }, [listBranches])

  const shadowWork = run?.workBranch?.shadow === true
  const runDelete = useCallback(() => {
    setDeleting(true)
    void deleteRun({ deleteBranches: shadowWork || alsoBranches })
      .then(() => {
        setConfirmDelete(false)
        setDeleted(true)
      })
      .finally(() => setDeleting(false))
  }, [deleteRun, alsoBranches, shadowWork])

  if (deleted) {
    return (
      <div className="p-4">
        <Alert variant="info">This process run and everything it produced were deleted.</Alert>
      </div>
    )
  }
  if (loadError) return <Alert variant="error">{loadError.message}</Alert>
  if (!isLoaded) return <div className="p-4 text-sm text-(--text-secondary)">Loading…</div>
  if (!run) return <Alert variant="error">This run no longer exists.</Alert>

  const needsYouActions: RunNeedsYouActions | undefined = canChat
    ? {
        resolutions: run.needsYouResolutions,
        onDiscuss: (card) => void openRunChat(runNeedsYouDiscussDraft(card.text)),
        onResolve: (card) => void resolveNeedsYou(card.id),
      }
    : undefined
  const states = processStepStates(run)
  const amendments = processAmendmentView(run)
  const managerView = stack.length === 0 ? processRunManagerView(run, now) : undefined
  const signoff = isStorySignoff(run) && !isReflectedPark(run.park!)
  const mergeHold =
    signoff && group
      ? signoffMergeHold(
          group,
          run.projectId,
          (id) => projects.find((p) => p.id === id)?.title ?? id,
        )
      : undefined
  const choose = (
    choice: ProcessResumeChoice,
    note?: string,
    integration?: ProcessIntegrationDecision,
    requestedProof?: readonly ProofKind[],
    retry?: ProcessRetryPick,
  ) => resume(choice, note, integration, requestedProof, retry)

  return (
    <RunChatDraftScope open={canChat ? (draft) => void openRunChat(draft) : undefined}>
      <div
        className={`flex h-full min-h-0 flex-col overflow-y-auto ${chat || chatOpening ? 'lg:pr-[460px]' : ''}`}
      >
        <RunHead
          now={now}
          run={run}
          depth={stack.length}
          onCrumb={popTo}
          onCancel={() => setConfirmStop(true)}
          onDelete={openDelete}
          onSetTurnLimit={setTurnLimit}
          {...(managerView ? { manager: { view: managerView, onSwitch: setManager } } : {})}
          reportText={signoff ? reportText : undefined}
          {...(canChat
            ? { chat: { onOpen: () => void openRunChat(), unread: !chat && runChatUnread } }
            : {})}
          {...(run.groupRunId && onOpenGroupRun
            ? { onOpenGroup: () => onOpenGroupRun(run.groupRunId!) }
            : {})}
        />

        {actionError && !signoff ? (
          <div
            role="alert"
            className="mx-3 mt-3 rounded-md px-2.5 py-2 text-[12px]"
            style={{
              background: 'var(--status-stuck-soft-bg)',
              border: '1px solid var(--status-stuck-soft-border)',
              color: 'var(--status-stuck-soft-fg)',
            }}
          >
            {actionError}
          </div>
        ) : null}

        {signoff ? null : <BaseMovedNote run={run} onChoose={(choice) => choose(choice)} />}
        <WorkBranchChangesNote run={run} />
        {managerView ? (
          <RunManagerPanel
            view={managerView}
            {...(canChat ? { onOpenChat: () => void openRunChat() } : {})}
          />
        ) : null}

        {stack.length === 0 ? (
          <RunPendingChanges run={run} onStart={startChanges} onRemove={withdrawChange} />
        ) : null}

        {amendments.notes.length > 0 ? (
          <div className="mx-3 mt-3 flex flex-col gap-1 rounded-md border border-(--border-subtle) bg-(--surface-base) px-2.5 py-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)">
              Work added to this run
            </span>
            {amendments.notes.map((note) => (
              <p key={note} className="text-[11.5px] leading-relaxed text-(--text-secondary)">
                {note}
              </p>
            ))}
          </div>
        ) : null}

        <div
          className={
            signoff ? 'mx-auto w-full max-w-[1120px] px-3 pb-4 pt-4 sm:px-6' : 'px-3 pb-4 pt-3'
          }
        >
          <ol className="m-0 flex list-none flex-col rounded-xl border border-(--border-subtle) bg-(--surface-raised) p-0 py-1.5">
            {states.map((state) => (
              <PipelineNode
                key={state.step.id}
                run={run}
                state={state}
                now={now}
                addedTag={amendments.addedSteps[state.step.id]}
                onChoose={choose}
                onDelegate={() => delegate().then(() => undefined)}
                {...(canChat ? { onAskAgent: askAgentAboutStep } : {})}
                {...(onOpenChat ? { onOpenChat } : {})}
                onDrill={drillTo}
                onOpenPanel={setPanel}
                {...(renderAgentRun
                  ? {
                      onOpenTranscript: (ref: ProcessNodeRunRef) =>
                        setPanel({
                          runId: run.id,
                          stepId: state.step.id,
                          entryId: entryIdOf(state, ref),
                        }),
                    }
                  : {})}
              />
            ))}
          </ol>
        </div>

        <IntegrationResult
          run={run}
          {...(integrationModes ? { modes: integrationModes } : {})}
          onRetry={retryIntegration}
          onResolve={resolveIntegrationConflict}
          error={signoff ? null : actionError}
        />

        {signoff ? (
          <div className="mx-auto w-full max-w-[1120px] px-3 pb-4 sm:px-6">
            <NeedsYouScope value={needsYouActions}>
              <StorySignoffReview
                projectId={run.projectId}
                storyId={run.storyId as string}
                storyRunId={run.id}
                choices={processRunParkChoices(run)}
                {...(run.workBranch && isIntegratingApproval(run, 'approve')
                  ? { workBranch: run.workBranch }
                  : {})}
                {...(integrationModes ? { integrationModes } : {})}
                onChoose={choose}
                error={actionError}
                {...(mergeHold
                  ? {
                      mergeHold: {
                        ...mergeHold,
                        ...(onOpenGroupRun
                          ? { onOpenGroup: () => onOpenGroupRun(run.groupRunId!) }
                          : {}),
                      },
                    }
                  : {})}
                onReportText={setReportText}
                onOpenStep={setPanel}
              />
            </NeedsYouScope>
          </div>
        ) : null}

        <RunDiagnosticsView runId={currentId} enabled={showDiagnostics} />

        <RunEnding run={run} onSendBack={sendBack} onRevive={revive} />
        {stack.length === 0 ? <RunClosurePanel run={run} /> : null}

        {renderChat && (chat || chatOpening) ? (
          <RunChatDrawer {...(run.storyId ? { storyId: run.storyId } : {})} onClose={closeChat}>
            {chat ? (
              <Fragment key={chat.version}>{renderChat(chat.context, closeChat)}</Fragment>
            ) : null}
          </RunChatDrawer>
        ) : null}

        {panel ? (
          <StepSidePanel
            target={panel}
            onClose={closePanel}
            {...(renderAgentRun ? { renderAgentRun } : {})}
            {...(onOpenAgentRun ? { onOpenAgentRun } : {})}
          />
        ) : null}

        {confirmStop ? (
          <Modal
            isOpen
            onClose={() => setConfirmStop(false)}
            title={PROCESS_STOP_CONFIRM_COPY.title}
            size="sm"
          >
            <div className="flex flex-col gap-3 text-[13px] text-(--text-secondary)">
              <p className="m-0">{PROCESS_STOP_CONFIRM_COPY.body}</p>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setConfirmStop(false)}>
                  {PROCESS_STOP_CONFIRM_COPY.cancel}
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    setConfirmStop(false)
                    void cancel()
                  }}
                >
                  {PROCESS_STOP_CONFIRM_COPY.confirm}
                </Button>
              </div>
            </div>
          </Modal>
        ) : null}

        {confirmDelete ? (
          <Modal
            isOpen
            onClose={() => setConfirmDelete(false)}
            title="Delete this process run?"
            size="sm"
          >
            <div className="flex flex-col gap-3 text-[13px] text-(--text-secondary)">
              <p className="m-0">
                This removes the run and everything it produced — every step’s agent-run chat and
                its record. This cannot be undone.
              </p>
              {shadowWork ? null : branches.length > 0 ? (
                <label className="flex items-start gap-2 rounded-md border border-(--border-subtle) bg-(--surface-sunken) p-2.5">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={alsoBranches}
                    onChange={(e) => setAlsoBranches(e.target.checked)}
                  />
                  <span className="min-w-0">
                    <span className="font-medium text-(--text-primary)">
                      Also delete {branches.length} git branch{branches.length === 1 ? '' : 'es'}
                    </span>
                    <span className="mt-1 flex flex-col gap-0.5 font-mono text-[11px] text-(--text-muted)">
                      {branches.map((b) => (
                        <span key={`${b.projectId}:${b.branch}`} className="truncate">
                          {b.branch}
                        </span>
                      ))}
                    </span>
                  </span>
                </label>
              ) : (
                <p className="m-0 text-[12px] text-(--text-muted)">
                  No review branches were found for this run.
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                >
                  Cancel
                </Button>
                <Button variant="danger" size="sm" onClick={runDelete} disabled={deleting}>
                  {deleting ? 'Deleting…' : 'Delete run'}
                </Button>
              </div>
            </div>
          </Modal>
        ) : null}
      </div>
    </RunChatDraftScope>
  )
}

/** Anything inside the run — its sign-off, a step's panel — can open the run's chat with a draft. */
function RunChatDraftScope({
  open,
  children,
}: {
  open: ((draft: string) => void) | undefined
  children: ReactNode
}) {
  return open ? <RunChatDraftProvider value={open}>{children}</RunChatDraftProvider> : children
}

/** The sign-off's "Needs you" cards can be discussed and settled — when the run has a chat to discuss them in. */
function NeedsYouScope({
  value,
  children,
}: {
  value: RunNeedsYouActions | undefined
  children: ReactNode
}) {
  return value ? <RunNeedsYouProvider value={value}>{children}</RunNeedsYouProvider> : children
}

function entryIdOf(
  state: ReturnType<typeof processStepStates>[number],
  ref: ProcessNodeRunRef,
): string | undefined {
  return state.entries.find((e) => e.runRef?.runId === ref.runId)?.id
}

/** A soft status pill in the package's own semantic palette. */
function ToneBadge({ tone, children }: { tone: ProcessStatusTone; children: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-px text-[11px]"
      style={{
        background: `var(--status-${tone}-soft-bg)`,
        color: `var(--status-${tone}-soft-fg)`,
        border: `1px solid var(--status-${tone}-soft-border)`,
      }}
    >
      {children}
    </span>
  )
}

/**
 * The run header: where you are, the headline state, time and spend — then
 * icon-only actions: the Group chip when the run is a group's leg, Stop while
 * the run can still do work, and ⋯ for the rare ones (copy the link, download
 * the report, delete — which still asks first).
 */
function RunHead({
  run,
  depth,
  now,
  onCrumb,
  onCancel,
  onDelete,
  onOpenGroup,
  onSetTurnLimit,
  manager,
  reportText,
  chat,
}: {
  run: ProcessRun
  depth: number
  now: number
  onCrumb: (depth: number) => void
  onCancel: () => void
  onDelete?: () => void
  onOpenGroup?: () => void
  /** Hold the run's step agents to a turn limit from their next step on. */
  onSetTurnLimit?: (limit: ProcessTurnLimit) => Promise<boolean>
  /** The run's agent manager: what it is, and the switch while the run is live. */
  manager?: { view: ProcessRunManagerView; onSwitch: (enabled: boolean) => Promise<boolean> }
  reportText?: string
  /** The run's own chat: open it, and whether it has news. */
  chat?: { onOpen: () => void; unread: boolean }
}) {
  const badge = processRunBadge(run)
  const spend = processRunSpend(run)
  const workMs = processRunWorkMs(run, now)
  const model = processRunHeaderModel(run, run.ledger)
  const stoppable = run.status === 'running' || run.status === 'pending' || run.status === 'parked'
  const menu: OverflowMenuItem[] = [
    ...(typeof navigator !== 'undefined' && navigator.clipboard
      ? [
          {
            key: 'copy-link',
            label: 'Copy run link',
            icon: <IconCopy className="size-4" />,
            onSelect: () => void navigator.clipboard.writeText(window.location.href),
          },
        ]
      : []),
    ...(reportText
      ? [
          {
            key: 'download-report',
            label: 'Download report',
            icon: <IconDownload className="size-4" />,
            onSelect: () =>
              downloadDataUri(
                `data:text/markdown;charset=utf-8,${encodeURIComponent(reportText)}`,
                `${fileNameSlug(run.title, 'report')}.md`,
              ),
          },
        ]
      : []),
    ...(depth === 0 && onDelete
      ? [
          {
            key: 'delete',
            label: 'Delete run…',
            icon: <IconDelete className="size-4" />,
            destructive: true,
            onSelect: onDelete,
          },
        ]
      : []),
  ]
  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b border-(--border-subtle) bg-(--surface-raised) px-3 py-2.5">
      <nav className="flex min-w-0 flex-wrap items-center gap-1 text-[12px]">
        {depth > 0 ? (
          <>
            <button
              type="button"
              className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-(--text-muted) hover:bg-(--surface-hover) hover:text-(--text-primary)"
              onClick={() => onCrumb(0)}
            >
              <IconChevronLeft className="size-3.5" />
              Top
            </button>
            {Array.from({ length: depth - 1 }).map((_, i) => (
              <span key={i} className="flex items-center gap-1">
                <span className="text-(--border-strong)">/</span>
                <button
                  type="button"
                  className="rounded px-1 py-0.5 text-(--text-muted) hover:bg-(--surface-hover) hover:text-(--text-primary)"
                  onClick={() => onCrumb(i + 1)}
                >
                  …
                </button>
              </span>
            ))}
            <span className="text-(--border-strong)">/</span>
          </>
        ) : null}
        <span className="font-semibold text-(--text-primary)">{run.title}</span>
      </nav>
      <span className="grow" />
      <ToneBadge tone={badge.tone}>{badge.label}</ToneBadge>
      {model ? <RunModelChip model={model} /> : null}
      <RunTurnLimitChip
        run={run}
        {...(stoppable && onSetTurnLimit ? { onSet: onSetTurnLimit } : {})}
      />
      {manager && depth === 0 ? (
        <RunManagerChip
          view={manager.view}
          {...(stoppable ? { onSwitch: manager.onSwitch } : {})}
        />
      ) : null}
      {workMs !== undefined ? (
        <DurationChip
          label={formatProcessDuration(workMs)}
          details={processTimeDetailsView(run.totals?.time, workMs)}
          title="Time spent working, across every attempt"
        />
      ) : null}
      {spend ? <CostChip label={spend.label} cost={run.totals} title={spend.title} /> : null}
      {onOpenGroup || chat || stoppable || menu.length > 0 ? (
        <span aria-hidden className="mx-1 h-6 w-px bg-(--border-subtle)" />
      ) : null}
      {onOpenGroup && depth === 0 ? (
        <button
          type="button"
          onClick={onOpenGroup}
          aria-label={SIGNOFF_GROUP_CHIP_TITLE}
          title={SIGNOFF_GROUP_CHIP_TITLE}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-(--border-default) px-2.5 text-[12px] text-(--text-secondary) hover:bg-(--surface-hover)"
        >
          <IconGroup className="size-4" />
          {SIGNOFF_GROUP_CHIP_LABEL}
        </button>
      ) : null}
      {chat && depth === 0 ? (
        <button
          type="button"
          onClick={chat.onOpen}
          aria-label={RUN_CHAT_OPEN_LABEL}
          title={RUN_CHAT_OPEN_LABEL}
          className="relative inline-flex size-8 items-center justify-center rounded-md border border-(--border-default) bg-(--surface-raised) text-(--text-secondary) hover:bg-(--surface-hover)"
        >
          <IconChat className="size-4" />
          {chat.unread ? (
            <span
              aria-hidden
              className="absolute right-1 top-1 size-2 rounded-full bg-(--accent-primary)"
            />
          ) : null}
        </button>
      ) : null}
      {stoppable ? (
        <button
          type="button"
          onClick={onCancel}
          aria-label="Stop the run"
          title="Stop the run"
          className="inline-flex size-8 items-center justify-center rounded-md border border-(--border-default) bg-(--surface-raised) text-(--text-secondary) hover:bg-(--surface-hover)"
        >
          <span aria-hidden className="size-3 rounded-[2px] bg-current" />
        </button>
      ) : null}
      {menu.length > 0 ? <OverflowMenu items={menu} /> : null}
    </div>
  )
}

/**
 * A node's marker, drawn from its look: a filled mark for a verdict, a dashed
 * outline for what has not run or was skipped, and — only for running work — a
 * ring that spins.
 */
function Marker({ look }: { look: ProcessNodeLook }) {
  return (
    <span
      className="relative grid size-[22px] shrink-0 place-items-center rounded-full text-[10px] font-bold tabular-nums"
      style={
        look.shape === 'dashed'
          ? {
              background: 'var(--surface-base)',
              color: 'var(--text-muted)',
              border: '1.5px dashed var(--border-strong)',
            }
          : look.shape === 'ring'
            ? {
                background: 'var(--surface-base)',
                color: `var(--status-${look.tone}-bg)`,
                border: `1.5px solid var(--status-${look.tone}-soft-border)`,
              }
            : {
                background: `var(--status-${look.tone}-bg)`,
                color: `var(--status-${look.tone}-fg)`,
                border: `1.5px solid var(--status-${look.tone}-bg)`,
              }
      }
    >
      {look.spin ? (
        <span
          aria-hidden
          className="absolute -inset-[1.5px] rounded-full motion-safe:animate-spin"
          style={{
            border: `1.5px solid var(--status-${look.tone}-bg)`,
            borderTopColor: 'transparent',
          }}
        />
      ) : null}
      {look.shape === 'dashed' ? '' : look.glyph}
    </span>
  )
}

/**
 * One step: its status, its name (a feature by its chip alone), what it came
 * to in a line, its time and cost, and a chevron when it produced something to
 * preview. A skipped or not-needed step is grey with no chips and no chevron.
 * The step a run is parked on (other than its sign-off) carries its decision
 * inline; a feature the run is on opens its stages by itself.
 */
function PipelineNode({
  run,
  state,
  now,
  addedTag,
  onChoose,
  onDelegate,
  onAskAgent,
  onOpenChat,
  onDrill,
  onOpenPanel,
  onOpenTranscript,
}: {
  run: ProcessRun
  state: ReturnType<typeof processStepStates>[number]
  now: number
  addedTag: string | undefined
  onChoose: (
    choice: ProcessResumeChoice,
    note?: string,
    integration?: ProcessIntegrationDecision,
    requestedProof?: readonly ProofKind[],
  ) => Promise<boolean>
  onDelegate: () => Promise<void>
  /** Ask an agent about the step the run stopped at, in the run's own chat. */
  onAskAgent?: () => Promise<void>
  onOpenChat?: (context: ChatContext) => void
  onDrill: (childRunId: string) => void
  onOpenPanel: (target: StepPanelTarget) => void
  onOpenTranscript?: (ref: ProcessNodeRunRef) => void
}) {
  const { resolveDependency } = useStories()
  const parkStepId = run.park?.stepId
  const parked = parkStepId === state.step.id
  const nodeState = processNodeState(state, parkStepId)
  const look = processNodeLook(nodeState, state.step.kind === 'gate', 0)
  const row = processStepRowView(state, parkStepId, run)
  const isFeature = state.step.kind === 'process'
  const [open, setOpen] = useState(isFeature && (state.current || parked))
  const iteration = processNodeBadge(state, run)
  const workMs = processStepWorkMs(run, state, now)
  const duration = workMs !== undefined && workMs > 0 ? formatProcessDuration(workMs) : undefined
  const cost = processStepCostLabel(run, state.step.id)
  const stepModel = processStepModelChip(state.latest, run)
  const featureRef =
    isFeature && run.storyId && state.step.subject?.kind === 'feature'
      ? `${run.storyId}.${state.step.subject.id}`
      : undefined
  const resolves = featureRef ? !('code' in resolveDependency(featureRef)) : false
  const signoffGate = parked && isStorySignoff(run) && !isReflectedPark(run.park!)

  return (
    <li
      className={`border-b border-(--border-subtle) last:border-b-0 ${row.waitingOnYou && signoffGate ? 'bg-(--accent-primary)/5' : ''}`}
    >
      <div
        className={`grid grid-cols-[22px_minmax(0,auto)_minmax(0,1fr)_auto_28px] items-center gap-3 px-4 py-2.5 sm:px-5 ${row.inert ? 'text-(--text-muted)' : ''}`}
      >
        <Marker look={look} />
        <span className="flex min-w-0 items-center gap-1.5">
          {featureRef && resolves ? (
            <DependencyBullet dependency={featureRef} interactive />
          ) : (
            <span
              className={`truncate text-[13.5px] ${row.inert ? '' : 'font-semibold text-(--text-primary)'}`}
            >
              {state.step.name}
            </span>
          )}
          {addedTag ? (
            <span className="inline-flex shrink-0 items-center rounded-full border border-dashed border-(--border-strong) px-2 py-px text-[10.5px] text-(--text-secondary)">
              {addedTag}
            </span>
          ) : null}
          {iteration && !row.inert ? (
            <span
              className="inline-flex shrink-0 items-center rounded-full px-2 py-px text-[10.5px] font-semibold tabular-nums"
              style={{
                background: `var(--status-${look.tone}-soft-bg)`,
                color: `var(--status-${look.tone}-soft-fg)`,
                border: `1px solid var(--status-${look.tone}-soft-border)`,
              }}
            >
              {iteration}
            </span>
          ) : null}
        </span>
        <span
          className={`min-w-0 truncate text-[12.5px] ${row.waitingOnYou ? 'font-semibold text-(--accent-primary)' : row.inert ? '' : 'text-(--text-secondary)'}`}
          title={state.latest?.summary}
        >
          {row.result ?? ''}
        </span>
        <span className="flex items-center gap-1.5">
          {!row.inert && stepModel ? <RunModelChip model={stepModel} /> : null}
          {!row.inert && duration ? (
            <DurationChip
              label={duration}
              details={processTimeDetailsView(run.totals?.steps[state.step.id]?.time, workMs ?? 0)}
              title={processStepCostTitle(state.step.name, state.entries.length)}
            />
          ) : null}
          {!row.inert && cost ? (
            <CostChip
              label={cost}
              cost={run.totals?.steps[state.step.id]}
              title={processStepCostTitle(state.step.name, state.entries.length)}
            />
          ) : null}
        </span>
        {row.expandable ? (
          <button
            type="button"
            aria-label={open ? `Hide ${state.step.name}` : `Preview ${state.step.name}`}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="inline-flex size-7 items-center justify-center rounded-md text-(--text-secondary) hover:bg-(--surface-hover)"
          >
            <IconChevronRight
              className={`size-3.5 transition-transform ${open ? 'rotate-90' : ''}`}
            />
          </button>
        ) : (
          <span />
        )}
      </div>

      {open && row.expandable ? (
        <div className="px-4 pb-3.5 sm:pl-[58px] sm:pr-5">
          <StepPreview
            run={run}
            state={state}
            kind={row.preview}
            onOpen={onOpenPanel}
            onDrill={onDrill}
          />
        </div>
      ) : null}

      {parked && !signoffGate ? (
        <div className="px-4 pb-3.5 sm:pl-[58px] sm:pr-5">
          <ParkBlock
            run={run}
            onChoose={onChoose}
            onDelegate={onDelegate}
            {...(onAskAgent ? { onAskAgent } : {})}
            {...(onOpenChat ? { onOpenChat } : {})}
            onDrill={onDrill}
            {...(onOpenTranscript ? { onOpenTranscript } : {})}
          />
        </div>
      ) : null}
    </li>
  )
}

/**
 * The decision a parked node carries — named choices, inline on the node, never
 * a spinner and a hope. A reflected park is a statement, not a question: its
 * decision belongs to the nested run, so it offers the way there instead. An
 * agent waiting on the person gets its own card: what it needs, in its words.
 */
function ParkBlock({
  run,
  onChoose,
  onDelegate,
  onAskAgent,
  onOpenChat,
  onOpenTranscript,
  onDrill,
}: {
  run: ProcessRun
  onChoose: (
    choice: ProcessResumeChoice,
    note?: string,
    integration?: ProcessIntegrationDecision,
    requestedProof?: readonly ProofKind[],
    retry?: ProcessRetryPick,
  ) => void
  onDelegate: () => Promise<void>
  onAskAgent?: () => Promise<void>
  onOpenChat?: (context: ChatContext) => void
  /** Open the agent run that is waiting, to read its transcript. */
  onOpenTranscript?: (ref: ProcessNodeRunRef) => void
  onDrill: (childRunId: string) => void
}) {
  const [noteFor, setNoteFor] = useState<ProcessResumeChoice | undefined>()
  const [asking, setAsking] = useState(false)
  const retryChoice = processRetryChoiceOf(run.park ? processRunParkChoices(run) : [])
  const [retryPick, setRetryPick] = useState<ProcessRetryPick | undefined>()
  const parkedAt = run.park?.parkedAt
  useEffect(() => setRetryPick(undefined), [parkedAt])
  const park = run.park
  if (!park) return null
  const waiting = processWaitingView(run)
  if (waiting) {
    return (
      <WaitingCard
        view={waiting}
        onChoose={onChoose}
        onDelegate={onDelegate}
        {...(onOpenChat ? { onOpenChat } : {})}
        {...(onOpenTranscript ? { onOpenTranscript } : {})}
      />
    )
  }
  const reflected = isReflectedPark(park)
  const choices = processRunParkChoices(run)
  const tone = park.reason === 'gate' ? 'review' : 'on_hold'

  return (
    <div
      className="mt-2 flex flex-col gap-2 rounded-lg p-3"
      style={{
        background: `var(--status-${tone}-soft-bg)`,
        border: `1px solid var(--status-${tone}-soft-border)`,
      }}
    >
      <div className="text-[13px] font-semibold" style={{ color: `var(--status-${tone}-soft-fg)` }}>
        {park.message}
      </div>
      {reflected && park.childRunId ? (
        <button
          type="button"
          className="self-start text-[11px] underline text-(--text-secondary)"
          onClick={() => onDrill(park.childRunId as string)}
        >
          Open the nested run to decide →
        </button>
      ) : null}
      {noteFor ? (
        <ParkNoteComposer
          {...(noteFor === 'request-changes' ? { proofChoices: REQUEST_PROOF_CHOICES } : {})}
          onSend={(note, requestedProof) => onChoose(noteFor, note, undefined, requestedProof)}
          onCancel={() => setNoteFor(undefined)}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {retryChoice && !reflected ? (
            <RetryChoiceOptions
              {...(retryChoice.retry ? { retry: retryChoice.retry } : {})}
              {...(retryChoice.turnLimit
                ? {
                    turnLimitView: processRetryTurnLimitView(
                      run,
                      (retryPick ?? processRetryPickStart(retryChoice)).turnLimit ??
                        retryChoice.turnLimit.current,
                    ),
                  }
                : {})}
              pick={retryPick ?? processRetryPickStart(retryChoice)}
              onPick={setRetryPick}
            />
          ) : null}
          <div className="flex flex-wrap gap-3">
            {choices.filter(isResumeParkChoice).map((choice) => (
              <div key={choice.choice} className="flex flex-col gap-0.5">
                <Button
                  size="sm"
                  variant={choice.primary ? 'primary' : 'secondary'}
                  onClick={() =>
                    choiceTakesNote(choice.choice)
                      ? setNoteFor(choice.choice)
                      : choice.choice === 'retry' && retryChoice
                        ? onChoose(
                            'retry',
                            undefined,
                            undefined,
                            undefined,
                            retryPick ?? processRetryPickStart(retryChoice),
                          )
                        : onChoose(choice.choice)
                  }
                >
                  {choice.label}
                </Button>
                <span className="max-w-48 text-[10px] text-(--text-secondary)">
                  {choice.detail}
                </span>
              </div>
            ))}
            {onAskAgent && processParkAskableStepId(run) ? (
              <div className="flex flex-col gap-0.5">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={asking}
                  onClick={() => {
                    setAsking(true)
                    void onAskAgent().finally(() => setAsking(false))
                  }}
                >
                  {PROCESS_PARK_ASK_AGENT_COPY.label}
                </Button>
                <span className="max-w-48 text-[10px] text-(--text-secondary)">
                  {PROCESS_PARK_ASK_AGENT_COPY.detail}
                </span>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * How a finished run ended: a person's decision in their words — with the way to
 * send a request for changes back for them — or the error a run that broke left.
 */
function RunEnding({
  run,
  onSendBack,
  onRevive,
}: {
  run: ProcessRun
  onSendBack: () => Promise<void>
  onRevive: () => Promise<void>
}) {
  const ending = processRunPersonEnding(run)
  const line = ending?.line ?? run.error
  if (!line) return null
  return (
    <div className="flex flex-col items-start gap-2 px-4 pb-3">
      <div className="text-[11px] text-(--text-secondary)">{line}</div>
      {processRunSendBackGateId(run) ? (
        <RunEndingAction copy={PROCESS_SEND_BACK_COPY} onAct={onSendBack} />
      ) : null}
      {processRunRevivable(run) ? (
        <RunEndingAction copy={PROCESS_REVIVE_COPY} onAct={onRevive} />
      ) : null}
    </div>
  )
}

/** One thing a person can still do on a run that ended: its button, and one line on what it does. */
function RunEndingAction({
  copy,
  onAct,
}: {
  copy: { label: string; detail: string }
  onAct: () => Promise<void>
}) {
  const [acting, setActing] = useState(false)
  return (
    <div className="flex flex-col gap-0.5">
      <Button
        size="sm"
        variant="primary"
        disabled={acting}
        onClick={() => {
          setActing(true)
          void onAct().finally(() => setActing(false))
        }}
      >
        {copy.label}
      </Button>
      <span className="max-w-72 text-[10px] text-(--text-secondary)">{copy.detail}</span>
    </div>
  )
}

/**
 * An agent waiting on the person: what it needs, in its own words, exactly what
 * it asked for, its transcript one click away, and the answers it takes — each
 * with one line on what it does.
 */
function WaitingCard({
  view,
  onChoose,
  onDelegate,
  onOpenChat,
  onOpenTranscript,
}: {
  view: ProcessWaitingView
  onChoose: (choice: ProcessResumeChoice, note?: string) => void
  onDelegate: () => Promise<void>
  onOpenChat?: (context: ChatContext) => void
  onOpenTranscript?: (ref: ProcessNodeRunRef) => void
}) {
  const [noteFor, setNoteFor] = useState<ProcessResumeChoice | undefined>()
  const [delegating, setDelegating] = useState(false)
  const transcript = view.transcript
  const delegated = view.delegated
  const delegate = () => {
    setDelegating(true)
    void onDelegate().finally(() => setDelegating(false))
  }

  return (
    <div
      className="mt-2 flex flex-col gap-2.5 rounded-lg p-3"
      style={{
        background: 'var(--status-on_hold-soft-bg)',
        border: '1px solid var(--status-on_hold-soft-border)',
      }}
    >
      <div className="flex flex-col gap-0.5">
        <div
          className="text-[13.5px] font-semibold"
          style={{ color: 'var(--status-on_hold-soft-fg)' }}
        >
          {view.heading}
        </div>
        <div className="text-[12px] text-(--text-secondary)">{view.title}</div>
      </div>
      <blockquote className="m-0 whitespace-pre-wrap rounded-md border-l-2 border-(--border-strong) bg-(--surface-base) px-2.5 py-1.5 text-[12.5px] leading-relaxed text-(--text-primary)">
        {view.words}
      </blockquote>
      {view.details.length > 0 ? (
        <dl className="m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 text-[11.5px]">
          {view.details.map((d) => (
            <div key={d.label} className="contents">
              <dt className="text-(--text-muted)">{d.label}</dt>
              <dd className="m-0 truncate font-mono text-(--text-primary)" title={d.value}>
                {d.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {transcript && onOpenTranscript ? (
          <button
            type="button"
            className="text-[11px] underline text-(--text-secondary)"
            onClick={() => onOpenTranscript(transcript)}
          >
            {view.transcriptLabel}
          </button>
        ) : null}
        {delegated ? (
          onOpenChat ? (
            <button
              type="button"
              className="text-[11px] font-medium underline text-(--text-primary)"
              onClick={() => onOpenChat(delegated.chatContext)}
            >
              {delegated.label} →
            </button>
          ) : (
            <span className="text-[11px] text-(--text-secondary)">{delegated.label}</span>
          )
        ) : null}
      </div>
      {noteFor ? (
        <ParkNoteComposer
          copy={waitingNoteCopy(view.kind)}
          required={parkNoteRequired(noteFor)}
          onSend={(note) => onChoose(noteFor, note)}
          onCancel={() => setNoteFor(undefined)}
        />
      ) : (
        <div className="flex flex-wrap gap-3">
          {view.choices.map((choice) => (
            <div key={choice.choice} className="flex flex-col gap-0.5">
              <Button
                size="sm"
                variant={choice.primary ? 'primary' : 'secondary'}
                disabled={choice.choice === 'delegate' && delegating}
                onClick={() => {
                  if (!isResumeParkChoice(choice)) return delegate()
                  if (choiceTakesNote(choice.choice)) return setNoteFor(choice.choice)
                  onChoose(choice.choice)
                }}
              >
                {choice.label}
              </Button>
              <span className="max-w-48 text-[10px] text-(--text-secondary)">{choice.detail}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
