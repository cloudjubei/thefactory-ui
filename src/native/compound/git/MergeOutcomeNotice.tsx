import type { ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'
import type { GitMergeOutcomeLine } from '../../../headless'
import { nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconClose } from '../../icons'

export type MergeOutcomeNoticeProps = {
  line: GitMergeOutcomeLine
  /** Renders the commit the branch now points at as its chip. */
  renderCommitRef?: (sha: string) => ReactNode
  onDismiss: () => void
}

/** Native peer of web's `MergeOutcomeNotice`: what the last merge did, with its commit's chip and how its result's checks went. */
export default function MergeOutcomeNotice({
  line,
  renderCommitRef,
  onDismiss,
}: MergeOutcomeNoticeProps) {
  const { theme, status } = useNativeTheme()
  const tone = {
    success: status.done,
    info: status.review,
    warning: status.working,
    error: status.stuck,
  }[line.tone]
  return (
    <View
      accessibilityRole="summary"
      style={{
        marginHorizontal: nativeSpace[4],
        marginTop: nativeSpace[3],
        flexDirection: 'row',
        alignItems: 'center',
        gap: nativeSpace[2],
        padding: nativeSpace[3],
        borderRadius: 8,
        backgroundColor: tone.softBg,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          style={{
            fontSize: 13,
            color: line.tone === 'warning' ? theme.text.primary : tone.softFg,
          }}
        >
          {line.text}
        </Text>
        {line.checksNote ? (
          <Text
            style={{
              fontSize: 12,
              opacity: 0.8,
              color: line.tone === 'warning' ? theme.text.primary : tone.softFg,
            }}
          >
            {line.checksNote}
          </Text>
        ) : null}
      </View>
      {line.sha && renderCommitRef ? renderCommitRef(line.sha) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
        onPress={onDismiss}
        hitSlop={8}
      >
        <IconClose size={14} color={theme.text.secondary} />
      </Pressable>
    </View>
  )
}
