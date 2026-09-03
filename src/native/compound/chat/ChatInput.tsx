import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { IconAttach, IconMic, IconSend } from '../../icons'
import FileMentionsTextarea, {
  type FileMentionsTextareaHandle,
} from '../files/FileMentionsTextarea'
import {
  rankMentionMatches,
  useNativeDictationTrigger,
  useSpeechToText,
  type NativeDictationResult,
  type ReferenceSuggestion,
} from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { Modal } from '../../primitives/Modal'
import { Button } from '../../primitives/Button'
import DictationWave from './DictationWave'

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
  /** When true, the backend WS is disconnected: sending is blocked but the
   *  input stays editable so the user can compose while the client
   *  reconnects. The host surfaces the "why" via its disconnected banner. */
  disconnected?: boolean

  /** Suggested quick-reply chips from the last assistant turn. */
  suggestedActions?: string[]

  /** Mobile-only: opens a file picker provided by the host. When omitted the
   *  attach button is hidden. */
  onPickAttachment?: () => void

  /** `@`-file mention paths. When omitted the `@` autocomplete is disabled. */
  filePaths?: string[]
  /** `#`-reference search. When omitted the `#` autocomplete is disabled. */
  onSearchReferences?: (token: string) => ReadonlyArray<ReferenceSuggestion>
  /** Fires after the user accepts a `#`-reference suggestion. */
  onAcceptReference?: (value: string) => void

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
  disconnected = false,
  suggestedActions,
  onPickAttachment,
  filePaths,
  onSearchReferences,
  onAcceptReference,
  autoFocus = false,
  clearOnSend = true,
  clearOnSuggestedAction = true,
  placeholder,
  hints,
}: ChatInputProps) {
  const { theme } = useNativeTheme()
  const inputRef = useRef<FileMentionsTextareaHandle>(null)
  const [submitting, setSubmitting] = useState(false)

  // Dictation runs through one of two host-supplied paths — see the
  // web peer for the full rationale. On mobile today only the engine
  // path is wired (expoSpeechEngine); the native-trigger path is here
  // for parity so a future host (e.g. an iPad keyboard-mic affordance)
  // can plug in without touching this component.
  const speech = useSpeechToText()
  const nativeDictation = useNativeDictationTrigger()
  const hasNativeDictation = nativeDictation?.isSupported() ?? false
  const dictationAvailable = hasNativeDictation || speech.isSupported
  const isDictating =
    !hasNativeDictation &&
    (speech.status === 'listening' || speech.status === 'requesting-permission')
  const [nativeError, setNativeError] = useState<string | null>(null)

  const appendDictation = useCallback(
    (chunk: string) => {
      const trimmedBuffer = value.replace(/\s+$/, '')
      const separator = trimmedBuffer.length > 0 ? ' ' : ''
      onChange(`${trimmedBuffer}${separator}${chunk}`)
    },
    [value, onChange],
  )

  const lastAppendedFinalRef = useRef<string>('')
  useEffect(() => {
    if (!speech.finalTranscript) return
    if (speech.finalTranscript === lastAppendedFinalRef.current) return
    lastAppendedFinalRef.current = speech.finalTranscript
    appendDictation(speech.finalTranscript)
    speech.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speech.finalTranscript])

  const startDictation = useCallback(() => {
    setNativeError(null)
    if (nativeDictation) {
      void (async () => {
        try {
          const result: NativeDictationResult = await nativeDictation.trigger()
          if (result.status !== 'started') setNativeError(result.reason || 'unknown')
        } catch (err) {
          setNativeError(err instanceof Error ? err.message : String(err))
        }
      })()
      return
    }
    lastAppendedFinalRef.current = ''
    void speech.start()
  }, [nativeDictation, speech])

  const stopDictation = useCallback(() => {
    const pendingPartial = speech.partialTranscript.trim()
    if (pendingPartial && pendingPartial !== lastAppendedFinalRef.current) {
      lastAppendedFinalRef.current = pendingPartial
      appendDictation(pendingPartial)
    }
    void speech.stop()
  }, [speech, appendDictation])

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  const canSend = useMemo(
    () => value.trim().length > 0 && !isThinking && !submitting && isConfigured && !disconnected,
    [value, isThinking, submitting, isConfigured, disconnected],
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
    [
      onSend,
      attachments,
      onChange,
      onChangeAttachments,
      isThinking,
      submitting,
      isConfigured,
      clearOnSend,
    ],
  )

  const onPressSend = () => void send(value, { reason: 'user' })

  const removeAttachment = (idx: number) => {
    if (!onChangeAttachments) return
    onChangeAttachments(attachments.filter((_, i) => i !== idx))
  }

  const onSuggestion = (text: string) => {
    if (clearOnSuggestedAction) onChange('')
    void send(text, { reason: 'suggested_action' })
  }

  const onSearchFiles = useCallback(
    (token: string) => (filePaths ? rankMentionMatches(filePaths, token, 8) : []),
    [filePaths],
  )

  const resolvedPlaceholder =
    placeholder ?? (isConfigured ? 'Message…' : 'Configure a model in Settings to chat.')

  return (
    <View
      style={{
        gap: nativeSpace[3],
        borderTopWidth: 1,
        borderTopColor: theme.border.subtle,
        backgroundColor: theme.surface.raised,
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
                backgroundColor: theme.surface.muted,
                borderWidth: 1,
                borderColor: theme.border.subtle,
              }}
            >
              <Text style={{ fontSize: 12, color: theme.text.secondary }}>
                {path.split('/').pop() ?? path}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove ${path}`}
                onPress={() => removeAttachment(i)}
                hitSlop={4}
              >
                <Text style={{ fontSize: 12, color: theme.text.muted }}>×</Text>
              </Pressable>
            </View>
          ))}
        </ScrollView>
      )}

      {suggestedActions && suggestedActions.length > 0 && !isThinking && isConfigured && (
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
                backgroundColor: pressed ? theme.surface.muted : theme.surface.overlay,
                borderWidth: 1,
                borderColor: theme.border.subtle,
                opacity: isThinking ? 0.6 : 1,
              })}
            >
              <Text numberOfLines={1} style={{ fontSize: 13, color: theme.text.primary }}>
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
        {/* Left slot — single button.
            - Dictating: animated soundwave (decorative).
            - isThinking with abort wired: stop-thinking control.
            - Otherwise: attachment picker (if the host provided one). */}
        {isDictating ? (
          <View
            style={{
              width: 36,
              height: 36,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <DictationWave height={22} />
          </View>
        ) : isThinking && onAbort ? (
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
              backgroundColor: theme.surface.muted,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ fontSize: 14, color: theme.text.primary }}>■</Text>
          </Pressable>
        ) : onPickAttachment ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Attach a file"
            onPress={onPickAttachment}
            disabled={!isConfigured || disconnected}
            style={({ pressed }) => ({
              width: 36,
              height: 36,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: nativeRadii[2],
              backgroundColor: pressed ? theme.surface.muted : 'transparent',
              opacity: !isConfigured || disconnected ? 0.4 : 1,
            })}
          >
            <IconAttach size={18} color={theme.text.secondary} />
          </Pressable>
        ) : null}

        {/* Textarea is always visible — even mid-dictation it shows the
            buffered text plus the current partial. Just `disabled` so
            the user can't type while the engine is listening. */}
        <View style={{ flex: 1 }}>
          <FileMentionsTextarea
            ref={inputRef}
            value={
              isDictating
                ? `${value}${value && speech.partialTranscript ? ' ' : ''}${speech.partialTranscript}`
                : value
            }
            onChangeText={onChange}
            onSearchFiles={filePaths ? onSearchFiles : undefined}
            onSearchReferences={onSearchReferences}
            onAcceptReference={onAcceptReference}
            placeholder={
              isDictating
                ? speech.status === 'requesting-permission'
                  ? 'Waiting for microphone…'
                  : 'Listening…'
                : resolvedPlaceholder
            }
            rows={1}
            disabled={isDictating || !isConfigured || submitting}
          />
        </View>

        {/* Right slot — single button.
            - Dictating: Stop dictation.
            - Has text + idle: Send.
            - No text + idle + dictation supported: Dictate.
            - No text + idle + no dictation: Send (disabled). */}
        {isDictating ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Stop dictation"
            onPress={stopDictation}
            style={({ pressed }) => ({
              width: 36,
              height: 36,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: nativeRadii[2],
              backgroundColor: theme.surface.muted,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <View
              style={{
                width: 12,
                height: 12,
                borderRadius: 2,
                backgroundColor: theme.accent.primary,
              }}
            />
          </Pressable>
        ) : value.trim().length === 0 && dictationAvailable && !isThinking ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dictate"
            onPress={startDictation}
            disabled={!isConfigured || disconnected}
            style={({ pressed }) => ({
              width: 36,
              height: 36,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: nativeRadii[2],
              backgroundColor: pressed ? theme.surface.muted : 'transparent',
              opacity: !isConfigured || disconnected ? 0.4 : 1,
            })}
          >
            <IconMic size={18} color={theme.text.secondary} />
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
              // No background swap between enabled / disabled — matches web's
              // `disabled:opacity-40` send button which keeps the icon in
              // place and only fades it when there's nothing to send.
              opacity: canSend ? (pressed ? 0.7 : 1) : 0.4,
            })}
          >
            <IconSend size={16} color={theme.accent.primary} />
          </Pressable>
        )}
      </View>

      {(() => {
        // Same dual-source error surface as the web peer — either the
        // engine path (`speech.status === 'error'`) or the native
        // trigger path (`nativeError`) drives one Modal.
        const errorCode = nativeError ?? (speech.status === 'error' ? speech.error : undefined)
        const open = errorCode !== undefined && errorCode !== null
        const dismiss = () => {
          setNativeError(null)
          if (speech.status === 'error') speech.reset()
        }
        return (
          <Modal
            isOpen={open}
            onClose={dismiss}
            title={dictationErrorTitle(errorCode ?? '')}
            size="sm"
          >
            <View style={{ gap: 12 }}>
              <Text style={{ color: theme.text.primary }}>
                {dictationErrorMessage(errorCode ?? '')}
              </Text>
              {dictationErrorHint(errorCode ?? '') ? (
                <Text style={{ fontSize: 12, color: theme.text.secondary }}>
                  {dictationErrorHint(errorCode ?? '')}
                </Text>
              ) : null}
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                <Button onPress={dismiss}>OK</Button>
              </View>
            </View>
          </Modal>
        )
      })()}

      {hints && (
        <View>
          {typeof hints === 'string' ? (
            <Text style={{ fontSize: 11, color: theme.text.muted }}>{hints}</Text>
          ) : (
            hints
          )}
        </View>
      )}
    </View>
  )
}

/**
 * Map the raw engine error codes (expo-speech-recognition's
 * `ExpoSpeechRecognitionErrorCode`s + the adapter's `'permission-denied'`
 * fallback) to user-readable copy. Mirrors the web copy so the two
 * platforms read the same when an error surfaces.
 */
function dictationErrorTitle(raw: string | undefined): string {
  switch (raw) {
    case 'permission-denied':
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Microphone access needed'
    case 'accessibility-permission':
      return 'Accessibility permission needed'
    case 'no-speech':
      return 'No audio detected'
    case 'audio-capture':
      return 'Microphone unavailable'
    case 'not-macos':
      return 'Native dictation unavailable'
    case 'ipc-unavailable':
      return 'Dictation bridge missing'
    case 'network':
      return 'Speech recognition needs an internet connection'
    case 'unsupported':
      return 'Dictation not available on this device'
    default:
      return 'Dictation unavailable'
  }
}

function dictationErrorMessage(raw: string | undefined): string {
  switch (raw) {
    case undefined:
    case '':
      return 'Dictation failed for an unknown reason. Please try again.'
    case 'permission-denied':
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Microphone access was denied for this app.'
    case 'no-speech':
      return "We didn't catch any audio. Speak closer to the microphone and try again."
    case 'audio-capture':
      return 'No microphone was found, or another app is using it.'
    case 'network':
      return 'On this device, speech recognition needs an internet connection and we couldn’t reach the service. Check your connection and try again.'
    case 'unsupported':
      return 'Speech recognition isn’t supported on this device.'
    case 'aborted':
      return 'Dictation was stopped before any audio was captured.'
    default:
      return `Dictation error: ${raw}`
  }
}

function dictationErrorHint(raw: string | undefined): string {
  switch (raw) {
    case 'permission-denied':
    case 'not-allowed':
    case 'service-not-allowed':
      return 'If you previously denied microphone access, allow it from your system settings and try again.'
    case 'audio-capture':
      return 'Check that no other app is holding the microphone.'
    default:
      return ''
  }
}
