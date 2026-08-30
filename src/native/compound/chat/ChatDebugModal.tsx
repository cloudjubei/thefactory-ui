import { useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { useChatDebugDump } from '../../../headless'
import { formatBytes } from '../../../headless/utils/path'
import type { ChatContext } from '../../../headless/api'
import { red } from '../../../tokens/colors'
import { nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { Modal } from '../../primitives/Modal'
import { Button } from '../../primitives/Button'

export interface ChatDebugModalProps {
  isOpen: boolean
  onClose: () => void
  context: ChatContext
  /**
   * Host-wired clipboard (mobile passes `expo-clipboard`'s `setStringAsync`).
   * Without it the Copy button is hidden and the document stays selectable text.
   */
  onCopy?: (text: string) => Promise<unknown> | void
}

/**
 * Native peer of web's `ChatDebugModal`. Same document, same caps — the chat's
 * stored messages, every CLI run's RAW transcript entries, and the normalized
 * steps + derived messages they render as.
 */
export default function ChatDebugModal({ isOpen, onClose, context, onCopy }: ChatDebugModalProps) {
  const { theme } = useNativeTheme()
  const { json, byteSize, loading, error, dump, refresh } = useChatDebugDump(context, isOpen)
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  const onPressCopy = async () => {
    if (!onCopy) return
    try {
      await onCopy(json)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <Modal isOpen onClose={onClose} title="Chat debug dump" size="xl" fillHeight>
      <View style={{ gap: nativeSpace[2], flex: 1 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: nativeSpace[2],
          }}
        >
          <Text style={{ flex: 1, fontSize: 12, color: theme.text.secondary }}>
            {formatBytes(byteSize) ?? '—'}
            {dump
              ? ` · ${dump.counts.messages} msgs · ${dump.counts.cliRuns} runs · ${dump.counts.transcriptEntries} entries`
              : ''}
            {dump?.truncated ? ' · truncated' : ''}
          </Text>
          <Button variant="secondary" size="sm" onPress={refresh}>
            {loading ? 'Loading…' : 'Reload'}
          </Button>
          {onCopy ? (
            <Button variant="secondary" size="sm" onPress={() => void onPressCopy()}>
              {copied ? 'Copied' : 'Copy'}
            </Button>
          ) : null}
        </View>

        {error ? <Text style={{ fontSize: 12, color: red[600] }}>{error}</Text> : null}

        <ScrollView style={{ flex: 1 }} horizontal={false}>
          <Text
            selectable
            style={{
              fontFamily: 'Menlo',
              fontSize: 11,
              lineHeight: 16,
              color: theme.text.secondary,
            }}
          >
            {json}
          </Text>
        </ScrollView>
      </View>
    </Modal>
  )
}
