import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { BackHandler, Pressable, ScrollView, Switch, Text, View } from 'react-native'

import {
  useDurationTimer,
  formatProcessDuration,
  hasIsolatedAttempts,
  isProcessLeafOpenable,
  isReflectedPark,
  latestOpenableAttempt,
  parkedRunRef,
  processAttemptLeaf,
  processEntryDurationLabel,
  processIterationBadge,
  processLeafReview,
  processNodeGlyph,
  processNodeState,
  processNodeTone,
  processParkChoices,
  processRunBadge,
  processRunSpend,
  processStepStates,
  processStepTone,
  useAppSettings,
  useProcessRun,
  type ProcessNodeRunRef,
  type ProcessNodeState,
  type ProcessOpenLeaf,
  type ProcessResumeChoice,
  type ProcessRun,
  type ProcessStatusTone,
} from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import type { ProcessRunBranch } from '../../../headless'
import Alert from '../../primitives/Alert'
import RunDiagnosticsView from './RunDiagnosticsView'
import StorySignoffReview from './StorySignoffReview'
import VerificationReview from './VerificationReview'
import { DurCostChips, type SaveFileHandler } from '../chat/signoff'
import { Button } from '../../primitives/Button'
import { Modal } from '../../primitives/Modal'
import SegmentedControl from '../../primitives/SegmentedControl'
import { IconChevronLeft } from '../../icons/IconChevronLeft'
import { useNativeTheme } from '../../hooks/useNativeTheme'

export type ProcessPipelineProps = {
  /** The top-level run. Drilling into a nested node stays inside this component. */
  runId: string
  /** Open the agent-run chat a leaf owns. A leaf IS a chat, one level down. */
  onOpenAgentRun?: (ref: ProcessNodeRunRef) => void
  /**
   * Render a leaf's agent-run chat inside the pipeline (drill-down) rather than
   * routing away. When provided it wins over `onOpenAgentRun`: opening a leaf
   * swaps the pipeline body for a drill with a "‹ Pipeline" head and this content
   * below it; `onBack` returns to the spine. A verify attempt opens in place as
   * its small sign-off either way.
   */
  renderAgentRun?: (ref: ProcessNodeRunRef, onBack: () => void) => ReactNode
  /** Native host's file saver; enables the story gate's downloads when provided. */
  onSaveFile?: SaveFileHandler
  /**
   * Whether this pipeline's screen is the one on top. The system back button is
   * only claimed while it is — a chat pushed over the pipeline must get its own
   * first back press. Defaults to true for a host with no navigation stack.
   */
  isFocused?: boolean
}

/**
 * Native peer of
 * [web's `ProcessPipeline`](../../../web/compound/process/ProcessPipeline.tsx).
 * Same spine-and-marker design, same navigation rule. On a small screen the
 * pipeline matters more, not less — a transcript is the least readable way to
 * answer "where is this" on a phone.
 */
export default function ProcessPipeline({
  runId,
  onOpenAgentRun,
  renderAgentRun,
  onSaveFile,
  isFocused = true,
}: ProcessPipelineProps) {
  const { theme } = useNativeTheme()
  const [stack, setStack] = useState<string[]>([])
  const [openLeaf, setOpenLeaf] = useState<ProcessOpenLeaf | null>(null)
  const [leafView, setLeafView] = useState<'review' | 'transcript'>('review')
  const currentId = stack[stack.length - 1] ?? runId
  const { isLoaded, loadError, run, resume, cancel, listBranches, deleteRun } =
    useProcessRun(currentId)
  const { settings } = useAppSettings()
  const showDiagnostics = settings.userPreferences.showRunDiagnostics === true

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [branches, setBranches] = useState<ProcessRunBranch[]>([])
  const [alsoBranches, setAlsoBranches] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleted, setDeleted] = useState(false)

  // One 1s clock for the whole pipeline — ticks while the run is live so every
  // step's elapsed advances in real time, freezes the moment it goes terminal.
  const now = useDurationTimer(run?.status === 'running' || run?.status === 'pending')

  const drillTo = useCallback((childId: string) => {
    setOpenLeaf(null)
    setStack((s) => [...s, childId])
  }, [])
  const popTo = useCallback((depth: number) => {
    setOpenLeaf(null)
    setStack((s) => s.slice(0, depth))
  }, [])

  // A leaf opens IN PLACE: a verify attempt as its small sign-off, any other as
  // its chat when the host renders one. Otherwise the host routes to it (the
  // native host pushes the chat screen).
  const canOpenTranscript = renderAgentRun !== undefined || onOpenAgentRun !== undefined
  const openLeafHere = useCallback(
    (leaf: ProcessOpenLeaf, hasReview: boolean) => {
      if (hasReview || renderAgentRun) {
        setOpenLeaf(leaf)
        setLeafView(hasReview ? 'review' : 'transcript')
        return
      }
      onOpenAgentRun?.(leaf.ref)
    },
    [renderAgentRun, onOpenAgentRun],
  )

  // The system back gesture/button steps back out of an opened leaf or drill
  // level first — the same as its "‹ Pipeline" head — instead of leaving the
  // pipeline screen altogether and losing where the user was.
  useEffect(() => {
    if (!isFocused || (!openLeaf && stack.length === 0)) return
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (openLeaf) setOpenLeaf(null)
      else setStack((s) => s.slice(0, -1))
      return true
    })
    return () => sub.remove()
  }, [isFocused, openLeaf, stack.length])

  const openDelete = useCallback(() => {
    setAlsoBranches(false)
    setBranches([])
    setConfirmDelete(true)
    void listBranches()
      .then(setBranches)
      .catch(() => setBranches([]))
  }, [listBranches])

  const runDelete = useCallback(() => {
    setDeleting(true)
    void deleteRun({ deleteBranches: alsoBranches })
      .then(() => {
        setConfirmDelete(false)
        setDeleted(true)
      })
      .finally(() => setDeleting(false))
  }, [deleteRun, alsoBranches])

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

  if (openLeaf) {
    const back = () => setOpenLeaf(null)
    const review = processLeafReview(run, openLeaf)
    const showReview = review !== undefined && leafView === 'review'
    const hasTranscript = openLeaf.ref.chatContextId !== undefined && canOpenTranscript
    const pickView = (view: 'review' | 'transcript') => {
      if (view === 'transcript' && !renderAgentRun) onOpenAgentRun?.(openLeaf.ref)
      else setLeafView(view)
    }
    return (
      <View style={{ flex: 1 }}>
        <LeafHead
          title={openLeaf.title}
          onBack={back}
          {...(review && hasTranscript ? { view: leafView, onView: pickView } : {})}
        />
        {showReview ? (
          <ScrollView contentContainerStyle={{ paddingBottom: nativeSpace[5] }}>
            <VerificationReview
              projectId={run.projectId}
              review={review.scope}
              entry={review.entry}
              title={openLeaf.title}
              {...(onSaveFile ? { onSaveFile } : {})}
            />
          </ScrollView>
        ) : (
          <View style={{ flex: 1 }}>{renderAgentRun?.(openLeaf.ref, back)}</View>
        )}
      </View>
    )
  }

  const states = processStepStates(run)

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: nativeSpace[5] }}>
      <RunHead
        run={run}
        depth={stack.length}
        now={now}
        onCrumb={popTo}
        onCancel={() => void cancel()}
        onDelete={openDelete}
      />
      <View style={{ paddingHorizontal: nativeSpace[3], paddingTop: nativeSpace[3] }}>
        {states.map((state, index) => (
          <PipelineNode
            key={state.step.id}
            run={run}
            state={state}
            ordinal={index + 1}
            isLast={index === states.length - 1}
            now={now}
            onChoose={(choice, note) => void resume(choice, note)}
            onDrill={drillTo}
            onOpenLeaf={openLeafHere}
            canOpenTranscript={canOpenTranscript}
            {...(onSaveFile ? { onSaveFile } : {})}
          />
        ))}
      </View>

      <RunDiagnosticsView runId={currentId} enabled={showDiagnostics} />

      {run.error ? (
        <Text
          style={{
            paddingHorizontal: nativeSpace[4],
            fontSize: 11,
            color: theme.text.secondary,
          }}
        >
          {run.error}
        </Text>
      ) : null}

      {confirmDelete ? (
        <Modal isOpen onClose={() => setConfirmDelete(false)} title="Delete this process run?">
          <View style={{ gap: nativeSpace[3] }}>
            <Text style={{ fontSize: 13, color: theme.text.secondary }}>
              This removes the run and everything it produced — every step’s agent-run chat and its
              record. This cannot be undone.
            </Text>
            {branches.length > 0 ? (
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
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: nativeSpace[2] }}>
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
  )
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

function RunHead({
  run,
  depth,
  now,
  onCrumb,
  onCancel,
  onDelete,
}: {
  run: ProcessRun
  depth: number
  /** The pipeline's live clock — so a running run's elapsed ticks in the head. */
  now: number
  onCrumb: (depth: number) => void
  onCancel: () => void
  /** Delete the WHOLE run — offered only at the top level (not a drilled child). */
  onDelete?: () => void
}) {
  const { theme } = useNativeTheme()
  const badge = processRunBadge(run)
  const spend = processRunSpend(run)
  // Elapsed EXCLUDES parked time — a run does not age while it waits on a person.
  const end = run.status === 'running' ? now : run.updatedAt
  const durMs = Math.max(0, end - run.startedAt - (run.parkedMs ?? 0))
  const stoppable = run.status === 'running' || run.status === 'pending' || run.status === 'parked'
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
            <Pressable onPress={() => onCrumb(0)} accessibilityRole="button">
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
      <DurCostChips
        facts={{ durationLabel: formatProcessDuration(durMs), costLabel: spend?.label }}
      />
      {stoppable ? (
        <Button size="sm" variant="secondary" onPress={onCancel}>
          Stop
        </Button>
      ) : null}
      {depth === 0 && onDelete ? (
        <Button size="sm" variant="ghost" onPress={onDelete}>
          Delete
        </Button>
      ) : null}
    </View>
  )
}

function Marker({
  nodeState,
  glyph,
  isGate,
}: {
  nodeState: ProcessNodeState
  glyph: string
  isGate: boolean
}) {
  const { status, theme } = useNativeTheme()
  const tone = processNodeTone(nodeState, isGate)
  const queued = nodeState === 'queued' || nodeState === 'skipped'
  const variant = status[tone]
  return (
    <View
      style={{
        width: 26,
        height: 26,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: queued ? theme.surface.base : variant.bg,
        borderWidth: 1.5,
        borderColor: queued ? theme.border.default : variant.bg,
        borderStyle: queued ? 'dashed' : 'solid',
      }}
    >
      <Text
        style={{ fontSize: 10, fontWeight: '700', color: queued ? theme.text.muted : variant.fg }}
      >
        {glyph}
      </Text>
    </View>
  )
}

/**
 * The head of an opened leaf: the ONE way back to the spine, the leaf's name,
 * and — for a verify attempt — the switch between its proof and its transcript.
 */
function LeafHead({
  title,
  onBack,
  view,
  onView,
}: {
  title: string
  onBack: () => void
  view?: 'review' | 'transcript'
  onView?: (view: 'review' | 'transcript') => void
}) {
  const { theme } = useNativeTheme()
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: nativeSpace[2],
        paddingHorizontal: nativeSpace[3],
        paddingVertical: nativeSpace[2],
        borderBottomWidth: 1,
        borderBottomColor: theme.border.subtle,
      }}
    >
      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Back to the pipeline"
        style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
      >
        <IconChevronLeft size={16} color={theme.text.secondary} />
        <Text style={{ fontSize: 13, color: theme.text.secondary }}>Pipeline</Text>
      </Pressable>
      <Text
        numberOfLines={1}
        style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: '500', color: theme.text.primary }}
      >
        {title}
      </Text>
      {view && onView ? (
        <SegmentedControl
          size="sm"
          value={view}
          onChange={(v) => onView(v === 'transcript' ? 'transcript' : 'review')}
          options={[
            { value: 'review', label: 'Review' },
            { value: 'transcript', label: 'Transcript' },
          ]}
        />
      ) : null}
    </View>
  )
}

function PipelineNode({
  run,
  state,
  ordinal,
  isLast,
  now,
  onChoose,
  onDrill,
  onOpenLeaf,
  canOpenTranscript,
  onSaveFile,
}: {
  run: ProcessRun
  state: ReturnType<typeof processStepStates>[number]
  ordinal: number
  isLast: boolean
  now: number
  onChoose: (choice: ProcessResumeChoice, note?: string) => void
  onDrill: (childRunId: string) => void
  onOpenLeaf: (leaf: ProcessOpenLeaf, hasReview: boolean) => void
  canOpenTranscript: boolean
  onSaveFile?: SaveFileHandler
}) {
  const { theme, status } = useNativeTheme()
  const parkStepId = run.park?.stepId
  const nodeState = processNodeState(state, parkStepId)
  const glyph = processNodeGlyph(nodeState, ordinal)
  const childRunId = state.latest?.childRunId
  const isFeature = state.step.kind === 'process'
  const isAgent = state.step.kind === 'agent'
  const total = state.entries.length
  const leafAt = (index: number) =>
    processAttemptLeaf(state.entries[index], state.step.name, { index: index + 1, total })
  const openAttempt = (index: number) => {
    const leaf = leafAt(index)
    if (!isProcessLeafOpenable(run, leaf, canOpenTranscript)) return undefined
    return () => onOpenLeaf(leaf, processLeafReview(run, leaf) !== undefined)
  }
  const latest = latestOpenableAttempt(run, state.entries, state.step.name, canOpenTranscript)
  const open = childRunId
    ? () => onDrill(childRunId)
    : latest
      ? () => onOpenLeaf(latest, processLeafReview(run, latest) !== undefined)
      : undefined
  const iteration = processIterationBadge(state.attempts, run)
  const duration = processEntryDurationLabel(state.latest, now)
  const expanded = isFeature && (state.current || parkStepId === state.step.id)
  const parked = parkStepId === state.step.id

  return (
    <View style={{ flexDirection: 'row', gap: nativeSpace[3] }}>
      <View style={{ width: 26, alignItems: 'center' }}>
        <Marker nodeState={nodeState} glyph={glyph} isGate={state.step.kind === 'gate'} />
        {!isLast ? (
          <View
            style={{
              flex: 1,
              width: 1,
              marginTop: 2,
              backgroundColor: nodeState === 'done' ? status.done.softBorder : theme.border.default,
            }}
          />
        ) : null}
      </View>
      <View style={{ flex: 1, paddingBottom: nativeSpace[3], minWidth: 0 }}>
        <Pressable
          onPress={open}
          disabled={!open}
          accessibilityRole={open ? 'button' : undefined}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: nativeSpace[2],
          }}
        >
          <Text
            style={{
              fontSize: 13.5,
              fontWeight: '600',
              color: nodeState === 'queued' ? theme.text.muted : theme.text.primary,
            }}
          >
            {state.step.name}
          </Text>
          <KindChip kind={state.step.kind} agent={isAgent} />
          {iteration ? (
            <View
              style={{
                backgroundColor: status.working.softBg,
                borderColor: status.working.softBorder,
                borderWidth: 1,
                borderRadius: 999,
                paddingHorizontal: 6,
                paddingVertical: 1,
              }}
            >
              <Text style={{ fontSize: 10.5, fontWeight: '600', color: status.working.softFg }}>
                {iteration}
              </Text>
            </View>
          ) : null}
          <View style={{ flex: 1 }} />
          {duration ? (
            <Text style={{ fontSize: 11, color: theme.text.muted }}>{duration}</Text>
          ) : null}
          {open ? <Text style={{ fontSize: 11, color: theme.text.muted }}>open ›</Text> : null}
        </Pressable>

        {state.latest?.summary ? (
          <Text style={{ fontSize: 12, color: theme.text.secondary }}>{state.latest.summary}</Text>
        ) : null}

        {/* A fix loop runs an agent step several times; the row above opens the
            LATEST. Earlier attempts get chips only when each is its OWN run — a
            developer's fix loop resumes one chat, so its chips would all open
            the same place. */}
        {isAgent && hasIsolatedAttempts(state.entries) ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 10.5, color: theme.text.muted }}>Attempts</Text>
            {state.entries.map((e, i) => {
              const openThis = openAttempt(i)
              const canOpen = openThis !== undefined
              const variant =
                status[processStepTone(e.status === 'running' ? 'running' : 'done', e.outcome)]
              return (
                <Pressable
                  key={e.id ?? i}
                  disabled={!canOpen}
                  onPress={openThis}
                  accessibilityRole="button"
                  style={{
                    borderRadius: nativeRadii.round,
                    paddingHorizontal: 8,
                    paddingVertical: 1,
                    borderWidth: 1,
                    borderColor: variant.softBorder,
                    backgroundColor: variant.softBg,
                    opacity: canOpen ? 1 : 0.6,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 10.5,
                      fontWeight: '600',
                      color: variant.softFg,
                      fontVariant: ['tabular-nums'],
                    }}
                  >
                    #{i + 1}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        ) : null}

        {expanded && childRunId ? <InlineSubSteps childRunId={childRunId} now={now} /> : null}

        {parked ? (
          <ParkBlock
            run={run}
            onChoose={onChoose}
            onDrill={onDrill}
            {...(canOpenTranscript
              ? {
                  onOpenAsked: (ref: ProcessNodeRunRef) =>
                    onOpenLeaf({ ref, title: `${state.step.name} · question` }, false),
                }
              : {})}
            {...(onSaveFile ? { onSaveFile } : {})}
          />
        ) : null}
      </View>
    </View>
  )
}

function KindChip({ kind, agent }: { kind: string; agent: boolean }) {
  const { theme } = useNativeTheme()
  return (
    <View
      style={{
        borderRadius: nativeRadii[1],
        paddingHorizontal: 5,
        paddingVertical: 1,
        borderWidth: 1,
        borderColor: agent ? 'rgba(162,93,220,0.45)' : theme.border.subtle,
        backgroundColor: agent ? 'rgba(162,93,220,0.12)' : 'transparent',
      }}
    >
      <Text
        style={{
          fontSize: 9.5,
          fontWeight: '600',
          letterSpacing: 0.6,
          textTransform: 'uppercase',
          color: agent ? '#A25DDC' : theme.text.muted,
        }}
      >
        {kind}
      </Text>
    </View>
  )
}

function InlineSubSteps({ childRunId, now }: { childRunId: string; now: number }) {
  const { theme, status } = useNativeTheme()
  const { run: child } = useProcessRun(childRunId)
  if (!child) return null
  const states = processStepStates(child)
  const looped = Object.values(child.loopCounts ?? {}).some((n) => n > 0)
  return (
    <View
      style={{
        marginTop: nativeSpace[2],
        marginLeft: 2,
        paddingHorizontal: nativeSpace[3],
        paddingVertical: nativeSpace[2],
        borderLeftWidth: 2,
        borderLeftColor: theme.border.default,
        backgroundColor: theme.surface.overlay,
        borderTopRightRadius: nativeRadii[3],
        borderBottomRightRadius: nativeRadii[3],
        gap: 4,
      }}
    >
      {looped ? (
        <View
          style={{
            backgroundColor: status.working.softBg,
            borderColor: status.working.softBorder,
            borderWidth: 1,
            borderStyle: 'dashed',
            borderRadius: nativeRadii[2],
            paddingHorizontal: nativeSpace[2],
            paddingVertical: 2,
          }}
        >
          <Text style={{ fontSize: 11, color: status.working.softFg }}>
            ↺ Verification sent the work back — retried
          </Text>
        </View>
      ) : null}
      {states.map((s) => {
        const st = processNodeState(s, child.park?.stepId)
        const dur = processEntryDurationLabel(s.latest, now)
        const iter = processIterationBadge(s.attempts, child)
        return (
          <View
            key={s.step.id}
            style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}
          >
            <SubDot nodeState={st} />
            <Text style={{ fontSize: 12, fontWeight: '600', color: theme.text.primary }}>
              {s.step.name}
            </Text>
            {iter ? (
              <Text style={{ fontSize: 11, color: status.working.softFg }}>· {iter}</Text>
            ) : null}
            <View style={{ flex: 1 }} />
            {dur ? <Text style={{ fontSize: 10.5, color: theme.text.muted }}>{dur}</Text> : null}
          </View>
        )
      })}
    </View>
  )
}

function SubDot({ nodeState }: { nodeState: ProcessNodeState }) {
  const { status, theme } = useNativeTheme()
  const tone = processNodeTone(nodeState, false)
  const queued = nodeState === 'queued' || nodeState === 'skipped'
  const variant = status[tone]
  const glyph = nodeState === 'done' ? '✓' : nodeState === 'failed' ? '!' : ''
  return (
    <View
      style={{
        width: 15,
        height: 15,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: queued ? theme.surface.base : variant.bg,
        borderWidth: 1.5,
        borderColor: queued ? theme.border.default : variant.bg,
        borderStyle: queued ? 'dashed' : 'solid',
      }}
    >
      {glyph ? (
        <Text style={{ fontSize: 8, fontWeight: '700', color: variant.fg }}>{glyph}</Text>
      ) : null}
    </View>
  )
}

function ParkBlock({
  run,
  onChoose,
  onOpenAsked,
  onDrill,
  onSaveFile,
}: {
  run: ProcessRun
  onChoose: (choice: ProcessResumeChoice, note?: string) => void
  /** Open the run that asked the question, to answer it in its chat. */
  onOpenAsked?: (ref: ProcessNodeRunRef) => void
  onDrill: (childRunId: string) => void
  onSaveFile?: SaveFileHandler
}) {
  const { theme, status } = useNativeTheme()
  const park = run.park
  if (!park) return null
  const asked = park.reason === 'step-question' ? parkedRunRef(run) : undefined
  const reflected = isReflectedPark(park)
  const variant = park.reason === 'gate' ? status.review : status.on_hold
  // The story sign-off is ONE decision over the whole run — show every feature's
  // proof here, so the reviewer signs off on what they can see, not on trust.
  const isSignoffGate = park.reason === 'gate' && !!run.storyId

  // The story sign-off owns its own panel (head + verdict + digest + sections +
  // decide bar). Hand it the gate's choices so its decide bar acts on the whole
  // story, and drop the outer park chrome that would frame it twice.
  if (isSignoffGate) {
    return (
      <View style={{ marginTop: nativeSpace[2] }}>
        <StorySignoffReview
          projectId={run.projectId}
          storyId={run.storyId as string}
          choices={processParkChoices(park.reason, { reflected })}
          onChoose={onChoose}
          {...(onSaveFile ? { onSaveFile } : {})}
        />
      </View>
    )
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
      <Text style={{ fontSize: 13, fontWeight: '600', color: variant.softFg }}>{park.message}</Text>
      {reflected && park.childRunId ? (
        <Pressable onPress={() => onDrill(park.childRunId as string)} accessibilityRole="button">
          <Text style={{ fontSize: 11, color: theme.text.secondary }}>
            Open the nested run to decide →
          </Text>
        </Pressable>
      ) : null}
      {asked && onOpenAsked ? (
        <Pressable onPress={() => onOpenAsked(asked)} accessibilityRole="button">
          <Text style={{ fontSize: 11, color: theme.text.secondary }}>
            Open the run to answer →
          </Text>
        </Pressable>
      ) : null}
      {processParkChoices(park.reason, { reflected }).map((choice) => (
        <View key={choice.choice} style={{ gap: 2 }}>
          <Button
            size="sm"
            variant={choice.primary ? 'primary' : 'secondary'}
            onPress={() => onChoose(choice.choice)}
          >
            {choice.label}
          </Button>
          <Text style={{ fontSize: 11, color: theme.text.secondary }}>{choice.detail}</Text>
        </View>
      ))}
    </View>
  )
}
