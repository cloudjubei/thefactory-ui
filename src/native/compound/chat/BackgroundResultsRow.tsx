import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import type { ChatBackgroundJobResult } from 'thefactory-tools/types'
import { describeBackgroundResult } from '../../../headless/utils/backgroundJobs'
import { BACKGROUND_RESULTS_TITLE } from '../../../headless/utils/backgroundJobsConstants'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { StatusIcon, statusVisual } from './ToolCall/StatusIcon'

export type BackgroundResultsRowProps = {
  results: ChatBackgroundJobResult[]
  /** The message the agent was given, results in full. */
  content: string
  timestamp?: string
}

/** Results of calls an agent made earlier that finished in the background — one line per call. */
export default function BackgroundResultsRow({
  results,
  content,
  timestamp,
}: BackgroundResultsRowProps) {
  const { theme } = useNativeTheme()
  const [open, setOpen] = useState(false)
  return (
    <View
      style={{
        width: '100%',
        borderRadius: nativeRadii[2],
        borderWidth: 1,
        borderColor: theme.border.subtle,
        backgroundColor: theme.surface.overlay,
      }}
    >
      <Text
        style={{
          paddingHorizontal: nativeSpace[4],
          paddingTop: nativeSpace[3],
          fontSize: 12,
          color: theme.text.secondary,
        }}
      >
        <Text style={{ fontWeight: '600' }}>{BACKGROUND_RESULTS_TITLE}</Text>
        {timestamp ? ` · ${timestamp}` : ''}
      </Text>
      <View
        style={{
          paddingHorizontal: nativeSpace[4],
          paddingVertical: nativeSpace[3],
          gap: nativeSpace[2],
        }}
      >
        {results.map((result) => {
          const visual = statusVisual(result.status === 'succeeded' ? 'success' : 'errored')
          return (
            <View
              key={result.jobId}
              style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}
            >
              {visual ? <StatusIcon kind={visual.kind} color={visual.iconColor} /> : null}
              <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text.primary }}>
                {result.toolName}
              </Text>
              <Text
                style={{ flexShrink: 1, fontSize: 13, color: theme.text.secondary }}
                numberOfLines={1}
              >
                {describeBackgroundResult(result)}
              </Text>
            </View>
          )
        })}
      </View>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={{
          borderTopWidth: 1,
          borderTopColor: theme.border.subtle,
          paddingHorizontal: nativeSpace[4],
          paddingVertical: nativeSpace[2],
          flexDirection: 'row',
          justifyContent: 'space-between',
        }}
      >
        <Text style={{ fontSize: 12, fontWeight: '500', color: theme.text.primary }}>
          What the agent was given
        </Text>
        <Text style={{ fontSize: 12, color: theme.text.secondary }}>{open ? '−' : '+'}</Text>
      </Pressable>
      {open ? (
        <Text
          selectable
          style={{
            paddingHorizontal: nativeSpace[4],
            paddingBottom: nativeSpace[3],
            fontFamily: 'Menlo',
            fontSize: 11,
            color: theme.text.primary,
          }}
        >
          {content}
        </Text>
      ) : null}
    </View>
  )
}
