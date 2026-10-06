import { useEffect, useState, type ReactNode } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import type { ProcessLedgerEntry, ProcessStepState } from 'thefactory-tools/types'

import {
  processAttemptLeaf,
  processLeafReview,
  processStepStates,
  reportBodyView,
  useProcessRun,
  useStepFiling,
  type ProcessNodeRunRef,
  type ProcessRun,
} from '../../../../headless'
import { nativeRadii, nativeSpace } from '../../../../tokens/native'
import { useNativeTheme } from '../../../hooks/useNativeTheme'
import SegmentedControl from '../../../primitives/SegmentedControl'
import { IconChevronLeft, IconExternalLink } from '../../../icons'
import type { SaveFileHandler } from '../../chat/signoff'
import ProcessCheckList from '../ProcessCheckList'
import VerificationReview from '../VerificationReview'
import CodeReviewPanel from '../signoff/CodeReviewPanel'
import SignoffReportPanel from '../signoff/SignoffReportPanel'

/** Which step's output the screen shows — an attempt of it, when one is named. */
export type StepPanelTarget = { runId: string; stepId: string; entryId?: string }

export type StepScreenProps = {
  target: StepPanelTarget
  onBack: () => void
  renderAgentRun?: (ref: ProcessNodeRunRef, onBack: () => void) => ReactNode
  onOpenAgentRun?: (ref: ProcessNodeRunRef) => void
  onSaveFile?: SaveFileHandler
}

type PanelView = 'output' | 'transcript'

/**
 * The native form of web's side panel: one step's full output — its code
 * review, report, checks, verify proof or chat — pushed over the pipeline
 * under a head with "‹ Pipeline" and ↗ (open as a full page).
 */
export default function StepScreen({
  target,
  onBack,
  renderAgentRun,
  onOpenAgentRun,
  onSaveFile,
}: StepScreenProps) {
  const { theme } = useNativeTheme()
  const { run } = useProcessRun(target.runId)
  const [view, setView] = useState<PanelView>('output')
  useEffect(() => setView('output'), [target.runId, target.stepId, target.entryId])

  const state = run ? processStepStates(run).find((s) => s.step.id === target.stepId) : undefined
  const entry =
    state && target.entryId ? state.entries.find((e) => e.id === target.entryId) : state?.latest
  const index = state && entry ? state.entries.indexOf(entry) : -1
  const title = state
    ? state.entries.length > 1 && index >= 0
      ? `${state.step.name} · attempt ${index + 1}`
      : state.step.name
    : ''
  const ref = entry?.runRef
  const hasOutput = state ? state.step.kind !== 'agent' && state.step.kind !== 'capture' : false
  const canTranscript = ref?.chatContextId !== undefined && renderAgentRun !== undefined
  const leafReview =
    run && state && entry
      ? processLeafReview(run, processAttemptLeaf(entry, state.step.name) ?? {})
      : undefined
  const switchable = canTranscript && (hasOutput || leafReview !== undefined)

  return (
    <View style={{ flex: 1 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: nativeSpace[2],
          paddingHorizontal: nativeSpace[3],
          paddingVertical: nativeSpace[2],
          borderBottomWidth: 1,
          borderBottomColor: theme.border.subtle,
        }}
      >
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Back to the pipeline"
          style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
        >
          <IconChevronLeft size={16} color={theme.text.secondary} />
          <Text style={{ fontSize: 13, color: theme.text.secondary }}>Pipeline</Text>
        </Pressable>
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: 13,
            fontWeight: '600',
            color: theme.text.primary,
          }}
        >
          {title}
        </Text>
        {switchable ? (
          <SegmentedControl
            size="sm"
            value={view}
            onChange={(v) => setView(v === 'transcript' ? 'transcript' : 'output')}
            options={[
              { value: 'output', label: 'Output' },
              { value: 'transcript', label: 'Transcript' },
            ]}
          />
        ) : null}
        {ref && onOpenAgentRun ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open as a full page"
            onPress={() => onOpenAgentRun(ref)}
            style={{
              width: 30,
              height: 30,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: nativeRadii[2],
              borderWidth: 1,
              borderColor: theme.border.subtle,
            }}
          >
            <IconExternalLink size={14} color={theme.text.secondary} />
          </Pressable>
        ) : null}
      </View>
      {!run || !state ? (
        <Text style={{ padding: nativeSpace[4], fontSize: 12.5, color: theme.text.secondary }}>
          Loading…
        </Text>
      ) : view === 'transcript' && ref && renderAgentRun ? (
        <View style={{ flex: 1 }}>{renderAgentRun(ref, onBack)}</View>
      ) : (
        <StepOutput
          run={run}
          state={state}
          entry={entry}
          leafReview={leafReview}
          {...(renderAgentRun && ref ? { transcript: renderAgentRun(ref, onBack) } : {})}
          {...(onSaveFile ? { onSaveFile } : {})}
        />
      )}
    </View>
  )
}

function StepOutput({
  run,
  state,
  entry,
  leafReview,
  transcript,
  onSaveFile,
}: {
  run: ProcessRun
  state: ProcessStepState
  entry: ProcessLedgerEntry | undefined
  leafReview: ReturnType<typeof processLeafReview>
  transcript?: ReactNode
  onSaveFile?: SaveFileHandler
}) {
  const { theme } = useNativeTheme()
  const pad = { padding: nativeSpace[4], paddingBottom: nativeSpace[6] }
  if (state.step.kind === 'judge') {
    return (
      <ScrollView contentContainerStyle={pad}>
        <ReviewOutput run={run} entry={entry} {...(onSaveFile ? { onSaveFile } : {})} />
      </ScrollView>
    )
  }
  if (state.step.kind === 'report') {
    return (
      <ScrollView contentContainerStyle={pad}>
        <ReportOutput run={run} entry={entry} />
      </ScrollView>
    )
  }
  if (state.step.kind === 'check') {
    return (
      <ScrollView contentContainerStyle={pad}>
        <ProcessCheckList step={state.step} latest={entry} />
      </ScrollView>
    )
  }
  if (leafReview) {
    return (
      <ScrollView contentContainerStyle={{ paddingBottom: nativeSpace[5] }}>
        <VerificationReview
          projectId={run.projectId}
          review={leafReview.scope}
          entry={leafReview.entry}
          title={state.step.name}
          {...(onSaveFile ? { onSaveFile } : {})}
        />
      </ScrollView>
    )
  }
  if (transcript) return <View style={{ flex: 1 }}>{transcript}</View>
  return (
    <Text style={{ padding: nativeSpace[4], fontSize: 13, color: theme.text.secondary }}>
      {entry?.summary?.trim() || 'Nothing to show for this step yet.'}
    </Text>
  )
}

function ReviewOutput({
  run,
  entry,
  onSaveFile,
}: {
  run: ProcessRun
  entry: ProcessLedgerEntry | undefined
  onSaveFile?: SaveFileHandler
}) {
  const { theme } = useNativeTheme()
  const { tile, loaded } = useStepFiling(run, entry, ['code-review'])
  if (tile) {
    return (
      <CodeReviewPanel
        review={tile}
        {...(entry?.review ? { verdict: entry.review } : {})}
        {...(onSaveFile ? { onSaveFile } : {})}
      />
    )
  }
  return (
    <Text style={{ fontSize: 13, color: theme.text.secondary }}>
      {loaded ? (entry?.review?.reason ?? 'No code review was filed for this step.') : 'Loading…'}
    </Text>
  )
}

function ReportOutput({ run, entry }: { run: ProcessRun; entry: ProcessLedgerEntry | undefined }) {
  const { theme } = useNativeTheme()
  const { tile, loaded } = useStepFiling(run, entry, ['final-report', 'feature-report'])
  if (tile)
    return <SignoffReportPanel view={{ tiles: [], ...reportBodyView(tile, []) }} hideTiles />
  return (
    <Text style={{ fontSize: 13, color: theme.text.secondary }}>
      {loaded ? (entry?.summary ?? 'No report was filed for this step.') : 'Loading…'}
    </Text>
  )
}
