/** The status a chat file that is no longer held answers with: the preview reads it as gone. */
export const CHAT_FILE_GONE_STATUS = 404

/**
 * The project a chat file's preview names: a chat's files are read from its
 * own store, not a project, so this only keys the preview.
 */
export const CHAT_FILE_PREVIEW_PROJECT = 'chat-files'
