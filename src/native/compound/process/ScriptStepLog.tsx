import { useState, type ReactNode } from 'react'
import { Image, Pressable, Text, View } from 'react-native'

import {
  SCRIPT_STEP_LOG_COPY,
  useReviewEvidenceImage,
  type EvidenceTile,
  type ScriptLogRowView,
  type ScriptLogSectionView,
  type ScriptStepLogView,
} from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconChevronRight } from '../../icons'
import WalkthroughTab from '../chat/signoff/WalkthroughTab'
import type { SaveFileHandler } from '../chat/signoff'
import CostChip from '../chips/CostChip'
import ToneBadge from '../chips/ToneBadge'

export type ScriptStepLogProps = {
  projectId: string
  view: ScriptStepLogView
  onSaveFile?: SaveFileHandler
}

function useText() {
  const { theme } = useNativeTheme()
  return {
    heading: {
      fontSize: 10,
      fontWeight: '600' as const,
      letterSpacing: 0.8,
      textTransform: 'uppercase' as const,
      color: theme.text.muted,
    },
    line: { fontSize: 13, lineHeight: 19, color: theme.text.primary },
    muted: { fontSize: 12, color: theme.text.secondary },
  }
}

function Part({ title, children }: { title: string; children: ReactNode }) {
  const text = useText()
  return (
    <View style={{ gap: 4 }}>
      <Text style={text.heading}>{title}</Text>
      {children}
    </View>
  )
}

function LogRow({ row }: { row: ScriptLogRowView }) {
  const text = useText()
  return (
    <View style={{ gap: 2 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
        <ToneBadge tone={row.kindBadge.tone} label={row.kindBadge.label} />
        <Text style={[text.line, { flex: 1 }]}>{row.title}</Text>
        {row.sourceBadge ? (
          <ToneBadge tone={row.sourceBadge.tone} label={row.sourceBadge.label} />
        ) : null}
        {row.cost ? <CostChip label={row.cost} /> : null}
      </View>
      {row.detail ? <Text style={text.muted}>{row.detail}</Text> : null}
      {row.items.length > 0 ? (
        <View style={{ gap: 2, paddingLeft: nativeSpace[3] }}>
          {row.items.map((item, at) => (
            <Text key={`${at}-${item}`} style={text.muted}>
              • {item}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  )
}

function SectionRow({
  section,
  first,
  defaultOpen,
}: {
  section: ScriptLogSectionView
  first: boolean
  defaultOpen: boolean
}) {
  const { theme } = useNativeTheme()
  const [open, setOpen] = useState(defaultOpen)
  return (
    <View style={{ borderTopWidth: first ? 0 : 1, borderTopColor: theme.border.subtle }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={section.title}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((v) => !v)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: nativeSpace[4],
          paddingVertical: nativeSpace[3],
        }}
      >
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text
              numberOfLines={1}
              style={{
                flexShrink: 1,
                fontSize: 13.5,
                fontWeight: '600',
                color: theme.text.primary,
              }}
            >
              {section.title}
            </Text>
            {section.takeOverBadge ? (
              <ToneBadge tone={section.takeOverBadge.tone} label={section.takeOverBadge.label} />
            ) : null}
          </View>
          <Text numberOfLines={1} style={{ fontSize: 12, color: theme.text.secondary }}>
            {section.line}
          </Text>
        </View>
        {section.cost ? <CostChip label={section.cost} /> : null}
        <View style={{ transform: [{ rotate: open ? '90deg' : '0deg' }] }}>
          <IconChevronRight size={14} color={theme.text.muted} />
        </View>
      </Pressable>
      {open ? (
        <View
          style={{
            gap: nativeSpace[3],
            paddingHorizontal: nativeSpace[4],
            paddingBottom: nativeSpace[4],
          }}
        >
          {section.rows.map((row) => (
            <LogRow key={row.key} row={row} />
          ))}
        </View>
      ) : null}
    </View>
  )
}

function StoppedAt({ projectId, tile }: { projectId: string; tile: EvidenceTile }) {
  const { theme } = useNativeTheme()
  const { dataUri } = useReviewEvidenceImage(projectId, tile.ref.id, tile.ref.mediaType)
  return (
    <Part title={SCRIPT_STEP_LOG_COPY.stoppedAt}>
      {dataUri ? (
        <Image
          source={{ uri: dataUri }}
          resizeMode="contain"
          accessibilityLabel={tile.caption}
          style={{
            width: '100%',
            aspectRatio: 9 / 16,
            borderRadius: nativeRadii[2],
            borderWidth: 1,
            borderColor: theme.border.subtle,
          }}
        />
      ) : (
        <View
          style={{
            height: 160,
            borderRadius: nativeRadii[2],
            backgroundColor: theme.surface.muted,
          }}
        />
      )}
    </Part>
  )
}

/** Native peer of web's `ScriptStepLog`: the same summary, recording and section rows, one under the other. */
export default function ScriptStepLog({ projectId, view, onSaveFile }: ScriptStepLogProps) {
  const { theme } = useNativeTheme()
  return (
    <View style={{ gap: nativeSpace[4] }}>
      {view.summaryLine ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ flex: 1, fontSize: 12.5, color: theme.text.secondary }}>
            {view.summaryLine}
          </Text>
          {view.totalCost ? <CostChip label={view.totalCost} /> : null}
        </View>
      ) : null}
      {view.empty ? (
        <Text style={{ fontSize: 13, color: theme.text.secondary }}>{view.empty}</Text>
      ) : null}
      {view.unread ? (
        <Text style={{ fontSize: 12, color: theme.text.muted }}>{view.unread}</Text>
      ) : null}
      {view.recording ? (
        <WalkthroughTab
          projectId={projectId}
          recordings={[view.recording]}
          {...(onSaveFile ? { onSaveFile } : {})}
        />
      ) : null}
      {view.stoppedAt ? <StoppedAt projectId={projectId} tile={view.stoppedAt} /> : null}
      {view.sections.length > 0 ? (
        <View
          style={{
            overflow: 'hidden',
            borderRadius: nativeRadii[3],
            borderWidth: 1,
            borderColor: theme.border.subtle,
            backgroundColor: theme.surface.raised,
          }}
        >
          {view.sections.map((section, at) => (
            <SectionRow
              key={section.key}
              section={section}
              first={at === 0}
              defaultOpen={section.key === view.openSection}
            />
          ))}
        </View>
      ) : null}
    </View>
  )
}
