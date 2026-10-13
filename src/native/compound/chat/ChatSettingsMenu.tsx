import { useState } from 'react'
import { Pressable } from 'react-native'

import {
  CHAT_SETTINGS_MENU_COPY,
  type ChatSettingsMenuItem,
  type ChatSettingsMenuKey,
} from '../../../headless'
import { nativeRadii } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconSettings } from '../../icons'
import ActionMenu from '../ActionMenu'

export interface ChatSettingsMenuProps {
  /** The rows, from `chatSettingsMenuItems`. */
  items: readonly ChatSettingsMenuItem[]
  onSelect: (key: ChatSettingsMenuKey) => void
}

/**
 * Native peer of web's `ChatSettingsMenu`: the settings gear, opening the same
 * rows as a bottom sheet — the developer rows under their heading.
 */
export default function ChatSettingsMenu({ items, onSelect }: ChatSettingsMenuProps) {
  const { theme } = useNativeTheme()
  const [open, setOpen] = useState(false)
  if (items.length === 0) return null
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={CHAT_SETTINGS_MENU_COPY.menu}
        onPress={() => setOpen(true)}
        hitSlop={4}
        style={({ pressed }) => ({
          width: 32,
          height: 32,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: nativeRadii[2],
          borderWidth: 1,
          borderColor: theme.border.subtle,
          backgroundColor: pressed ? theme.surface.hover : theme.surface.overlay,
        })}
      >
        <IconSettings size={17} />
      </Pressable>
      <ActionMenu
        isOpen={open}
        onClose={() => setOpen(false)}
        title={CHAT_SETTINGS_MENU_COPY.menu}
        actions={items.map((item) => ({
          key: item.key,
          label: item.label,
          ...(item.hint ? { hint: item.hint } : {}),
          ...(item.section === 'developer' ? { section: CHAT_SETTINGS_MENU_COPY.developer } : {}),
          destructive: item.section === 'danger',
          onPress: () => {
            setOpen(false)
            onSelect(item.key)
          },
        }))}
      />
    </>
  )
}
