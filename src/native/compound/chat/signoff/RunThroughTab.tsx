import { useRef, useState, type ReactNode } from 'react'
import { Image, Pressable, Text, View } from 'react-native'
import { formatVideoTime } from 'thefactory-tools/utils'

import {
  EVIDENCE_REFERENCE_COPY,
  evidenceCitation,
  RUN_THROUGH_TEXT,
  runThroughTickPercent,
  useReviewEvidenceImage,
  type RunThroughIssueRow,
  type RunThroughRecordView,
  type RunThroughReportView,
} from '../../../../headless'
import { nativeRadii } from '../../../../tokens/native'
import { useNativeTheme } from '../../../hooks/useNativeTheme'
import { IconChevronRight, IconMonitor } from '../../../icons'
import Pill from '../../process/signoff/Pill'
import { reviewToneVariant } from '../../process/signoff/tones'
import { Button } from '../../../primitives/Button'
import { useClipboardHost } from '../../ClipboardHostContext'
import EvidenceImageOverlay from '../EvidenceImageOverlay'
import { WalkthroughRecording } from './WalkthroughTab'

export type RunThroughTabProps = {
  projectId: string
  view: RunThroughReportView
  /** Shown first: the way into going over its issues, or how they were gone over. */
  top?: ReactNode
}

function Eyebrow({ children }: { children: string }) {
  const { theme } = useNativeTheme()
  return (
    <Text
      style={{
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 0.6,
        textTransform: 'uppercase',
        color: theme.text.muted,
      }}
    >
      {children}
    </Text>
  )
}

function RecordHead({ record }: { record: RunThroughRecordView }) {
  const { theme, status } = useNativeTheme()
  const mark = record.reachedEnd ? status.done.softFg : status.stuck.softFg
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
        <Eyebrow>{RUN_THROUGH_TEXT.scenario}</Eyebrow>
        <Text style={{ flex: 1, fontSize: 13, color: theme.text.primary }}>{record.scenario}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: mark }}>
          {record.reachedEnd ? '✓' : '✗'}
        </Text>
        <Text style={{ flex: 1, fontSize: 13, color: theme.text.secondary }}>{record.endLine}</Text>
      </View>
      <Text style={{ fontSize: 13, lineHeight: 19, color: theme.text.secondary }}>
        {record.summary}
      </Text>
    </View>
  )
}

/** The moments under the recording: each issue a tick in its severity's colour, the playhead, and where it stopped. */
function MomentsBar({
  issues,
  reachedEnd,
  atSec,
  durationSec,
  onPick,
}: {
  issues: readonly RunThroughIssueRow[]
  reachedEnd: boolean
  atSec: number
  durationSec: number
  onPick: (row: RunThroughIssueRow) => void
}) {
  const { theme, status } = useNativeTheme()
  const playhead = runThroughTickPercent(atSec, durationSec) ?? 0
  const time = { fontSize: 12, fontVariant: ['tabular-nums' as const], color: theme.text.secondary }
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Text style={time}>{formatVideoTime(atSec)}</Text>
      <View style={{ flex: 1, height: 18 }}>
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 7,
            height: 4,
            borderRadius: 2,
            backgroundColor: theme.border.default,
          }}
        />
        <View
          style={{
            position: 'absolute',
            left: 0,
            top: 7,
            height: 4,
            width: `${playhead}%`,
            borderRadius: 2,
            backgroundColor: theme.accent.primary,
          }}
        />
        {issues.map((row) => {
          const left = runThroughTickPercent(row.atSec, durationSec)
          return left === undefined ? null : (
            <Pressable
              key={row.key}
              accessibilityRole="button"
              accessibilityLabel={RUN_THROUGH_TEXT.playFrom(row.time ?? '')}
              hitSlop={8}
              onPress={() => onPick(row)}
              style={{
                position: 'absolute',
                left: `${left}%`,
                top: 2,
                width: 4,
                height: 14,
                marginLeft: -2,
                borderRadius: 2,
                backgroundColor:
                  row.tone === 'neutral'
                    ? theme.border.strong
                    : reviewToneVariant(row.tone, status).bg,
              }}
            />
          )
        })}
        {reachedEnd ? null : (
          <View
            style={{
              position: 'absolute',
              right: 0,
              top: 2,
              width: 2,
              height: 14,
              borderRadius: 1,
              backgroundColor: status.stuck.softFg,
            }}
          />
        )}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: `${playhead}%`,
            top: 3,
            width: 12,
            height: 12,
            marginLeft: -6,
            borderRadius: 6,
            borderWidth: 2,
            borderColor: theme.surface.raised,
            backgroundColor: theme.accent.primary,
          }}
        />
      </View>
      <Text style={time}>{formatVideoTime(durationSec)}</Text>
    </View>
  )
}

function Screenshot({
  projectId,
  row,
  onOpen,
}: {
  projectId: string
  row: RunThroughIssueRow
  onOpen: (dataUri: string) => void
}) {
  const { theme } = useNativeTheme()
  const tile = row.screenshot
  const fetched = useReviewEvidenceImage(
    tile && !tile.dataUri ? projectId : undefined,
    tile?.ref.id,
    tile?.ref.mediaType,
  )
  const dataUri = tile?.dataUri ?? fetched.dataUri
  if (!tile) return null
  return (
    <Pressable
      accessibilityRole="imagebutton"
      accessibilityLabel={RUN_THROUGH_TEXT.openShot(row.title)}
      disabled={!dataUri}
      onPress={() => dataUri && onOpen(dataUri)}
      style={{
        width: 132,
        aspectRatio: 16 / 10,
        overflow: 'hidden',
        borderRadius: nativeRadii[2],
        borderWidth: 1,
        borderColor: theme.border.subtle,
        backgroundColor: '#000000',
      }}
    >
      {dataUri ? (
        <Image
          source={{ uri: dataUri }}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
        />
      ) : null}
    </Pressable>
  )
}

function CopyReference({ projectId, evidenceId }: { projectId: string; evidenceId: string }) {
  const { copyText } = useClipboardHost()
  const [copied, setCopied] = useState(false)
  if (!copyText) return null
  return (
    <Button
      size="sm"
      variant="secondary"
      onPress={() => {
        void copyText(evidenceCitation({ kind: 'evidence', projectId, evidenceId })).then(() =>
          setCopied(true),
        )
      }}
    >
      {copied ? EVIDENCE_REFERENCE_COPY.copied : EVIDENCE_REFERENCE_COPY.copyReference}
    </Button>
  )
}

function IssueDetail({
  projectId,
  row,
  onOpenShot,
}: {
  projectId: string
  row: RunThroughIssueRow
  onOpenShot: (dataUri: string) => void
}) {
  const { theme } = useNativeTheme()
  const line = (label: string, text: string | undefined) =>
    text ? (
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Text style={{ fontSize: 12.5, fontWeight: '600', color: theme.text.secondary }}>
          {label}
        </Text>
        <Text style={{ flex: 1, fontSize: 12.5, color: theme.text.secondary }}>{text}</Text>
      </View>
    ) : null
  return (
    <View
      style={{
        gap: 6,
        paddingHorizontal: 12,
        paddingBottom: 12,
        backgroundColor: theme.accent.softBg,
      }}
    >
      <Text style={{ fontSize: 13, lineHeight: 19, color: theme.text.secondary }}>
        {row.happened}
      </Text>
      {line(RUN_THROUGH_TEXT.expected, row.expected)}
      {line(RUN_THROUGH_TEXT.doing, row.doing)}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        <Screenshot projectId={projectId} row={row} onOpen={onOpenShot} />
        {row.view ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              flexShrink: 1,
              height: 24,
              paddingHorizontal: 8,
              borderRadius: nativeRadii[1],
              borderWidth: 1,
              borderColor: theme.border.subtle,
              backgroundColor: theme.surface.muted,
            }}
          >
            <IconMonitor size={12} color={theme.text.secondary} />
            <Text
              numberOfLines={1}
              style={{
                flexShrink: 1,
                fontSize: 12,
                fontFamily: 'Menlo',
                color: theme.text.primary,
              }}
            >
              {row.view}
            </Text>
          </View>
        ) : null}
        <CopyReference projectId={projectId} evidenceId={row.key} />
      </View>
    </View>
  )
}

/**
 * A tester's run-through on its own tab: the scenario, whether it reached the
 * end or where it stopped, and how it went; the run's recording with every
 * issue a tick on its moments; and the issues worst first, one open at a
 * time. Opening an issue plays its moment where the host's player can seek;
 * its screenshot opens large.
 */
export default function RunThroughTab({ projectId, view, top }: RunThroughTabProps) {
  const { theme } = useNativeTheme()
  const [openKey, setOpenKey] = useState<string | undefined>(view.issues[0]?.key)
  const [time, setTime] = useState({ atSec: 0, durationSec: 0 })
  const [shot, setShot] = useState<{ title: string; caption: string; dataUri: string }>()
  const seekRef = useRef<((atSec: number) => void) | null>(null)
  const { record, issues, recording } = view

  const play = (row: RunThroughIssueRow) => {
    if (row.atSec !== undefined) seekRef.current?.(row.atSec)
  }
  const pick = (row: RunThroughIssueRow) => {
    setOpenKey(row.key)
    play(row)
  }

  return (
    <View style={{ gap: 12 }}>
      {top}
      {record ? <RecordHead record={record} /> : null}
      {recording ? (
        <WalkthroughRecording
          projectId={projectId}
          tile={recording}
          label={RUN_THROUGH_TEXT.recording}
          seekRef={seekRef}
          onProgress={(atSec, durationSec) => setTime({ atSec, durationSec })}
          footer={
            time.durationSec > 0 ? (
              <MomentsBar
                issues={issues}
                reachedEnd={record?.reachedEnd !== false}
                atSec={time.atSec}
                durationSec={time.durationSec}
                onPick={pick}
              />
            ) : null
          }
        />
      ) : (
        <View
          style={{
            height: 120,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 16,
            borderRadius: nativeRadii[2],
            borderWidth: 1,
            borderColor: theme.border.subtle,
            backgroundColor: theme.surface.muted,
          }}
        >
          <Text style={{ fontSize: 12, textAlign: 'center', color: theme.text.secondary }}>
            {RUN_THROUGH_TEXT.noRecording}
          </Text>
        </View>
      )}
      <View style={{ gap: 8 }}>
        <Eyebrow>{`${RUN_THROUGH_TEXT.issues} · ${view.issuesSummary}`}</Eyebrow>
        <View
          style={{
            overflow: 'hidden',
            borderRadius: nativeRadii[3],
            borderWidth: 1,
            borderColor: theme.border.subtle,
          }}
        >
          {issues.length === 0 ? (
            <Text
              style={{
                paddingHorizontal: 12,
                paddingVertical: 10,
                fontSize: 12.5,
                color: theme.text.secondary,
              }}
            >
              {RUN_THROUGH_TEXT.nothingFlagged}
            </Text>
          ) : (
            issues.map((row, index) => {
              const open = row.key === openKey
              return (
                <View
                  key={row.key}
                  style={{
                    borderTopWidth: index === 0 ? 0 : 1,
                    borderTopColor: theme.border.subtle,
                  }}
                >
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ expanded: open }}
                    onPress={() => {
                      setOpenKey(open ? undefined : row.key)
                      play(row)
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      backgroundColor: open ? theme.accent.softBg : 'transparent',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '500',
                        fontVariant: ['tabular-nums'],
                        color: row.time && recording ? theme.accent.primary : theme.text.muted,
                      }}
                    >
                      {row.time ?? '—'}
                    </Text>
                    <Pill tone={row.tone} label={row.severity} />
                    <Text
                      numberOfLines={1}
                      style={{
                        flex: 1,
                        fontSize: 13,
                        fontWeight: '600',
                        color: theme.text.primary,
                      }}
                    >
                      {row.title}
                    </Text>
                    <View style={{ transform: [{ rotate: open ? '90deg' : '0deg' }] }}>
                      <IconChevronRight size={14} color={theme.text.muted} />
                    </View>
                  </Pressable>
                  {open ? (
                    <IssueDetail
                      projectId={projectId}
                      row={row}
                      onOpenShot={(dataUri) =>
                        setShot({
                          title: row.title,
                          caption: [row.view, row.time].filter(Boolean).join(' · ') || row.title,
                          dataUri,
                        })
                      }
                    />
                  ) : null}
                </View>
              )
            })
          )}
        </View>
      </View>
      <EvidenceImageOverlay
        isOpen={shot !== undefined}
        onClose={() => setShot(undefined)}
        title={shot?.title ?? ''}
        images={shot ? [{ id: shot.title, caption: shot.caption, dataUri: shot.dataUri }] : []}
      />
    </View>
  )
}
