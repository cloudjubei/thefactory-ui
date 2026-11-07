import { useMemo, useState, type ReactNode } from 'react'

import {
  LAUNCH_HOW_IT_RUNS_HEADING,
  PROCESS_LAUNCH_COPY,
  baseBranchChoice,
  baseBranchMetadata,
  launchCapFields,
  launchCapsMetadata,
  launchCapsOfArgs,
  launchCapsSummary,
  launchCapsValid,
  launchWorstCaseLine,
  processGrantTurnLimitView,
  processLaunchVariants,
  processRunAskView,
  processTurnLimitOfView,
  startProcessRunGrantSummary,
  useProcessRunLaunch,
  useProjectNotes,
  type LaunchCapsTyped,
  type PendingToolGrant,
} from '../../../headless'
import { useLaunchAgentPick } from '../../../headless/hooks/useLaunchAgentPick'
import {
  launchAgentPickMetadata,
  launchAgentPickRunner,
  launchModelChipSlotOf,
} from '../../../headless/utils/launchAgentPick'
import type { LaunchModelChipSlot } from '../../../headless/utils/launchAgentPickTypes'
import type { PendingToolGrantDecision } from '../../../headless/utils/chatTypes'
import { grantDecideErrorMessage } from '../../../headless/utils/pendingToolGrants'
import { processLaunchDrafts } from '../../../headless/hooks/processLaunchDrafts'
import { toolAskDecidedLine } from '../../../headless/utils/toolAskCard'
import type { ToolAskDecidedLine } from '../../../headless/utils/toolAskCardTypes'
import { runProposalArgs } from '../../../headless/utils/runProposalView'
import { LAUNCH_NOTE_MAX_CHARS } from '../../../headless/utils/approvalGrant'
import { Textarea } from '../../primitives/Textarea'
import { TurnLimitField } from '../TurnLimitField'
import BaseBranchChooser from './BaseBranchChooser'
import LaunchCapsFields from './LaunchCapsFields'
import ProcessLaunchFields from './ProcessLaunchFields'
import ToolAskCard from './ToolAskCard'

export type ProcessRunLaunchPanelProps = {
  /** The pending `startProcessRun` ask, or a page's launch of a process. */
  grant: PendingToolGrant
  projectId?: string
  /** The app's model chip, so the run's agent can be picked before it starts. */
  renderModelChip?: (picked: LaunchModelChipSlot) => ReactNode
  /** Leave the ask waiting; a page's own launch has nothing to come back to, and omits it. */
  onDecideLater?: () => void
  onDecided?: (line: ToolAskDecidedLine) => void
}

/**
 * The launch card of a process that starts from a form: what it asks for, drawn
 * from its typed inputs, then how it runs as on every launch card. The backend
 * reads the form as it is filled, so the card says the first thing wrong with it
 * and Start run waits until there is nothing.
 */
export default function ProcessRunLaunchPanel({
  grant,
  projectId,
  renderModelChip,
  onDecideLater,
  onDecided,
}: ProcessRunLaunchPanelProps) {
  const summary = startProcessRunGrantSummary(grant)
  const asked = useMemo(() => summary.inputValues, [JSON.stringify(summary.inputValues)]) // eslint-disable-line react-hooks/exhaustive-deps
  const key = `${projectId ?? ''}:${grant.id}`
  const launch = useProcessRunLaunch({
    key,
    projectId,
    processId: summary.processId,
    asked,
  })
  const { form, refusal, repos, draft, setDraft, inputValues, problem } = launch
  const { notes, revealNote } = useProjectNotes(projectId)
  const { pick: agentPick, slot: chipSlot } = useLaunchAgentPick()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [touched, setTouched] = useState(false)
  const [note, setNote] = useState('')
  const [noteOpen, setNoteOpen] = useState(false)
  const [basePick, setBasePick] = useState<string | undefined>(undefined)
  const [capsTyped, setCapsTyped] = useState<LaunchCapsTyped>({})
  const [turnLimitPick, setTurnLimitPick] = useState<
    { limited: boolean; maxTurns: number } | undefined
  >(undefined)
  const runner = launchAgentPickRunner(agentPick, summary.runner ?? grant.chatRunner)
  const turnLimitStart = processGrantTurnLimitView(summary.turnLimit, runner)
  const turnLimit = turnLimitPick ?? turnLimitStart
  const capFields = launchCapFields({
    asked: launchCapsOfArgs(runProposalArgs(grant)),
    ...(form?.defaultCaps ? { defaults: form.defaultCaps } : {}),
    typed: capsTyped,
  })
  const capsMeta = launchCapsMetadata(capFields)
  const baseBranch = baseBranchChoice(form?.baseBranches, summary.baseBranch, basePick)
  const variantCount = (form?.inputs ?? [])
    .filter((input) => input.kind === 'variants')
    .reduce((n, input) => n + (draft ? processLaunchVariants(draft, input.name).length : 0), 0)
  const worstCase = launchWorstCaseLine({
    attempts: capsMeta.maxIterations,
    count: variantCount,
    of: 'variant',
  })
  const view = processRunAskView(form?.proposal.name)
  const hasAsked = Object.keys(asked).length > 0

  const decide = (decision: PendingToolGrantDecision) => {
    setBusy(true)
    setError(null)
    const trimmed = note.trim()
    void grant
      .decide(
        decision,
        decision === 'once'
          ? {
              inputValues,
              ...(summary.title ? { title: summary.title } : {}),
              ...(trimmed ? { note: trimmed } : {}),
              ...launchAgentPickMetadata(agentPick),
              turnLimit: processTurnLimitOfView(turnLimit),
              ...capsMeta,
              ...baseBranchMetadata(baseBranch),
            }
          : undefined,
      )
      .then(() => {
        processLaunchDrafts.clear(key)
        onDecided?.(toolAskDecidedLine(view, decision))
      })
      .catch((err: unknown) => {
        setBusy(false)
        setError(grantDecideErrorMessage(err))
      })
  }

  const cardProblem = refusal ?? problem?.message
  return (
    <div className="m-3 flex max-h-[min(80vh,720px)] min-h-0 flex-col">
      <ToolAskCard
        view={view}
        busy={busy}
        error={error}
        ready={draft !== undefined && launchCapsValid(capFields)}
        {...(cardProblem !== undefined ? { problem: cardProblem } : {})}
        onApprove={() => decide('once')}
        onDeny={() => decide('deny')}
        {...(onDecideLater ? { onLater: onDecideLater } : {})}
      >
        {form && draft ? (
          <ProcessLaunchFields
            inputs={form.inputs}
            draft={draft}
            repos={repos}
            problem={problem}
            marked={touched || hasAsked}
            notes={notes}
            loadNote={revealNote}
            busy={busy}
            onChange={(next) => {
              setTouched(true)
              setDraft(next)
            }}
          />
        ) : !refusal ? (
          <span className="text-[12.5px] text-(--text-secondary)">
            {PROCESS_LAUNCH_COPY.loading}
          </span>
        ) : null}

        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)">
            {LAUNCH_HOW_IT_RUNS_HEADING}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <BaseBranchChooser
              options={form?.baseBranches}
              {...(summary.baseBranch !== undefined ? { asked: summary.baseBranch } : {})}
              picked={basePick}
              followsOpenRun={false}
              busy={busy}
              onChoose={setBasePick}
            />
            {renderModelChip ? renderModelChip(launchModelChipSlotOf(chipSlot, summary)) : null}
          </div>
          <TurnLimitField
            {...turnLimitStart}
            limited={turnLimit.limited}
            maxTurns={turnLimit.maxTurns}
            disabled={busy}
            onChange={setTurnLimitPick}
          />
          <LaunchCapsFields
            fields={capFields}
            summary={launchCapsSummary(capsMeta)}
            {...(worstCase ? { worstCase } : {})}
            busy={busy}
            onChange={(capKey, text) => setCapsTyped((prev) => ({ ...prev, [capKey]: text }))}
          />
        </div>

        {noteOpen ? (
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)">
              Note for this run
            </span>
            <Textarea
              rows={2}
              value={note}
              disabled={busy}
              maxLength={LAUNCH_NOTE_MAX_CHARS}
              placeholder="Anything this run should know"
              onChange={(e) => setNote(e.target.value)}
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
            Add a note for this run
          </button>
        )}
      </ToolAskCard>
    </div>
  )
}
