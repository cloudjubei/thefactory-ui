import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import { COMMIT_RECEIPT_COPY, type CommitReceiptFile } from '../../../headless'
import { nativeRadii } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconCheck } from '../../icons'
import { CommitChangeDetails } from './CommitChangeDetails'

export type AlreadyOnBaseLineProps = {
  /** "Already on dev as 0956f8c — nothing left to review". */
  text: string
  /** What "View the change" opens to; without it the line only says so. */
  change?: { files: readonly CommitReceiptFile[]; message?: string }
  /** Starts with the change open — for a record that shows it. */
  defaultOpen?: boolean
}

/**
 * Native peer of web's `AlreadyOnBaseLine`: the one neutral line a turn leaves
 * when its base already holds its change — no verdict, no checks, no Apply or
 * Discard.
 */
export function AlreadyOnBaseLine({ text, change, defaultOpen = false }: AlreadyOnBaseLineProps) {
  const { theme } = useNativeTheme()
  const [open, setOpen] = useState(defaultOpen)
  return (
    <View
      style={{
        marginTop: 8,
        borderRadius: nativeRadii[2],
        borderWidth: 1,
        borderColor: theme.border.subtle,
        backgroundColor: theme.surface.muted,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 12,
          paddingVertical: 8,
        }}
      >
        <IconCheck size={15} color={theme.text.secondary} />
        <Text style={{ flexShrink: 1, fontSize: 13, color: theme.text.secondary }}>{text}</Text>
        {change ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: open }}
            onPress={() => setOpen((v) => !v)}
            hitSlop={8}
            style={{ marginLeft: 'auto' }}
          >
            <Text style={{ fontSize: 13, color: theme.accent.primary }}>
              {open ? COMMIT_RECEIPT_COPY.hide : COMMIT_RECEIPT_COPY.view}
            </Text>
          </Pressable>
        ) : null}
      </View>
      {open && change ? (
        <CommitChangeDetails files={change.files} message={change.message} />
      ) : null}
    </View>
  )
}
