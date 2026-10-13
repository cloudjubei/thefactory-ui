import { ASSISTANT_SETTINGS_MENU_COPY, CHAT_SETTINGS_MENU_COPY } from './chatSettingsMenuConstants'
import type { ChatSettingsMenuInput, ChatSettingsMenuItem } from './chatSettingsMenuTypes'

/**
 * The chat settings menu, in order: how the chat notifies, its turn limit and
 * tools, hiding it from the list; then — only with "Show developer tools" on —
 * the system prompt, costs, dynamic context and debug dump; then clearing and
 * deleting it. A row whose action the chat cannot take now is left out. Pure.
 */
export function chatSettingsMenuItems(input: ChatSettingsMenuInput): ChatSettingsMenuItem[] {
  const copy = input.assistant
    ? { ...CHAT_SETTINGS_MENU_COPY, ...ASSISTANT_SETTINGS_MENU_COPY }
    : CHAT_SETTINGS_MENU_COPY
  const items: ChatSettingsMenuItem[] = []
  if (input.notifyLevel !== undefined) {
    items.push({
      key: 'notify',
      label: copy.notify,
      hint: `${input.notifyLevel} ›`,
      section: 'chat',
    })
  }
  if (input.canTune) items.push({ key: 'tune', label: copy.tune, hint: '›', section: 'chat' })
  if (input.listHidden !== undefined) {
    items.push({
      key: 'archive',
      label: input.listHidden ? copy.unarchive : copy.archive,
      section: 'chat',
    })
  }
  if (input.showDeveloperTools) {
    items.push(
      { key: 'prompt', label: copy.prompt, section: 'developer' },
      { key: 'costs', label: copy.costs, section: 'developer' },
      { key: 'dynamic-context', label: copy.dynamicContext, section: 'developer' },
      { key: 'debug', label: copy.debug, section: 'developer' },
    )
  }
  if (input.clearLabel !== undefined) {
    items.push({ key: 'clear', label: `${input.clearLabel}…`, section: 'danger' })
  }
  if (input.canDelete) items.push({ key: 'delete', label: copy.delete, section: 'danger' })
  return items
}
