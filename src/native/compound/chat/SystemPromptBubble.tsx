import { memo } from 'react'
import { ScrollView, Text, View } from 'react-native'
import {
  nativeLightTheme,
  nativeRadii,
  nativeShadows,
  nativeSpace,
} from '../../../tokens/native'

export interface SystemPromptBubbleProps {
  content: string
  timestamp?: string
  maxHeight?: number
}

// Markdown rendering is plain-text on RN until a native Markdown peer lands;
// see the chat batch in implementation-plan.md.
function SystemPromptBubble({ content, timestamp, maxHeight }: SystemPromptBubbleProps) {
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ alignItems: 'flex-end', maxWidth: '100%' }}>
        {timestamp && (
          <Text
            selectable={false}
            style={{
              fontSize: 10,
              lineHeight: 14,
              marginBottom: nativeSpace[2],
              color: nativeLightTheme.text.secondary,
              opacity: 0.8,
            }}
          >
            {timestamp}
          </Text>
        )}
        <ScrollView
          accessibilityLabel="System prompt"
          style={{
            maxHeight,
            minHeight: 56,
            maxWidth: '100%',
            paddingHorizontal: nativeSpace[6],
            paddingVertical: nativeSpace[4],
            borderRadius: nativeRadii[5],
            backgroundColor: nativeLightTheme.surface.overlay,
            borderWidth: 1,
            borderColor: nativeLightTheme.border.subtle,
            ...nativeShadows[1],
          }}
        >
          <Text style={{ fontSize: 14, color: nativeLightTheme.text.primary }}>{content}</Text>
        </ScrollView>
      </View>
    </View>
  )
}

export default memo(SystemPromptBubble)
