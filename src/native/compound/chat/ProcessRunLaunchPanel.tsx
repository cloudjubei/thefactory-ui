import { useMemo, useState, type ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'

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
import { processLaunchDrafts } from '../../../headless/hooks/processLaunchDrafts'
import { useLaunchAgentPick } from '../../../headless/hooks/useLaunchAgentPick'
import { LAUNCH_NOTE_MAX_CHARS } from '../../../headless/utils/approvalGrant'
import type { PendingToolGrantDecision } from '../../../headless/utils/chatTypes'
import {
  launchAgentPickMetadata,
  launchAgentPickRunner,
  launchModelChipSlotOf,
} from '../../../headless/utils/launchAgentPick'
import type { LaunchModelChipSlot } from '../../../headless/utils/launchAgentPickTypes'
import { grantDecideErrorMessage } from '../../../headless/utils/pendingToolGrants'
import { runProposalArgs } from '../../../headless/utils/runProposalView'
import { toolAskDecidedLine } from '../../../headless/utils/toolAskCard'
import type { ToolAskDecidedLine } from '../../../headless/utils/toolAskCardTypes'
import { nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
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
  renderModelChip?: (picked: LaunchModelChipSlot) => ReactNode
  /** Leave the ask waiting; a page's own launch has nothing to come back to, and omits it. */
  onDecideLater?: () => void
  onDecided?: (line: ToolAskDecidedLine) => void
  /** Push a variant's own screen, on a screen of its own rather than in a chat. */
  onOpenVariant?: (inputName: string, variantKey: string) => void
  /** Where the form is kept, for a screen pushed over it to reach. */
  launchKey?: string
}

/** Native peer of web's `ProcessRunLaunchPanel`: the launch card of a process that starts from a form. */
export default function ProcessRunLaunchPanel({
  grant,
  projectId,
  renderModelChip,
  onDecideLater,
  onDecided,
  onOpenVariant,
  launchKey,
}: ProcessRunLaunchPanelProps) {
  const { theme } = useNativeTheme()
  const summary = startProcessRunGrantSummary(grant)
  const asked = useMemo(() => summary.inputValues, [JSON.stringify(summary.inputValues)]) // eslint-disable-line react-hooks/exhaustive-deps
  const key = launchKey ?? `${projectId ?? ''}:${grant.id}`
  const launch = useProcessRunLaunch({ key, projectId, processId: summary.processId, asked })
  const { form, refusal, repos, draft, setDraft, inputValues, problem } = launch
  const { notes } = useProjectNotes(projectId)
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
    <View style={{ margin: nativeSpace[3] }}>
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
            busy={busy}
            onChange={(next) => {
              setTouched(true)
              setDraft(next)
            }}
            {...(onOpenVariant ? { onOpenVariant } : {})}
          />
        ) : !refusal ? (
          <Text style={{ fontSize: 12.5, color: theme.text.secondary }}>
            {PROCESS_LAUNCH_COPY.loading}
          </Text>
        ) : null}

        <View style={{ gap: 6 }}>
          <Text
            style={{
              fontSize: 10,
              fontWeight: '600',
              letterSpacing: 0.8,
              textTransform: 'uppercase',
              color: theme.text.muted,
            }}
          >
            {LAUNCH_HOW_IT_RUNS_HEADING}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
            <BaseBranchChooser
              options={form?.baseBranches}
              {...(summary.baseBranch !== undefined ? { asked: summary.baseBranch } : {})}
              picked={basePick}
              followsOpenRun={false}
              busy={busy}
              onChoose={setBasePick}
            />
            {renderModelChip ? renderModelChip(launchModelChipSlotOf(chipSlot, summary)) : null}
          </View>
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
        </View>

        {noteOpen ? (
          <View style={{ gap: 4 }}>
            <Text style={{ fontSize: 12.5, color: theme.text.secondary }}>Note for this run</Text>
            <Textarea
              rows={2}
              value={note}
              disabled={busy}
              maxLength={LAUNCH_NOTE_MAX_CHARS}
              placeholder="Anything this run should know"
              onChangeText={setNote}
            />
          </View>
        ) : (
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => setNoteOpen(true)}>
            <Text style={{ fontSize: 12, color: theme.text.muted }}>+ Add a note for this run</Text>
          </Pressable>
        )}
      </ToolAskCard>
    </View>
  )
}
