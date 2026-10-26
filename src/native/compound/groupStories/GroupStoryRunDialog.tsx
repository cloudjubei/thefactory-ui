import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ScrollView, Text, View } from 'react-native'

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
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import { Input } from '../../primitives/Input'
import { Modal } from '../../primitives/Modal'
import BaseBranchChooser from '../chat/BaseBranchChooser'
import { TurnLimitField } from '../TurnLimitField'

export type GroupStoryRunStarted = { groupRunId: string; message: string }

export type GroupStoryRunDialogProps = {
  isOpen: boolean
  onClose: () => void
  title: string
  preview: GroupStoryRunPreview | undefined
  previewLoading?: boolean
  previewError?: string
  basePicks: Readonly<Record<string, string>>
  onPickBase: (projectId: string, branch: string) => void
  renderModelChip?: (picked: LaunchModelChipSlot) => ReactNode
  onStart: (body: GroupStoryRunBody) => Promise<GroupStoryRunStarted>
  onOpenRun: (groupRunId: string) => void
  started?: GroupStoryRunStarted
}

/**
 * Native peer of
 * [web's `GroupStoryRunDialog`](../../../web/compound/groupStories/GroupStoryRunDialog.tsx):
 * run a group story — its parts step by step, each part's branch, the agent, a
 * cap per part, the turn limit — as one group run with no chat.
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
  const { theme, status } = useNativeTheme()
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
  const muted = { fontSize: 12, color: theme.text.muted }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      fillHeight={!started}
      title={started ? 'Started' : `Run “${title}”`}
      footer={
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: nativeSpace[2] }}>
          <Button variant="secondary" onPress={onClose}>
            {started ? 'Close' : 'Cancel'}
          </Button>
          {started ? (
            <Button variant="primary" onPress={() => onOpenRun(started.groupRunId)}>
              Open the run
            </Button>
          ) : (
            <Button variant="run" loading={busy} disabled={!canStart} onPress={start}>
              Start
            </Button>
          )}
        </View>
      }
    >
      {started ? (
        <View style={{ gap: nativeSpace[2] }}>
          <Text style={{ fontSize: 13, color: theme.text.secondary }}>{started.message}</Text>
          <Text style={{ fontSize: 13, color: theme.text.secondary }}>
            Follow it on the group’s Processes page and in Needs you.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ gap: nativeSpace[3] }}>
          {error ? <Alert variant="error">{error}</Alert> : null}
          <View
            style={{
              gap: nativeSpace[2],
              padding: nativeSpace[3],
              borderRadius: nativeRadii[2],
              borderWidth: 1,
              borderColor: theme.border.subtle,
              backgroundColor: theme.surface.base,
            }}
          >
            {previewLoading && !preview ? (
              <Text style={muted}>Reading the projects…</Text>
            ) : previewError || !preview ? (
              <Text style={muted}>{previewError ?? 'The run could not be previewed.'}</Text>
            ) : (
              legsByStep.map((legs, i) => (
                <View key={i} style={{ gap: 6 }}>
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '600',
                      letterSpacing: 0.6,
                      textTransform: 'uppercase',
                      color: theme.text.muted,
                    }}
                  >
                    {i === 0 ? 'Step 1 — starts at once' : `Step ${i + 1}`}
                  </Text>
                  {legs.map((leg) => {
                    const waits = processGroupLegWaitsFor(preview, leg.dependsOn)
                    return (
                      <View key={leg.projectId} style={{ gap: 4 }}>
                        <Text
                          style={{ fontSize: 14, fontWeight: '500', color: theme.text.primary }}
                        >
                          {leg.projectTitle}
                        </Text>
                        <Text
                          numberOfLines={2}
                          style={{ fontSize: 13, color: theme.text.secondary }}
                        >
                          {`${leg.storyTitle ?? leg.storyId} · ${leg.features} feature${leg.features === 1 ? '' : 's'}`}
                        </Text>
                        {leg.baseBranches ? (
                          <BaseBranchChooser
                            options={leg.baseBranches}
                            {...(leg.baseBranch !== undefined ? { asked: leg.baseBranch } : {})}
                            picked={basePicks[leg.projectId]}
                            busy={busy}
                            onChoose={(branch) => onPickBase(leg.projectId, branch)}
                          />
                        ) : null}
                        {waits ? <Text style={muted}>{waits}</Text> : null}
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
                padding: nativeSpace[3],
                borderRadius: nativeRadii[2],
                borderWidth: 1,
                backgroundColor: status.stuck.softBg,
                borderColor: status.stuck.softBorder,
              }}
            >
              {problems.map((p) => (
                <Text key={p} style={{ fontSize: 12.5, color: status.stuck.softFg }}>
                  {p}
                </Text>
              ))}
            </View>
          ) : null}
          {renderModelChip ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: nativeSpace[2] }}>
              {renderModelChip(slot)}
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
            <Text style={{ fontSize: 13, color: theme.text.secondary }}>Spend cap per part $</Text>
            <View style={{ width: 96 }}>
              <Input
                size="sm"
                keyboardType="decimal-pad"
                value={cap}
                disabled={busy}
                placeholder="None"
                invalid={!capValid}
                onChangeText={setCap}
              />
            </View>
          </View>
          <TurnLimitField
            {...turnStart}
            limited={turnLimit.limited}
            maxTurns={turnLimit.maxTurns}
            disabled={busy}
            onChange={setTurnLimitPick}
          />
          <Text style={muted}>
            No chat is opened: follow the run on the group’s Processes page and in Needs you, and
            open a chat for the whole group from it when you want one.
          </Text>
        </ScrollView>
      )}
    </Modal>
  )
}
