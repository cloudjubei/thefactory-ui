import { useMemo, useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import {
  EVIDENCE_REFERENCE_COPY,
  evidenceTime,
  useEvidenceReference,
  type EvidenceLink,
  type EvidenceOpenTarget,
  type EvidenceReferenceView,
} from '../../headless'
import { nativeRadii, nativeSpace } from '../../tokens/native'
import { useNativeTheme } from '../hooks/useNativeTheme'
import { Button } from '../primitives/Button'
import EvidenceTargetOverlay from '../compound/chat/EvidenceTargetOverlay'
import { WalkthroughRecording } from '../compound/chat/signoff/WalkthroughTab'
import { evidenceGlyph } from '../compound/chips/referenceGlyphs'
import ImageViewer from '../compound/files/ImageViewer'

function Shown({ target }: { target: EvidenceOpenTarget }) {
  const { theme } = useNativeTheme()
  if (target.kind === 'image') {
    return (
      <View
        style={{
          gap: nativeSpace[2],
          borderRadius: nativeRadii[2],
          borderWidth: 1,
          borderColor: theme.border.subtle,
          overflow: 'hidden',
        }}
      >
        <View style={{ height: 320 }}>
          <ImageViewer uri={target.url} />
        </View>
        <Text
          style={{
            paddingHorizontal: 12,
            paddingBottom: 8,
            fontSize: 12,
            color: theme.text.secondary,
          }}
        >
          {target.caption}
        </Text>
      </View>
    )
  }
  return (
    <View style={{ gap: nativeSpace[2] }}>
      <WalkthroughRecording
        projectId={target.projectId}
        tile={{
          ref: { id: target.evidenceId, mediaType: target.mediaType },
          caption: target.caption,
        }}
        label={EVIDENCE_REFERENCE_COPY.recording}
        {...(target.atSec !== undefined ? { startAt: target.atSec } : {})}
      />
      <Text style={{ fontSize: 12.5, color: theme.text.secondary }}>
        {target.atSec !== undefined
          ? `${EVIDENCE_REFERENCE_COPY.openedAt} ${evidenceTime(target.atSec)} · `
          : ''}
        {target.caption}
      </Text>
    </View>
  )
}

export type EvidenceViewBodyProps = {
  view: EvidenceReferenceView
}

/**
 * Native peer of web's `EvidenceViewBody`: one evidence item on its own
 * screen — its kind, title and severity, what happened and where, and the item
 * itself, with its other way to open. Something gone says so calmly.
 */
export function EvidenceViewBody({ view }: EvidenceViewBodyProps) {
  const { theme, status } = useNativeTheme()
  const [opened, setOpened] = useState<EvidenceOpenTarget | undefined>()
  const Glyph = evidenceGlyph(view.glyph)
  const { card } = view
  const pill = card.severity ? status[card.severity.tone] : undefined
  const rest = card.actions.filter((action) => action.target !== view.open)
  return (
    <ScrollView contentContainerStyle={{ padding: nativeSpace[4], gap: nativeSpace[4] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[3] }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: nativeRadii[2],
            backgroundColor: theme.surface.muted,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Glyph size={18} color={theme.text.secondary} />
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text
            style={{
              fontSize: 10.5,
              fontWeight: '600',
              letterSpacing: 0.6,
              textTransform: 'uppercase',
              color: theme.text.secondary,
            }}
          >
            {card.caption}
          </Text>
          <Text style={{ fontSize: 17, fontWeight: '600', color: theme.text.primary }}>
            {card.title}
          </Text>
        </View>
      </View>
      {card.severity && pill ? (
        <View
          style={{
            alignSelf: 'flex-start',
            backgroundColor: pill.softBg,
            borderColor: pill.softBorder,
            borderWidth: 1,
            borderRadius: nativeRadii[2],
            paddingHorizontal: nativeSpace[2],
            paddingVertical: 1,
          }}
        >
          <Text style={{ fontSize: 11.5, fontWeight: '600', color: pill.softFg }}>
            {card.severity.label}
          </Text>
        </View>
      ) : null}
      {card.lines.map((line) => (
        <View
          key={`${line.label}:${line.value}`}
          style={{ flexDirection: 'row', gap: nativeSpace[3] }}
        >
          {line.label ? (
            <Text style={{ width: 74, fontSize: 13, color: theme.text.secondary }}>
              {line.label}
            </Text>
          ) : null}
          <Text style={{ flex: 1, fontSize: 13, color: theme.text.primary }}>{line.value}</Text>
        </View>
      ))}
      {view.phase === 'gone' ? (
        <View
          style={{
            gap: 6,
            padding: nativeSpace[4],
            borderRadius: nativeRadii[2],
            borderWidth: 1,
            borderStyle: 'dashed',
            borderColor: theme.border.strong,
            backgroundColor: theme.surface.base,
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: '700', color: theme.text.primary }}>
            {EVIDENCE_REFERENCE_COPY.goneTitle}
          </Text>
          <Text style={{ fontSize: 13, color: theme.text.secondary }}>
            {EVIDENCE_REFERENCE_COPY.goneBody}
          </Text>
        </View>
      ) : view.open ? (
        <Shown target={view.open} />
      ) : null}
      {rest.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: nativeSpace[2] }}>
          {rest.map((action) => (
            <Button key={action.label} variant="secondary" onPress={() => setOpened(action.target)}>
              {action.label}
            </Button>
          ))}
        </View>
      ) : null}
      {opened ? (
        <EvidenceTargetOverlay target={opened} onClose={() => setOpened(undefined)} />
      ) : null}
    </ScrollView>
  )
}

export type EvidenceViewProps = {
  projectId: string
  evidenceId: string
  /** The moment to open its recording at — the link's `?at=`. */
  at?: number
}

/**
 * Native peer of web's `EvidenceView`: the screen an evidence link opens, the
 * item read by its reference. The app mounts it at its evidence route.
 */
export default function EvidenceView({ projectId, evidenceId, at }: EvidenceViewProps) {
  const link = useMemo<EvidenceLink>(
    () => ({ kind: 'evidence', projectId, evidenceId, ...(at !== undefined ? { at } : {}) }),
    [projectId, evidenceId, at],
  )
  const { view } = useEvidenceReference(link, { withIssue: true })
  return view ? <EvidenceViewBody view={view} /> : null
}
