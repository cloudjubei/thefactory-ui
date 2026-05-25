import { memo } from 'react'
import { ScrollView, Text, View } from 'react-native'
import Markdown from '../Markdown'
import { nativeRadii, nativeShadows, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'

export interface SystemPromptBubbleProps {
  content: string
  timestamp?: string
  maxHeight?: number
}

function SystemPromptBubble({ content, timestamp, maxHeight }: SystemPromptBubbleProps) {
  const { theme } = useNativeTheme()
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
              color: theme.text.secondary,
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
            backgroundColor: theme.surface.overlay,
            borderWidth: 1,
            borderColor: theme.border.subtle,
            ...nativeShadows[1],
          }}
        >
          <Markdown text={content} />
        </ScrollView>
      </View>
    </View>
  )
}

export default memo(SystemPromptBubble)
