import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { chatNotifyLevel } from '../../../headless/utils/chatNotify'
import {
  AccessibilityInfo,
  Animated,
  BackHandler,
  Easing,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from 'react-native'

import {
  choiceTakesNote,
  processParkCirclingView,
  processStepCirclingView,
  computeChatRowStatus,
  parkNoteCopy,
  RunChatDraftProvider,
  RunNeedsYouProvider,
  runNeedsYouDiscussDraft,
  runNeedsYouTriageBrief,
  useChats,
  usePendingAsksByChat,
  useProcessRunAlreadyLanded,
  type ProcessAlreadyMergedAction,
  type ChatsSeenMap,
  type RunNeedsYouActions,
  type RunNeedsYouFocus,
  type RunModelChipSlot,
  type RunModelChipView,
  useRunModelChip,
  fileNameSlug,
  useDurationTimer,
  formatProcessDuration,
  isIntegratingApproval,
  isReflectedPark,
  PROCESS_PARK_ASK_AGENT_COPY,
  processParkAskableStepId,
  isResumeParkChoice,
  requestProofChoices,
  parkNoteRequired,
  processAmendmentView,
  processNodeBadge,
  processNodeLook,
  processNodeState,
  type ProcessNodeLook,
  processRetryChoiceOf,
  processRetryPickStart,
  processRetryTurnLimitView,
  processDroppedChangeRows,
  processRunParkChoices,
  processRunIntegrationModes,
  processRunBadge,
  processRunChatContext,
  processRunModelChipView,
  processRunManagerLine,
  processBaseMovedView,
  processRunManagerView,
  processRunStopHolderOf,
  PROCESS_LIVE_TONE,
  PROCESS_NESTED_RUN_OPEN,
  processRunPersonEnding,
  processRunRevivable,
  processRunSendBackGateId,
  PROCESS_REVIVE_COPY,
  PROCESS_STOP_CONFIRM_COPY,
  PROCESS_SEND_BACK_COPY,
  processRunSpend,
  processRunWorkMs,
  processStepCostLabel,
  processStepCostTitle,
  processStepModelChip,
  processStepRowView,
  processStepWorkMs,
  processTimeDetailsView,
  processStepStates,
  processRunStripEntries,
  runStepsLine,
  STEPS_STRIP_LABELS,
  processWaitingView,
  signoffMergeHold,
  SIGNOFF_GROUP_CHIP_LABEL,
  SIGNOFF_GROUP_CHIP_TITLE,
  useAppSettings,
  useProcessGroupRun,
  useProcessRun,
  useProcessRunChat,
  useProcessStopClock,
  useProjects,
  useStories,
  waitingNoteCopy,
  answerTakesFiles,
  type ProcessIntegrationDecision,
  type ProofChangeDraft,
  type ProofKind,
  type ProcessNodeRunRef,
  type ProcessResumeChoice,
  type ProcessRetryOffer,
  type ProcessRetryPick,
  type ProcessRun,
  type ProcessRunManagerView,
  type ProcessManagerEscalationView,
  type ParkAnswerView,
  PARK_ANSWERS_COPY,
  parkOwnAnswerChoice,
  processParkAnswersView,
  useProcessCleanup,
  type ProcessRunStopHolder,
  type ProcessTurnLimit,
  type ProcessWaitingDetail,
  type ProcessWaitingItemChoice,
  type ProcessWaitingRequestView,
  type ProcessWaitingView,
  isProcessRunAtSignOff,
  processWaitingTitleLine,
} from '../../../headless'
import type { ChatContext } from '../../../headless/api'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import type { ProcessRunBranch } from '../../../headless'
import Alert from '../../primitives/Alert'
import ActionMenu, { type ActionMenuItem } from '../ActionMenu'
import RichText from '../files/RichText'
import AlreadyMergedOffer from './AlreadyMergedOffer'
import CloseUnmergedConfirm from './CloseUnmergedConfirm'
import WorkBranchChangesNote from './WorkBranchChangesNote'
import DroppedChangesNote from './DroppedChangesNote'
import RunPendingChanges from './RunPendingChanges'
import IntegrationResult from './IntegrationResult'
import { CirclingChip, CirclingNotice } from './CirclingNotice'
import ParkNoteComposer from './ParkNoteComposer'
import type { NativeAnswerFiles, PickedAnswerFile } from './answerFilesNativeTypes'
import ProofChangeComposer from './ProofChangeComposer'
import RetryChoiceOptions from './RetryChoiceOptions'
import ParkAnswers from './ParkAnswers'
import RunDetails from './RunDetails'
import RunManagerBar from './RunManagerBar'
import RunStepsCard from './RunStepsCard'
import RunNeedsYouCard, { ManagerLine } from './RunNeedsYouCard'
import RunClosurePanel from './RunClosurePanel'
import RunTurnLimitChip from './RunTurnLimitChip'
import RunModelControl from './RunModelControl'
import { RunManagerChip } from './RunManagerChip'
import RunChatButton, { type RunChatButtonProps } from './RunChatButton'
import RunDiagnosticsView from './RunDiagnosticsView'
import StorySignoffReview from './StorySignoffReview'
import StepPreview from './pipeline/StepPreview'
import StepScreen, { type StepPanelTarget } from './pipeline/StepScreen'
import { RunModelChip, type SaveFileHandler } from '../chat/signoff'
import CostChip from '../chips/CostChip'
import ToneBadge from '../chips/ToneBadge'
import ChatKindTile from '../chat/ChatKindTile'
import StepsStrip from './StepsStrip'
import DurationChip from '../chips/DurationChip'
import DependencyRef from '../stories/DependencyRef'
import { Button } from '../../primitives/Button'
import { Modal } from '../../primitives/Modal'
import { IconChevronLeft, IconChevronRight, IconDotsVertical, IconGroup } from '../../icons'
import { getChatContextKey } from 'thefactory-tools/utils'
import { useNativeTheme } from '../../hooks/useNativeTheme'

export type ProcessPipelineProps = {
  /** The top-level run. Drilling into a nested node stays inside this component. */
  runId: string
  /** Open the agent-run chat a step owns as a full page — the step screen's ↗. */
  onOpenAgentRun?: (ref: ProcessNodeRunRef) => void
  /**
   * Render a step's agent-run chat on its pushed step screen; `onBack` returns
   * to the pipeline.
   */
  renderAgentRun?: (ref: ProcessNodeRunRef, onBack: () => void) => ReactNode
  /** Native host's file saver; enables the sign-off's downloads when provided. */
  onSaveFile?: SaveFileHandler
  /**
   * Open a chat by its context — where a waiting agent's ask went when the
   * person handed it to another agent. The host owns chat navigation.
   */
  onOpenChat?: (context: ChatContext) => void
  /** Open the group run a project's run is a leg of. */
  onOpenGroupRun?: (groupRunId: string) => void
  /**
   * Push the run's own chat — native's form of web's docked run chat. Its draft is
   * already set when a "Needs you" item is being discussed.
   */
  onOpenRunChat?: (context: ChatContext) => void
  /** The host's map of when each chat was last seen — the run chat's unread dot. */
  chatsSeen?: ChatsSeenMap
  /**
   * Whether this pipeline's screen is the one on top. The system back button is
   * only claimed while it is — a chat pushed over the pipeline must get its own
   * first back press. Defaults to true for a host with no navigation stack.
   */
  isFocused?: boolean
  /**
   * Render the host's chooser chip for the run's model — the API or a CLI, its
   * model and login — from the slot the run hands it. Without it the run's
   * model is shown read-only.
   */
  renderModelChip?: (slot: RunModelChipSlot) => ReactNode
  /**
   * The app's file picker, for files a person hands a waiting agent with an
   * answer from this device. Without it only project files can be handed over.
   */
  pickAnswerFiles?: () => Promise<PickedAnswerFile[]>
  /**
   * The "Needs you" item a link opened the run on — the host's `?needsYou=` —
   * shown on the report and lit at its sign-off.
   */
  focusNeedsYouItemId?: string
}

/** The run sits at its story's sign-off — the screen leads with the decision. */
const isStorySignoff = (run: ProcessRun): boolean => isProcessRunAtSignOff(run)

/**
 * Native peer of
 * [web's `ProcessPipeline`](../../../web/compound/process/ProcessPipeline.tsx).
 * At a story's sign-off the decision leads; each step is one line with a
 * chevron to a preview of its output, and a preview opens the full view on a
 * pushed step screen — native's form of web's side panel.
 */
export default function ProcessPipeline({
  runId,
  onOpenAgentRun,
  renderAgentRun,
  onSaveFile,
  onOpenChat,
  onOpenGroupRun,
  onOpenRunChat,
  chatsSeen,
  isFocused = true,
  renderModelChip,
  pickAnswerFiles,
  focusNeedsYouItemId,
}: ProcessPipelineProps) {
  const { theme, status } = useNativeTheme()
  const [stack, setStack] = useState<string[]>([])
  const [panel, setPanel] = useState<StepPanelTarget | null>(null)
  const [reportText, setReportText] = useState<string | undefined>()
  const [needsYouFocus, setNeedsYouFocus] = useState<RunNeedsYouFocus | undefined>()
  useEffect(() => {
    if (!focusNeedsYouItemId) return
    setNeedsYouFocus((prev) => ({ itemId: focusNeedsYouItemId, seq: (prev?.seq ?? 0) + 1 }))
  }, [focusNeedsYouItemId])
  const currentId = stack[stack.length - 1] ?? runId
  const own = useProcessRun(currentId)
  const {
    isLoaded,
    loadError,
    actionError: runActionError,
    run,
    resume,
    setTurnLimit,
    setManager,
    setModel,
    retryIntegration,
    resolveIntegrationConflict,
    sendBack,
    revive,
    cancel,
    listBranches,
    deleteRun,
    askAgent,
    resolveNeedsYou,
    startChanges,
    withdrawChange,
    uploadAnswerFile,
    loadAnswerProjectFiles,
  } = own
  const answerFiles = useMemo<NativeAnswerFiles>(
    () => ({
      upload: uploadAnswerFile,
      loadProjectFiles: loadAnswerProjectFiles,
      ...(pickAnswerFiles ? { pickDeviceFiles: pickAnswerFiles } : {}),
    }),
    [uploadAnswerFile, loadAnswerProjectFiles, pickAnswerFiles],
  )
  const nestedStopId = run?.park && isReflectedPark(run.park) ? run.park.childRunId : undefined
  const nested = useProcessRun(nestedStopId)
  const nestedAnswerFiles = useMemo<NativeAnswerFiles>(
    () => ({
      upload: nested.uploadAnswerFile,
      loadProjectFiles: nested.loadAnswerProjectFiles,
      ...(pickAnswerFiles ? { pickDeviceFiles: pickAnswerFiles } : {}),
    }),
    [nested.uploadAnswerFile, nested.loadAnswerProjectFiles, pickAnswerFiles],
  )
  const cleanup = useProcessCleanup(stack.length === 0 ? runId : undefined)
  const scrollRef = useRef<ScrollView>(null)
  const needsYouY = useRef(0)
  const modelChip = useRunModelChip(run, setModel)
  const { settings } = useAppSettings()
  const showDiagnostics = settings.userPreferences.showRunDiagnostics === true
  const { group } = useProcessGroupRun(run?.groupRunId)
  const integrationModes = run ? processRunIntegrationModes(run, group) : undefined
  const { projects } = useProjects()
  const { getChat, setDraft, sendMessage } = useChats()
  const { run: drilledRoot } = useProcessRun(stack.length > 0 ? runId : undefined)
  const runChat = useProcessRunChat(stack.length > 0 ? drilledRoot : run)
  const runChatContext = runChat.context
  const runChatKey = runChatContext ? getChatContextKey(runChatContext) : undefined
  const pendingAsksByChat = usePendingAsksByChat()
  const runChatUnread =
    !!chatsSeen &&
    !!runChatContext &&
    !!runChatKey &&
    computeChatRowStatus({
      context: runChatContext,
      contextKey: runChatKey,
      chat: getChat(runChatContext),
      isSending: false,
      seen: chatsSeen,
      pendingAsks: pendingAsksByChat.get(runChatKey) ?? 0,
      level: chatNotifyLevel(
        getChat(runChatContext) ?? { context: runChatContext },
        settings.notifications.chatNotifyLevels,
      ),
    }).isUnread
  const canChat = runChatContext !== undefined && !!onOpenRunChat
  const atTop = stack.length === 0 && !run?.parentRunId
  const actionError = runActionError ?? runChat.error
  const openTreeChat = runChat.open
  const openRunChat = useCallback(
    async (draft?: string) => {
      const opened = await openTreeChat()
      if (!opened) return
      if (draft) setDraft(opened.context, draft)
      onOpenRunChat?.(opened.context)
    },
    [openTreeChat, setDraft, onOpenRunChat],
  )
  const sendToRunChat = useCallback(
    async (text: string) => {
      const opened = await openTreeChat()
      if (!opened) return
      onOpenRunChat?.(opened.context)
      void sendMessage(opened.context, text).catch(() => {})
    },
    [openTreeChat, onOpenRunChat, sendMessage],
  )
  const askAgentAboutStep = useCallback(async () => {
    const opened = await askAgent()
    if (opened) onOpenRunChat?.(opened.context)
  }, [askAgent, onOpenRunChat])

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmStop, setConfirmStop] = useState(false)
  const [branches, setBranches] = useState<ProcessRunBranch[]>([])
  const [alsoBranches, setAlsoBranches] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleted, setDeleted] = useState(false)

  const now = useDurationTimer(run?.totals?.ticking === true)
  const stopNow = useProcessStopClock()
  const parkAlreadyLanded = useProcessRunAlreadyLanded(run, 'stop')

  const drillTo = useCallback((childId: string) => {
    setPanel(null)
    setStack((s) => [...s, childId])
  }, [])
  const popTo = useCallback((depth: number) => {
    setPanel(null)
    setStack((s) => s.slice(0, depth))
  }, [])

  useEffect(() => {
    if (!isFocused || (!panel && stack.length === 0)) return
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (panel) setPanel(null)
      else setStack((s) => s.slice(0, -1))
      return true
    })
    return () => sub.remove()
  }, [isFocused, panel, stack.length])

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
      <View style={{ padding: nativeSpace[5] }}>
        <Alert variant="info">This process run and everything it produced were deleted.</Alert>
      </View>
    )
  }
  if (loadError) return <Alert variant="error">{loadError.message}</Alert>
  if (!isLoaded) {
    return (
      <View style={{ padding: nativeSpace[5] }}>
        <Text style={{ fontSize: 13, color: theme.text.secondary }}>Loading…</Text>
      </View>
    )
  }
  if (!run) return <Alert variant="error">This run no longer exists.</Alert>

  const openDraft = canChat ? (draft: string) => void openRunChat(draft) : undefined
  const chatButton: RunChatButtonProps | undefined = canChat
    ? { onOpen: () => void openRunChat(), unread: runChatUnread }
    : undefined
  if (panel) {
    return (
      <RunChatDraftScope open={openDraft}>
        <StepScreen
          target={panel}
          onBack={() => setPanel(null)}
          {...(renderAgentRun ? { renderAgentRun } : {})}
          {...(onOpenAgentRun ? { onOpenAgentRun } : {})}
          {...(onSaveFile ? { onSaveFile } : {})}
          {...(chatButton ? { chat: chatButton } : {})}
        />
      </RunChatDraftScope>
    )
  }

  const needsYouActions: RunNeedsYouActions | undefined =
    canChat && atTop
      ? {
          resolutions: run.needsYouResolutions,
          onDiscuss: (card) => void openRunChat(runNeedsYouDiscussDraft(card.text)),
          onResolve: (card) => void resolveNeedsYou(card.id),
          onTriage: (cards) => void sendToRunChat(runNeedsYouTriageBrief(cards, run.id)),
          ...(needsYouFocus ? { focus: needsYouFocus } : {}),
        }
      : undefined
  const states = processStepStates(run)
  const projectName = projects.find((p) => p.id === run.projectId)?.title
  const amendments = processAmendmentView(run)
  const managerView = stack.length === 0 ? processRunManagerView(run, now) : undefined
  const stopRoot = stack.length > 0 ? drilledRoot : run
  const stopHolder = processRunStopHolderOf(run, stopRoot, stopNow)
  const managerLine =
    stopHolder === 'manager' && stopRoot ? processRunManagerLine(stopRoot, stopNow) : undefined
  const signoff = isStorySignoff(run)
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
    files?: readonly string[],
  ) => resume(choice, note, integration, requestedProof, retry, files)
  const alreadyMerged: ProcessAlreadyMergedAction | undefined = parkAlreadyLanded.offer
    ? {
        offer: parkAlreadyLanded.offer,
        busy: parkAlreadyLanded.busy,
        error: parkAlreadyLanded.actionError,
        onSettle: () => void parkAlreadyLanded.settle(),
      }
    : undefined

  const stopRun = nested.run ?? run
  const stopActions = nested.run ? nested : own
  const escalation = managerView?.escalation
  const stopManager =
    escalation && (escalation.runId === stopRun.id || escalation.runId === run.id)
      ? escalation
      : undefined
  const stopPark = stopRun.park
  const stopState = stopPark
    ? processStepStates(stopRun).find((st) => st.step.id === stopPark.stepId)
    : undefined
  const stopStepName = stopState?.step.name
  const featureStep = nested.run
    ? states.find((st) => st.step.id === run.park?.stepId)?.step
    : undefined
  const stopFeatureRef =
    featureStep?.subject?.kind === 'feature' && run.storyId
      ? `${run.storyId}.${featureStep.subject.id}`
      : undefined
  const stopTone = stopPark?.reason === 'gate' ? 'review' : 'on_hold'
  const showStopCard =
    run.status === 'parked' &&
    !signoff &&
    stopHolder !== 'manager' &&
    !!stopPark &&
    (!nestedStopId || !!nested.run)
  const managerStatus =
    stopHolder === 'manager' && managerView?.status && managerView.status.state !== 'escalated'
      ? managerView.status
      : undefined
  const stripEntries = processRunStripEntries(run, stopHolder)
  const chooseAtTop = () => scrollRef.current?.scrollTo({ y: needsYouY.current, animated: true })
  const flush = { marginHorizontal: 0, marginTop: 0 }
  const stepsCard = (style?: typeof flush) => (
    <RunStepsCard
      line={runStepsLine(stripEntries)}
      total={stripEntries.length}
      defaultOpen={stack.length > 0 || run.status === 'running'}
      {...(style ? { style } : {})}
    >
      {states.map((state, index) => (
        <PipelineNode
          key={state.step.id}
          run={run}
          state={state}
          isLast={index === states.length - 1}
          now={now}
          stopHolder={stopHolder}
          managerLine={managerLine}
          addedTag={amendments.addedSteps[state.step.id]}
          onDrill={drillTo}
          onOpenPanel={setPanel}
          onChooseAtTop={chooseAtTop}
        />
      ))}
    </RunStepsCard>
  )
  const baseView = signoff ? undefined : processBaseMovedView(run)
  const runDetails = (style?: typeof flush) => (
    <RunDetails
      {...(managerView?.preRead ? { preRead: managerView.preRead } : {})}
      workAdded={amendments.notes}
      {...(stack.length === 0 ? { cleanup } : {})}
      {...(baseView ? { base: baseView } : {})}
      onChooseBase={(choice) => void resume(choice)}
      {...(style ? { style } : {})}
    />
  )

  return (
    <RunChatDraftScope open={openDraft}>
      <ScrollView ref={scrollRef} contentContainerStyle={{ paddingBottom: nativeSpace[5] }}>
        <RunHead
          run={run}
          stopHolder={stopHolder}
          {...(projectName ? { projectName } : {})}
          depth={stack.length}
          now={now}
          onCrumb={popTo}
          onCancel={() => setConfirmStop(true)}
          onDelete={openDelete}
          onSetTurnLimit={setTurnLimit}
          {...(modelChip
            ? {
                model: {
                  view: modelChip.view,
                  ...(renderModelChip && modelChip.view.editable
                    ? {
                        chip: renderModelChip({
                          ...modelChip.slot,
                          chatContext: processRunChatContext(run),
                          note: modelChip.view.note,
                        }),
                      }
                    : {}),
                },
              }
            : {})}
          {...(managerView ? { manager: { view: managerView, onSwitch: setManager } } : {})}
          {...(signoff && reportText && onSaveFile
            ? {
                onDownloadReport: () =>
                  void onSaveFile({
                    name: `${fileNameSlug(run.title, 'report')}.md`,
                    dataUri: `data:text/markdown;charset=utf-8,${encodeURIComponent(reportText)}`,
                  }),
              }
            : {})}
          {...(run.groupRunId && onOpenGroupRun
            ? { onOpenGroup: () => onOpenGroupRun(run.groupRunId!) }
            : {})}
          {...(chatButton ? { chat: chatButton } : {})}
        />
        {actionError && !signoff ? (
          <View
            accessibilityRole="alert"
            style={{
              marginHorizontal: nativeSpace[3],
              marginTop: nativeSpace[3],
              paddingHorizontal: nativeSpace[2],
              paddingVertical: nativeSpace[2],
              borderRadius: nativeRadii[2],
              borderWidth: 1,
              backgroundColor: status.stuck.softBg,
              borderColor: status.stuck.softBorder,
            }}
          >
            <Text style={{ fontSize: 12, color: status.stuck.softFg }}>{actionError}</Text>
          </View>
        ) : null}
        <WorkBranchChangesNote run={run} />
        <DroppedChangesNote run={run} />
        <View
          onLayout={(e) => {
            needsYouY.current = e.nativeEvent.layout.y
          }}
        >
          {showStopCard && stopRun.park ? (
            <RunNeedsYouCard
              where={
                <>
                  {stopFeatureRef ? (
                    <DependencyRef
                      dependency={stopFeatureRef}
                      projectId={run.projectId}
                      interactive
                    />
                  ) : null}
                  {stopStepName ? <ToneBadge tone={stopTone} label={stopStepName} /> : null}
                </>
              }
              tone={stopTone}
              {...(canChat ? { onAskManager: () => void openRunChat() } : {})}
            >
              <ParkBlock
                run={stopRun}
                root={run}
                managerLine={undefined}
                {...(stopManager ? { manager: stopManager } : {})}
                embedded
                answerFiles={nested.run ? nestedAnswerFiles : answerFiles}
                {...(alreadyMerged && !nested.run ? { alreadyMerged } : {})}
                onChoose={(choice, note, integration, requestedProof, retry, files) =>
                  void stopActions.resume(choice, note, integration, requestedProof, retry, files)
                }
                onChangeProof={(draft) => void stopActions.changeProof(draft)}
                onAnswerRequest={(actionId, choice) =>
                  void stopActions.answerWaitingRequest(actionId, choice)
                }
                onDelegate={(note) => stopActions.delegate(note).then(() => undefined)}
                {...(canChat && atTop && !nested.run ? { onAskAgent: askAgentAboutStep } : {})}
                {...(onOpenChat ? { onOpenChat } : {})}
                onDrill={drillTo}
                {...((renderAgentRun || onOpenAgentRun) && stopState
                  ? {
                      onOpenTranscript: (ref: ProcessNodeRunRef) => {
                        if (!renderAgentRun) return onOpenAgentRun?.(ref)
                        const entryId = stopState.entries.find(
                          (e) => e.runRef?.runId === ref.runId,
                        )?.id
                        setPanel({
                          runId: stopRun.id,
                          stepId: stopState.step.id,
                          ...(entryId ? { entryId } : {}),
                        })
                      },
                    }
                  : {})}
              />
            </RunNeedsYouCard>
          ) : managerStatus ? (
            <RunManagerBar
              status={managerStatus}
              {...(stopRun.park ? { headline: stopRun.park.message } : {})}
              {...(canChat ? { onOpenChat: () => void openRunChat() } : {})}
            />
          ) : null}
        </View>
        {signoff ? null : (
          <IntegrationResult
            run={run}
            {...(integrationModes ? { modes: integrationModes } : {})}
            onRetry={retryIntegration}
            onResolve={resolveIntegrationConflict}
            error={actionError}
          />
        )}
        {stack.length === 0 ? (
          <RunPendingChanges run={run} onStart={startChanges} onRemove={withdrawChange} />
        ) : null}
        {signoff ? (
          <View style={{ paddingHorizontal: nativeSpace[3], paddingTop: nativeSpace[3] }}>
            <NeedsYouScope value={needsYouActions}>
              <StorySignoffReview
                projectId={run.projectId}
                storyId={run.storyId as string}
                storyRunId={run.id}
                choices={processRunParkChoices(run)}
                {...(stopManager ? { manager: stopManager } : {})}
                {...(canChat ? { onAskManager: () => void openRunChat() } : {})}
                integration={
                  <IntegrationResult
                    run={run}
                    embedded
                    {...(integrationModes ? { modes: integrationModes } : {})}
                    onRetry={retryIntegration}
                    onResolve={resolveIntegrationConflict}
                  />
                }
                steps={stepsCard(flush)}
                details={runDetails(flush)}
                droppedAccepted={processDroppedChangeRows(run)}
                {...(run.proofUnavailable ? { proofUnavailable: run.proofUnavailable } : {})}
                {...(run.changeUiPaths ? { changeUiPaths: run.changeUiPaths } : {})}
                {...(run.changeScreensDecision
                  ? { changeScreensDecision: run.changeScreensDecision }
                  : {})}
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
                {...(onSaveFile ? { onSaveFile } : {})}
              />
            </NeedsYouScope>
          </View>
        ) : (
          <>
            {stepsCard()}
            {runDetails()}
          </>
        )}

        <RunDiagnosticsView runId={currentId} enabled={showDiagnostics} />

        <RunEnding run={run} onSendBack={sendBack} onRevive={revive} />
        {stack.length === 0 ? <RunClosurePanel run={run} /> : null}

        {confirmStop ? (
          <Modal
            isOpen
            onClose={() => setConfirmStop(false)}
            title={PROCESS_STOP_CONFIRM_COPY.title}
          >
            <View style={{ gap: nativeSpace[3] }}>
              <Text style={{ fontSize: 13, color: theme.text.secondary }}>
                {PROCESS_STOP_CONFIRM_COPY.body}
              </Text>
              <View
                style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: nativeSpace[2] }}
              >
                <Button size="sm" variant="ghost" onPress={() => setConfirmStop(false)}>
                  {PROCESS_STOP_CONFIRM_COPY.cancel}
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onPress={() => {
                    setConfirmStop(false)
                    void cancel()
                  }}
                >
                  {PROCESS_STOP_CONFIRM_COPY.confirm}
                </Button>
              </View>
            </View>
          </Modal>
        ) : null}

        {confirmDelete ? (
          <Modal isOpen onClose={() => setConfirmDelete(false)} title="Delete this process run?">
            <View style={{ gap: nativeSpace[3] }}>
              <Text style={{ fontSize: 13, color: theme.text.secondary }}>
                This removes the run and everything it produced — every step’s agent-run chat and
                its record. This cannot be undone.
              </Text>
              {shadowWork ? null : branches.length > 0 ? (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    gap: nativeSpace[2],
                    borderRadius: nativeRadii[2],
                    borderWidth: 1,
                    borderColor: theme.border.subtle,
                    backgroundColor: theme.surface.muted,
                    padding: nativeSpace[3],
                  }}
                >
                  <Switch value={alsoBranches} onValueChange={setAlsoBranches} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text.primary }}>
                      {`Also delete ${branches.length} git branch${branches.length === 1 ? '' : 'es'}`}
                    </Text>
                    {branches.map((b) => (
                      <Text
                        key={`${b.projectId}:${b.branch}`}
                        numberOfLines={1}
                        style={{ fontSize: 11, color: theme.text.muted }}
                      >
                        {b.branch}
                      </Text>
                    ))}
                  </View>
                </View>
              ) : (
                <Text style={{ fontSize: 12, color: theme.text.muted }}>
                  No review branches were found for this run.
                </Text>
              )}
              <View
                style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: nativeSpace[2] }}
              >
                <Button
                  size="sm"
                  variant="ghost"
                  onPress={() => setConfirmDelete(false)}
                  disabled={deleting}
                >
                  Cancel
                </Button>
                <Button size="sm" variant="danger" onPress={runDelete} disabled={deleting}>
                  {deleting ? 'Deleting…' : 'Delete run'}
                </Button>
              </View>
            </View>
          </Modal>
        ) : null}
      </ScrollView>
    </RunChatDraftScope>
  )
}

/** Anything inside the run — its sign-off, a step's screen — can open the run's chat with a draft. */
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

/** A square icon action in the run head. */
function HeadAction({
  label,
  onPress,
  children,
}: {
  label: string
  onPress: () => void
  children: ReactNode
}) {
  const { theme } = useNativeTheme()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => ({
        minWidth: 32,
        height: 32,
        paddingHorizontal: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        borderRadius: nativeRadii[2],
        borderWidth: 1,
        borderColor: theme.border.default,
        backgroundColor: pressed ? theme.surface.muted : theme.surface.raised,
      })}
    >
      {children}
    </Pressable>
  )
}

/**
 * The run head — the chat header's layout: the run tile, the run's title and
 * status, then its story, process and project with its time and spend; then
 * the manager, model and turn limit, the Group chip for a group's leg, the
 * run's chat, Stop while the run can still do work, and ⋯ for the rare ones. A
 * nested run leads with the breadcrumb back up; its chat button pushes the
 * whole run's chat, like the top run's. Under it, the steps strip.
 */
function RunHead({
  run,
  stopHolder,
  depth,
  now,
  projectName,
  onCrumb,
  onCancel,
  onDelete,
  onOpenGroup,
  onDownloadReport,
  onSetTurnLimit,
  model,
  manager,
  chat,
}: {
  run: ProcessRun
  /** Who has the stop the run waits at — its agent manager, or the person. */
  stopHolder: ProcessRunStopHolder | undefined
  depth: number
  now: number
  /** The run's project, named on the line under the title. */
  projectName?: string
  onCrumb: (depth: number) => void
  onCancel: () => void
  onDelete?: () => void
  onOpenGroup?: () => void
  onDownloadReport?: () => void
  /** Hold the run's step agents to a turn limit from their next step on. */
  onSetTurnLimit?: (limit: ProcessTurnLimit) => Promise<boolean>
  /** The run's model chip, and the host's chooser chip while it can change; read-only without it. */
  model?: { view: RunModelChipView; chip?: ReactNode }
  /** The run's agent manager: what it is, and the switch while the run is live. */
  manager?: { view: ProcessRunManagerView; onSwitch: (enabled: boolean) => Promise<boolean> }
  /** The whole run tree's chat: open it, and whether it has news. */
  chat?: RunChatButtonProps
}) {
  const { theme, status } = useNativeTheme()
  const [menuOpen, setMenuOpen] = useState(false)
  const badge = processRunBadge(run, now, stopHolder)
  const spend = processRunSpend(run)
  const workMs = processRunWorkMs(run, now)
  const modelView = model?.view ?? processRunModelChipView(run)
  const steps = useMemo(() => processRunStripEntries(run, stopHolder), [run, stopHolder])
  const stoppable = run.status === 'running' || run.status === 'pending' || run.status === 'parked'
  const actions: ActionMenuItem[] = [
    ...(onDownloadReport
      ? [
          {
            key: 'download-report',
            label: 'Download report',
            onPress: () => {
              setMenuOpen(false)
              onDownloadReport()
            },
          },
        ]
      : []),
    ...(depth === 0 && onDelete
      ? [
          {
            key: 'delete',
            label: 'Delete run…',
            destructive: true,
            onPress: () => {
              setMenuOpen(false)
              onDelete()
            },
          },
        ]
      : []),
  ]
  const where = [run.plan.name, projectName].filter(Boolean).join(' · ')
  return (
    <View style={{ backgroundColor: theme.surface.raised }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: nativeSpace[2],
          paddingHorizontal: nativeSpace[3],
          paddingVertical: nativeSpace[2],
          borderBottomWidth: 1,
          borderBottomColor: theme.border.subtle,
        }}
      >
        {depth > 0 ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Pressable
              onPress={() => onCrumb(0)}
              accessibilityRole="button"
              style={{ flexDirection: 'row', alignItems: 'center' }}
            >
              <IconChevronLeft size={14} color={theme.text.muted} />
              <Text style={{ fontSize: 12, color: theme.text.muted }}>Top</Text>
            </Pressable>
            {Array.from({ length: depth - 1 }).map((_, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ fontSize: 12, color: theme.border.strong }}>/</Text>
                <Pressable onPress={() => onCrumb(i + 1)} accessibilityRole="button">
                  <Text style={{ fontSize: 12, color: theme.text.muted }}>…</Text>
                </Pressable>
              </View>
            ))}
            <Text style={{ fontSize: 12, color: theme.border.strong }}>/</Text>
          </View>
        ) : null}
        <ChatKindTile kind="run" />
        <View style={{ flex: 1, minWidth: 180, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
            <Text
              numberOfLines={1}
              style={{ flexShrink: 1, fontSize: 15, fontWeight: '600', color: theme.text.primary }}
            >
              {run.title}
            </Text>
            <ToneBadge tone={badge.tone} label={badge.label} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
            {run.storyId ? (
              <DependencyRef dependency={run.storyId} projectId={run.projectId} interactive />
            ) : null}
            {where ? (
              <Text
                numberOfLines={1}
                style={{ flexShrink: 1, fontSize: 12, color: theme.text.secondary }}
              >
                {where}
              </Text>
            ) : null}
            {workMs !== undefined ? (
              <DurationChip
                label={formatProcessDuration(workMs)}
                details={processTimeDetailsView(run.totals?.time, workMs, run.totals?.manager)}
                title="Time spent working, across every attempt"
              />
            ) : null}
            {spend ? <CostChip label={spend.label} cost={run.totals} title={spend.title} /> : null}
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
          {manager && depth === 0 ? (
            <RunManagerChip
              view={manager.view}
              {...(stoppable ? { onSwitch: manager.onSwitch } : {})}
            />
          ) : null}
          <RunModelControl view={modelView} {...(model?.chip ? { chip: model.chip } : {})} />
          <RunTurnLimitChip
            run={run}
            {...(stoppable && onSetTurnLimit ? { onSet: onSetTurnLimit } : {})}
          />
          {onOpenGroup && depth === 0 ? (
            <HeadAction label={SIGNOFF_GROUP_CHIP_TITLE} onPress={onOpenGroup}>
              <IconGroup size={16} color={theme.text.secondary} />
              <Text style={{ fontSize: 12, color: theme.text.secondary }}>
                {SIGNOFF_GROUP_CHIP_LABEL}
              </Text>
            </HeadAction>
          ) : null}
          {chat ? <RunChatButton {...chat} /> : null}
          {stoppable ? (
            <HeadAction label="Stop the run" onPress={onCancel}>
              <View
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 2,
                  backgroundColor: status.stuck.bg,
                }}
              />
            </HeadAction>
          ) : null}
          {actions.length > 0 ? (
            <HeadAction label="More actions" onPress={() => setMenuOpen(true)}>
              <View style={{ transform: [{ rotate: '90deg' }] }}>
                <IconDotsVertical size={16} color={theme.text.secondary} />
              </View>
            </HeadAction>
          ) : null}
        </View>
        <ActionMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} actions={actions} />
      </View>
      <StepsStrip model={{ label: STEPS_STRIP_LABELS.steps, entries: steps }} />
    </View>
  )
}

/**
 * Native peer of the web Marker: a filled mark for a verdict, a dashed outline
 * for what has not run or was skipped, and — only for running work — a ring
 * that spins (held still when the device asks for reduced motion).
 */
function Marker({ look }: { look: ProcessNodeLook }) {
  const { status, theme } = useNativeTheme()
  const variant = status[look.tone]
  const box = 22
  const rotation = useRef(new Animated.Value(0)).current
  useEffect(() => {
    if (!look.spin) return
    let loop: Animated.CompositeAnimation | undefined
    let cancelled = false
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (cancelled || reduced) return
      loop = Animated.loop(
        Animated.timing(rotation, {
          toValue: 1,
          duration: 900,
          easing: Easing.linear,
          useNativeDriver: false,
        }),
      )
      loop.start()
    })
    return () => {
      cancelled = true
      loop?.stop()
      rotation.setValue(0)
    }
  }, [look.spin, rotation])
  const spin = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })
  return (
    <View
      style={{
        width: box,
        height: box,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: look.shape === 'solid' ? variant.bg : theme.surface.base,
        borderWidth: 1.5,
        borderColor:
          look.shape === 'dashed'
            ? theme.border.strong
            : look.shape === 'ring'
              ? variant.softBorder
              : variant.bg,
        borderStyle: look.shape === 'dashed' ? 'dashed' : 'solid',
      }}
    >
      {look.spin ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -1.5,
            left: -1.5,
            right: -1.5,
            bottom: -1.5,
            borderRadius: 999,
            borderWidth: 1.5,
            borderColor: variant.bg,
            borderTopColor: 'transparent',
            transform: [{ rotate: spin }],
          }}
        />
      ) : null}
      {look.shape !== 'dashed' && look.glyph ? (
        <Text
          style={{
            fontSize: 10,
            fontWeight: '700',
            color: look.shape === 'ring' ? variant.bg : variant.fg,
          }}
        >
          {look.glyph}
        </Text>
      ) : null}
    </View>
  )
}

/**
 * One step: status, name (a feature by its chip alone), one result line, time
 * and cost, and a chevron when it produced something — tapping it shows a
 * preview whose tap pushes the step screen. Skipped steps are grey and inert.
 */
function PipelineNode({
  run,
  state,
  isLast,
  now,
  stopHolder,
  managerLine,
  addedTag,
  onDrill,
  onOpenPanel,
  onChooseAtTop,
}: {
  run: ProcessRun
  state: ReturnType<typeof processStepStates>[number]
  isLast: boolean
  now: number
  /** Who has the stop the run waits at — its agent manager, or the person. */
  stopHolder: ProcessRunStopHolder | undefined
  /** What the manager is doing on the stop, while it has it. */
  managerLine: string | undefined
  addedTag: string | undefined
  onDrill: (childRunId: string) => void
  onOpenPanel: (target: StepPanelTarget) => void
  /** Bring the "Needs you" card at the top of the run into view. */
  onChooseAtTop: () => void
}) {
  const { theme, status } = useNativeTheme()
  const { resolveDependency } = useStories()
  const parkStepId = run.park?.stepId
  const parked = parkStepId === state.step.id
  const nodeState = processNodeState(state, parkStepId)
  const row = processStepRowView(state, parkStepId, run, stopHolder, now)
  const look = processNodeLook(
    row.managerOnIt ? 'working' : nodeState,
    state.step.kind === 'gate',
    0,
  )
  const isFeature = state.step.kind === 'process'
  const [open, setOpen] = useState(isFeature && (state.current || parked))
  const iteration = processNodeBadge(state, run)
  const chip = status[look.tone]
  const workMs = processStepWorkMs(run, state, now)
  const duration = workMs !== undefined && workMs > 0 ? formatProcessDuration(workMs) : undefined
  const cost = processStepCostLabel(run, state.step.id)
  const stepModel = processStepModelChip(state.latest, run)
  const featureRef =
    isFeature && run.storyId && state.step.subject?.kind === 'feature'
      ? `${run.storyId}.${state.step.subject.id}`
      : undefined
  const resolves = featureRef ? !('code' in resolveDependency(featureRef)) : false
  const signoffGate = parked && isStorySignoff(run)
  const circling = processStepCirclingView(run, state.step.id, state.latest)
  const parkedTone = status[managerLine ? PROCESS_LIVE_TONE : 'on_hold']

  return (
    <View
      style={{
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: theme.border.subtle,
        backgroundColor: row.waitingOnYou && signoffGate ? status.review.softBg : 'transparent',
      }}
    >
      <Pressable
        disabled={!row.expandable}
        onPress={() => setOpen((v) => !v)}
        accessibilityRole={row.expandable ? 'button' : undefined}
        accessibilityState={row.expandable ? { expanded: open } : undefined}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingHorizontal: 12,
          paddingVertical: 10,
        }}
      >
        <Marker look={look} />
        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
            {featureRef && resolves ? (
              <DependencyRef dependency={featureRef} projectId={run.projectId} />
            ) : (
              <Text
                style={{
                  fontSize: 13.5,
                  fontWeight: row.inert ? '400' : '600',
                  color: row.inert ? theme.text.muted : theme.text.primary,
                }}
              >
                {state.step.name}
              </Text>
            )}
            {addedTag ? (
              <View
                style={{
                  borderColor: theme.border.strong,
                  borderStyle: 'dashed',
                  borderWidth: 1,
                  borderRadius: 999,
                  paddingHorizontal: 6,
                  paddingVertical: 1,
                }}
              >
                <Text style={{ fontSize: 10.5, color: theme.text.secondary }}>{addedTag}</Text>
              </View>
            ) : null}
            {circling && !row.inert ? <CirclingChip view={circling} /> : null}
            {row.acceptedUnchecked ? (
              <ToneBadge tone={look.tone} label={row.acceptedUnchecked.label} />
            ) : null}
            {iteration && !row.inert ? (
              <View
                style={{
                  backgroundColor: chip.softBg,
                  borderColor: chip.softBorder,
                  borderWidth: 1,
                  borderRadius: 999,
                  paddingHorizontal: 6,
                  paddingVertical: 1,
                }}
              >
                <Text style={{ fontSize: 10.5, fontWeight: '600', color: chip.softFg }}>
                  {iteration}
                </Text>
              </View>
            ) : null}
          </View>
          {row.result ? (
            <Text
              numberOfLines={2}
              style={{
                fontSize: 12.5,
                fontWeight: row.waitingOnYou ? '600' : '400',
                color: row.waitingOnYou
                  ? theme.accent.primary
                  : row.inert
                    ? theme.text.muted
                    : theme.text.secondary,
              }}
            >
              {row.result}
            </Text>
          ) : null}
          {!row.inert && (duration || cost || stepModel) ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {stepModel ? <RunModelChip model={stepModel} /> : null}
              {duration ? (
                <DurationChip
                  label={duration}
                  details={processTimeDetailsView(
                    run.totals?.steps[state.step.id]?.time,
                    workMs ?? 0,
                  )}
                  title={processStepCostTitle(state.step.name, state.entries.length)}
                />
              ) : null}
              {cost ? (
                <CostChip
                  label={cost}
                  cost={run.totals?.steps[state.step.id]}
                  title={processStepCostTitle(state.step.name, state.entries.length)}
                />
              ) : null}
            </View>
          ) : null}
        </View>
        {row.expandable ? (
          <View style={{ transform: [{ rotate: open ? '90deg' : '0deg' }] }}>
            <IconChevronRight size={14} color={theme.text.secondary} />
          </View>
        ) : (
          <View style={{ width: 14 }} />
        )}
      </Pressable>

      {open && row.expandable ? (
        <View style={{ paddingHorizontal: 12, paddingBottom: 12, paddingLeft: 44 }}>
          <StepPreview
            run={run}
            state={state}
            stopHolder={stopHolder}
            kind={row.preview}
            onOpen={onOpenPanel}
            onDrill={onDrill}
          />
        </View>
      ) : null}

      {parked && !signoffGate ? (
        <View style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: nativeSpace[2],
              borderRadius: nativeRadii[3],
              borderWidth: 1,
              borderColor: parkedTone.softBorder,
              backgroundColor: parkedTone.softBg,
              paddingHorizontal: nativeSpace[3],
              paddingVertical: nativeSpace[2],
            }}
          >
            <Text style={{ flex: 1, minWidth: 200, fontSize: 12.5, color: parkedTone.softFg }}>
              {managerLine ?? PARK_ANSWERS_COPY.stoppedHere}
            </Text>
            {managerLine ? null : (
              <Pressable accessibilityRole="button" onPress={onChooseAtTop} hitSlop={6}>
                <Text style={{ fontSize: 12.5, fontWeight: '500', color: theme.accent.primary }}>
                  {PARK_ANSWERS_COPY.chooseAtTop}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      ) : null}
    </View>
  )
}

/**
 * The decision a parked node carries — named choices, never a spinner and a
 * hope. A reflected park is a statement, not a question: its decision belongs
 * to the nested run, so it offers the way there instead. An agent waiting on
 * the person gets its own card: what it needs, in its words.
 */
function ParkBlock({
  run,
  root,
  managerLine,
  manager,
  embedded = false,
  alreadyMerged,
  answerFiles,
  onChoose,
  onChangeProof,
  onAnswerRequest,
  onDelegate,
  onAskAgent,
  onOpenChat,
  onOpenTranscript,
  onDrill,
}: {
  run: ProcessRun
  /** The manager's card when it handed this stop over: its word on it and the answers it prepared. */
  manager?: ProcessManagerEscalationView
  /** Inside the "Needs you" card, which draws the frame. */
  embedded?: boolean
  /** The top-level run that keeps the agent manager's record — `run` itself when omitted. */
  root?: ProcessRun | undefined
  /** What the agent manager is doing on the stop, while it has it — said in place of what waits on the person. */
  managerLine: string | undefined
  /** Finishing the run as already merged, when its base already holds the work. */
  alreadyMerged?: ProcessAlreadyMergedAction
  /** Where files handed to a waiting agent with an answer come from. */
  answerFiles?: NativeAnswerFiles
  onChoose: (
    choice: ProcessResumeChoice,
    note?: string,
    integration?: ProcessIntegrationDecision,
    requestedProof?: readonly ProofKind[],
    retry?: ProcessRetryPick,
    files?: readonly string[],
  ) => void
  onChangeProof: (draft: ProofChangeDraft) => void
  onAnswerRequest: (actionId: string, choice: ProcessWaitingItemChoice) => void
  /** Hand a waiting agent's ask to another agent, with the brief it starts from. */
  onDelegate: (note?: string) => Promise<void>
  onAskAgent?: () => Promise<void>
  onOpenChat?: (context: ChatContext) => void
  /** Open the agent run that is waiting, to read its transcript. */
  onOpenTranscript?: (ref: ProcessNodeRunRef) => void
  onDrill: (childRunId: string) => void
}) {
  const { theme, status } = useNativeTheme()
  const [noteFor, setNoteFor] = useState<ProcessResumeChoice | undefined>()
  const [changingProof, setChangingProof] = useState(false)
  const [asking, setAsking] = useState(false)
  const retryChoice = processRetryChoiceOf(run.park ? processRunParkChoices(run) : [])
  const [retryPick, setRetryPick] = useState<ProcessRetryPick | undefined>()
  const [selected, setSelected] = useState<string | undefined>()
  const [confirmingClose, setConfirmingClose] = useState(false)
  const parkedAt = run.park?.parkedAt
  useEffect(() => {
    setRetryPick(undefined)
    setSelected(undefined)
  }, [parkedAt])
  const park = run.park
  if (!park) return null
  const choose: typeof onChoose = (choice, ...rest) =>
    choice === 'close-unmerged' ? setConfirmingClose(true) : onChoose(choice, ...rest)
  const closeConfirm = confirmingClose ? (
    <CloseUnmergedConfirm
      onCancel={() => setConfirmingClose(false)}
      onConfirm={() => {
        setConfirmingClose(false)
        onChoose('close-unmerged')
      }}
    />
  ) : null
  const waiting = processWaitingView(run)
  if (waiting) {
    return (
      <>
        <WaitingCard
          view={waiting}
          managerLine={managerLine}
          {...(manager ? { manager } : {})}
          embedded={embedded}
          {...(answerFiles ? { answerFiles } : {})}
          {...(retryChoice?.retry
            ? {
                retry: {
                  offer: retryChoice.retry,
                  pick: retryPick ?? processRetryPickStart(retryChoice),
                  onPick: setRetryPick,
                },
              }
            : {})}
          onChoose={choose}
          onChangeProof={onChangeProof}
          onAnswerRequest={onAnswerRequest}
          onDelegate={onDelegate}
          {...(onOpenChat ? { onOpenChat } : {})}
          {...(onOpenTranscript ? { onOpenTranscript } : {})}
        />
        {closeConfirm}
      </>
    )
  }
  const reflected = isReflectedPark(park)
  const choices = processRunParkChoices(run)
  const proofChange = choices.find((c) => c.choice === 'change-proof')?.proofChange
  const circling = processParkCirclingView(run, root ?? run)
  const variant = managerLine
    ? status[PROCESS_LIVE_TONE]
    : park.reason === 'gate'
      ? status.review
      : status.on_hold
  const offered = choices
    .filter(isResumeParkChoice)
    .map((c) =>
      c.choice === 'retry' && c.turnLimit && manager?.moreTries?.verdict === 'pointless'
        ? { ...c, detail: PARK_ANSWERS_COPY.retryAsIs }
        : c,
    )
  const answers = processParkAnswersView(offered, manager, selected)
  const ownChoice = parkOwnAnswerChoice(offered)
  const pick =
    retryPick ?? (retryChoice ? processRetryPickStart(retryChoice, manager?.moreTries) : undefined)
  const send = (answer: ParkAnswerView, note: string | undefined) => {
    if (answer.choice === 'change-proof') return setChangingProof(true)
    if (answer.choice === 'close-unmerged') return setConfirmingClose(true)
    if (!note && choiceTakesNote(answer.choice)) {
      return setNoteFor(answer.choice as ProcessResumeChoice)
    }
    if (answer.choice === 'retry' && pick) {
      return onChoose('retry', note, undefined, undefined, pick)
    }
    onChoose(answer.choice as ProcessResumeChoice, note)
  }

  return (
    <View
      style={
        embedded
          ? { gap: 10 }
          : {
              marginTop: nativeSpace[2],
              borderRadius: nativeRadii[3],
              padding: nativeSpace[3],
              backgroundColor: variant.softBg,
              borderWidth: 1,
              borderColor: variant.softBorder,
              gap: nativeSpace[2],
            }
      }
    >
      <RichText
        text={managerLine ?? park.message}
        textColor={embedded ? theme.text.primary : variant.softFg}
        fontSize={embedded ? 16 : 13}
        fontWeight="600"
      />
      {circling ? <CirclingNotice view={circling} /> : null}
      {reflected && park.childRunId ? (
        <Pressable onPress={() => onDrill(park.childRunId as string)} accessibilityRole="button">
          <Text style={{ fontSize: 11, color: theme.text.secondary }}>
            {managerLine ? PROCESS_NESTED_RUN_OPEN.quiet : PROCESS_NESTED_RUN_OPEN.decide}
          </Text>
        </Pressable>
      ) : null}
      {manager && !reflected ? <ManagerLine view={manager} /> : null}
      {noteFor ? (
        <ParkNoteComposer
          copy={parkNoteCopy(noteFor)}
          required={parkNoteRequired(noteFor)}
          {...(noteFor === 'request-changes'
            ? { proofChoices: requestProofChoices(run.proofUnavailable) }
            : {})}
          onSend={(note, requestedProof) =>
            noteFor === 'retry' && pick
              ? onChoose('retry', note, undefined, undefined, pick)
              : onChoose(noteFor, note, undefined, requestedProof)
          }
          onCancel={() => setNoteFor(undefined)}
        />
      ) : changingProof && proofChange ? (
        <ProofChangeComposer
          offer={proofChange}
          onSend={(draft) => {
            setChangingProof(false)
            onChangeProof(draft)
          }}
          onCancel={() => setChangingProof(false)}
        />
      ) : (
        <>
          {reflected ? null : (
            <ParkAnswers
              view={answers}
              onSelect={setSelected}
              onSend={send}
              {...(ownChoice
                ? { onOwnAnswer: () => setNoteFor(ownChoice as ProcessResumeChoice) }
                : {})}
              {...(retryChoice && pick && answers.lead?.choice === 'retry'
                ? {
                    leadExtra: (
                      <RetryChoiceOptions
                        {...(retryChoice.retry ? { retry: retryChoice.retry } : {})}
                        {...(retryChoice.turnLimit
                          ? {
                              turnLimitView: processRetryTurnLimitView(
                                run,
                                pick.turnLimit ?? retryChoice.turnLimit.current,
                              ),
                            }
                          : {})}
                        pick={pick}
                        onPick={setRetryPick}
                      />
                    ),
                  }
                : {})}
            />
          )}
          {onAskAgent && processParkAskableStepId(run) ? (
            <View style={{ gap: 2 }}>
              <Button
                size="sm"
                variant="secondary"
                disabled={asking}
                onPress={() => {
                  setAsking(true)
                  void onAskAgent().finally(() => setAsking(false))
                }}
              >
                {PROCESS_PARK_ASK_AGENT_COPY.label}
              </Button>
              <Text style={{ fontSize: 11, color: theme.text.secondary }}>
                {PROCESS_PARK_ASK_AGENT_COPY.detail}
              </Text>
            </View>
          ) : null}
          {alreadyMerged && !reflected ? (
            <AlreadyMergedOffer projectId={run.projectId} {...alreadyMerged} />
          ) : null}
        </>
      )}
      {closeConfirm}
    </View>
  )
}

/** What exactly a request asked for, one line each. */
function WaitingDetails({ details }: { details: ProcessWaitingDetail[] }) {
  const { theme } = useNativeTheme()
  return (
    <>
      {details.map((d) => (
        <View key={d.label} style={{ flexDirection: 'row', gap: nativeSpace[2] }}>
          <Text style={{ fontSize: 12, color: theme.text.muted }}>{d.label}</Text>
          <Text
            numberOfLines={1}
            style={{ flex: 1, fontSize: 12, fontFamily: 'Menlo', color: theme.text.primary }}
          >
            {d.value}
          </Text>
        </View>
      ))}
    </>
  )
}

/**
 * One of several requests a waiting agent left open: what it asks, in its
 * words, and its own answers — or what it was decided as.
 */
function WaitingRequestRow({
  request,
  onAnswer,
}: {
  request: ProcessWaitingRequestView
  onAnswer: (choice: ProcessWaitingItemChoice) => void
}) {
  const { theme } = useNativeTheme()
  return (
    <View
      style={{
        gap: nativeSpace[1],
        borderRadius: nativeRadii[2],
        borderWidth: 1,
        borderColor: theme.border.subtle,
        backgroundColor: theme.surface.base,
        padding: nativeSpace[2],
      }}
    >
      <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text.primary }}>
        {request.title}
      </Text>
      {request.words ? (
        <Text style={{ fontSize: 12, lineHeight: 17, color: theme.text.secondary }}>
          {request.words}
        </Text>
      ) : null}
      <WaitingDetails details={request.details} />
      {request.decided ? (
        <Text style={{ fontSize: 12, fontWeight: '600', color: theme.text.secondary }}>
          {request.decided}
        </Text>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: nativeSpace[2] }}>
          {request.choices.map((choice) => (
            <Button
              key={choice.choice}
              size="sm"
              variant={choice.choice === 'allow' ? 'primary' : 'secondary'}
              onPress={() => onAnswer(choice.choice)}
            >
              {choice.label}
            </Button>
          ))}
        </View>
      )}
    </View>
  )
}

/**
 * An agent waiting on the person: what it needs, in its own words, exactly what
 * it asked for, its transcript one tap away, and the answers it takes — each
 * with one line on what it does. Several requests are each decided on their
 * own rows; the card's answers take every one still open.
 */
function WaitingCard({
  view,
  managerLine,
  manager,
  embedded = false,
  answerFiles,
  retry,
  onChoose,
  onChangeProof,
  onAnswerRequest,
  onDelegate,
  onOpenChat,
  onOpenTranscript,
}: {
  view: ProcessWaitingView
  /** What the agent manager is doing on the ask, while it has it — said in place of the ask's heading. */
  managerLine: string | undefined
  /** The manager's card when it handed the ask over: its word on it and the answers it prepared. */
  manager?: ProcessManagerEscalationView
  /** Inside the "Needs you" card, which draws the frame. */
  embedded?: boolean
  /** Where files handed over with an answer come from. */
  answerFiles?: NativeAnswerFiles
  /** How "Try again" starts the step's agent, where its agent could not go on. */
  retry?: {
    offer: ProcessRetryOffer
    pick: ProcessRetryPick
    onPick: (pick: ProcessRetryPick) => void
  }
  onChoose: (
    choice: ProcessResumeChoice,
    note?: string,
    integration?: ProcessIntegrationDecision,
    requestedProof?: readonly ProofKind[],
    retry?: ProcessRetryPick,
    files?: readonly string[],
  ) => void
  /** Change what proves the work, where the agent's block is proof the run cannot give. */
  onChangeProof: (draft: ProofChangeDraft) => void
  onAnswerRequest: (actionId: string, choice: ProcessWaitingItemChoice) => void
  onDelegate: (note?: string) => Promise<void>
  onOpenChat?: (context: ChatContext) => void
  onOpenTranscript?: (ref: ProcessNodeRunRef) => void
}) {
  const { theme, status } = useNativeTheme()
  const [noteFor, setNoteFor] = useState<ProcessResumeChoice | undefined>()
  const [changingProof, setChangingProof] = useState(false)
  const [selected, setSelected] = useState<string | undefined>()
  const proofChange = view.choices.find((c) => c.choice === 'change-proof')?.proofChange
  const [delegating, setDelegating] = useState(false)
  const variant = managerLine ? status[PROCESS_LIVE_TONE] : status.on_hold
  const titleLine = processWaitingTitleLine(view.title, managerLine ?? view.heading)
  const transcript = view.transcript
  const delegated = view.delegated
  const answers = processParkAnswersView(view.choices, manager, selected)
  const ownChoice = parkOwnAnswerChoice(view.choices)
  const send = (answer: ParkAnswerView, note: string | undefined) => {
    if (answer.choice === 'delegate') {
      setDelegating(true)
      void onDelegate(note).finally(() => setDelegating(false))
      return
    }
    if (answer.choice === 'change-proof') return setChangingProof(true)
    if (!note && choiceTakesNote(answer.choice)) {
      return setNoteFor(answer.choice as ProcessResumeChoice)
    }
    if (answer.choice === 'retry' && retry) {
      return onChoose('retry', note, undefined, undefined, retry.pick)
    }
    onChoose(answer.choice as ProcessResumeChoice, note)
  }

  return (
    <View
      style={
        embedded
          ? { gap: 10 }
          : {
              marginTop: nativeSpace[2],
              borderRadius: nativeRadii[3],
              padding: nativeSpace[3],
              backgroundColor: variant.softBg,
              borderWidth: 1,
              borderColor: variant.softBorder,
              gap: nativeSpace[2],
            }
      }
    >
      <View style={{ gap: 2 }}>
        <Text
          style={
            embedded
              ? { fontSize: 16, fontWeight: '600', color: theme.text.primary }
              : { fontSize: 14, fontWeight: '600', color: variant.softFg }
          }
        >
          {managerLine ?? view.heading}
        </Text>
        {titleLine ? (
          <Text style={{ fontSize: 12, color: theme.text.secondary }}>{titleLine}</Text>
        ) : null}
      </View>
      <View
        style={{
          borderLeftWidth: 2,
          borderLeftColor: theme.border.strong,
          backgroundColor: theme.surface.base,
          borderRadius: nativeRadii[2],
          paddingHorizontal: nativeSpace[2],
          paddingVertical: nativeSpace[1],
        }}
      >
        <Text style={{ fontSize: 13, lineHeight: 19, color: theme.text.primary }}>
          {view.words}
        </Text>
      </View>
      <WaitingDetails details={view.details} />
      {view.requests?.map((request) => (
        <WaitingRequestRow
          key={request.actionId}
          request={request}
          onAnswer={(choice) => onAnswerRequest(request.actionId, choice)}
        />
      ))}
      {transcript && onOpenTranscript ? (
        <Pressable onPress={() => onOpenTranscript(transcript)} accessibilityRole="button">
          <Text style={{ fontSize: 12, color: theme.text.secondary }}>{view.transcriptLabel}</Text>
        </Pressable>
      ) : null}
      {delegated ? (
        onOpenChat ? (
          <Pressable onPress={() => onOpenChat(delegated.chatContext)} accessibilityRole="button">
            <Text style={{ fontSize: 12, fontWeight: '600', color: theme.text.primary }}>
              {delegated.label} →
            </Text>
          </Pressable>
        ) : (
          <Text style={{ fontSize: 12, color: theme.text.secondary }}>{delegated.label}</Text>
        )
      ) : null}
      {manager ? <ManagerLine view={manager} /> : null}
      {noteFor ? (
        <ParkNoteComposer
          copy={waitingNoteCopy(view.kind)}
          required={parkNoteRequired(noteFor)}
          {...(answerFiles && answerTakesFiles(noteFor)
            ? {
                answerFiles,
                ...(answerFiles.pickDeviceFiles
                  ? { pickAnswerFiles: answerFiles.pickDeviceFiles }
                  : {}),
              }
            : {})}
          onSend={(note, _proof, files) =>
            onChoose(noteFor, note, undefined, undefined, undefined, files)
          }
          onCancel={() => setNoteFor(undefined)}
        />
      ) : changingProof && proofChange ? (
        <ProofChangeComposer
          offer={proofChange}
          onSend={(draft) => {
            setChangingProof(false)
            onChangeProof(draft)
          }}
          onCancel={() => setChangingProof(false)}
        />
      ) : (
        <ParkAnswers
          view={answers}
          busy={delegating}
          onSelect={setSelected}
          onSend={send}
          {...(ownChoice
            ? { onOwnAnswer: () => setNoteFor(ownChoice as ProcessResumeChoice) }
            : {})}
          {...(retry && answers.lead?.choice === 'retry'
            ? {
                leadExtra: (
                  <RetryChoiceOptions retry={retry.offer} pick={retry.pick} onPick={retry.onPick} />
                ),
              }
            : {})}
        />
      )}
    </View>
  )
}

/**
 * Native peer of web's `RunEnding`: a person's decision in their words — with
 * the way to send a request for changes back for them — or the error.
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
  const { theme } = useNativeTheme()
  const ending = processRunPersonEnding(run)
  const line = ending?.line ?? run.error
  if (!line) return null
  return (
    <View
      style={{ paddingHorizontal: nativeSpace[4], gap: nativeSpace[2], alignItems: 'flex-start' }}
    >
      <Text style={{ fontSize: 11, color: theme.text.secondary }}>{line}</Text>
      {processRunSendBackGateId(run) ? (
        <RunEndingAction copy={PROCESS_SEND_BACK_COPY} onAct={onSendBack} />
      ) : null}
      {processRunRevivable(run) ? (
        <RunEndingAction copy={PROCESS_REVIVE_COPY} onAct={onRevive} />
      ) : null}
    </View>
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
  const { theme } = useNativeTheme()
  const [acting, setActing] = useState(false)
  return (
    <View style={{ gap: nativeSpace[1], alignItems: 'flex-start' }}>
      <Button
        size="sm"
        variant="primary"
        disabled={acting}
        onPress={() => {
          setActing(true)
          void onAct().finally(() => setActing(false))
        }}
      >
        {copy.label}
      </Button>
      <Text style={{ fontSize: 10, color: theme.text.secondary }}>{copy.detail}</Text>
    </View>
  )
}
