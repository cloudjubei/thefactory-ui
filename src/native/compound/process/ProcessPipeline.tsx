import { useCallback, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'

import {
  PROCESS_OUTCOME_VIEW,
  PROCESS_RUN_STATUS_VIEW,
  isReflectedPark,
  parkedRunRef,
  processParkChoices,
  processRunProgress,
  processRunSpend,
  processStepStates,
  processStepTone,
  useProcessRun,
  type ProcessNodeRunRef,
  type ProcessResumeChoice,
  type ProcessRun,
  type ProcessStatusTone,
  type ProcessStepOutcome,
} from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import { useNativeTheme } from '../../hooks/useNativeTheme'

export type ProcessPipelineProps = {
  /** The top-level run. Drilling into a nested node stays inside this component. */
  runId: string
  /** Open the agent-run chat a leaf owns. A leaf IS a chat, one level down. */
  onOpenAgentRun?: (ref: ProcessNodeRunRef) => void
}

/**
 * Native peer of
 * [web's `ProcessPipeline`](../../../web/compound/process/ProcessPipeline.tsx).
 * Same prop surface.
 *
 * The pipeline REPLACES the message list for a run: which step, which attempt,
 * what it is waiting on. On a small screen that matters more, not less — a
 * transcript is the least readable way to answer "where is this" on a phone.
 */
export default function ProcessPipeline({ runId, onOpenAgentRun }: ProcessPipelineProps) {
  const { theme } = useNativeTheme()
  const [stack, setStack] = useState<string[]>([])
  const currentId = stack[stack.length - 1] ?? runId
  const { isLoaded, loadError, run, resume, cancel } = useProcessRun(currentId)

  const drillTo = useCallback((childId: string) => setStack((s) => [...s, childId]), [])
  const popTo = useCallback((depth: number) => setStack((s) => s.slice(0, depth)), [])

  if (loadError) return <Alert variant="error">{loadError.message}</Alert>
  if (!isLoaded) {
    return (
      <View style={{ padding: nativeSpace[5] }}>
        <Text style={{ fontSize: 13, color: theme.text.secondary }}>Loading…</Text>
      </View>
    )
  }
  if (!run) return <Alert variant="error">This run no longer exists.</Alert>

  const progress = processRunProgress(run)
  const spend = processRunSpend(run)
  const statusView = PROCESS_RUN_STATUS_VIEW[run.status]
  const stoppable = run.status === 'running' || run.status === 'pending' || run.status === 'parked'

  return (
    <ScrollView contentContainerStyle={{ padding: nativeSpace[4], gap: nativeSpace[3] }}>
      {stack.length > 0 ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: nativeSpace[1],
          }}
        >
          <Pressable onPress={() => popTo(0)} accessibilityRole="button">
            <Text style={{ fontSize: 12, color: theme.text.secondary }}>← Top</Text>
          </Pressable>
          {/* Every level, as on web. A single "Top" made the middle of a deep
              stack unreachable in one move — the small screen is where that
              costs most, since there is no second pane to hold the place. */}
          {stack.map((id, index) => (
            <View
              key={id}
              style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[1] }}
            >
              <Text style={{ fontSize: 12, color: theme.text.secondary }}>/</Text>
              {index === stack.length - 1 ? (
                <Text style={{ fontSize: 12, color: theme.text.primary }}>{run.title}</Text>
              ) : (
                <Pressable onPress={() => popTo(index + 1)} accessibilityRole="button">
                  <Text style={{ fontSize: 12, color: theme.text.secondary }}>…</Text>
                </Pressable>
              )}
            </View>
          ))}
        </View>
      ) : null}

      <View style={{ gap: nativeSpace[1] }}>
        <Text style={{ fontSize: 17, fontWeight: '600', color: theme.text.primary }}>
          {run.title}
        </Text>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: nativeSpace[2],
          }}
        >
          <ToneBadge tone={statusView.tone} label={statusView.label} />
          <Text style={{ fontSize: 12, color: theme.text.secondary }}>
            {progress.completed} of {progress.total} steps · {run.plan.name}
            {spend ? ` · ${spend.label}` : ''}
          </Text>
          {stoppable ? (
            <Button size="sm" variant="secondary" onPress={() => void cancel()}>
              Stop
            </Button>
          ) : null}
        </View>
      </View>

      {run.park ? (
        <ParkBanner
          run={run}
          onChoose={(choice) => void resume(choice)}
          onDrill={drillTo}
          {...(onOpenAgentRun ? { onOpenAgentRun } : {})}
        />
      ) : null}

      <View style={{ gap: nativeSpace[2] }}>
        {processStepStates(run).map((state, index) => (
          <StepRow
            key={state.step.id}
            index={index}
            name={state.step.name}
            kind={state.step.kind}
            status={state.status}
            current={state.current}
            attempts={state.attempts}
            {...(state.outcome ? { outcome: state.outcome } : {})}
            {...(state.latest?.summary ? { summary: state.latest.summary } : {})}
            {...(state.latest?.childRunId ? { childRunId: state.latest.childRunId } : {})}
            {...(state.latest?.runRef ? { runRef: state.latest.runRef } : {})}
            onDrill={drillTo}
            {...(onOpenAgentRun ? { onOpenAgentRun } : {})}
          />
        ))}
      </View>

      {run.error ? (
        <Text style={{ fontSize: 12, color: theme.text.secondary }}>{run.error}</Text>
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

/**
 * What the run is waiting for, and the choices that answer it — stacked rather
 * than in a row, because a phone has no room for four side-by-side buttons and
 * each choice carries a line saying what it does.
 */
function ParkBanner({
  run,
  onChoose,
  onOpenAgentRun,
  onDrill,
}: {
  run: ProcessRun
  onChoose: (choice: ProcessResumeChoice) => void
  onOpenAgentRun?: (ref: ProcessNodeRunRef) => void
  onDrill: (childRunId: string) => void
}) {
  const { theme } = useNativeTheme()
  const park = run.park
  if (!park) return null
  // A park waiting on an ANSWER has somewhere to go: the run that asked.
  const asked = park.reason === 'step-question' ? parkedRunRef(run) : undefined
  // A MIRRORED park is a statement, not a question — the decision belongs to
  // the nested run, where its context is, and the server refuses to answer it
  // here. So the banner offers the one thing that does work: going there.
  const reflected = isReflectedPark(park)
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: theme.border.subtle,
        backgroundColor: theme.surface.raised,
        borderRadius: nativeRadii[3],
        padding: nativeSpace[3],
        gap: nativeSpace[3],
      }}
    >
      <Text style={{ fontSize: 14, color: theme.text.primary }}>{park.message}</Text>
      {reflected && park.childRunId ? (
        <Pressable onPress={() => onDrill(park.childRunId as string)} accessibilityRole="button">
          <Text style={{ fontSize: 12, color: theme.text.secondary }}>
            Open the nested run to decide →
          </Text>
        </Pressable>
      ) : null}
      {asked && onOpenAgentRun ? (
        <Pressable onPress={() => onOpenAgentRun(asked)} accessibilityRole="button">
          <Text style={{ fontSize: 12, color: theme.text.secondary }}>
            Open the run to answer →
          </Text>
        </Pressable>
      ) : null}
      {processParkChoices(park.reason, { reflected }).map((choice) => (
        <View key={choice.choice} style={{ gap: nativeSpace[1] }}>
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

function StepRow({
  index,
  name,
  kind,
  status,
  current,
  attempts,
  outcome,
  summary,
  childRunId,
  runRef,
  onDrill,
  onOpenAgentRun,
}: {
  index: number
  name: string
  kind: string
  status: 'pending' | 'running' | 'done'
  current: boolean
  attempts: number
  outcome?: ProcessStepOutcome
  summary?: string
  childRunId?: string
  runRef?: ProcessNodeRunRef
  onDrill: (childRunId: string) => void
  onOpenAgentRun?: (ref: ProcessNodeRunRef) => void
}) {
  const { theme, status: statusTokens } = useNativeTheme()
  // A node is either a nested process or a leaf that owns one agent run — the
  // whole navigation rule, same as web.
  const open = childRunId
    ? () => onDrill(childRunId)
    : runRef && onOpenAgentRun
      ? () => onOpenAgentRun(runRef)
      : undefined
  const tone = processStepTone(status, outcome)

  return (
    <Pressable
      onPress={open}
      disabled={!open}
      accessibilityRole={open ? 'button' : undefined}
      style={{
        borderWidth: 1,
        borderColor: current ? theme.border.focus : theme.border.subtle,
        backgroundColor: theme.surface.raised,
        borderRadius: nativeRadii[3],
        padding: nativeSpace[3],
        gap: nativeSpace[1],
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: nativeSpace[2],
        }}
      >
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: statusTokens[tone].fg,
          }}
        />
        <Text style={{ fontSize: 12, color: theme.text.secondary }}>{index + 1}</Text>
        <Text style={{ fontSize: 14, fontWeight: '500', color: theme.text.primary }}>{name}</Text>
        <Text style={{ fontSize: 11, color: theme.text.muted }}>{kind}</Text>
        {attempts > 1 ? (
          <Text style={{ fontSize: 11, color: theme.text.secondary }}>attempt {attempts}</Text>
        ) : null}
        {outcome ? (
          <ToneBadge
            tone={PROCESS_OUTCOME_VIEW[outcome].tone}
            label={PROCESS_OUTCOME_VIEW[outcome].label}
          />
        ) : null}
      </View>
      {summary ? (
        <Text style={{ fontSize: 12, color: theme.text.secondary }}>{summary}</Text>
      ) : null}
      {open ? (
        <Text style={{ fontSize: 11, color: theme.text.secondary }}>
          {childRunId ? 'Open the steps →' : 'Open the run →'}
        </Text>
      ) : null}
    </Pressable>
  )
}
