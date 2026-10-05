import { Alert, Text } from 'react-native'
import type { ReferenceDescription, ResourceLink } from 'thefactory-tools/types'

import { nativeRadii } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'

export type ReferenceChipProps = {
  description: ReferenceDescription
  /** Opens what the chip points at. Omitted, or for something gone, a tap opens nothing. */
  onOpen?: (link: ResourceLink) => void
}

/**
 * Native peer of web's `ReferenceChip`: something a message points at, inline
 * in the text — its current number or name, a tap that opens it, and a long
 * press that says what it is. Something gone shows as such and opens nothing.
 */
export default function ReferenceChip({ description, onOpen }: ReferenceChipProps) {
  const { theme } = useNativeTheme()
  const link = description.missing ? undefined : description.link
  const open = link && onOpen ? () => onOpen(link) : undefined
  return (
    <Text
      accessibilityRole={open ? 'link' : 'text'}
      accessibilityLabel={description.label}
      {...(description.detail ? { accessibilityHint: description.detail } : {})}
      onPress={open}
      onLongPress={() => Alert.alert(description.label, description.detail)}
      style={{
        fontSize: 13,
        color: description.missing
          ? theme.text.muted
          : open
            ? theme.accent.primary
            : theme.text.secondary,
        backgroundColor: theme.surface.muted,
        borderRadius: nativeRadii[2],
        textDecorationLine: description.missing ? 'line-through' : 'none',
      }}
    >
      {` ${description.label} `}
    </Text>
  )
}
