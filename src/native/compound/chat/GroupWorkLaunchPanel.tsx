import { useState, type ReactNode } from 'react'
import { useLaunchAgentPick } from '../../../headless/hooks/useLaunchAgentPick'
import {
  launchAgentPickMetadata,
  launchAgentPickRunner,
} from '../../../headless/utils/launchAgentPick'
import type { LaunchModelChipSlot } from '../../../headless/utils/launchAgentPickTypes'
import { Text, View } from 'react-native'

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
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { Textarea } from '../../primitives/Textarea'
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
  /** The host's live card for a process run, opening it on press — shows a story's open run. */
  renderProcessRun?: (processRunId: string) => ReactNode
  onDecideLater: () => void
  /** The launch was decided — what its one line says. */
  onDecided?: (line: ToolAskDecidedLine) => void
}

/**
 * Native peer of
 * [web's `GroupWorkLaunchPanel`](../../../web/compound/chat/GroupWorkLaunchPanel.tsx).
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
  renderProcessRun,
  onDecideLater,
  onDecided,
}: GroupWorkLaunchPanelProps) {
  const { theme, status } = useNativeTheme()
  const summary = startGroupWorkGrantSummary(grant)
  const launchGroupId = groupId ?? summary.groupId
  const { preview, isLoaded, loadError } = useProcessGroupLaunchPreview({
    groupId: launchGroupId,
    legs: summary.legs,
  })
  const [note, setNote] = useState('')
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
    <View style={{ margin: nativeSpace[3] }}>
      <ToolAskCard
        view={view}
        busy={busy}
        error={error}
        ready={canStart}
        onApprove={() => decide('once')}
        onDeny={() => decide('deny')}
        onLater={onDecideLater}
      >
        <View
          style={{
            gap: nativeSpace[2],
            paddingHorizontal: 10,
            paddingVertical: 8,
            borderRadius: nativeRadii[2],
            borderWidth: 1,
            borderColor: theme.border.subtle,
            backgroundColor: theme.surface.base,
          }}
        >
          {!isLoaded ? (
            <Text style={{ fontSize: 12, color: theme.text.secondary }}>Reading the projects…</Text>
          ) : loadError || !preview ? (
            <Text style={{ fontSize: 12, color: theme.text.secondary }}>
              {launchGroupId
                ? 'The launch could not be previewed.'
                : 'The ask names no group to start the work in.'}
            </Text>
          ) : (
            legsByWave.map((wave, i) => (
              <View key={i} style={{ gap: 6 }}>
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: '600',
                    letterSpacing: 0.6,
                    textTransform: 'uppercase',
                    color: theme.text.muted,
                  }}
                >
                  {i === 0 ? 'Starts at once' : `Then — step ${i + 1}`}
                </Text>
                {wave.map((leg) => {
                  const waitsFor = processGroupLegWaitsFor(preview, leg.dependsOn)
                  return (
                    <View key={leg.projectId} style={{ gap: 4, paddingLeft: 4 }}>
                      <View
                        style={{
                          flexDirection: 'row',
                          flexWrap: 'wrap',
                          alignItems: 'center',
                          gap: nativeSpace[2],
                        }}
                      >
                        <Text
                          style={{ fontSize: 12.5, fontWeight: '500', color: theme.text.primary }}
                        >
                          {leg.projectTitle}
                        </Text>
                        <Text
                          numberOfLines={1}
                          style={{ flexShrink: 1, fontSize: 12.5, color: theme.text.secondary }}
                        >
                          {leg.storyTitle ?? leg.storyId}
                        </Text>
                        <Text style={{ fontSize: 10.5, color: theme.text.muted }}>
                          {`${leg.features} feature${leg.features === 1 ? '' : 's'}`}
                        </Text>
                      </View>
                      <BaseBranchChooser
                        options={leg.baseBranches}
                        {...(leg.baseBranch !== undefined ? { asked: leg.baseBranch } : {})}
                        picked={basePicks[leg.projectId]}
                        busy={busy}
                        onChoose={(branch) =>
                          setBasePicks((prev) => ({ ...prev, [leg.projectId]: branch }))
                        }
                      />
                      {waitsFor ? (
                        <Text style={{ fontSize: 11, color: theme.text.muted }}>{waitsFor}</Text>
                      ) : null}
                      {(leg.alreadyDone ?? []).map((line) => (
                        <Text key={line} style={{ fontSize: 11, color: status.review.softFg }}>
                          {line}
                        </Text>
                      ))}
                      {leg.openRunId && renderProcessRun ? renderProcessRun(leg.openRunId) : null}
                    </View>
                  )
                })}
              </View>
            ))
          )}
        </View>

        {problems.length > 0 ? (
          <View
            accessibilityRole="alert"
            style={{
              gap: 4,
              paddingHorizontal: 10,
              paddingVertical: 8,
              borderRadius: nativeRadii[2],
              borderWidth: 1,
              backgroundColor: status.stuck.softBg,
              borderColor: status.stuck.softBorder,
            }}
          >
            {problems.map((p) => (
              <Text key={p} style={{ fontSize: 12, color: status.stuck.softFg }}>
                {p}
              </Text>
            ))}
          </View>
        ) : null}

        {summary.note ? (
          <Text
            style={{
              fontSize: 11.5,
              lineHeight: 18,
              color: theme.text.secondary,
              borderRadius: nativeRadii[2],
              borderWidth: 1,
              borderColor: theme.border.subtle,
              backgroundColor: theme.surface.base,
              paddingHorizontal: 8,
              paddingVertical: 6,
            }}
          >
            <Text style={{ fontWeight: '600' }}>From the agent: </Text>
            {summary.note}
          </Text>
        ) : null}

        <View style={{ gap: nativeSpace[2] }}>
          {renderModelChip ? renderModelChip(chipSlot) : null}
          <TurnLimitField
            {...turnLimitStart}
            limited={turnLimit.limited}
            maxTurns={turnLimit.maxTurns}
            disabled={busy}
            onChange={setTurnLimitPick}
          />
          <Textarea
            rows={2}
            value={note}
            onChangeText={setNote}
            disabled={busy}
            maxLength={LAUNCH_NOTE_MAX_CHARS}
            placeholder="A note every project’s agent reads (optional)"
            accessibilityLabel="A note for every project's agent"
          />
        </View>
      </ToolAskCard>
    </View>
  )
}
