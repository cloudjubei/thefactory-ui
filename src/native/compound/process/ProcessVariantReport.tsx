import { useState, type ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'

import {
  PROCESS_VARIANT_COPY,
  processVariantChildView,
  useProcessRun,
  type EvidenceTile,
  type ProcessVariantFact,
  type ProcessVariantLane,
  type ProcessVariantRecording,
  type ProcessVariantReportView,
  type ProcessVariantSection,
} from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconChevronRight, IconCopy, IconDocument } from '../../icons'
import { Button } from '../../primitives/Button'
import SegmentedControl from '../../primitives/SegmentedControl'
import type { SaveFileHandler } from '../chat/signoff'
import WalkthroughTab from '../chat/signoff/WalkthroughTab'
import DurationChip from '../chips/DurationChip'
import RefChip from '../chips/RefChip'
import ToneBadge from '../chips/ToneBadge'
import Markdown from '../Markdown'
import ScriptStepLog from './ScriptStepLog'
import SignoffReportPanel from './signoff/SignoffReportPanel'

export type ProcessVariantReportProps = {
  view: ProcessVariantReportView
  projectId: string
  top?: ReactNode
  steps?: ReactNode
  onOpenSteps?: () => void
  /** Open a variant's own page: a push. */
  onOpenVariant: (lane: ProcessVariantLane) => void
  onCopy?: (text: string) => void
  onSaveFile?: SaveFileHandler
}

function Card({ children, label }: { children: ReactNode; label: string }) {
  const { theme } = useNativeTheme()
  return (
    <View
      accessibilityLabel={label}
      style={{
        overflow: 'hidden',
        borderRadius: nativeRadii[4],
        borderWidth: 1,
        borderColor: theme.border.subtle,
        backgroundColor: theme.surface.raised,
      }}
    >
      {children}
    </View>
  )
}

function CardHead({
  title,
  sub,
  action,
}: {
  title: string
  sub?: string | undefined
  action?: ReactNode
}) {
  const { theme } = useNativeTheme()
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: nativeSpace[4],
        paddingVertical: nativeSpace[3],
      }}
    >
      <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text.primary }}>{title}</Text>
      <Text numberOfLines={1} style={{ flex: 1, fontSize: 12.5, color: theme.text.muted }}>
        {sub ?? ''}
      </Text>
      {action}
    </View>
  )
}

/** A ref or patch of a variant, the way the launch card showed it. */
export function VariantFacts({ facts }: { facts: readonly ProcessVariantFact[] }) {
  const { theme } = useNativeTheme()
  if (facts.length === 0) return null
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {facts.map((fact) =>
        fact.kind === 'ref' ? (
          <RefChip key={fact.key} value={fact.text} kind="commit" />
        ) : (
          <View
            key={fact.key}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              paddingHorizontal: 8,
              paddingVertical: 1,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: theme.border.default,
            }}
          >
            <IconDocument size={12} color={theme.text.secondary} />
            <Text style={{ fontSize: 11.5, color: theme.text.secondary }}>{fact.text}</Text>
          </View>
        ),
      )}
    </View>
  )
}

function ProofBadge({ recording }: { recording: ProcessVariantRecording }) {
  return <ToneBadge tone={recording.proof ? 'done' : 'review'} label={recording.label} />
}

/** Recordings in the order filed, each by its own label, with its proof badge. */
export function VariantRecordings({
  projectId,
  recordings,
  onSaveFile,
}: {
  projectId: string
  recordings: readonly ProcessVariantRecording[]
  onSaveFile?: SaveFileHandler
}) {
  const byId = new Map(recordings.map((one) => [one.tile.ref.id, one]))
  const footer = (tile: EvidenceTile) => {
    const recording = byId.get(tile.ref.id)
    return recording ? <ProofBadge recording={recording} /> : null
  }
  return (
    <View style={{ gap: 8 }}>
      <WalkthroughTab
        projectId={projectId}
        recordings={recordings.map((one) => one.tile)}
        renderFooter={footer}
        {...(onSaveFile ? { onSaveFile } : {})}
      />
    </View>
  )
}

/** The reports a variant filed, in the order filed, each by its own label. */
export function VariantFindings({ section }: { section: ProcessVariantSection }) {
  const { theme } = useNativeTheme()
  return (
    <View style={{ gap: nativeSpace[3] }}>
      {section.findings.map((one) => (
        <View key={one.key} style={{ gap: 4 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text.primary }}>
            {one.title}
          </Text>
          {one.text ? <Markdown text={one.text} /> : null}
        </View>
      ))}
      {section.findingsNote ? (
        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text.primary }}>
            {PROCESS_VARIANT_COPY.review}
          </Text>
          <Text style={{ fontSize: 12.5, color: theme.text.muted }}>{section.findingsNote}</Text>
        </View>
      ) : null}
    </View>
  )
}

/** The step log of each script step the variant's run reached. */
function VariantStepLogs({
  section,
  projectId,
  onSaveFile,
}: {
  section: ProcessVariantSection
  projectId: string
  onSaveFile?: SaveFileHandler
}) {
  const { run } = useProcessRun(section.lane.runId)
  const { stepLogs } = processVariantChildView(run, section.tiles)
  return (
    <>
      {stepLogs.map((log) => (
        <Card key={log.stepId} label={log.title}>
          <CardHead title={log.title} sub={PROCESS_VARIANT_COPY.stepLog} />
          <View style={{ padding: nativeSpace[4], paddingTop: 0 }}>
            <ScriptStepLog
              projectId={projectId}
              view={log.view}
              {...(onSaveFile ? { onSaveFile } : {})}
            />
          </View>
        </Card>
      ))}
    </>
  )
}

/** A variant's own page: how it stands, then what it filed and its step logs. */
export function ProcessVariantPage({
  section,
  projectId,
  onSaveFile,
}: {
  section: ProcessVariantSection
  projectId: string
  onSaveFile?: SaveFileHandler
}) {
  const { theme } = useNativeTheme()
  const { lane } = section
  return (
    <View
      style={{ gap: nativeSpace[3], marginHorizontal: nativeSpace[3], marginTop: nativeSpace[3] }}
    >
      <Card label={lane.label}>
        <View style={{ gap: 8, padding: nativeSpace[4] }}>
          <VariantFacts facts={lane.facts} />
          <Text style={{ fontSize: 12.5, color: theme.text.secondary }}>{lane.line}</Text>
        </View>
      </Card>
      <Card label={PROCESS_VARIANT_COPY.recordings}>
        <CardHead
          title={PROCESS_VARIANT_COPY.recordings}
          sub={PROCESS_VARIANT_COPY.countAsProof(lane.proof.count, lane.proof.total)}
        />
        <View style={{ gap: nativeSpace[3], padding: nativeSpace[4], paddingTop: 0 }}>
          <VariantRecordings
            projectId={projectId}
            recordings={section.recordings}
            {...(onSaveFile ? { onSaveFile } : {})}
          />
          <VariantFindings section={section} />
        </View>
      </Card>
      <VariantStepLogs
        section={section}
        projectId={projectId}
        {...(onSaveFile ? { onSaveFile } : {})}
      />
    </View>
  )
}

function VariantRow({ section, onOpen }: { section: ProcessVariantSection; onOpen: () => void }) {
  const { theme } = useNativeTheme()
  const { lane } = section
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={lane.label}
      onPress={onOpen}
      style={{
        gap: 6,
        paddingHorizontal: nativeSpace[4],
        paddingVertical: nativeSpace[3],
        borderTopWidth: 1,
        borderTopColor: theme.border.subtle,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text
          numberOfLines={1}
          style={{ flex: 1, fontSize: 13.5, fontWeight: '600', color: theme.text.primary }}
        >
          {lane.label}
        </Text>
        <ToneBadge tone={lane.badge.tone} label={lane.badge.label} />
        <IconChevronRight size={14} color={theme.text.muted} />
      </View>
      <Text numberOfLines={1} style={{ fontSize: 12, color: theme.text.secondary }}>
        {lane.line}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <ToneBadge
          tone={lane.chip.state === 'passed' ? 'done' : 'review'}
          label={`${PROCESS_VARIANT_COPY.proof} · ${PROCESS_VARIANT_COPY.ofTotal(lane.proof.count, lane.proof.total)}`}
        />
        {lane.time ? <DurationChip label={lane.time} /> : null}
      </View>
    </Pressable>
  )
}

function ReportDoc({
  view,
  onCopy,
}: {
  view: ProcessVariantReportView
  onCopy?: (text: string) => void
}) {
  const { theme } = useNativeTheme()
  const [doc, setDoc] = useState('report')
  const post = view.post
  return (
    <View style={{ gap: 8, paddingHorizontal: nativeSpace[4], paddingBottom: nativeSpace[3] }}>
      {post ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <SegmentedControl
            size="sm"
            value={doc}
            onChange={setDoc}
            options={[
              { value: 'report', label: PROCESS_VARIANT_COPY.report },
              { value: 'post', label: PROCESS_VARIANT_COPY.post },
            ]}
          />
          {doc === 'post' && post.text && onCopy ? (
            <Button size="sm" variant="ghost" onPress={() => onCopy(post.text ?? '')}>
              <IconCopy size={14} color={theme.text.secondary} />
              {PROCESS_VARIANT_COPY.copy}
            </Button>
          ) : null}
        </View>
      ) : null}
      {doc === 'post' && post ? (
        <Markdown text={post.text ?? ''} />
      ) : view.report ? (
        <SignoffReportPanel view={view.report} />
      ) : null}
    </View>
  )
}

/** Native peer of web's `ProcessVariantReport`: each variant is a row that pushes its own page. */
export default function ProcessVariantReport({
  view,
  projectId,
  top,
  steps,
  onOpenSteps,
  onOpenVariant,
  onCopy,
  onSaveFile,
}: ProcessVariantReportProps) {
  const { theme } = useNativeTheme()
  return (
    <View style={{ gap: nativeSpace[3] }}>
      {top}
      {steps}
      <Card label={PROCESS_VARIANT_COPY.finalReport}>
        <CardHead
          title={PROCESS_VARIANT_COPY.finalReport}
          sub={view.waiting?.sub}
          action={
            onOpenSteps ? (
              <Pressable accessibilityRole="button" onPress={onOpenSteps}>
                <Text style={{ fontSize: 12.5, fontWeight: '500', color: theme.accent.primary }}>
                  {PROCESS_VARIANT_COPY.lanes}
                </Text>
              </Pressable>
            ) : null
          }
        />
        {view.waiting ? (
          <Text
            style={{
              paddingHorizontal: nativeSpace[4],
              paddingBottom: nativeSpace[3],
              fontSize: 12.5,
              color: theme.text.secondary,
            }}
          >
            {view.waiting.line}
          </Text>
        ) : (
          <ReportDoc view={view} {...(onCopy ? { onCopy } : {})} />
        )}
      </Card>
      {view.sections.length > 0 ? (
        <Card label={PROCESS_VARIANT_COPY.heading}>
          <CardHead
            title={PROCESS_VARIANT_COPY.heading}
            sub={PROCESS_VARIANT_COPY.recordingsAndReviews}
          />
          {view.sections.map((section) => (
            <VariantRow
              key={section.lane.id}
              section={section}
              onOpen={() => onOpenVariant(section.lane)}
            />
          ))}
        </Card>
      ) : null}
      {view.recordings.length > 0 ? (
        <Card label={PROCESS_VARIANT_COPY.recordings}>
          <CardHead
            title={PROCESS_VARIANT_COPY.recordings}
            sub={PROCESS_VARIANT_COPY.countAsProof(
              view.recordings.filter((one) => one.proof).length,
              view.recordings.length,
            )}
          />
          <View style={{ padding: nativeSpace[4], paddingTop: 0 }}>
            <VariantRecordings
              projectId={projectId}
              recordings={view.recordings}
              {...(onSaveFile ? { onSaveFile } : {})}
            />
          </View>
        </Card>
      ) : null}
    </View>
  )
}
