import { useCallback, useState } from 'react'
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
  useProcessRun,
  type ProcessNodeRunRef,
  type ProcessNodeState,
  type ProcessResumeChoice,
  type ProcessRun,
  type ProcessStatusTone,
} from '../../../headless'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'

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
 * The surface a process run is watched on — a pipeline, not a transcript.
 *
 * One continuous spine, one live marker: the settled steps above it, the queued
 * ones dashed below. Which step, which attempt, what it is parked on — the state
 * a transcript buries — is exactly what the spine shows. The chat that a leaf
 * owns is still one click away, one level down.
 *
 * Drilling into a nested node stays inside this component with a breadcrumb;
 * only a LEAF hands off, to the chat it owns. Depth is capped at three by the
 * model itself — a leaf never contains another pipeline.
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

  const states = processStepStates(run)
  const now = Date.now()

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <RunHead run={run} depth={stack.length} onCrumb={popTo} onCancel={() => void cancel()} />

      <ol className="flex flex-col px-3 pb-4 pt-3">
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
          />
        ))}
      </ol>

      {run.error ? (
        <div className="px-4 pb-3 text-[11px] text-(--text-secondary)">{run.error}</div>
      ) : null}
    </div>
  )
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

/** The run header: where you are (breadcrumbs), the headline state, elapsed and spend. */
function RunHead({
  run,
  depth,
  onCrumb,
  onCancel,
}: {
  run: ProcessRun
  depth: number
  onCrumb: (depth: number) => void
  onCancel: () => void
}) {
  const badge = processRunBadge(run)
  const spend = processRunSpend(run)
  // Elapsed EXCLUDES parked time — a run does not age while it waits on a person.
  const durMs = Math.max(0, run.updatedAt - run.startedAt - (run.parkedMs ?? 0))
  const stoppable = run.status === 'running' || run.status === 'pending' || run.status === 'parked'
  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b border-(--border-subtle) bg-(--surface-raised) px-3 py-2.5">
      <nav className="flex min-w-0 flex-wrap items-center gap-1 text-[12px]">
        {/* Only the current run is loaded, so ancestor titles are not known —
            the crumb trail is Top → … → here, capped at three by the model. */}
        {depth > 0 ? (
          <>
            <button
              type="button"
              className="rounded px-1 py-0.5 text-(--text-muted) hover:bg-(--surface-hover) hover:text-(--text-primary)"
              onClick={() => onCrumb(0)}
            >
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
      <span className="text-[11px] tabular-nums text-(--text-muted)">
        {formatProcessDuration(durMs)}
      </span>
      {spend ? (
        <span
          className="text-[11px] tabular-nums text-(--text-muted)"
          title="Spent against the cap"
        >
          {spend.label}
        </span>
      ) : null}
      {stoppable ? (
        <Button size="sm" variant="secondary" onClick={onCancel}>
          Stop
        </Button>
      ) : null}
    </div>
  )
}

/** The 26px marker on the spine — a verdict glyph or the ordinal, coloured by state. */
function Marker({
  nodeState,
  glyph,
  isGate,
}: {
  nodeState: ProcessNodeState
  glyph: string
  isGate: boolean
}) {
  const tone = processNodeTone(nodeState, isGate)
  const queued = nodeState === 'queued' || nodeState === 'skipped'
  return (
    <span
      className="relative grid size-[26px] shrink-0 place-items-center rounded-full text-[10px] font-bold tabular-nums"
      style={
        queued
          ? {
              background: 'var(--surface-base)',
              color: 'var(--text-muted)',
              border: '1.5px dashed var(--border-default)',
            }
          : {
              background: `var(--status-${tone}-bg)`,
              color: `var(--status-${tone}-fg)`,
              border: `1.5px solid var(--status-${tone}-bg)`,
            }
      }
    >
      {nodeState === 'working' ? (
        <span
          aria-hidden
          className="absolute inset-0 animate-ping rounded-full"
          style={{ border: `1.5px solid var(--status-${tone}-bg)`, opacity: 0.5 }}
        />
      ) : null}
      {glyph}
    </span>
  )
}

/**
 * One node on the spine. A `process` node with a child run drills; a leaf opens
 * its chat; a queued function is inert. The node the run is parked on carries the
 * decision inline, and the active feature node shows its nested pipeline inline.
 */
function PipelineNode({
  run,
  state,
  ordinal,
  isLast,
  now,
  onChoose,
  onDrill,
  onOpenAgentRun,
}: {
  run: ProcessRun
  state: ReturnType<typeof processStepStates>[number]
  ordinal: number
  isLast: boolean
  now: number
  onChoose: (choice: ProcessResumeChoice, note?: string) => void
  onDrill: (childRunId: string) => void
  onOpenAgentRun?: (ref: ProcessNodeRunRef) => void
}) {
  const parkStepId = run.park?.stepId
  const nodeState = processNodeState(state, parkStepId)
  const glyph = processNodeGlyph(nodeState, ordinal)
  const childRunId = state.latest?.childRunId
  const runRef = state.latest?.runRef
  const isFeature = state.step.kind === 'process'
  const isAgent = state.step.kind === 'agent'
  const open = childRunId
    ? () => onDrill(childRunId)
    : // Only offer "open ›" when the leaf's run actually has a chat to open.
      // A verifier leaf attaches a runRef WITHOUT a chatContextId, so guarding on
      // the ref alone (as before) left a dead button that navigated nowhere —
      // the same guard `parkedRunRef` already applies.
      runRef?.chatContextId && onOpenAgentRun
      ? () => onOpenAgentRun(runRef)
      : undefined
  const iteration = processIterationBadge(state.attempts, run.plan)
  const duration = processEntryDurationLabel(state.latest, now)
  // The active feature node shows its child pipeline inline — expanded when the
  // run is on it (running or parked), collapsed (and drillable) otherwise.
  const expanded = isFeature && (state.current || parkStepId === state.step.id)
  const parked = parkStepId === state.step.id

  return (
    <li className="relative grid grid-cols-[26px_minmax(0,1fr)] gap-3">
      {!isLast ? (
        <span
          aria-hidden
          className="absolute bottom-0 left-[12.5px] top-[26px] w-px"
          style={{
            background:
              nodeState === 'done' ? 'var(--status-done-soft-border)' : 'var(--border-default)',
          }}
        />
      ) : null}
      <Marker nodeState={nodeState} glyph={glyph} isGate={state.step.kind === 'gate'} />
      <div className="min-w-0 pb-3">
        <button
          type="button"
          disabled={!open}
          onClick={open}
          className="flex w-full flex-wrap items-center gap-2 rounded-md px-1.5 py-1 text-left enabled:hover:bg-(--surface-hover) disabled:cursor-default"
        >
          <span
            className={`text-[13.5px] font-semibold ${nodeState === 'queued' ? 'text-(--text-muted)' : 'text-(--text-primary)'}`}
          >
            {state.step.name}
          </span>
          <KindChip kind={state.step.kind} agent={isAgent} />
          {iteration ? (
            <span
              className="inline-flex items-center rounded-full px-2 py-px text-[10.5px] font-semibold tabular-nums"
              style={{
                background: 'var(--status-working-soft-bg)',
                color: 'var(--status-working-soft-fg)',
                border: '1px solid var(--status-working-soft-border)',
              }}
            >
              {iteration}
            </span>
          ) : null}
          <span className="ml-auto flex items-center gap-2">
            {duration ? (
              <span className="text-[11px] tabular-nums text-(--text-muted)">{duration}</span>
            ) : null}
            {open ? <span className="text-[11px] text-(--text-muted)">open ›</span> : null}
          </span>
        </button>

        {state.latest?.summary ? (
          <div className="whitespace-pre-wrap px-1.5 text-[12px] text-(--text-secondary)">
            {state.latest.summary}
          </div>
        ) : null}

        {expanded && childRunId ? <InlineSubSteps childRunId={childRunId} now={now} /> : null}

        {parked ? (
          <ParkBlock
            run={run}
            onChoose={onChoose}
            onDrill={onDrill}
            {...(onOpenAgentRun ? { onOpenAgentRun } : {})}
          />
        ) : null}
      </div>
    </li>
  )
}

/** The kind tag — an agent step (a model runs) is purple; everything else muted. */
function KindChip({ kind, agent }: { kind: string; agent: boolean }) {
  return (
    <span
      className="rounded px-1.5 py-px text-[9.5px] font-semibold uppercase tracking-wider"
      style={
        agent
          ? {
              color: 'var(--color-purple-700)',
              background: 'color-mix(in srgb, var(--color-purple-650) 12%, transparent)',
              border: '1px solid color-mix(in srgb, var(--color-purple-650) 45%, transparent)',
            }
          : {
              color: 'var(--text-muted)',
              border: '1px solid var(--border-subtle)',
            }
      }
    >
      {kind}
    </span>
  )
}

/**
 * The nested pipeline of the active feature, inline — its own child run's steps,
 * live. A back-edge that fired is drawn as a loop banner rather than described.
 * The child is loaded only while expanded, so a collapsed feature costs nothing.
 */
function InlineSubSteps({ childRunId, now }: { childRunId: string; now: number }) {
  const { run: child } = useProcessRun(childRunId)
  if (!child) return null
  const states = processStepStates(child)
  const looped = Object.values(child.loopCounts ?? {}).some((n) => n > 0)
  return (
    <div className="ml-1 mt-2 flex flex-col gap-1 rounded-r-lg border-l-2 border-(--border-default) bg-(--surface-overlay) px-3 py-2">
      {looped ? (
        <div
          className="mb-0.5 flex items-center gap-2 rounded-md px-2 py-1 text-[11px]"
          style={{
            color: 'var(--status-working-soft-fg)',
            background: 'var(--status-working-soft-bg)',
            border: '1px dashed var(--status-working-soft-border)',
          }}
        >
          ↺ Verification sent the work back — <b className="font-semibold">retried</b>
        </div>
      ) : null}
      {states.map((s) => {
        const st = processNodeState(s, child.park?.stepId)
        const dur = processEntryDurationLabel(s.latest, now)
        const iter = processIterationBadge(s.attempts, child.plan)
        return (
          <div
            key={s.step.id}
            className="flex items-center gap-2 text-[12px] text-(--text-secondary)"
          >
            <SubDot nodeState={st} />
            <b className="font-semibold text-(--text-primary)">{s.step.name}</b>
            {s.latest?.summary ? (
              <span className="truncate text-(--text-muted)">· {s.latest.summary}</span>
            ) : null}
            {iter ? <span className="text-(--status-working-soft-fg)">· {iter}</span> : null}
            {dur ? <span className="ml-auto tabular-nums text-(--text-muted)">{dur}</span> : null}
          </div>
        )
      })}
    </div>
  )
}

function SubDot({ nodeState }: { nodeState: ProcessNodeState }) {
  const tone = processNodeTone(nodeState, false)
  const queued = nodeState === 'queued' || nodeState === 'skipped'
  const glyph = nodeState === 'done' ? '✓' : nodeState === 'failed' ? '!' : ''
  return (
    <span
      className="grid size-[15px] shrink-0 place-items-center rounded-full text-[8px] font-bold"
      style={
        queued
          ? { background: 'var(--surface-base)', border: '1.5px dashed var(--border-default)' }
          : {
              background: `var(--status-${tone}-bg)`,
              color: `var(--status-${tone}-fg)`,
              border: `1.5px solid var(--status-${tone}-bg)`,
            }
      }
    >
      {glyph}
    </span>
  )
}

/**
 * The decision a parked node carries — named choices, inline on the node, never
 * a spinner and a hope. A reflected park is a statement, not a question: its
 * decision belongs to the nested run, so it offers the way there instead.
 */
function ParkBlock({
  run,
  onChoose,
  onOpenAgentRun,
  onDrill,
}: {
  run: ProcessRun
  onChoose: (choice: ProcessResumeChoice, note?: string) => void
  onOpenAgentRun?: (ref: ProcessNodeRunRef) => void
  onDrill: (childRunId: string) => void
}) {
  const park = run.park
  if (!park) return null
  const asked = park.reason === 'step-question' ? parkedRunRef(run) : undefined
  const reflected = isReflectedPark(park)
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
      {asked && onOpenAgentRun ? (
        <button
          type="button"
          className="self-start text-[11px] underline text-(--text-secondary)"
          onClick={() => onOpenAgentRun(asked)}
        >
          Open the run to answer →
        </button>
      ) : null}
      <div className="flex flex-wrap gap-3">
        {processParkChoices(park.reason, { reflected }).map((choice) => (
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
    </div>
  )
}
