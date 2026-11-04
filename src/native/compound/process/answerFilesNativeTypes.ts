import type { ChatAttachmentFile } from '../../../headless/api'

/** Where an answer's files come from on native: the run's upload and project files, and the app's picker. */
export interface NativeAnswerFiles {
  upload: (file: ChatAttachmentFile) => Promise<string>
  loadProjectFiles: () => Promise<string[]>
  pickDeviceFiles?: () => Promise<ChatAttachmentFile[]>
}
