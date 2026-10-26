import { useEffect, useRef, useState, type ReactNode } from 'react'

import {
  extractErrorMessage,
  launchAgentPickMetadata,
  launchAgentPickRunner,
  processGroupLegWaitsFor,
  processLaunchTurnLimitView,
  processTurnLimitOfView,
  useLaunchAgentPick,
  type GroupStoryRunBody,
  type GroupStoryRunPreview,
  type LaunchModelChipSlot,
} from '../../../headless'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import { Input } from '../../primitives/Input'
import { Modal } from '../../primitives/Modal'
import BaseBranchChooser from '../chat/BaseBranchChooser'
import { TurnLimitField } from '../TurnLimitField'

/** A group run that started, as the dialog says it. */
export type GroupStoryRunStarted = { groupRunId: string; message: string }

export type GroupStoryRunDialogProps = {
  isOpen: boolean
  onClose: () => void
  /** The group story's title. */
  title: string
  /** What running it would start, on the branches picked so far. */
  preview: GroupStoryRunPreview | undefined
  previewLoading?: boolean
  previewError?: string
  /** Each part's branch the person picked, by project id. */
  basePicks: Readonly<Record<string, string>>
  /** The host previews again with the new pick. */
  onPickBase: (projectId: string, branch: string) => void
  /** The app's model chip — the agent every part runs on. */
  renderModelChip?: (picked: LaunchModelChipSlot) => ReactNode
  /** Start the run; a rejection's reason is shown in the dialog. */
  onStart: (body: GroupStoryRunBody) => Promise<GroupStoryRunStarted>
  onOpenRun: (groupRunId: string) => void
  /** Open already started — for a fixed showcase state. */
  started?: GroupStoryRunStarted
}

/**
 * Run a group story: its parts step by step with their stories and features,
 * each part's branch, the agent, a cap per part and the turn limit. It starts
 * one group run with no chat — followed on the group's Processes page and in
 * Needs you, where a chat for the whole group can be opened on it.
 */
export default function GroupStoryRunDialog({
  isOpen,
  onClose,
  title,
  preview,
  previewLoading = false,
  previewError,
  basePicks,
  onPickBase,
  renderModelChip,
  onStart,
  onOpenRun,
  started: startedShown,
}: GroupStoryRunDialogProps) {
  const { pick, slot } = useLaunchAgentPick()
  const runner = launchAgentPickRunner(pick, 'api')
  const [turnLimitPick, setTurnLimitPick] = useState<{ limited: boolean; maxTurns: number }>()
  const turnStart = processLaunchTurnLimitView(runner)
  const turnLimit = turnLimitPick ?? turnStart
  const [cap, setCap] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [started, setStarted] = useState<GroupStoryRunStarted | undefined>(startedShown)

  const wasOpen = useRef(false)
  useEffect(() => {
    if (isOpen && !wasOpen.current) {
      setError(null)
      setStarted(startedShown)
    }
    wasOpen.current = isOpen
  }, [isOpen, startedShown])

  const problems = preview?.problems ?? []
  const capUsd = Number(cap)
  const capValid = cap.trim() === '' || (Number.isFinite(capUsd) && capUsd > 0)
  const canStart =
    !busy && !previewLoading && preview !== undefined && problems.length === 0 && capValid
  const legsByStep = (preview?.waves ?? []).map((wave) =>
    wave.flatMap((id) => preview?.legs.filter((l) => l.projectId === id) ?? []),
  )

  const start = () => {
    setBusy(true)
    setError(null)
    void onStart({
      ...launchAgentPickMetadata(pick),
      turnLimit: processTurnLimitOfView(turnLimit),
      ...(cap.trim() ? { spendCapUsd: capUsd } : {}),
      ...(Object.keys(basePicks).length > 0 ? { baseBranches: { ...basePicks } } : {}),
    })
      .then(setStarted)
      .catch((err: unknown) => setError(extractErrorMessage(err, 'The run did not start.')))
      .finally(() => setBusy(false))
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={started ? 'Started' : `Run “${title}”`}
      footer={
        started ? (
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            <Button variant="primary" onClick={() => onOpenRun(started.groupRunId)}>
              Open the run
            </Button>
          </div>
        ) : (
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="run" loading={busy} disabled={!canStart} onClick={start}>
              Start
            </Button>
          </div>
        )
      }
    >
      {started ? (
        <div className="flex flex-col gap-2 text-[12.5px] text-(--text-secondary)">
          <p>{started.message}</p>
          <p>Follow it on the group’s Processes page and in Needs you.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {error ? <Alert variant="error">{error}</Alert> : null}
          <div className="flex flex-col gap-2 rounded-md border border-(--border-subtle) bg-(--surface-base) px-2.5 py-2">
            {previewLoading && !preview ? (
              <span className="text-[12px] text-(--text-secondary)">Reading the projects…</span>
            ) : previewError || !preview ? (
              <span className="text-[12px] text-(--text-secondary)">
                {previewError ?? 'The run could not be previewed.'}
              </span>
            ) : (
              legsByStep.map((legs, i) => (
                <div key={i} className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)">
                    {i === 0 ? 'Step 1 — starts at once' : `Step ${i + 1}`}
                  </span>
                  {legs.map((leg) => {
                    const waits = processGroupLegWaitsFor(preview, leg.dependsOn)
                    return (
                      <div key={leg.projectId} className="flex flex-col gap-1 pl-1">
                        <div className="flex flex-wrap items-baseline gap-2 text-[12.5px]">
                          <span className="font-medium text-(--text-primary)">
                            {leg.projectTitle}
                          </span>
                          <span className="min-w-0 truncate text-(--text-secondary)">
                            {leg.storyTitle ?? leg.storyId}
                          </span>
                          <span className="text-[10.5px] text-(--text-muted)">
                            {leg.features} feature{leg.features === 1 ? '' : 's'}
                          </span>
                        </div>
                        {leg.baseBranches ? (
                          <div className="flex">
                            <BaseBranchChooser
                              options={leg.baseBranches}
                              {...(leg.baseBranch !== undefined ? { asked: leg.baseBranch } : {})}
                              picked={basePicks[leg.projectId]}
                              busy={busy}
                              onChoose={(branch) => onPickBase(leg.projectId, branch)}
                            />
                          </div>
                        ) : null}
                        {waits ? (
                          <span className="text-[11px] text-(--text-muted)">{waits}</span>
                        ) : null}
                        {(leg.alreadyDone ?? []).map((line) => (
                          <span key={line} className="text-[11px] text-(--status-review-soft-fg)">
                            {line}
                          </span>
                        ))}
                      </div>
                    )
                  })}
                </div>
              ))
            )}
          </div>

          {problems.length > 0 ? (
            <div
              role="alert"
              className="flex flex-col gap-1 rounded-md px-2.5 py-2 text-[12px]"
              style={{
                background: 'var(--status-stuck-soft-bg)',
                border: '1px solid var(--status-stuck-soft-border)',
                color: 'var(--status-stuck-soft-fg)',
              }}
            >
              {problems.map((p) => (
                <span key={p}>{p}</span>
              ))}
            </div>
          ) : null}

          {renderModelChip ? (
            <div className="flex flex-wrap items-center gap-2">{renderModelChip(slot)}</div>
          ) : null}
          <label className="flex items-center gap-2 text-[12px] text-(--text-secondary)">
            <span>Spend cap per part</span>
            <span className="text-(--text-muted)">$</span>
            <Input
              size="sm"
              inputMode="decimal"
              className="w-24"
              value={cap}
              disabled={busy}
              placeholder="None"
              aria-invalid={!capValid}
              onChange={(e) => setCap(e.target.value)}
            />
          </label>
          <TurnLimitField
            {...turnStart}
            limited={turnLimit.limited}
            maxTurns={turnLimit.maxTurns}
            disabled={busy}
            onChange={setTurnLimitPick}
          />
          <p className="text-[11.5px] text-(--text-muted)">
            No chat is opened: follow the run on the group’s Processes page and in Needs you, and
            open a chat for the whole group from it when you want one.
          </p>
        </div>
      )}
    </Modal>
  )
}
