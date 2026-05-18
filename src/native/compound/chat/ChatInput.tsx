import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import type { TextInput as RNTextInput } from 'react-native'
import {
  nativeLightTheme,
  nativeRadii,
  nativeSpace,
} from '../../../tokens/native'

type SendReason = 'user' | 'suggested_action'

export type ChatInputAttachment = string

export interface ChatInputProps {
  value: string
  attachments?: ChatInputAttachment[]
  onChange: (val: string) => void
  onChangeAttachments?: (next: ChatInputAttachment[]) => void

  onSend: (
    message: string,
    attachments: ChatInputAttachment[],
    meta?: { reason?: SendReason },
  ) => void | Promise<void>
  onAbort?: () => void
  isThinking?: boolean
  isConfigured?: boolean

  /** Suggested quick-reply chips from the last assistant turn. */
  suggestedActions?: string[]

  /** Mobile-only: opens a file picker provided by the host. Replaces web's
   * `onUploadAttachment` shape — RN host owns the picker (`expo-document-picker`
   * etc.) and pushes the resolved path back via `onChangeAttachments`. */
  onPickAttachment?: () => void

  autoFocus?: boolean
  clearOnSend?: boolean
  clearOnSuggestedAction?: boolean
  placeholder?: string

  /** Hints rendered beneath the input. Pass `null` to hide. */
  hints?: ReactNode | null
}

export default function ChatInput({
  value,
  attachments = [],
  onChange,
  onChangeAttachments,
  onSend,
  onAbort,
  isThinking = false,
  isConfigured = true,
  suggestedActions,
  onPickAttachment,
  autoFocus = false,
  clearOnSend = true,
  clearOnSuggestedAction = true,
  placeholder,
  hints,
}: ChatInputProps) {
  const inputRef = useRef<RNTextInput>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  const canSend = useMemo(
    () => value.trim().length > 0 && !isThinking && !submitting && isConfigured,
    [value, isThinking, submitting, isConfigured],
  )

  const send = useCallback(
    async (text: string, meta?: { reason?: SendReason }) => {
      if (!text.trim() || isThinking || submitting || !isConfigured) return
      setSubmitting(true)
      try {
        await onSend(text.trim(), attachments, meta)
        if (clearOnSend) {
          onChange('')
          onChangeAttachments?.([])
        }
      } finally {
        setSubmitting(false)
      }
    },
    [onSend, attachments, onChange, onChangeAttachments, isThinking, submitting, isConfigured, clearOnSend],
  )

  const onPressSend = () => void send(value, { reason: 'user' })

  const removeAttachment = (idx: number) => {
    if (!onChangeAttachments) return
    const next = attachments.filter((_, i) => i !== idx)
    onChangeAttachments(next)
  }

  const onSuggestion = (text: string) => {
    if (clearOnSuggestedAction) onChange('')
    void send(text, { reason: 'suggested_action' })
  }

  const resolvedPlaceholder =
    placeholder ?? (isConfigured ? 'Message…' : 'Configure a model in Settings to chat.')

  return (
    <View
      style={{
        gap: nativeSpace[3],
        borderTopWidth: 1,
        borderTopColor: nativeLightTheme.border.subtle,
        backgroundColor: nativeLightTheme.surface.raised,
        paddingHorizontal: nativeSpace[5],
        paddingTop: nativeSpace[4],
        paddingBottom: nativeSpace[5],
      }}
    >
      {attachments.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: nativeSpace[2] }}
        >
          {attachments.map((path, i) => (
            <View
              key={`${i}-${path}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: nativeSpace[2],
                paddingHorizontal: nativeSpace[4],
                paddingVertical: nativeSpace[2],
                borderRadius: nativeRadii.round,
                backgroundColor: nativeLightTheme.surface.muted,
                borderWidth: 1,
                borderColor: nativeLightTheme.border.subtle,
              }}
            >
              <Text style={{ fontSize: 12, color: nativeLightTheme.text.secondary }}>
                {path.split('/').pop() ?? path}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove ${path}`}
                onPress={() => removeAttachment(i)}
                hitSlop={4}
              >
                <Text style={{ fontSize: 12, color: nativeLightTheme.text.muted }}>×</Text>
              </Pressable>
            </View>
          ))}
        </ScrollView>
      )}

      {suggestedActions && suggestedActions.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: nativeSpace[2] }}
        >
          {suggestedActions.map((sa, i) => (
            <Pressable
              key={`sa-${i}`}
              accessibilityRole="button"
              accessibilityLabel={sa}
              onPress={() => onSuggestion(sa)}
              disabled={isThinking}
              style={({ pressed }) => ({
                paddingHorizontal: nativeSpace[5],
                paddingVertical: nativeSpace[3],
                borderRadius: nativeRadii.round,
                backgroundColor: pressed
                  ? nativeLightTheme.surface.muted
                  : nativeLightTheme.surface.overlay,
                borderWidth: 1,
                borderColor: nativeLightTheme.border.subtle,
                opacity: isThinking ? 0.6 : 1,
              })}
            >
              <Text
                numberOfLines={1}
                style={{ fontSize: 13, color: nativeLightTheme.text.primary }}
              >
                {sa}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: nativeSpace[3],
        }}
      >
        {onPickAttachment && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Attach a file"
            onPress={onPickAttachment}
            disabled={isThinking || !isConfigured}
            style={({ pressed }) => ({
              width: 36,
              height: 36,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: nativeRadii[2],
              backgroundColor: pressed
                ? nativeLightTheme.surface.muted
                : 'transparent',
              opacity: isThinking || !isConfigured ? 0.4 : 1,
            })}
          >
            <Text style={{ fontSize: 18, color: nativeLightTheme.text.secondary }}>📎</Text>
          </Pressable>
        )}
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChange}
          editable={isConfigured && !submitting}
          placeholder={resolvedPlaceholder}
          placeholderTextColor={nativeLightTheme.text.muted}
          multiline
          textAlignVertical="top"
          accessibilityLabel="Message"
          style={{
            flex: 1,
            minHeight: 40,
            maxHeight: 160,
            paddingHorizontal: nativeSpace[5],
            paddingVertical: nativeSpace[3],
            borderRadius: nativeRadii[3],
            borderWidth: 1,
            borderColor: nativeLightTheme.border.default,
            backgroundColor: nativeLightTheme.surface.base,
            color: nativeLightTheme.text.primary,
            fontSize: 14,
          }}
        />
        {isThinking && onAbort ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Abort"
            onPress={onAbort}
            style={({ pressed }) => ({
              width: 36,
              height: 36,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: nativeRadii[2],
              backgroundColor: nativeLightTheme.surface.muted,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ fontSize: 14, color: nativeLightTheme.text.primary }}>■</Text>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send message"
            onPress={onPressSend}
            disabled={!canSend}
            style={({ pressed }) => ({
              width: 36,
              height: 36,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: nativeRadii[2],
              backgroundColor: canSend
                ? nativeLightTheme.accent.primary
                : nativeLightTheme.surface.muted,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text
              style={{
                fontSize: 16,
                color: canSend ? nativeLightTheme.text.inverted : nativeLightTheme.text.muted,
              }}
            >
              ↑
            </Text>
          </Pressable>
        )}
      </View>

      {hints && (
        <View>
          {typeof hints === 'string' ? (
            <Text style={{ fontSize: 11, color: nativeLightTheme.text.muted }}>{hints}</Text>
          ) : (
            hints
          )}
        </View>
      )}
    </View>
  )
}
