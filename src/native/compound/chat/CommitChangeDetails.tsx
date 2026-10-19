import { Text, View } from 'react-native'

import type { CommitReceiptFile } from '../../../headless'
import { nativeFontFamilies } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'

/**
 * Native peer of web's `CommitChangeDetails`: what a commit holds, opened in
 * place under its line — each file with its status as one letter, then the
 * commit's message.
 */
export function CommitChangeDetails({
  files,
  message,
}: {
  files: readonly CommitReceiptFile[]
  message: string | undefined
}) {
  const { theme } = useNativeTheme()
  return (
    <View
      style={{
        gap: 4,
        borderTopWidth: 1,
        borderTopColor: theme.border.subtle,
        paddingHorizontal: 12,
        paddingVertical: 8,
      }}
    >
      {files.map((file) => (
        <Text
          key={file.path}
          style={{ fontFamily: nativeFontFamilies.mono, fontSize: 12, color: theme.text.primary }}
        >
          <Text style={{ fontWeight: '700' }}>{`${file.letter}  `}</Text>
          {file.path}
        </Text>
      ))}
      {message ? (
        <Text style={{ fontSize: 12.5, color: theme.text.secondary }}>{message}</Text>
      ) : null}
    </View>
  )
}
