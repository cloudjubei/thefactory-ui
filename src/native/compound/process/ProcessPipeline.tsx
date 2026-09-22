import { useCallback, useState } from 'react'
import { Pressable, ScrollView, Switch, Text, View } from 'react-native'

import {
  formatProcessDuration,
  isReflectedPark,
  parkedRunRef,
  processEntryDurationLabel,
  processIterationBadge,
  processNodeGlyph,
  processNodeState,
  processNodeTone,
  processParkChoices,
  processRunBadge,
  processRunSpend,
  processStepStates,
  useAppSettings,
  useProcessRun,
  type ProcessNodeRunRef,
  type ProcessNodeState,
  type ProcessResumeChoice,
  type ProcessRun,
  type ProcessStatusTone,
} from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import type { ProcessRunBranch } from '../../../headless'
import Alert from '../../primitives/Alert'
import RunDiagnosticsView from './RunDiagnosticsView'
import StorySignoffReview from './StorySignoffReview'
import type { SaveFileHandler } from '../chat/signoff'
import { Button } from '../../primitives/Button'
import { Modal } from '../../primitives/Modal'
import { useNativeTheme } from '../../hooks/useNativeTheme'

export type ProcessPipelineProps = {
  /** The top-level run. Drilling into a nested node stays inside this component. */
  runId: string
  /** Open the agent-run chat a leaf owns. A leaf IS a chat, one level down. */
  onOpenAgentRun?: (ref: ProcessNodeRunRef) => void
  /** Native host's file saver; enables the story gate's downloads when provided. */
  onSaveFile?: SaveFileHandler
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
  onSaveFile,
}: ProcessPipelineProps) {
  const { theme } = useNativeTheme()
  const [stack, setStack] = useState<string[]>([])
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

  const drillTo = useCallback((childId: string) => setStack((s) => [...s, childId]), [])
  const popTo = useCallback((depth: number) => setStack((s) => s.slice(0, depth)), [])

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

  const states = processStepStates(run)
  const now = Date.now()

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: nativeSpace[5] }}>
      <RunHead
        run={run}
        depth={stack.length}
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
            {...(onOpenAgentRun ? { onOpenAgentRun } : {})}
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
  onCrumb,
  onCancel,
  onDelete,
}: {
  run: ProcessRun
  depth: number
  onCrumb: (depth: number) => void
  onCancel: () => void
  /** Delete the WHOLE run — offered only at the top level (not a drilled child). */
  onDelete?: () => void
}) {
  const { theme } = useNativeTheme()
  const badge = processRunBadge(run)
  const spend = processRunSpend(run)
  // Elapsed EXCLUDES parked time — a run does not age while it waits on a person.
  const durMs = Math.max(0, run.updatedAt - run.startedAt - (run.parkedMs ?? 0))
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
      <Text style={{ fontSize: 11, color: theme.text.muted }}>{formatProcessDuration(durMs)}</Text>
      {spend ? <Text style={{ fontSize: 11, color: theme.text.muted }}>{spend.label}</Text> : null}
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

function PipelineNode({
  run,
  state,
  ordinal,
  isLast,
  now,
  onChoose,
  onDrill,
  onOpenAgentRun,
  onSaveFile,
}: {
  run: ProcessRun
  state: ReturnType<typeof processStepStates>[number]
  ordinal: number
  isLast: boolean
  now: number
  onChoose: (choice: ProcessResumeChoice, note?: string) => void
  onDrill: (childRunId: string) => void
  onOpenAgentRun?: (ref: ProcessNodeRunRef) => void
  onSaveFile?: SaveFileHandler
}) {
  const { theme, status } = useNativeTheme()
  const parkStepId = run.park?.stepId
  const nodeState = processNodeState(state, parkStepId)
  const glyph = processNodeGlyph(nodeState, ordinal)
  const childRunId = state.latest?.childRunId
  const runRef = state.latest?.runRef
  const isFeature = state.step.kind === 'process'
  const isAgent = state.step.kind === 'agent'
  const open = childRunId
    ? () => onDrill(childRunId)
    : // Only offer "open ›" when the leaf's run actually has a chat to open. A
      // verifier leaf attaches a runRef WITHOUT a chatContextId, so guarding on
      // the ref alone left a dead button — the same guard `parkedRunRef` applies.
      runRef?.chatContextId && onOpenAgentRun
      ? () => onOpenAgentRun(runRef)
      : undefined
  const iteration = processIterationBadge(state.attempts, run.plan)
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

        {expanded && childRunId ? <InlineSubSteps childRunId={childRunId} now={now} /> : null}

        {parked ? (
          <ParkBlock
            run={run}
            onChoose={onChoose}
            onDrill={onDrill}
            {...(onOpenAgentRun ? { onOpenAgentRun } : {})}
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
        const iter = processIterationBadge(s.attempts, child.plan)
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
  onOpenAgentRun,
  onDrill,
  onSaveFile,
}: {
  run: ProcessRun
  onChoose: (choice: ProcessResumeChoice, note?: string) => void
  onOpenAgentRun?: (ref: ProcessNodeRunRef) => void
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
      {isSignoffGate ? (
        <StorySignoffReview
          projectId={run.projectId}
          storyId={run.storyId as string}
          {...(onSaveFile ? { onSaveFile } : {})}
        />
      ) : null}
      {reflected && park.childRunId ? (
        <Pressable onPress={() => onDrill(park.childRunId as string)} accessibilityRole="button">
          <Text style={{ fontSize: 11, color: theme.text.secondary }}>
            Open the nested run to decide →
          </Text>
        </Pressable>
      ) : null}
      {asked && onOpenAgentRun ? (
        <Pressable onPress={() => onOpenAgentRun(asked)} accessibilityRole="button">
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
