import {
  CHAT_SETTINGS_MENU_COPY,
  type ChatSettingsMenuItem,
  type ChatSettingsMenuKey,
} from '../../../headless'
import { IconSettings } from '../../icons'
import OverflowMenu from '../OverflowMenu'

export type ChatSettingsMenuProps = {
  /** The rows, from `chatSettingsMenuItems`. */
  items: readonly ChatSettingsMenuItem[]
  onSelect: (key: ChatSettingsMenuKey) => void
}

/**
 * The chat's settings gear and its menu: notifications, turn limit and tools,
 * hiding it from the list, the developer tools when they are on, and clearing
 * or deleting the chat after a divider.
 */
export default function ChatSettingsMenu({ items, onSelect }: ChatSettingsMenuProps) {
  if (items.length === 0) return null
  return (
    <OverflowMenu
      label={CHAT_SETTINGS_MENU_COPY.menu}
      icon={<IconSettings className="size-[17px]" />}
      items={items.map((item) => ({
        key: item.key,
        label: item.label,
        ...(item.hint ? { hint: item.hint } : {}),
        ...(item.section === 'developer' ? { section: CHAT_SETTINGS_MENU_COPY.developer } : {}),
        destructive: item.section === 'danger',
        onSelect: () => onSelect(item.key),
      }))}
    />
  )
}
