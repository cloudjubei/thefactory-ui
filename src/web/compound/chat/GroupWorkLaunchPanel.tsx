import { useState, type ReactNode } from 'react'
import { useLaunchAgentPick } from '../../../headless/hooks/useLaunchAgentPick'
import {
  launchAgentPickMetadata,
  launchAgentPickRunner,
} from '../../../headless/utils/launchAgentPick'
import type { LaunchModelChipSlot } from '../../../headless/utils/launchAgentPickTypes'

import {
  groupBaseBranchMetadata,
  LAUNCH_NOTE_MAX_CHARS,
  processGroupLegWaitsFor,
  processGrantTurnLimitView,
  processTurnLimitOfView,
  startGroupWorkGrantSummary,
  useProcessGroupLaunchPreview,
  type PendingToolGrant,
} from '../../../headless'
import { grantDecideErrorMessage } from '../../../headless/utils/pendingToolGrants'
import { runProposalArgs } from '../../../headless/utils/runProposalView'
import { groupWorkAskView, toolAskDecidedLine } from '../../../headless/utils/toolAskCard'
import type { ToolAskDecidedLine } from '../../../headless/utils/toolAskCardTypes'
import { Textarea } from '../../primitives/Textarea'
import { IconChevron } from '../../icons'
import { TurnLimitField } from '../TurnLimitField'
import BaseBranchChooser from './BaseBranchChooser'
import ToolAskCard from './ToolAskCard'

export type GroupWorkLaunchPanelProps = {
  /** The pending `startGroupWork` ask. */
  grant: PendingToolGrant
  /** The group the chat belongs to. */
  groupId?: string
  /** The app's model chip for this chat — the agent every project's work runs on. */
  renderModelChip?: (picked: LaunchModelChipSlot) => ReactNode
  onDecideLater: () => void
  /** The launch was decided — what its one line says. */
  onDecided?: (line: ToolAskDecidedLine) => void
}

/**
 * The launch of one run across several projects, on the shared tool-ask card,
 * read before it starts: each
 * project with its story and what it waits for, in the order they run, every
 * reason it cannot start, and how each project others build on is merged when
 * its turn comes (merge or squash — you still approve each of those merges).
 */
export default function GroupWorkLaunchPanel({
  grant,
  groupId,
  renderModelChip,
  onDecideLater,
  onDecided,
}: GroupWorkLaunchPanelProps) {
  const summary = startGroupWorkGrantSummary(grant)
  const launchGroupId = groupId ?? summary.groupId
  const { preview, isLoaded, loadError } = useProcessGroupLaunchPreview({
    groupId: launchGroupId,
    legs: summary.legs,
  })
  const [note, setNote] = useState('')
  const [noteOpen, setNoteOpen] = useState(false)
  const [agentNoteOpen, setAgentNoteOpen] = useState(false)
  // The agent this WORK runs on — the API or a CLI, a model — seeded from the
  // chat by the chip and sent with the decision, never written back to the
  // conversation.
  const { pick: agentPick, slot: chipSlot } = useLaunchAgentPick()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const turnLimitStart = processGrantTurnLimitView(
    summary.turnLimit,
    launchAgentPickRunner(agentPick, summary.runner ?? grant.chatRunner),
  )
  const [turnLimitPick, setTurnLimitPick] = useState<
    { limited: boolean; maxTurns: number } | undefined
  >(undefined)
  const turnLimit = turnLimitPick ?? turnLimitStart
  // Each project's branch to work off — the person's pick, else what the
  // agent asked, else that project's current branch.
  const [basePicks, setBasePicks] = useState<Record<string, string>>({})
  const baseBranchMeta = groupBaseBranchMetadata(preview?.legs ?? [], basePicks)

  const problems = preview?.problems ?? []
  const canStart = isLoaded && preview !== undefined && problems.length === 0
  const view = groupWorkAskView(summary, runProposalArgs(grant))

  const decide = (decision: 'once' | 'deny') => {
    setBusy(true)
    setError(null)
    const trimmed = note.trim()
    void grant
      .decide(
        decision,
        decision === 'once'
          ? {
              ...(trimmed ? { note: trimmed } : {}),
              turnLimit: processTurnLimitOfView(turnLimit),
              ...launchAgentPickMetadata(agentPick),
              ...(baseBranchMeta ?? {}),
            }
          : undefined,
      )
      .then(() => onDecided?.(toolAskDecidedLine(view, decision)))
      .catch((err: unknown) => {
        setBusy(false)
        setError(grantDecideErrorMessage(err))
      })
  }

  const legsByWave = (preview?.waves ?? []).map((wave) =>
    wave.flatMap((id) => preview?.legs.filter((l) => l.projectId === id) ?? []),
  )

  return (
    <div className="m-3 flex max-h-[min(70vh,640px)] min-h-0 flex-col">
      <ToolAskCard
        view={view}
        busy={busy}
        error={error}
        ready={canStart}
        onApprove={() => decide('once')}
        onDeny={() => decide('deny')}
        onLater={onDecideLater}
      >
        <div className="flex flex-col gap-2 rounded-md border border-(--border-subtle) bg-(--surface-base) px-2.5 py-2">
          {!isLoaded ? (
            <span className="text-[12px] text-(--text-secondary)">Reading the projects…</span>
          ) : loadError || !preview ? (
            <span className="text-[12px] text-(--text-secondary)">
              {launchGroupId
                ? 'The launch could not be previewed.'
                : 'The ask names no group to start the work in.'}
            </span>
          ) : (
            legsByWave.map((wave, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)">
                  {i === 0 ? 'Starts at once' : `Then — step ${i + 1}`}
                </span>
                {wave.map((leg) => (
                  <div key={leg.projectId} className="flex flex-col gap-1 pl-1">
                    <div className="flex flex-wrap items-baseline gap-2 text-[12.5px]">
                      <span className="font-medium text-(--text-primary)">{leg.projectTitle}</span>
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
                          onChoose={(branch) =>
                            setBasePicks((prev) => ({ ...prev, [leg.projectId]: branch }))
                          }
                        />
                      </div>
                    ) : null}
                    {processGroupLegWaitsFor(preview, leg.dependsOn) ? (
                      <span className="text-[11px] text-(--text-muted)">
                        {processGroupLegWaitsFor(preview, leg.dependsOn)}
                      </span>
                    ) : null}
                  </div>
                ))}
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

        {summary.note ? (
          <div className="flex flex-col gap-1">
            <button
              type="button"
              aria-expanded={agentNoteOpen}
              onClick={() => setAgentNoteOpen((v) => !v)}
              className="inline-flex w-fit items-center gap-1.5 rounded-full border border-(--border-default) bg-(--surface-base) px-2.5 py-1 text-[11.5px] text-(--text-secondary) hover:border-(--border-strong) hover:text-(--text-primary)"
            >
              <IconChevron
                className={`w-3 h-3 transition-transform ${agentNoteOpen ? 'rotate-90' : ''}`}
              />
              Note from the agent
            </button>
            {agentNoteOpen ? (
              <p className="rounded border border-(--border-subtle) bg-(--surface-base) px-2 py-1.5 text-[11.5px] leading-relaxed text-(--text-secondary)">
                {summary.note}
              </p>
            ) : null}
          </div>
        ) : null}

        {renderModelChip ? (
          <div className="flex flex-wrap items-center gap-2">{renderModelChip(chipSlot)}</div>
        ) : null}
        <TurnLimitField
          {...turnLimitStart}
          limited={turnLimit.limited}
          maxTurns={turnLimit.maxTurns}
          disabled={busy}
          onChange={setTurnLimitPick}
        />
        {noteOpen ? (
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)">
              Note for every project{' '}
              <span className="font-normal normal-case tracking-normal">
                — goes into each agent’s opening prompt
              </span>
            </span>
            <Textarea
              rows={2}
              value={note}
              disabled={busy}
              maxLength={LAUNCH_NOTE_MAX_CHARS}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Anything every project’s agent should know…"
            />
          </label>
        ) : (
          <button
            type="button"
            onClick={() => setNoteOpen(true)}
            disabled={busy}
            className="inline-flex w-fit items-center gap-1.5 rounded-full border border-dashed border-(--border-strong) px-2.5 py-1 text-[11.5px] text-(--text-muted) hover:border-(--accent-primary) hover:text-(--text-primary)"
          >
            <span aria-hidden className="text-[13px] leading-none">
              +
            </span>
            Add a note for every project
          </button>
        )}
      </ToolAskCard>
    </div>
  )
}
