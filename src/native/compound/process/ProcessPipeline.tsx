import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
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
  computeChatRowStatus,
  processRunChatContext,
  RUN_CHAT_OPEN_LABEL,
  RunChatDraftProvider,
  RunNeedsYouProvider,
  runNeedsYouDiscussDraft,
  useChats,
  usePendingAsksByChat,
  type ChatsSeenMap,
  type RunNeedsYouActions,
  fileNameSlug,
  useDurationTimer,
  formatProcessDuration,
  isIntegratingApproval,
  isReflectedPark,
  isResumeParkChoice,
  REQUEST_PROOF_CHOICES,
  parkNoteRequired,
  processAmendmentView,
  processNodeBadge,
  processNodeLook,
  processNodeState,
  type ProcessNodeLook,
  processRunParkChoices,
  processRunIntegrationModes,
  processRunBadge,
  processRunHeaderModel,
  processRunPersonEnding,
  processRunSendBackGateId,
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
  processWaitingView,
  signoffMergeHold,
  SIGNOFF_GROUP_CHIP_LABEL,
  SIGNOFF_GROUP_CHIP_TITLE,
  useAppSettings,
  useProcessGroupRun,
  useProcessRun,
  useProjects,
  useStories,
  waitingNoteCopy,
  type ProcessIntegrationDecision,
  type ProofKind,
  type ProcessNodeRunRef,
  type ProcessResumeChoice,
  type ProcessRun,
  type ProcessStatusTone,
  type ProcessWaitingView,
} from '../../../headless'
import type { ChatContext } from '../../../headless/api'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import type { ProcessRunBranch } from '../../../headless'
import Alert from '../../primitives/Alert'
import ActionMenu, { type ActionMenuItem } from '../ActionMenu'
import BaseMovedNote from './BaseMovedNote'
import IntegrationResult from './IntegrationResult'
import ParkNoteComposer from './ParkNoteComposer'
import RunDiagnosticsView from './RunDiagnosticsView'
import StorySignoffReview from './StorySignoffReview'
import StepPreview from './pipeline/StepPreview'
import StepScreen, { type StepPanelTarget } from './pipeline/StepScreen'
import { DurCostChips, RunModelChip, type SaveFileHandler } from '../chat/signoff'
import CostChip from '../chips/CostChip'
import DurationChip from '../chips/DurationChip'
import DependencyRef from '../stories/DependencyRef'
import { Button } from '../../primitives/Button'
import { Modal } from '../../primitives/Modal'
import {
  IconChat,
  IconChevronLeft,
  IconChevronRight,
  IconDotsVertical,
  IconGroup,
} from '../../icons'
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
   * Push the run's own chat — native's form of web's chat drawer. Its draft is
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
}

/** The run sits at its story's sign-off — the screen leads with the decision. */
function isStorySignoff(run: ProcessRun): boolean {
  return (
    run.status === 'parked' &&
    run.park?.reason === 'gate' &&
    !!run.storyId &&
    !isReflectedPark(run.park)
  )
}

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
}: ProcessPipelineProps) {
  const { theme, status } = useNativeTheme()
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
    delegate,
    retryIntegration,
    resolveIntegrationConflict,
    sendBack,
    cancel,
    listBranches,
    deleteRun,
    openChat,
    resolveNeedsYou,
  } = useProcessRun(currentId)
  const { settings } = useAppSettings()
  const showDiagnostics = settings.userPreferences.showRunDiagnostics === true
  const { group } = useProcessGroupRun(run?.groupRunId)
  const integrationModes = run ? processRunIntegrationModes(run, group) : undefined
  const { projects } = useProjects()
  const { getChat, setDraft } = useChats()
  const runChat = processRunChatContext({ id: runId, projectId: run?.projectId ?? '' })
  const runChatKey = getChatContextKey(runChat)
  const runChatAsks = usePendingAsksByChat().get(runChatKey) ?? 0
  const runChatUnread =
    !!chatsSeen &&
    computeChatRowStatus({
      context: runChat,
      contextKey: runChatKey,
      chat: getChat(runChat),
      isSending: false,
      seen: chatsSeen,
      pendingAsks: runChatAsks,
    }).isUnread
  const canChat = stack.length === 0 && !run?.parentRunId && !!onOpenRunChat
  const openRunChat = useCallback(
    async (draft?: string) => {
      const opened = await openChat()
      if (!opened) return
      if (draft) setDraft(opened.context, draft)
      onOpenRunChat?.(opened.context)
    },
    [openChat, setDraft, onOpenRunChat],
  )

  const [confirmDelete, setConfirmDelete] = useState(false)
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
  if (panel) {
    return (
      <RunChatDraftScope open={openDraft}>
        <StepScreen
          target={panel}
          onBack={() => setPanel(null)}
          {...(renderAgentRun ? { renderAgentRun } : {})}
          {...(onOpenAgentRun ? { onOpenAgentRun } : {})}
          {...(onSaveFile ? { onSaveFile } : {})}
        />
      </RunChatDraftScope>
    )
  }

  const needsYouActions: RunNeedsYouActions | undefined = canChat
    ? {
        resolutions: run.needsYouResolutions,
        onDiscuss: (card) => void openRunChat(runNeedsYouDiscussDraft(card.text)),
        onResolve: (card) => void resolveNeedsYou(card.id),
      }
    : undefined
  const states = processStepStates(run)
  const amendments = processAmendmentView(run)
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
  ) => resume(choice, note, integration, requestedProof)

  return (
    <RunChatDraftScope open={openDraft}>
      <ScrollView contentContainerStyle={{ paddingBottom: nativeSpace[5] }}>
        <RunHead
          run={run}
          depth={stack.length}
          now={now}
          onCrumb={popTo}
          onCancel={() => void cancel()}
          onDelete={openDelete}
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
          {...(canChat
            ? { chat: { onOpen: () => void openRunChat(), unread: runChatUnread } }
            : {})}
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
        {signoff ? null : <BaseMovedNote run={run} onChoose={(choice) => void resume(choice)} />}
        {amendments.notes.length > 0 ? (
          <View
            style={{
              marginHorizontal: nativeSpace[3],
              marginTop: nativeSpace[3],
              gap: 4,
              borderWidth: 1,
              borderColor: theme.border.subtle,
              borderRadius: nativeRadii[2],
              backgroundColor: theme.surface.base,
              paddingHorizontal: 10,
              paddingVertical: 8,
            }}
          >
            <Text
              style={{
                fontSize: 10,
                fontWeight: '600',
                letterSpacing: 0.6,
                textTransform: 'uppercase',
                color: theme.text.muted,
              }}
            >
              Work added to this run
            </Text>
            {amendments.notes.map((note) => (
              <Text
                key={note}
                style={{ fontSize: 11.5, lineHeight: 17, color: theme.text.secondary }}
              >
                {note}
              </Text>
            ))}
          </View>
        ) : null}
        <View
          style={{
            marginHorizontal: nativeSpace[3],
            marginTop: nativeSpace[3],
            borderRadius: nativeRadii[3],
            borderWidth: 1,
            borderColor: theme.border.subtle,
            backgroundColor: theme.surface.raised,
            paddingVertical: 4,
          }}
        >
          {states.map((state, index) => (
            <PipelineNode
              key={state.step.id}
              run={run}
              state={state}
              isLast={index === states.length - 1}
              now={now}
              addedTag={amendments.addedSteps[state.step.id]}
              onChoose={choose}
              onDelegate={() => delegate().then(() => undefined)}
              {...(onOpenChat ? { onOpenChat } : {})}
              onDrill={drillTo}
              onOpenPanel={setPanel}
              {...(renderAgentRun || onOpenAgentRun
                ? {
                    onOpenTranscript: (ref: ProcessNodeRunRef) => {
                      if (!renderAgentRun) return onOpenAgentRun?.(ref)
                      const entryId = state.entries.find((e) => e.runRef?.runId === ref.runId)?.id
                      setPanel({
                        runId: run.id,
                        stepId: state.step.id,
                        ...(entryId ? { entryId } : {}),
                      })
                    },
                  }
                : {})}
            />
          ))}
        </View>
        <IntegrationResult
          run={run}
          {...(integrationModes ? { modes: integrationModes } : {})}
          onRetry={retryIntegration}
          onResolve={resolveIntegrationConflict}
          error={signoff ? null : actionError}
        />
        {signoff ? (
          <View style={{ paddingHorizontal: nativeSpace[3], paddingTop: nativeSpace[3] }}>
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
                {...(onSaveFile ? { onSaveFile } : {})}
              />
            </NeedsYouScope>
          </View>
        ) : null}

        <RunDiagnosticsView runId={currentId} enabled={showDiagnostics} />

        <RunEnding run={run} onSendBack={sendBack} />

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

function ToneBadge({ tone, label }: { tone: ProcessStatusTone; label: string }) {
  const { status } = useNativeTheme()
  const variant = status[tone]
  return (
    <View
      style={{
        backgroundColor: variant.softBg,
        borderColor: variant.softBorder,
        borderWidth: 1,
        borderRadius: nativeRadii[2],
        paddingHorizontal: nativeSpace[2],
        paddingVertical: 1,
      }}
    >
      <Text style={{ fontSize: 11, color: variant.softFg }}>{label}</Text>
    </View>
  )
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
 * The run head: where you are, the state, time and spend — then icon-only
 * actions: the Group chip for a group's leg, Stop while the run can still do
 * work, and ⋯ for the rare ones (download the report, delete — which still
 * asks first).
 */
function RunHead({
  run,
  depth,
  now,
  onCrumb,
  onCancel,
  onDelete,
  onOpenGroup,
  onDownloadReport,
  chat,
}: {
  run: ProcessRun
  depth: number
  now: number
  onCrumb: (depth: number) => void
  onCancel: () => void
  onDelete?: () => void
  onOpenGroup?: () => void
  onDownloadReport?: () => void
  /** The run's own chat: open it, and whether it has news. */
  chat?: { onOpen: () => void; unread: boolean }
}) {
  const { theme } = useNativeTheme()
  const [menuOpen, setMenuOpen] = useState(false)
  const badge = processRunBadge(run)
  const spend = processRunSpend(run)
  const workMs = processRunWorkMs(run, now)
  const model = processRunHeaderModel(run, run.ledger)
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
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: nativeSpace[2],
        paddingHorizontal: nativeSpace[3],
        paddingVertical: nativeSpace[3],
        borderBottomWidth: 1,
        borderBottomColor: theme.border.subtle,
        backgroundColor: theme.surface.raised,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
        {depth > 0 ? (
          <>
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
          </>
        ) : null}
        <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text.primary }}>
          {run.title}
        </Text>
      </View>
      <View style={{ flex: 1 }} />
      <ToneBadge tone={badge.tone} label={badge.label} />
      {model ? <RunModelChip model={model} /> : null}
      <DurCostChips
        facts={{
          durationLabel: workMs !== undefined ? formatProcessDuration(workMs) : undefined,
          costLabel: spend?.label,
          cost: run.totals,
          timeDetails:
            workMs !== undefined ? processTimeDetailsView(run.totals?.time, workMs) : undefined,
        }}
        costTitle={spend?.title}
        timeTitle="Time spent working, across every attempt"
      />
      {onOpenGroup && depth === 0 ? (
        <HeadAction label={SIGNOFF_GROUP_CHIP_TITLE} onPress={onOpenGroup}>
          <IconGroup size={16} color={theme.text.secondary} />
          <Text style={{ fontSize: 12, color: theme.text.secondary }}>
            {SIGNOFF_GROUP_CHIP_LABEL}
          </Text>
        </HeadAction>
      ) : null}
      {chat && depth === 0 ? (
        <HeadAction label={RUN_CHAT_OPEN_LABEL} onPress={chat.onOpen}>
          <IconChat size={16} color={theme.text.secondary} />
          {chat.unread ? (
            <View
              style={{
                position: 'absolute',
                top: 4,
                right: 4,
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: theme.accent.primary,
              }}
            />
          ) : null}
        </HeadAction>
      ) : null}
      {stoppable ? (
        <HeadAction label="Stop the run" onPress={onCancel}>
          <View
            style={{
              width: 12,
              height: 12,
              borderRadius: 2,
              backgroundColor: theme.text.secondary,
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
      <ActionMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} actions={actions} />
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
  addedTag,
  onChoose,
  onDelegate,
  onOpenChat,
  onDrill,
  onOpenPanel,
  onOpenTranscript,
}: {
  run: ProcessRun
  state: ReturnType<typeof processStepStates>[number]
  isLast: boolean
  now: number
  addedTag: string | undefined
  onChoose: (
    choice: ProcessResumeChoice,
    note?: string,
    integration?: ProcessIntegrationDecision,
    requestedProof?: readonly ProofKind[],
  ) => Promise<boolean>
  onDelegate: () => Promise<void>
  onOpenChat?: (context: ChatContext) => void
  onDrill: (childRunId: string) => void
  onOpenPanel: (target: StepPanelTarget) => void
  onOpenTranscript?: (ref: ProcessNodeRunRef) => void
}) {
  const { theme, status } = useNativeTheme()
  const { resolveDependency } = useStories()
  const parkStepId = run.park?.stepId
  const parked = parkStepId === state.step.id
  const nodeState = processNodeState(state, parkStepId)
  const look = processNodeLook(nodeState, state.step.kind === 'gate', 0)
  const row = processStepRowView(state, parkStepId)
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
              numberOfLines={1}
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
            kind={row.preview}
            onOpen={onOpenPanel}
            onDrill={onDrill}
          />
        </View>
      ) : null}

      {parked && !signoffGate ? (
        <View style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
          <ParkBlock
            run={run}
            onChoose={onChoose}
            onDelegate={onDelegate}
            {...(onOpenChat ? { onOpenChat } : {})}
            onDrill={onDrill}
            {...(onOpenTranscript ? { onOpenTranscript } : {})}
          />
        </View>
      ) : null}
    </View>
  )
}

function ParkBlock({
  run,
  onChoose,
  onDelegate,
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
  ) => void
  onDelegate: () => Promise<void>
  onOpenChat?: (context: ChatContext) => void
  /** Open the agent run that is waiting, to read its transcript. */
  onOpenTranscript?: (ref: ProcessNodeRunRef) => void
  onDrill: (childRunId: string) => void
}) {
  const { theme, status } = useNativeTheme()
  const [noteFor, setNoteFor] = useState<ProcessResumeChoice | undefined>()
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
  const variant = park.reason === 'gate' ? status.review : status.on_hold

  return (
    <View
      style={{
        marginTop: nativeSpace[2],
        borderRadius: nativeRadii[3],
        padding: nativeSpace[3],
        backgroundColor: variant.softBg,
        borderWidth: 1,
        borderColor: variant.softBorder,
        gap: nativeSpace[2],
      }}
    >
      <Text style={{ fontSize: 13, fontWeight: '600', color: variant.softFg }}>{park.message}</Text>
      {reflected && park.childRunId ? (
        <Pressable onPress={() => onDrill(park.childRunId as string)} accessibilityRole="button">
          <Text style={{ fontSize: 11, color: theme.text.secondary }}>
            Open the nested run to decide →
          </Text>
        </Pressable>
      ) : null}
      {noteFor ? (
        <ParkNoteComposer
          {...(noteFor === 'request-changes' ? { proofChoices: REQUEST_PROOF_CHOICES } : {})}
          onSend={(note, requestedProof) => onChoose(noteFor, note, undefined, requestedProof)}
          onCancel={() => setNoteFor(undefined)}
        />
      ) : (
        choices.filter(isResumeParkChoice).map((choice) => (
          <View key={choice.choice} style={{ gap: 2 }}>
            <Button
              size="sm"
              variant={choice.primary ? 'primary' : 'secondary'}
              onPress={() =>
                choiceTakesNote(choice.choice) ? setNoteFor(choice.choice) : onChoose(choice.choice)
              }
            >
              {choice.label}
            </Button>
            <Text style={{ fontSize: 11, color: theme.text.secondary }}>{choice.detail}</Text>
          </View>
        ))
      )}
    </View>
  )
}

/**
 * An agent waiting on the person: what it needs, in its own words, exactly what
 * it asked for, its transcript one tap away, and the answers it takes — each
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
  const { theme, status } = useNativeTheme()
  const [noteFor, setNoteFor] = useState<ProcessResumeChoice | undefined>()
  const [delegating, setDelegating] = useState(false)
  const variant = status.on_hold
  const transcript = view.transcript
  const delegated = view.delegated
  const delegate = () => {
    setDelegating(true)
    void onDelegate().finally(() => setDelegating(false))
  }

  return (
    <View
      style={{
        marginTop: nativeSpace[2],
        borderRadius: nativeRadii[3],
        padding: nativeSpace[3],
        backgroundColor: variant.softBg,
        borderWidth: 1,
        borderColor: variant.softBorder,
        gap: nativeSpace[2],
      }}
    >
      <View style={{ gap: 2 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: variant.softFg }}>
          {view.heading}
        </Text>
        <Text style={{ fontSize: 12, color: theme.text.secondary }}>{view.title}</Text>
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
      {view.details.map((d) => (
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
      {noteFor ? (
        <ParkNoteComposer
          copy={waitingNoteCopy(view.kind)}
          required={parkNoteRequired(noteFor)}
          onSend={(note) => onChoose(noteFor, note)}
          onCancel={() => setNoteFor(undefined)}
        />
      ) : (
        view.choices.map((choice) => (
          <View key={choice.choice} style={{ gap: 2 }}>
            <Button
              size="sm"
              variant={choice.primary ? 'primary' : 'secondary'}
              disabled={choice.choice === 'delegate' && delegating}
              onPress={() => {
                if (!isResumeParkChoice(choice)) return delegate()
                if (choiceTakesNote(choice.choice)) return setNoteFor(choice.choice)
                onChoose(choice.choice)
              }}
            >
              {choice.label}
            </Button>
            <Text style={{ fontSize: 11, color: theme.text.secondary }}>{choice.detail}</Text>
          </View>
        ))
      )}
    </View>
  )
}

/**
 * Native peer of web's `RunEnding`: a person's decision in their words — with
 * the way to send a request for changes back for them — or the error.
 */
function RunEnding({ run, onSendBack }: { run: ProcessRun; onSendBack: () => Promise<void> }) {
  const { theme } = useNativeTheme()
  const [sending, setSending] = useState(false)
  const ending = processRunPersonEnding(run)
  const line = ending?.line ?? run.error
  if (!line) return null
  return (
    <View
      style={{ paddingHorizontal: nativeSpace[4], gap: nativeSpace[2], alignItems: 'flex-start' }}
    >
      <Text style={{ fontSize: 11, color: theme.text.secondary }}>{line}</Text>
      {processRunSendBackGateId(run) ? (
        <View style={{ gap: nativeSpace[1], alignItems: 'flex-start' }}>
          <Button
            size="sm"
            variant="primary"
            disabled={sending}
            onPress={() => {
              setSending(true)
              void onSendBack().finally(() => setSending(false))
            }}
          >
            {PROCESS_SEND_BACK_COPY.label}
          </Button>
          <Text style={{ fontSize: 10, color: theme.text.secondary }}>
            {PROCESS_SEND_BACK_COPY.detail}
          </Text>
        </View>
      ) : null}
    </View>
  )
}
