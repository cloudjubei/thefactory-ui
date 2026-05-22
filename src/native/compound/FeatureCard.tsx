import type { ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'
import type { StyleProp, ViewStyle } from 'react-native'
import type { StoryStatus } from '../../headless/utils/status'
import { nativeLightTheme, nativeRadii, nativeShadows, nativeSpace } from '../../tokens/native'
import StatusControl from './StatusControl'
import Markdown from './Markdown'

export interface FeatureCardData {
  id: string
  title: string
  description?: string
  status: StoryStatus
  blockers?: ReadonlyArray<string>
}

export interface FeatureCardProps {
  feature: FeatureCardData
  headerLeft?: ReactNode
  /** Right-aligned slot in the header. Always visible on RN (web hover-reveals it). */
  actions?: ReactNode
  footer?: ReactNode
  renderBlocker?: (dep: string) => ReactNode
  showStatus?: boolean
  onStatusChange?: (status: StoryStatus) => void
  className?: string
  style?: StyleProp<ViewStyle>
  onPress?: () => void
  ariaLabel?: string
}

export function FeatureCard({
  feature,
  headerLeft,
  actions,
  footer,
  showStatus = true,
  onStatusChange,
  renderBlocker,
  className,
  style,
  onPress,
  ariaLabel,
}: FeatureCardProps) {
  const wrapperStyle: StyleProp<ViewStyle> = [
    {
      padding: nativeSpace[8],
      borderRadius: nativeRadii[4],
      borderWidth: 1,
      borderColor: nativeLightTheme.border.subtle,
      backgroundColor: nativeLightTheme.surface.raised,
      gap: nativeSpace[5],
      ...nativeShadows[2],
    },
    style,
  ]

  const body = (
    <>
      {(headerLeft || actions) && (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            minHeight: 20,
          }}
        >
          <View style={{ flexShrink: 1 }}>{headerLeft}</View>
          {actions && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[4] }}>
              {actions}
            </View>
          )}
        </View>
      )}
      <Text
        numberOfLines={2}
        style={{ fontSize: 18, fontWeight: '600', color: nativeLightTheme.text.primary }}
      >
        {feature.title}
      </Text>
      {feature.description ? <Markdown text={feature.description} /> : null}
      {feature.blockers && feature.blockers.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: nativeSpace[3] }}>
          {feature.blockers.map((b) =>
            renderBlocker ? (
              <View key={b}>{renderBlocker(b)}</View>
            ) : (
              <View
                key={b}
                style={{
                  paddingHorizontal: nativeSpace[5],
                  paddingVertical: 2,
                  borderRadius: nativeRadii[1],
                  borderWidth: 1,
                  borderColor: nativeLightTheme.border.subtle,
                  backgroundColor: nativeLightTheme.surface.base,
                }}
              >
                <Text
                  style={{
                    fontFamily: 'Menlo',
                    fontSize: 11,
                    color: nativeLightTheme.text.secondary,
                  }}
                >
                  {b}
                </Text>
              </View>
            ),
          )}
        </View>
      )}
      {footer}
      {showStatus && <StatusControl status={feature.status} onChange={onStatusChange} />}
    </>
  )

  if (onPress) {
    return (
      <Pressable
        className={className}
        accessibilityRole="button"
        accessibilityLabel={ariaLabel ?? `Feature ${feature.id} ${feature.title}`}
        onPress={onPress}
        style={({ pressed }) => [wrapperStyle, pressed && { opacity: 0.85 }]}
      >
        {body}
      </Pressable>
    )
  }
  return (
    <View
      className={className}
      accessibilityLabel={ariaLabel ?? `Feature ${feature.id} ${feature.title}`}
      style={wrapperStyle}
    >
      {body}
    </View>
  )
}
