import { Text, View } from 'react-native'
import { isVideoPath } from 'thefactory-tools/utils'

import {
  CHAT_UPLOAD_TEXT,
  chatUploadLine,
  formatBytes,
  type ChatAttachmentUpload,
} from '../../../headless'
import { nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import InlineStopConfirm from '../chips/InlineStopConfirm'

export interface ChatUploadStripProps {
  uploads: readonly ChatAttachmentUpload[]
  onStop: (id: string) => void
}

function ChatUploadRow({
  upload,
  onStop,
}: {
  upload: ChatAttachmentUpload
  onStop: (id: string) => void
}) {
  const { theme } = useNativeTheme()
  const { progress, timeLeft } = chatUploadLine(upload)
  const text = { fontSize: 12, color: theme.text.secondary }
  return (
    <View style={{ gap: nativeSpace[1] }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: nativeSpace[3] }}>
        <Text
          numberOfLines={1}
          style={{ ...text, flexShrink: 1, fontWeight: '500', color: theme.text.primary }}
        >
          {upload.name}
        </Text>
        {upload.sizeBytes !== undefined ? (
          <Text style={{ ...text, color: theme.text.muted }}>{formatBytes(upload.sizeBytes)}</Text>
        ) : null}
      </View>
      <View
        style={{
          height: 4,
          overflow: 'hidden',
          borderRadius: 2,
          backgroundColor: theme.surface.muted,
        }}
      >
        <View
          style={{
            height: '100%',
            width: `${upload.percent}%`,
            backgroundColor: theme.accent.primary,
          }}
        />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: nativeSpace[3] }}>
        <Text style={{ ...text, fontVariant: ['tabular-nums'] }}>{progress}</Text>
        {timeLeft ? <Text style={{ ...text, color: theme.text.muted }}>{timeLeft}</Text> : null}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'baseline',
            gap: nativeSpace[3],
            marginLeft: 'auto',
          }}
        >
          <InlineStopConfirm
            ask={CHAT_UPLOAD_TEXT.stopAsk}
            stop={CHAT_UPLOAD_TEXT.stop}
            keep={CHAT_UPLOAD_TEXT.keep}
            label={CHAT_UPLOAD_TEXT.stopLabel(upload.name)}
            onStop={() => onStop(upload.id)}
          />
        </View>
      </View>
      {isVideoPath(upload.name) ? (
        <Text style={{ fontSize: 11, color: theme.text.muted }}>{CHAT_UPLOAD_TEXT.costLater}</Text>
      ) : null}
    </View>
  )
}

/** The files on their way into a chat, above the composer, each with the time it has left. */
export default function ChatUploadStrip({ uploads, onStop }: ChatUploadStripProps) {
  const { theme } = useNativeTheme()
  if (uploads.length === 0) return null
  return (
    <View
      style={{
        gap: nativeSpace[3],
        paddingHorizontal: nativeSpace[5],
        paddingVertical: nativeSpace[3],
        borderTopWidth: 1,
        borderTopColor: theme.border.subtle,
        backgroundColor: theme.surface.raised,
      }}
    >
      {uploads.map((upload) => (
        <ChatUploadRow key={upload.id} upload={upload} onStop={onStop} />
      ))}
    </View>
  )
}
