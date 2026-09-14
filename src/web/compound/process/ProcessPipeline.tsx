import { useCallback, useMemo, useState } from 'react'
import type {
  ProcessNodeRunRef,
  ProcessResumeChoice,
  ProcessRun,
  ProcessStepOutcome,
} from 'thefactory-tools/types'
import { processParkChoices, processRunProgress, processStepStates } from 'thefactory-tools/utils'
import {
  PROCESS_OUTCOME_VIEW,
  PROCESS_RUN_STATUS_VIEW,
  processStepTone,
  useProcessRun,
  type ProcessStatusTone,
} from '../../../headless'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import Surface from '../../primitives/Surface'

export type ProcessPipelineProps = {
  /** The top-level run. Drilling into a nested node stays inside this component. */
  runId: string
  /**
   * Open the agent-run chat a leaf owns. The pipeline never renders a
   * transcript itself — a leaf IS a chat, one level down, and the host already
   * knows how to open one.
   */
  onOpenAgentRun?: (ref: ProcessNodeRunRef) => void
}

/**
 * The surface a process run is watched on: the plan, where it is, and what it
 * is waiting for.
 *
 * This REPLACES the message list for a run. The interesting state — which step,
 * which attempt, what it is parked on — is exactly what a transcript buries,
 * and the transcript is still one click away on the node that owns it.
 *
 * Drilling into a nested node stays inside this component with a breadcrumb,
 * because a nested process is the same thing one level down; only a LEAF hands
 * off, to the chat it owns.
 */
export default function ProcessPipeline({ runId, onOpenAgentRun }: ProcessPipelineProps) {
  const [stack, setStack] = useState<string[]>([])
  const currentId = stack[stack.length - 1] ?? runId
  const { isLoaded, loadError, run, resume, cancel } = useProcessRun(currentId)

  const drillTo = useCallback((childId: string) => setStack((s) => [...s, childId]), [])
  const popTo = useCallback((depth: number) => setStack((s) => s.slice(0, depth)), [])

  if (loadError) return <Alert variant="error">{loadError.message}</Alert>
  if (!isLoaded) return <div className="p-4 text-sm text-(--text-secondary)">Loading…</div>
  if (!run) return <Alert variant="error">This run no longer exists.</Alert>

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto p-4">
      {stack.length > 0 ? (
        <nav className="flex flex-wrap items-center gap-1 text-[11px] text-(--text-secondary)">
          <button type="button" className="underline" onClick={() => popTo(0)}>
            Top
          </button>
          {stack.map((id, index) => (
            <span key={id} className="flex items-center gap-1">
              <span aria-hidden>/</span>
              {index === stack.length - 1 ? (
                <span className="text-(--text-primary)">{run.title}</span>
              ) : (
                <button type="button" className="underline" onClick={() => popTo(index + 1)}>
                  …
                </button>
              )}
            </span>
          ))}
        </nav>
      ) : null}

      <PipelineHeader run={run} onCancel={() => void cancel()} />

      {run.park ? <ParkBanner run={run} onChoose={(choice) => void resume(choice)} /> : null}

      <ol className="flex flex-col gap-2">
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
      </ol>

      {run.error ? <div className="text-[11px] text-(--text-secondary)">{run.error}</div> : null}
    </div>
  )
}

/** A status pill in the package's own semantic palette. */
function ToneBadge({ tone, children }: { tone: ProcessStatusTone; children: string }) {
  return (
    <span
      className="rounded px-1.5 py-px text-[10px]"
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

function PipelineHeader({ run, onCancel }: { run: ProcessRun; onCancel: () => void }) {
  const progress = useMemo(() => processRunProgress(run), [run])
  const view = PROCESS_RUN_STATUS_VIEW[run.status]
  const running = run.status === 'running' || run.status === 'pending' || run.status === 'parked'
  return (
    <div className="flex flex-wrap items-center gap-2">
      <h2 className="text-base font-semibold">{run.title}</h2>
      <span className="text-[11px] text-(--text-secondary)">{run.plan.name}</span>
      <ToneBadge tone={view.tone}>{view.label}</ToneBadge>
      <span className="text-[11px] text-(--text-secondary)">
        {progress.completed} of {progress.total} steps
      </span>
      {running ? (
        <Button className="ml-auto" size="sm" variant="secondary" onClick={onCancel}>
          Stop
        </Button>
      ) : null}
    </div>
  )
}

/**
 * What the run is waiting for, and the choices that answer it.
 *
 * Named choices rather than one "resume" button: the reasons a run parks are
 * not interchangeable, and a single button would hide which one this is.
 */
function ParkBanner({
  run,
  onChoose,
}: {
  run: ProcessRun
  onChoose: (choice: ProcessResumeChoice) => void
}) {
  const park = run.park
  if (!park) return null
  return (
    <Surface className="flex flex-col gap-2 p-3">
      <div className="text-sm">{park.message}</div>
      <div className="flex flex-wrap gap-3">
        {processParkChoices(park.reason).map((choice) => (
          <div key={choice.choice} className="flex flex-col gap-0.5">
            <Button
              size="sm"
              variant={choice.primary ? 'primary' : 'secondary'}
              onClick={() => onChoose(choice.choice)}
            >
              {choice.label}
            </Button>
            <span className="max-w-48 text-[10px] text-(--text-secondary)">{choice.detail}</span>
          </div>
        ))}
      </div>
    </Surface>
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
  // A node is either a nested process or a leaf that owns one agent run. That
  // is the whole navigation rule: clicking opens the pipeline one level down,
  // or the chat, and nothing else.
  const open = childRunId
    ? () => onDrill(childRunId)
    : runRef && onOpenAgentRun
      ? () => onOpenAgentRun(runRef)
      : undefined

  return (
    <Surface
      as={open ? 'button' : 'div'}
      {...(open ? { type: 'button' as const, onClick: open } : {})}
      className="w-full p-3 text-left"
      style={current ? { borderColor: 'var(--accent-primary)' } : undefined}
    >
      <div className="flex flex-wrap items-center gap-2">
        <StatusDot tone={processStepTone(status, outcome)} />
        <span className="text-[11px] text-(--text-secondary)">{index + 1}</span>
        <span className="text-sm font-medium">{name}</span>
        <span className="rounded bg-(--surface-muted) px-1 py-px text-[10px]">{kind}</span>
        {attempts > 1 ? (
          <span className="text-[10px] text-(--text-secondary)">attempt {attempts}</span>
        ) : null}
        {outcome ? (
          <ToneBadge tone={PROCESS_OUTCOME_VIEW[outcome].tone}>
            {PROCESS_OUTCOME_VIEW[outcome].label}
          </ToneBadge>
        ) : null}
        {open ? (
          <span className="ml-auto text-[10px] text-(--text-secondary)">
            {childRunId ? 'Open the steps →' : 'Open the run →'}
          </span>
        ) : null}
      </div>
      {summary ? (
        <div className="mt-1 whitespace-pre-wrap text-[11px] text-(--text-secondary)">
          {summary}
        </div>
      ) : null}
    </Surface>
  )
}

function StatusDot({ tone }: { tone: ProcessStatusTone }) {
  return (
    <span
      aria-hidden
      className="inline-block size-2 shrink-0 rounded-full"
      style={{ background: `var(--status-${tone}-fg)` }}
    />
  )
}
