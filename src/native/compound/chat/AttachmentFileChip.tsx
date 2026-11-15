import { View } from 'react-native'
import { attachmentDisplayName } from 'thefactory-tools/utils'

import { nativeSpace } from '../../../tokens/native'
import FileDisplay from '../files/FileDisplay'
import type { ChatFileSaving } from '../../../headless/utils/chatFileSaveTypes'
import ChatFileSaveButton from './ChatFileSaveButton'

export interface AttachmentFileChipProps {
  path: string
  /** A file an agent showed: offers "Save to project" beside its chip. */
  saving?: ChatFileSaving
}

/** A file on a message, as its chip — with a way to save it when an agent showed it. */
export default function AttachmentFileChip({ path, saving }: AttachmentFileChipProps) {
  const name = attachmentDisplayName(path)
  const chip = (
    <FileDisplay file={{ name, absolutePath: path, relativePath: path }} density="compact" />
  )
  if (!saving) return chip
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
      {chip}
      <ChatFileSaveButton source={path} saving={saving} variant="icon" />
    </View>
  )
}
