/** The chat settings menu's words. */
export const CHAT_SETTINGS_MENU_COPY = {
  menu: 'Chat settings',
  notify: 'Notify me',
  tune: 'Turn limit and tools',
  archive: 'Archive from list',
  unarchive: 'Show in list again',
  developer: 'Developer',
  prompt: 'System prompt',
  costs: 'Costs',
  dynamicContext: 'Dynamic context',
  debug: 'Debug',
  delete: 'Delete this chat…',
} as const

/** The rows an Assistant conversation words as a conversation. */
export const ASSISTANT_SETTINGS_MENU_COPY = {
  archive: 'Archive',
  unarchive: 'Move back to conversations',
  delete: 'Delete this conversation…',
} as const

/** The preference that adds the developer rows to every chat's settings menu. */
export const SHOW_DEVELOPER_TOOLS_COPY = {
  title: 'Developer tools',
  label: 'Show developer tools',
  hint: 'Adds System prompt, Costs, Dynamic context and Debug to each chat’s settings menu.',
} as const
