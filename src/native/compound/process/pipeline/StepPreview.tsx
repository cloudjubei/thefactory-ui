import type { ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'
import type { ProcessStepState } from 'thefactory-tools/types'

import {
  codeReviewPreview,
  codeReviewVerdictBadge,
  codeReviewView,
  hasIsolatedAttempts,
  processStageChips,
  processStepStates,
  processStepTone,
  reportPreviewTiles,
  reportSectionsOf,
  useProcessRun,
  useStepFiling,
  type ProcessRun,
  type ProcessStepPreviewKind,
  type ProcessRunStopHolder,
} from '../../../../headless'
import { nativeRadii } from '../../../../tokens/native'
import { useNativeTheme } from '../../../hooks/useNativeTheme'
import { IconExternalLink } from '../../../icons'
import ProcessCheckList from '../ProcessCheckList'
import Pill from '../signoff/Pill'
import { reviewToneVariant } from '../signoff/tones'
import SignoffRecord from './SignoffRecord'
import type { StepPanelTarget } from './StepScreen'

export type StepPreviewProps = {
  run: ProcessRun
  state: ProcessStepState
  kind: ProcessStepPreviewKind
  /** Who has the stop the run waits at — the stopped stage of the nested run it mirrors says so. */
  stopHolder?: ProcessRunStopHolder
  onOpen: (target: StepPanelTarget) => void
  onDrill: (childRunId: string) => void
}

function PeekCard({
  label,
  onPress,
  children,
}: {
  label: string
  onPress: () => void
  children: ReactNode
}) {
  const { theme } = useNativeTheme()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 12,
        borderRadius: nativeRadii[3],
        borderWidth: 1,
        borderColor: pressed ? theme.accent.primary : theme.border.subtle,
        backgroundColor: theme.surface.raised,
      })}
    >
      <View style={{ flex: 1, minWidth: 0, gap: 8 }}>{children}</View>
      <IconExternalLink size={16} color={theme.accent.primary} />
    </Pressable>
  )
}

/**
 * Native peer of web's `StepPreview`: what a step's chevron shows — a code
 * review's verdict and counts, a report's tiles, a feature's stages — each
 * opening its full view on a pushed screen; a decided sign-off, its record.
 */
export default function StepPreview({
  run,
  state,
  kind,
  stopHolder,
  onOpen,
  onDrill,
}: StepPreviewProps) {
  const { theme, status } = useNativeTheme()
  const target = (entryId?: string): StepPanelTarget => ({
    runId: run.id,
    stepId: state.step.id,
    ...(entryId ? { entryId } : {}),
  })
  if (kind === 'code-review') {
    return <ReviewPreview run={run} state={state} onOpen={() => onOpen(target())} />
  }
  if (kind === 'report') {
    return <ReportPreview run={run} state={state} onOpen={() => onOpen(target())} />
  }
  if (kind === 'stages' && state.latest?.childRunId) {
    const childRunId = state.latest.childRunId
    return (
      <StagesPreview
        childRunId={childRunId}
        {...(stopHolder && run.park?.childRunId === childRunId ? { stopHolder } : {})}
        onOpen={onOpen}
        onDrill={onDrill}
      />
    )
  }
  if (kind === 'signoff') return <SignoffRecord run={run} state={state} onOpen={onOpen} />
  if (kind === 'checks') {
    return (
      <PeekCard label={`Open ${state.step.name}`} onPress={() => onOpen(target())}>
        <ProcessCheckList step={state.step} latest={state.latest} />
      </PeekCard>
    )
  }
  return (
    <View style={{ gap: 8 }}>
      <PeekCard label={`Open ${state.step.name}`} onPress={() => onOpen(target(state.latest?.id))}>
        <Text style={{ fontSize: 12.5, color: theme.text.secondary }}>
          {state.latest?.summary?.trim() || state.step.description || state.step.name}
        </Text>
      </PeekCard>
      {hasIsolatedAttempts(state.entries) ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 11, color: theme.text.muted }}>Attempts</Text>
          {state.entries.map((e, i) => {
            const v =
              status[processStepTone(e.status === 'running' ? 'running' : 'done', e.outcome)]
            return (
              <Pressable
                key={e.id ?? i}
                accessibilityRole="button"
                onPress={() => onOpen(target(e.id))}
                style={{
                  borderRadius: nativeRadii.round,
                  borderWidth: 1,
                  borderColor: v.softBorder,
                  backgroundColor: v.softBg,
                  paddingHorizontal: 8,
                  paddingVertical: 1,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '600', color: v.softFg }}>#{i + 1}</Text>
              </Pressable>
            )
          })}
        </View>
      ) : null}
    </View>
  )
}

function ReviewPreview({
  run,
  state,
  onOpen,
}: {
  run: ProcessRun
  state: ProcessStepState
  onOpen: () => void
}) {
  const { theme } = useNativeTheme()
  const { tile } = useStepFiling(run, state.latest, ['code-review'])
  const view = tile ? codeReviewView(tile, state.latest?.review) : undefined
  if (view) {
    const preview = codeReviewPreview(view)
    return (
      <PeekCard label={`Open ${state.step.name}`} onPress={onOpen}>
        <Pill tone={preview.verdict.tone} label={preview.verdict.label} bold />
        <Text style={{ fontSize: 12.5, color: theme.text.secondary }}>{preview.line}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {preview.chips.map((chip) => (
            <Pill key={chip.key} tone={chip.tone} label={chip.label} />
          ))}
        </View>
      </PeekCard>
    )
  }
  const verdict = state.latest?.review
  const badge = codeReviewVerdictBadge({ verdict: verdict?.verdict })
  return (
    <PeekCard label={`Open ${state.step.name}`} onPress={onOpen}>
      <Pill tone={badge.tone} label={badge.label} bold />
      {(verdict?.reason ?? state.latest?.summary) ? (
        <Text style={{ fontSize: 12.5, color: theme.text.secondary }}>
          {verdict?.reason ?? state.latest?.summary}
        </Text>
      ) : null}
    </PeekCard>
  )
}

function ReportPreview({
  run,
  state,
  onOpen,
}: {
  run: ProcessRun
  state: ProcessStepState
  onOpen: () => void
}) {
  const { theme, status } = useNativeTheme()
  const { tile } = useStepFiling(run, state.latest, ['final-report', 'feature-report'])
  const sections = tile ? reportSectionsOf(tile) : undefined
  if (!sections) {
    return (
      <PeekCard label={`Open ${state.step.name}`} onPress={onOpen}>
        <Text style={{ fontSize: 12.5, color: theme.text.secondary }}>
          {state.latest?.summary?.trim() || (tile ? 'Report written' : 'Report')}
        </Text>
      </PeekCard>
    )
  }
  return (
    <PeekCard label={`Open ${state.step.name}`} onPress={onOpen}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {reportPreviewTiles(sections).map((t) => (
          <View key={t.key} style={{ flexBasis: '45%', flexGrow: 1 }}>
            <Text style={{ fontSize: 11.5, color: theme.text.secondary }}>{t.label}</Text>
            <Text
              numberOfLines={1}
              style={{
                fontSize: 12.5,
                fontWeight: '600',
                color:
                  t.tone === 'neutral'
                    ? theme.text.primary
                    : reviewToneVariant(t.tone, status).softFg,
              }}
            >
              {t.value}
            </Text>
          </View>
        ))}
      </View>
    </PeekCard>
  )
}

function StagesPreview({
  childRunId,
  stopHolder,
  onOpen,
  onDrill,
}: {
  childRunId: string
  /** Who has the stop the nested run is at, as its top-level run reads it. */
  stopHolder?: ProcessRunStopHolder
  onOpen: (target: StepPanelTarget) => void
  onDrill: (childRunId: string) => void
}) {
  const { theme, status } = useNativeTheme()
  const { run: child } = useProcessRun(childRunId)
  if (!child) return null
  const chips = processStageChips(processStepStates(child), child.park?.stepId, stopHolder)
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
      {chips.map((chip) => {
        const v = status[chip.tone]
        return (
          <Pressable
            key={chip.stepId}
            accessibilityRole="button"
            disabled={chip.inert}
            onPress={() => onOpen({ runId: child.id, stepId: chip.stepId })}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              height: 30,
              paddingHorizontal: 12,
              borderRadius: nativeRadii.round,
              borderWidth: 1,
              borderColor: chip.tone === 'working' ? v.softBorder : theme.border.subtle,
              backgroundColor: chip.tone === 'working' ? v.softBg : theme.surface.raised,
              opacity: chip.inert ? 0.6 : 1,
            }}
          >
            {chip.mark ? (
              <Text style={{ fontWeight: '700', color: v.softFg }}>{chip.mark}</Text>
            ) : null}
            <Text style={{ fontSize: 12, fontWeight: '600', color: theme.text.primary }}>
              {chip.label}
            </Text>
            {chip.note ? (
              <Text style={{ fontSize: 12, color: theme.text.secondary }}>{chip.note}</Text>
            ) : null}
          </Pressable>
        )
      })}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open this feature’s pipeline"
        onPress={() => onDrill(childRunId)}
        style={{
          width: 30,
          height: 30,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: nativeRadii.round,
          borderWidth: 1,
          borderColor: theme.border.subtle,
        }}
      >
        <IconExternalLink size={14} color={theme.accent.primary} />
      </Pressable>
    </View>
  )
}
