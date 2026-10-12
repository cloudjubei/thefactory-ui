import { useState, type ReactNode } from 'react'
import { Text, View } from 'react-native'

import {
  LAUNCH_NOTE_MAX_CHARS,
  PROCESS_GROUP_LAUNCH_BLURB,
  processGroupLegWaitsFor,
  processGrantTurnLimitView,
  processTurnLimitOfView,
  startGroupWorkGrantSummary,
  useProcessGroupLaunchPreview,
  type PendingToolGrant,
} from '../../../headless'
import { grantDecideErrorMessage } from '../../../headless/utils/pendingToolGrants'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { red } from '../../../tokens/colors'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { Button } from '../../primitives/Button'
import { Textarea } from '../../primitives/Textarea'
import { TurnLimitField } from '../TurnLimitField'

export type GroupWorkLaunchPanelProps = {
  /** The pending `startGroupWork` ask. */
  grant: PendingToolGrant
  /** The group the chat belongs to. */
  groupId?: string
  /** The app's model chip for this chat — the agent every project's work runs on. */
  renderModelChip?: (picked: {
    model: string | undefined
    onPick: (modelId: string) => void
    cli: string | undefined
    onPickCli: (cli: string, credentialId: string | undefined, model: string | undefined) => void
  }) => ReactNode
  onDecideLater: () => void
}

/**
 * Native peer of
 * [web's `GroupWorkLaunchPanel`](../../../web/compound/chat/GroupWorkLaunchPanel.tsx).
 * The launch of one run across several projects, read before it starts: each
 * project with its story and what it waits for, in the order they run, every
 * reason it cannot start, and how each project others build on is merged when
 * its turn comes (merge or squash — you still approve each of those merges).
 */
export default function GroupWorkLaunchPanel({
  grant,
  groupId,
  renderModelChip,
  onDecideLater,
}: GroupWorkLaunchPanelProps) {
  const { theme, status } = useNativeTheme()
  const summary = startGroupWorkGrantSummary(grant)
  const launchGroupId = groupId ?? summary.groupId
  const { preview, isLoaded, loadError } = useProcessGroupLaunchPreview({
    groupId: launchGroupId,
    legs: summary.legs,
  })
  const [note, setNote] = useState('')
  const [runModel, setRunModel] = useState<string | undefined>(undefined)
  const [runCli, setRunCli] = useState<string | undefined>(undefined)
  const [runCliCredentialId, setRunCliCredentialId] = useState<string | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const turnLimitStart = processGrantTurnLimitView(
    summary.turnLimit,
    runCli ? 'cli' : (summary.runner ?? grant.chatRunner),
  )
  const [turnLimitPick, setTurnLimitPick] = useState<
    { limited: boolean; maxTurns: number } | undefined
  >(undefined)
  const turnLimit = turnLimitPick ?? turnLimitStart

  const problems = preview?.problems ?? []
  const canStart = isLoaded && preview !== undefined && problems.length === 0

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
              ...(runModel ? { cliModel: runModel } : {}),
              ...(runCli ? { cliTool: runCli } : {}),
              ...(runCliCredentialId ? { cliCredentialId: runCliCredentialId } : {}),
            }
          : undefined,
      )
      .catch((err: unknown) => {
        setBusy(false)
        setError(grantDecideErrorMessage(err))
      })
  }

  const legsByWave = (preview?.waves ?? []).map((wave) =>
    wave.flatMap((id) => preview?.legs.filter((l) => l.projectId === id) ?? []),
  )

  return (
    <View
      style={{
        paddingHorizontal: nativeSpace[3],
        paddingVertical: nativeSpace[3],
        borderTopWidth: 1,
        borderTopColor: theme.border.strong ?? theme.border.subtle,
        backgroundColor: theme.surface.raised ?? theme.surface.muted,
        gap: 10,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: nativeSpace[2],
        }}
      >
        <View
          style={{
            height: 20,
            paddingHorizontal: 6,
            borderRadius: 999,
            borderWidth: 1,
            borderStyle: 'dashed',
            borderColor: status.review.softBorder,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <View
            style={{
              width: 7,
              height: 7,
              borderRadius: 999,
              borderWidth: 1.5,
              borderColor: status.review.softFg,
            }}
          />
          <Text style={{ fontSize: 10, color: status.review.softFg }}>Needs you</Text>
        </View>
        <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text.primary }}>
          {`Start work across ${summary.legs.length} project${summary.legs.length === 1 ? '' : 's'}?`}
        </Text>
      </View>
      {summary.title ? (
        <Text style={{ fontSize: 13.5, fontWeight: '500', color: theme.text.primary }}>
          {summary.title}
        </Text>
      ) : null}
      <Text style={{ fontSize: 11.5, lineHeight: 18, color: theme.text.secondary }}>
        {PROCESS_GROUP_LAUNCH_BLURB}
      </Text>

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
                    {waitsFor ? (
                      <Text style={{ fontSize: 11, color: theme.text.muted }}>{waitsFor}</Text>
                    ) : null}
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
        {renderModelChip
          ? renderModelChip({
              model: runModel,
              onPick: setRunModel,
              cli: runCli,
              onPickCli: (cli, credentialId, model) => {
                setRunCli(cli)
                setRunCliCredentialId(credentialId)
                setRunModel(model)
              },
            })
          : null}
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

      {error !== null ? (
        <View
          style={{
            padding: nativeSpace[3],
            borderRadius: nativeRadii[3],
            borderWidth: 1,
            borderColor: red[500],
          }}
        >
          <Text style={{ fontSize: 13, color: red[600] }}>{error}</Text>
        </View>
      ) : null}

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: nativeSpace[2],
          flexWrap: 'wrap',
        }}
      >
        <Button
          size="sm"
          variant="primary"
          onPress={() => decide('once')}
          loading={busy}
          disabled={!canStart}
        >
          Start work
        </Button>
        <Button variant="danger" size="sm" onPress={() => decide('deny')} disabled={busy}>
          No — cancel
        </Button>
        <Button variant="ghost" size="sm" onPress={onDecideLater} disabled={busy}>
          Decide later
        </Button>
      </View>
    </View>
  )
}
