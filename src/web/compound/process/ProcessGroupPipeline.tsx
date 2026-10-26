import { useCallback, useState } from 'react'

import {
  costChipLabel,
  formatProcessDuration,
  processGroupBadge,
  processGroupLegRows,
  processGroupProgress,
  processGroupResumeRebuildLegIds,
  processGroupResumeView,
  processGroupWorkMs,
  PROCESS_GROUP_MARK_LANDED_LABEL,
  PROCESS_GROUP_RESUME_LABEL,
  PROCESS_GROUP_STOP_CONFIRM_COPY,
  useDurationTimer,
  useProcessGroupRebuildPlans,
  useProcessGroupRun,
  useProcessGroupRunChat,
  type ProcessGroupLeg,
  type ProcessGroupLegRow,
  type ProcessRunBranch,
  type ProcessRunChatOpened,
  type ProcessStatusTone,
} from '../../../headless'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import { Modal } from '../../primitives/Modal'
import CostChip from '../chips/CostChip'
import DurationChip from '../chips/DurationChip'
import ProcessGroupLegLandingDialog from './ProcessGroupLegLandingDialog'
import ProcessGroupParkReview from './ProcessGroupParkReview'
import ProcessGroupRunChatButton from './ProcessGroupRunChatButton'

export type ProcessGroupPipelineProps = {
  groupRunId: string
  /** Open one project's own pipeline — where it is signed off and its asks are answered. */
  onOpenLegRun: (runId: string, projectId: string) => void
  /** Open a chat for the whole group on the run; no Chat button without it. */
  onOpenChat?: (opened: ProcessRunChatOpened) => void
}

const ENDED = ['succeeded', 'failed', 'cancelled']

/**
 * One group run: every project's leg, drawn by dependency level — what needs
 * nothing first, then what builds on it — with where each stands, what it
 * waits for and what it has cost. Each project is signed off and merged in its
 * own pipeline, one click away — a project only once the ones it builds on are
 * merged; only what the group alone can answer (a project that stopped, a
 * merged project that does not build, a failed merge) is answered here — and a
 * project whose work landed another way is marked so, after which an ended
 * group run can be resumed for the projects that waited on it.
 */
export default function ProcessGroupPipeline({
  groupRunId,
  onOpenLegRun,
  onOpenChat,
}: ProcessGroupPipelineProps) {
  const chat = useProcessGroupRunChat(groupRunId)
  const {
    isLoaded,
    loadError,
    actionError,
    group,
    deleted,
    resume,
    cancel,
    checkLanding,
    markLanded,
    planRebuild,
    reopen,
    listBranches,
    deleteGroupRun,
  } = useProcessGroupRun(groupRunId)
  const resumePlans = useProcessGroupRebuildPlans(
    processGroupResumeRebuildLegIds(group),
    planRebuild,
  )
  const ticking = group?.totals?.ticking === true
  const now = useDurationTimer(ticking)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmStop, setConfirmStop] = useState(false)
  const [branches, setBranches] = useState<ProcessRunBranch[]>([])
  const [alsoBranches, setAlsoBranches] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [landingLeg, setLandingLeg] = useState<ProcessGroupLeg | undefined>(undefined)
  const [confirmResume, setConfirmResume] = useState(false)
  const [resuming, setResuming] = useState(false)

  const runResume = useCallback(() => {
    setResuming(true)
    void reopen()
      .then(() => setConfirmResume(false))
      .finally(() => setResuming(false))
  }, [reopen])

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
    void deleteGroupRun({ deleteBranches: alsoBranches })
      .then(() => setConfirmDelete(false))
      .finally(() => setDeleting(false))
  }, [deleteGroupRun, alsoBranches])

  if (deleted) {
    return (
      <div className="p-4">
        <Alert variant="info">
          This group run and everything its projects produced were deleted.
        </Alert>
      </div>
    )
  }
  if (loadError) return <Alert variant="error">{loadError.message}</Alert>
  if (!isLoaded) return <div className="p-4 text-sm text-(--text-secondary)">Loading…</div>
  if (!group) return <Alert variant="error">This group run no longer exists.</Alert>

  const badge = processGroupBadge(group)
  const { merged, total } = processGroupProgress(group)
  const waves = processGroupLegRows(group)
  const ended = ENDED.includes(group.status)
  const workMs = processGroupWorkMs(group.totals, now)
  const spend = costChipLabel(group.totals)
  const resumeView = processGroupResumeView(group, resumePlans)

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b border-(--border-subtle) bg-(--surface-raised) px-3 py-2.5">
        <span className="min-w-0 truncate text-[12px] font-semibold text-(--text-primary)">
          {group.title}
        </span>
        <span className="text-[11px] text-(--text-muted)">
          {total} project{total === 1 ? '' : 's'} · {merged} merged
        </span>
        <span className="grow" />
        <ToneBadge tone={badge.tone}>{badge.label}</ToneBadge>
        {workMs !== undefined ? (
          <DurationChip
            label={formatProcessDuration(workMs)}
            title="Time every project spent working, summed"
          />
        ) : null}
        {spend ? (
          <CostChip label={spend} cost={group.totals} title="Every project, summed" />
        ) : null}
        {onOpenChat ? (
          <ProcessGroupRunChatButton
            busy={chat.busy}
            onOpen={() => {
              void chat.open().then((opened) => {
                if (opened) onOpenChat(opened)
              })
            }}
          />
        ) : null}
        {resumeView?.canResume ? (
          <Button size="sm" variant="primary" onClick={() => setConfirmResume(true)}>
            {PROCESS_GROUP_RESUME_LABEL}
          </Button>
        ) : null}
        {ended ? (
          <Button size="sm" variant="ghost" onClick={openDelete}>
            Delete
          </Button>
        ) : (
          <Button size="sm" variant="secondary" onClick={() => setConfirmStop(true)}>
            Stop
          </Button>
        )}
      </div>

      {chat.error ? (
        <div className="px-3 pt-3">
          <Alert variant="error">{chat.error}</Alert>
        </div>
      ) : null}
      {actionError ? (
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

      {resumeView && !resumeView.canResume ? (
        <div className="mx-3 mt-3 text-[11.5px] text-(--text-secondary)">{resumeView.reason}</div>
      ) : null}

      {group.park ? (
        <div className="mx-3 mt-3">
          <ProcessGroupParkReview key={group.park.parkedAt} group={group} onResume={resume} />
        </div>
      ) : null}

      <ol className="flex flex-col gap-3 px-3 pb-4 pt-3">
        {waves.map((wave, i) => (
          <li key={i} className="flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)">
              {i === 0 ? 'Starts at once' : `Then — step ${i + 1}`}
            </span>
            <div className="grid gap-2 sm:grid-cols-2">
              {wave.map((row) => (
                <LegCard
                  key={row.leg.id}
                  row={row}
                  now={now}
                  onOpen={onOpenLegRun}
                  onMarkLanded={setLandingLeg}
                />
              ))}
            </div>
          </li>
        ))}
      </ol>

      {group.error ? (
        <div className="px-4 pb-3 text-[11px] text-(--text-secondary)">{group.error}</div>
      ) : null}

      {landingLeg ? (
        <ProcessGroupLegLandingDialog
          group={group}
          leg={landingLeg}
          planRebuild={planRebuild}
          checkLanding={checkLanding}
          markLanded={markLanded}
          onClose={() => setLandingLeg(undefined)}
        />
      ) : null}

      {confirmResume && resumeView?.canResume ? (
        <Modal
          isOpen
          onClose={() => setConfirmResume(false)}
          title="Resume this group run?"
          size="sm"
        >
          <div className="flex flex-col gap-3 text-[13px] text-(--text-secondary)">
            <p className="m-0">{resumeView.effect}</p>
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="ghost"
                disabled={resuming}
                onClick={() => setConfirmResume(false)}
              >
                Cancel
              </Button>
              <Button size="sm" variant="primary" loading={resuming} onClick={runResume}>
                {PROCESS_GROUP_RESUME_LABEL}
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}

      {confirmStop ? (
        <Modal
          isOpen
          onClose={() => setConfirmStop(false)}
          title={PROCESS_GROUP_STOP_CONFIRM_COPY.title}
          size="sm"
        >
          <div className="flex flex-col gap-3 text-[13px] text-(--text-secondary)">
            <p className="m-0">{PROCESS_GROUP_STOP_CONFIRM_COPY.body}</p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setConfirmStop(false)}>
                {PROCESS_GROUP_STOP_CONFIRM_COPY.cancel}
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  setConfirmStop(false)
                  void cancel()
                }}
              >
                {PROCESS_GROUP_STOP_CONFIRM_COPY.confirm}
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}

      {confirmDelete ? (
        <Modal
          isOpen
          onClose={() => setConfirmDelete(false)}
          title="Delete this group run?"
          size="sm"
        >
          <div className="flex flex-col gap-3 text-[13px] text-(--text-secondary)">
            <p className="m-0">
              This removes the group run and every project’s runs — each step’s agent-run chat and
              its record. This cannot be undone.
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
                        {b.projectId} · {b.branch}
                      </span>
                    ))}
                  </span>
                </span>
              </label>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="ghost"
                disabled={deleting}
                onClick={() => setConfirmDelete(false)}
              >
                Cancel
              </Button>
              <Button size="sm" variant="danger" loading={deleting} onClick={runDelete}>
                Delete
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  )
}

function LegCard({
  row,
  now,
  onOpen,
  onMarkLanded,
}: {
  row: ProcessGroupLegRow
  now: number
  onOpen: (runId: string, projectId: string) => void
  onMarkLanded: (leg: ProcessGroupLeg) => void
}) {
  const { leg, totals } = row
  const workMs = processGroupWorkMs(totals, now)
  const spend = costChipLabel(totals)
  return (
    <div
      className="flex flex-col gap-1.5 rounded-lg border p-2.5"
      style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface-raised)' }}
    >
      <div className="flex items-center gap-2">
        <span className="min-w-0 truncate text-[12.5px] font-semibold text-(--text-primary)">
          {leg.projectId}
        </span>
        <span className="ml-auto shrink-0">
          <ToneBadge tone={row.tone}>{row.label}</ToneBadge>
        </span>
      </div>
      <div className="truncate text-[11.5px] text-(--text-secondary)">{leg.title}</div>
      {row.waitsFor ? <div className="text-[11px] text-(--text-muted)">{row.waitsFor}</div> : null}
      {row.landed ? <div className="text-[11px] text-(--text-muted)">{row.landed}</div> : null}
      {row.error ? (
        <div
          className="rounded-md px-2 py-1 text-[11px]"
          style={{
            background: 'var(--status-stuck-soft-bg)',
            color: 'var(--status-stuck-soft-fg)',
          }}
        >
          {row.error}
        </div>
      ) : null}
      <div className="flex items-center gap-2">
        {leg.runId ? (
          <button
            type="button"
            className="rounded-md border border-(--border-default) bg-(--surface-base) px-2.5 py-1 text-[11px] font-medium text-(--text-primary) hover:border-(--border-strong)"
            style={
              row.readyForSignOff
                ? {
                    background: 'var(--status-review-soft-bg)',
                    borderColor: 'var(--status-review-soft-border)',
                    color: 'var(--status-review-soft-fg)',
                  }
                : undefined
            }
            onClick={() => onOpen(leg.runId!, leg.projectId)}
          >
            {row.openLabel} ›
          </button>
        ) : null}
        {row.canMarkLanded ? (
          <button
            type="button"
            className="rounded-md border border-(--border-default) bg-(--surface-base) px-2.5 py-1 text-[11px] font-medium text-(--text-primary) hover:border-(--border-strong)"
            onClick={() => onMarkLanded(leg)}
          >
            {PROCESS_GROUP_MARK_LANDED_LABEL}
          </button>
        ) : null}
        <span className="ml-auto flex items-center gap-2 text-[11px] tabular-nums text-(--text-muted)">
          {workMs !== undefined ? <span>{formatProcessDuration(workMs)}</span> : null}
          {spend ? (
            <CostChip label={spend} cost={totals} title="This project’s runs" appearance="text" />
          ) : null}
        </span>
      </div>
    </div>
  )
}

function ToneBadge({ tone, children }: { tone: ProcessStatusTone; children: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-px text-[10px]"
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
