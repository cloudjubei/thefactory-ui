import { useCallback, useState, type ReactNode } from 'react'
import {
  formatProcessDuration,
  hasIsolatedAttempts,
  isProcessLeafOpenable,
  isReflectedPark,
  latestOpenableAttempt,
  parkedRunRef,
  processAttemptLeaf,
  processLeafReview,
  processNodeBadge,
  processNodeLook,
  processNodeState,
  processNodeSummary,
  type ProcessNodeLook,
  processParkChoices,
  processRunBadge,
  processRunSpend,
  processRunWorkMs,
  processStepCostLabel,
  processStepWorkMs,
  processStepStates,
  processStepTone,
  useAppSettings,
  useDurationTimer,
  useProcessRun,
  type ProcessNodeRunRef,
  type ProcessOpenLeaf,
  type ProcessResumeChoice,
  type ProcessRun,
  type ProcessStatusTone,
} from '../../../headless'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import { Modal } from '../../primitives/Modal'
import SegmentedControl from '../../primitives/SegmentedControl'
import { IconChevronLeft } from '../../icons'
import { CHIP_PILL_NEUTRAL } from '../chips/pillStyles'
import { DURATION_CHIP_CLASS } from '../chat/ToolCall/StatusIcon'
import RunDiagnosticsView from './RunDiagnosticsView'
import StorySignoffReview from './StorySignoffReview'
import VerificationReview from './VerificationReview'
import type { ProcessRunBranch } from '../../../headless'

export type ProcessPipelineProps = {
  /** The top-level run. Drilling into a nested node stays inside this component. */
  runId: string
  /**
   * Open the agent-run chat a leaf owns. The pipeline never renders a
   * transcript itself — a leaf IS a chat, one level down, and the host already
   * knows how to open one.
   */
  onOpenAgentRun?: (ref: ProcessNodeRunRef) => void
  /**
   * Render a leaf's agent-run chat INSIDE the pipeline (a drill-down), rather
   * than handing off to a Chat route. When provided it wins over
   * `onOpenAgentRun`: opening a leaf swaps the pipeline body for a drill with a
   * "← Pipeline" head and this content below it. `onBack` returns to the spine —
   * hand it to anything in the content that offers the way back. The host owns
   * the render because the chat body lives in the client layer.
   */
  renderAgentRun?: (ref: ProcessNodeRunRef, onBack: () => void) => ReactNode
}

/**
 * The surface a process run is watched on — a pipeline, not a transcript.
 *
 * One continuous spine, one live marker: the settled steps above it, the queued
 * ones dashed below. Which step, which attempt, what it is parked on — the state
 * a transcript buries — is exactly what the spine shows. The chat that a leaf
 * owns is still one click away, one level down.
 *
 * Drilling into a nested node stays inside this component with a breadcrumb,
 * and so does opening a LEAF: a verify attempt opens as its small sign-off (the
 * verdict and the proof it rests on), any other leaf as its chat, under one
 * "← Pipeline" head. Depth is capped at three by the model itself — a leaf never
 * contains another pipeline.
 */
export default function ProcessPipeline({
  runId,
  onOpenAgentRun,
  renderAgentRun,
}: ProcessPipelineProps) {
  const [stack, setStack] = useState<string[]>([])
  const [openLeaf, setOpenLeaf] = useState<ProcessOpenLeaf | null>(null)
  const [leafView, setLeafView] = useState<'review' | 'transcript'>('review')
  const currentId = stack[stack.length - 1] ?? runId
  const { isLoaded, loadError, run, resume, cancel, listBranches, deleteRun } =
    useProcessRun(currentId)
  const { settings } = useAppSettings()
  const showDiagnostics = settings.userPreferences.showRunDiagnostics === true

  // Delete-a-whole-run flow: the confirm lists the branches the run owns and
  // offers to remove them too, since a chat delete leaves the git branches behind.
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [branches, setBranches] = useState<ProcessRunBranch[]>([])
  const [alsoBranches, setAlsoBranches] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleted, setDeleted] = useState(false)

  // One 1s clock for the whole pipeline — ticks while a step is working, so its
  // time advances in real time; stops while the run waits on a person or ends.
  const now = useDurationTimer(run?.totals?.ticking === true)

  const drillTo = useCallback((childId: string) => {
    setOpenLeaf(null)
    setStack((s) => [...s, childId])
  }, [])
  const popTo = useCallback((depth: number) => {
    setOpenLeaf(null)
    setStack((s) => s.slice(0, depth))
  }, [])

  // A leaf opens IN PLACE: a verify attempt as its small sign-off (verdict +
  // the proof it rests on), any other leaf as its chat when the host renders
  // one. Only with neither does it hand off to the host's route.
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
      <div className="p-4">
        <Alert variant="info">This process run and everything it produced were deleted.</Alert>
      </div>
    )
  }
  if (loadError) return <Alert variant="error">{loadError.message}</Alert>
  if (!isLoaded) return <div className="p-4 text-sm text-(--text-secondary)">Loading…</div>
  if (!run) return <Alert variant="error">This run no longer exists.</Alert>

  if (openLeaf) {
    const back = () => setOpenLeaf(null)
    const review = processLeafReview(run, openLeaf)
    const showReview = review !== undefined && leafView === 'review'
    const hasTranscript = openLeaf.ref.chatContextId !== undefined && canOpenTranscript
    const pickView = (view: 'review' | 'transcript') => {
      // Without an in-place renderer the transcript lives on the host's route.
      if (view === 'transcript' && !renderAgentRun) onOpenAgentRun?.(openLeaf.ref)
      else setLeafView(view)
    }
    return (
      <div className="flex h-full min-h-0 flex-col">
        <LeafHead
          title={openLeaf.title}
          onBack={back}
          {...(review && hasTranscript ? { view: leafView, onView: pickView } : {})}
        />
        {showReview ? (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <VerificationReview
              projectId={run.projectId}
              review={review.scope}
              entry={review.entry}
              title={openLeaf.title}
            />
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">{renderAgentRun?.(openLeaf.ref, back)}</div>
        )}
      </div>
    )
  }

  const states = processStepStates(run)

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <RunHead
        now={now}
        run={run}
        depth={stack.length}
        onCrumb={popTo}
        onCancel={() => void cancel()}
        onDelete={openDelete}
      />

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
            onOpenLeaf={openLeafHere}
            canOpenTranscript={canOpenTranscript}
          />
        ))}
      </ol>

      <RunDiagnosticsView runId={currentId} enabled={showDiagnostics} />

      {run.error ? (
        <div className="px-4 pb-3 text-[11px] text-(--text-secondary)">{run.error}</div>
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
              This removes the run and everything it produced — every step’s agent-run chat and its
              record. This cannot be undone.
            </p>
            {branches.length > 0 ? (
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
  const badge = processRunBadge(run)
  const spend = processRunSpend(run)
  // Work time from the ledger: every attempt of every step, nested runs
  // included, and never the time spent waiting on a person.
  const workMs = processRunWorkMs(run, now)
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
      {workMs !== undefined ? (
        <span className={DURATION_CHIP_CLASS} title="Time spent working, across every attempt">
          {formatProcessDuration(workMs)}
        </span>
      ) : null}
      {spend ? (
        <span
          className={`inline-flex items-center gap-1 ${CHIP_PILL_NEUTRAL}`}
          title={spend.cap !== undefined ? 'Spent against the cap' : 'Spent so far'}
        >
          <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden />
          {spend.label}
        </span>
      ) : null}
      {stoppable ? (
        <Button size="sm" variant="secondary" onClick={onCancel}>
          Stop
        </Button>
      ) : null}
      {depth === 0 && onDelete ? (
        <Button size="sm" variant="ghost" onClick={onDelete}>
          Delete
        </Button>
      ) : null}
    </div>
  )
}

/**
 * A node's marker, drawn from its look: a filled mark for a verdict, a dashed
 * numbered outline for what has not run yet, and — only for running work — a
 * green ring that spins.
 */
function Marker({ look, size }: { look: ProcessNodeLook; size: 'node' | 'sub' }) {
  const box = size === 'node' ? 'size-[26px] text-[10px]' : 'size-[15px] text-[8px]'
  const glyph = size === 'sub' && look.shape !== 'solid' ? '' : look.glyph
  return (
    <span
      className={`relative grid shrink-0 place-items-center rounded-full font-bold tabular-nums ${box}`}
      style={
        look.shape === 'dashed'
          ? {
              background: 'var(--surface-base)',
              color: 'var(--text-muted)',
              border: '1.5px dashed var(--border-default)',
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
  onOpenLeaf,
  canOpenTranscript,
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
}) {
  const parkStepId = run.park?.stepId
  const nodeState = processNodeState(state, parkStepId)
  const look = processNodeLook(nodeState, state.step.kind === 'gate', ordinal)
  const summary = processNodeSummary(state)
  const childRunId = state.latest?.childRunId
  const isFeature = state.step.kind === 'process'
  const isAgent = state.step.kind === 'agent'
  const total = state.entries.length
  const leafAt = (index: number) =>
    processAttemptLeaf(state.entries[index], state.step.name, { index: index + 1, total })
  const openAttempt = (index: number) => {
    const leaf = leafAt(index)
    // Only openable when there is something to show: a dead "open ›" that goes
    // nowhere is worse than none.
    if (!isProcessLeafOpenable(run, leaf, canOpenTranscript)) return undefined
    return () => onOpenLeaf(leaf, processLeafReview(run, leaf) !== undefined)
  }
  const latest = latestOpenableAttempt(run, state.entries, state.step.name, canOpenTranscript)
  const open = childRunId
    ? () => onDrill(childRunId)
    : latest
      ? () => onOpenLeaf(latest, processLeafReview(run, latest) !== undefined)
      : undefined
  const iteration = processNodeBadge(state, run)
  const workMs = processStepWorkMs(run, state, now)
  const duration = workMs !== undefined && workMs > 0 ? formatProcessDuration(workMs) : undefined
  const cost = processStepCostLabel(run, state.step.id)
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
      <Marker look={look} size="node" />
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
                background: `var(--status-${look.tone}-soft-bg)`,
                color: `var(--status-${look.tone}-soft-fg)`,
                border: `1px solid var(--status-${look.tone}-soft-border)`,
              }}
            >
              {iteration}
            </span>
          ) : null}
          <span className="ml-auto flex items-center gap-2">
            {duration || cost ? (
              <span
                className="text-[11px] tabular-nums text-(--text-muted)"
                title={total > 1 ? `All ${total} attempts` : undefined}
              >
                {[duration, cost].filter(Boolean).join(' · ')}
              </span>
            ) : null}
            {open ? <span className="text-[11px] text-(--text-muted)">open ›</span> : null}
          </span>
        </button>

        {summary ? (
          <div
            className={`whitespace-pre-wrap px-1.5 text-[12px] ${summary.muted ? 'text-(--text-muted)' : 'text-(--text-secondary)'}`}
          >
            {summary.text}
          </div>
        ) : null}

        {/* A fix loop runs an agent step several times; the button above opens the
            LATEST. Earlier attempts get chips only when each is its OWN run — a
            verifier starts fresh every time, while a developer's fix loop resumes
            one chat, so chips for it would all open the same place. */}
        {isAgent && hasIsolatedAttempts(state.entries) ? (
          <div className="flex flex-wrap items-center gap-1.5 px-1.5 pt-1">
            <span className="text-[10.5px] text-(--text-muted)">Attempts</span>
            {state.entries.map((e, i) => {
              const openThis = openAttempt(i)
              const tone = processStepTone(e.status === 'running' ? 'running' : 'done', e.outcome)
              return (
                <button
                  key={e.id ?? i}
                  type="button"
                  disabled={!openThis}
                  onClick={openThis}
                  title={e.summary ?? e.outcome ?? `Attempt ${i + 1}`}
                  className="inline-flex items-center rounded-full px-2 py-px text-[10.5px] font-semibold tabular-nums enabled:hover:brightness-105 disabled:opacity-60"
                  style={{
                    background: `var(--status-${tone}-soft-bg)`,
                    color: `var(--status-${tone}-soft-fg)`,
                    border: `1px solid var(--status-${tone}-soft-border)`,
                  }}
                >
                  #{i + 1}
                </button>
              )
            })}
          </div>
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
          />
        ) : null}
      </div>
    </li>
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
  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-(--border-subtle) px-3 py-2">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-1 pl-1.5">
        <IconChevronLeft className="h-4 w-4" />
        Pipeline
      </Button>
      <span className="min-w-0 truncate text-[13px] font-medium text-(--text-primary)">
        {title}
      </span>
      {view && onView ? (
        <SegmentedControl
          className="ml-auto"
          size="sm"
          ariaLabel="What to show for this attempt"
          value={view}
          onChange={(v) => onView(v === 'transcript' ? 'transcript' : 'review')}
          options={[
            { value: 'review', label: 'Review' },
            { value: 'transcript', label: 'Transcript' },
          ]}
        />
      ) : null}
    </div>
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
            color: 'var(--status-queued-soft-fg)',
            background: 'var(--status-queued-soft-bg)',
            border: '1px dashed var(--status-queued-soft-border)',
          }}
        >
          ↺ Verification sent the work back — <b className="font-semibold">retried</b>
        </div>
      ) : null}
      {states.map((s, index) => {
        const st = processNodeState(s, child.park?.stepId)
        const workMs = processStepWorkMs(child, s, now)
        const dur = workMs !== undefined && workMs > 0 ? formatProcessDuration(workMs) : undefined
        const iter = processNodeBadge(s, child)
        const line = processNodeSummary(s)
        return (
          <div
            key={s.step.id}
            className="flex items-center gap-2 text-[12px] text-(--text-secondary)"
          >
            <Marker look={processNodeLook(st, s.step.kind === 'gate', index + 1)} size="sub" />
            <b className="font-semibold text-(--text-primary)">{s.step.name}</b>
            {line ? <span className="truncate text-(--text-muted)">· {line.text}</span> : null}
            {iter ? <span className="text-(--text-muted)">· {iter}</span> : null}
            {dur ? <span className="ml-auto tabular-nums text-(--text-muted)">{dur}</span> : null}
          </div>
        )
      })}
    </div>
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
  onOpenAsked,
  onDrill,
}: {
  run: ProcessRun
  onChoose: (choice: ProcessResumeChoice, note?: string) => void
  /** Open the run that asked the question, to answer it in its chat. */
  onOpenAsked?: (ref: ProcessNodeRunRef) => void
  onDrill: (childRunId: string) => void
}) {
  const park = run.park
  if (!park) return null
  const asked = park.reason === 'step-question' ? parkedRunRef(run) : undefined
  const reflected = isReflectedPark(park)
  const tone = park.reason === 'gate' ? 'review' : 'on_hold'
  // The story sign-off is ONE decision over the whole run — show every feature's
  // proof here, so the reviewer signs off on what they can see, not on trust.
  const isSignoffGate = park.reason === 'gate' && !!run.storyId

  // The story sign-off owns its own panel (head + verdict + digest + sections +
  // decide bar). Hand it the gate's choices so its decide bar acts on the whole
  // story, and drop the outer park chrome that would frame it twice.
  if (isSignoffGate) {
    return (
      <div className="mt-2">
        <StorySignoffReview
          projectId={run.projectId}
          storyId={run.storyId as string}
          choices={processParkChoices(park.reason, { reflected })}
          onChoose={onChoose}
        />
      </div>
    )
  }

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
      {asked && onOpenAsked ? (
        <button
          type="button"
          className="self-start text-[11px] underline text-(--text-secondary)"
          onClick={() => onOpenAsked(asked)}
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
