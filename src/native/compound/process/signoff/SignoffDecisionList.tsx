import { useEffect } from 'react'
import { Image, Pressable, Text, View } from 'react-native'

import {
  SIGNOFF_DECISION_PAIR_LABEL,
  SIGNOFF_DECISION_STEP_LABEL,
  type ScreenPair,
  type SignoffDecisionAction,
  type SignoffDecisionItem,
  type SignoffStepTarget,
} from '../../../../headless'
import { nativeRadii } from '../../../../tokens/native'
import { useNativeTheme } from '../../../hooks/useNativeTheme'
import { IconCheck, IconError, IconEye } from '../../../icons'
import { IdChip } from '../../chat/signoff'
import DependencyRef from '../../stories/DependencyRef'

export type SignoffDecisionListProps = {
  projectId: string
  items: readonly SignoffDecisionItem[]
  onOpenPair: (key: string) => void
  /** Open a step's output on its own screen; without it a step chip opens its section. */
  onOpenStep?: (target: SignoffStepTarget) => void
  onShowSection: (sectionId: string) => void
  onRequestImage: (id: string, mediaType: string) => void
}

/**
 * Native peer of web's `SignoffDecisionList`: the decision card's one
 * attention list — an icon, one line and its chips per item.
 */
export default function SignoffDecisionList({
  projectId,
  items,
  onOpenPair,
  onOpenStep,
  onShowSection,
  onRequestImage,
}: SignoffDecisionListProps) {
  const { theme, status } = useNativeTheme()
  if (items.length === 0) return null
  return (
    <View
      style={{
        gap: 8,
        marginTop: 4,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: theme.border.subtle,
      }}
    >
      {items.map((item) => (
        <View
          key={item.key}
          style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}
        >
          {item.tone === 'done' ? (
            <IconCheck size={16} color={status.done.softFg} />
          ) : (
            <IconError size={16} color={status[item.tone].softFg} />
          )}
          {item.dependency ? (
            <DependencyRef dependency={item.dependency} projectId={projectId} />
          ) : item.label ? (
            <IdChip kind="story">{item.label}</IdChip>
          ) : null}
          <Text style={{ flexShrink: 1, fontSize: 13, color: theme.text.primary }}>
            {item.text}
          </Text>
          {item.pairs.map((pair) => (
            <PairChip
              key={pair.key}
              pair={pair}
              onOpen={() => onOpenPair(pair.key)}
              onRequestImage={onRequestImage}
            />
          ))}
          {item.actions.map((action) => (
            <ActionChip
              key={`${action.kind}-${action.sectionId}`}
              action={action}
              onShowSection={onShowSection}
              {...(onOpenStep ? { onOpenStep } : {})}
            />
          ))}
        </View>
      ))}
    </View>
  )
}

function PairChip({
  pair,
  onOpen,
  onRequestImage,
}: {
  pair: ScreenPair
  onOpen: () => void
  onRequestImage: (id: string, mediaType: string) => void
}) {
  const { theme } = useNativeTheme()
  const shown = pair.after ?? pair.before
  useEffect(() => {
    if (shown) onRequestImage(shown.ref.id, shown.ref.mediaType)
  }, [shown, onRequestImage])
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={SIGNOFF_DECISION_PAIR_LABEL(pair.title)}
      onPress={onOpen}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        maxWidth: 220,
        height: 28,
        paddingLeft: 2,
        paddingRight: 8,
        borderRadius: nativeRadii[2],
        borderWidth: 1,
        borderColor: theme.border.subtle,
        backgroundColor: theme.surface.raised,
      }}
    >
      <View
        style={{
          width: 36,
          height: 22,
          borderRadius: nativeRadii[1],
          overflow: 'hidden',
          backgroundColor: theme.surface.muted,
        }}
      >
        {shown?.dataUri ? (
          <Image
            source={{ uri: shown.dataUri }}
            resizeMode="cover"
            style={{ width: '100%', height: '100%' }}
          />
        ) : null}
      </View>
      <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 12, color: theme.text.secondary }}>
        {pair.title}
      </Text>
    </Pressable>
  )
}

function ActionChip({
  action,
  onOpenStep,
  onShowSection,
}: {
  action: SignoffDecisionAction
  onOpenStep?: (target: SignoffStepTarget) => void
  onShowSection: (sectionId: string) => void
}) {
  const { theme } = useNativeTheme()
  if (action.kind === 'verify') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={action.label}
        onPress={() => onShowSection(action.sectionId)}
        style={{
          width: 28,
          height: 28,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: nativeRadii[2],
          borderWidth: 1,
          borderColor: theme.border.subtle,
          backgroundColor: theme.surface.raised,
        }}
      >
        <IconEye size={14} color={theme.text.secondary} />
      </Pressable>
    )
  }
  const step = action.step
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={SIGNOFF_DECISION_STEP_LABEL(action.label)}
      onPress={() => (step && onOpenStep ? onOpenStep(step) : onShowSection(action.sectionId))}
    >
      <IdChip kind="story">{action.label}</IdChip>
    </Pressable>
  )
}
