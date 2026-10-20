import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
  type NativeSyntheticEvent,
  type TextInputProps,
  type TextInputSelectionChangeEventData,
} from 'react-native'

import { isFolderMention, useFileMentions, type ReferenceSuggestion } from '../../../headless'
import { IconFolder } from '../../icons'
import FileTypeIcon from './FileTypeIcon'
import type { ReferenceSigil } from '../../../headless/utils/reference'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'

export type FileMentionsTextareaHandle = {
  focus: () => void
  blur: () => void
}

export interface FileMentionsTextareaProps {
  value: string
  onChangeText: (next: string) => void
  /** Returns ranked path suggestions for the active `@<token>`. When
   *  omitted, the `@`-suggestion strip stays hidden. */
  onSearchFiles?: (token: string) => ReadonlyArray<string>
  /** An `@` suggestion as its row shows it — the path, and its project in a chat over several. */
  describeFile?: (value: string) => { path: string; project?: string }
  /** Returns ranked reference suggestions for the active `#<token>`. When
   *  omitted, the `#`-suggestion strip stays hidden. */
  onSearchReferences?: (token: string) => ReadonlyArray<ReferenceSuggestion>
  /** Returns ranked suggestions for the active `&<token>` — notes and the
   *  chat's attachments. When omitted, `&` shows no suggestions. */
  onSearchHandles?: (token: string) => ReadonlyArray<ReferenceSuggestion>
  /** Fires AFTER the user taps an `@`-file suggestion — not a folder, which is not a file. */
  onAcceptFileMention?: (path: string) => void
  /** Fires AFTER the user taps a `#` or `&` suggestion, with the sigil it was picked under. */
  onAcceptReference?: (value: string, sigil: ReferenceSigil) => void
  /** Submit on the keyboard's return key when the suggestion strip is hidden. */
  onSubmit?: () => void
  placeholder?: string
  /** Approximate number of visible rows; drives `minHeight` via line-height. */
  rows?: number
  disabled?: boolean
  autoFocus?: boolean
  /** Cap on the suggestion list, default `5` — matches the
   *  "above-the-keyboard 5-item" rule. */
  maxSuggestions?: number
  /** Fill the space it is given — a full-height editor — instead of growing with its text. */
  fill?: boolean
  /** Optional pass-through. The mention machinery wraps these so its own
   *  caret-tracking + accept-suggestion handlers run first. */
  textInputProps?: Omit<
    TextInputProps,
    'value' | 'onChangeText' | 'placeholder' | 'editable' | 'multiline' | 'autoFocus'
  >
}

/**
 * Native peer of [web's `FileMentionsTextarea`](../../../web/compound/files/FileMentionsTextarea.tsx).
 * Same `@`-file / `#`-reference autocomplete contract — only the keyboard
 * glue differs.
 *
 * On mobile there are no arrow keys or `Tab`; the suggestion strip is
 * touch-driven. A single horizontal-or-stacked list of up to
 * `maxSuggestions` (default 5) is rendered DIRECTLY ABOVE the input so it
 * floats above the keyboard rather than obscuring half the screen. Tap a
 * row to accept; the strip auto-hides when the caret leaves the active
 * token.
 *
 * State machine + parsing live in the headless
 * [`useFileMentions`](../../../headless/hooks/useFileMentions.ts) hook —
 * mention.ts / reference.ts are re-exported from headless too.
 */
const FileMentionsTextarea = forwardRef<FileMentionsTextareaHandle, FileMentionsTextareaProps>(
  function FileMentionsTextarea(
    {
      value,
      onChangeText,
      onSearchFiles,
      describeFile,
      onSearchReferences,
      onSearchHandles,
      onAcceptFileMention,
      onAcceptReference,
      onSubmit,
      placeholder,
      rows = 3,
      disabled,
      autoFocus,
      maxSuggestions = 5,
      textInputProps,
      fill = false,
    },
    ref,
  ) {
    const { theme } = useNativeTheme()
    const inputRef = useRef<TextInput | null>(null)
    useImperativeHandle(
      ref,
      () => ({
        focus: () => inputRef.current?.focus(),
        blur: () => inputRef.current?.blur(),
      }),
      [],
    )

    const {
      setCursor,
      fileSuggestions,
      refSuggestions,
      showFileMenu,
      showRefMenu,
      acceptFileSuggestion,
      acceptRefSuggestion,
      pendingCursor,
      clearPendingCursor,
    } = useFileMentions({
      value,
      onChange: onChangeText,
      onSearchFiles,
      onSearchReferences,
      onSearchHandles,
      onAcceptFileMention,
      onAcceptReference,
      maxSuggestions,
    })

    const onSelectionChange = (ev: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
      setCursor(ev.nativeEvent.selection.end)
      textInputProps?.onSelectionChange?.(ev)
    }

    // Restore the caret after a programmatic accept. RN's `TextInput` reads
    // `selection` only at controlled-value time; mirror it on the next
    // render then immediately clear the pending value so subsequent edits
    // aren't pinned.
    useEffect(() => {
      if (pendingCursor === null) return
      const t = setTimeout(() => clearPendingCursor(), 0)
      return () => clearTimeout(t)
    }, [pendingCursor, clearPendingCursor])

    return (
      <View style={fill ? { width: '100%', flex: 1, minHeight: 0 } : { width: '100%' }}>
        {(showFileMenu || showRefMenu) && (
          <SuggestionsStrip
            mode={showFileMenu ? 'file' : 'reference'}
            files={fileSuggestions}
            describeFile={describeFile}
            references={refSuggestions}
            onPickFile={(p) => acceptFileSuggestion(p)}
            onPickReference={(v) => acceptRefSuggestion(v)}
          />
        )}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={fill ? { width: '100%', flex: 1, minHeight: 0 } : { width: '100%' }}
        >
          <TextInput
            {...textInputProps}
            ref={inputRef}
            value={value}
            onChangeText={onChangeText}
            onSelectionChange={onSelectionChange}
            onSubmitEditing={onSubmit ? () => onSubmit() : textInputProps?.onSubmitEditing}
            placeholder={placeholder}
            editable={!disabled}
            multiline
            autoFocus={autoFocus}
            selection={
              pendingCursor !== null
                ? { start: pendingCursor, end: pendingCursor }
                : textInputProps?.selection
            }
            style={[
              {
                minHeight: 20 + 20 * rows,
                // Same clamp web uses (`MAX_INPUT_HEIGHT_PX = 250`) —
                // without this, the textarea grows with every newline
                // until it pushes the keyboard off the screen.
                maxHeight: 250,
                textAlignVertical: 'top',
                paddingHorizontal: nativeSpace[3],
                paddingVertical: nativeSpace[2],
                borderRadius: nativeRadii[3],
                borderWidth: 1,
                borderColor: theme.border.subtle,
                backgroundColor: theme.surface.raised,
                color: theme.text.primary,
                fontSize: 14,
                lineHeight: 20,
              },
              fill ? { flex: 1, minHeight: 0, maxHeight: undefined } : null,
              textInputProps?.style,
            ]}
            placeholderTextColor={theme.text.muted}
          />
        </KeyboardAvoidingView>
      </View>
    )
  },
)

export default FileMentionsTextarea

function SuggestionsStrip({
  mode,
  files,
  describeFile,
  references,
  onPickFile,
  onPickReference,
}: {
  mode: 'file' | 'reference'
  files: ReadonlyArray<string>
  describeFile?: (value: string) => { path: string; project?: string }
  references: ReadonlyArray<ReferenceSuggestion>
  onPickFile: (path: string) => void
  onPickReference: (value: string) => void
}) {
  const { theme } = useNativeTheme()
  return (
    <View
      accessibilityRole="list"
      accessibilityLabel={mode === 'file' ? 'File suggestions' : 'Reference suggestions'}
      style={{
        marginBottom: nativeSpace[1],
        borderRadius: nativeRadii[3],
        borderWidth: 1,
        borderColor: theme.border.subtle,
        backgroundColor: theme.surface.overlay,
        overflow: 'hidden',
      }}
    >
      {mode === 'file'
        ? files.map((path, idx) => (
            <Pressable
              key={path}
              accessibilityRole="button"
              onPress={() => onPickFile(path)}
              style={({ pressed }) => ({
                paddingHorizontal: nativeSpace[3],
                paddingVertical: nativeSpace[2],
                borderTopWidth: idx === 0 ? 0 : 1,
                borderTopColor: theme.border.subtle,
                backgroundColor: pressed ? theme.surface.hover : 'transparent',
              })}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
                {isFolderMention(path) ? (
                  <IconFolder size={16} />
                ) : (
                  <FileTypeIcon path={describeFile?.(path).path ?? path} size={16} />
                )}
                <Text
                  style={{ flexShrink: 1, fontSize: 13, color: theme.text.primary }}
                  numberOfLines={1}
                  ellipsizeMode="middle"
                >
                  {describeFile?.(path).path ?? path}
                </Text>
                {describeFile?.(path).project ? (
                  <Text
                    style={{ marginLeft: 'auto', fontSize: 12, color: theme.text.secondary }}
                    numberOfLines={1}
                  >
                    {describeFile(path).project}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          ))
        : references.map((sug, idx) => (
            <Pressable
              key={sug.value}
              accessibilityRole="button"
              onPress={() => onPickReference(sug.value)}
              style={({ pressed }) => ({
                paddingHorizontal: nativeSpace[3],
                paddingVertical: nativeSpace[2],
                borderTopWidth: idx === 0 ? 0 : 1,
                borderTopColor: theme.border.subtle,
                backgroundColor: pressed ? theme.surface.hover : 'transparent',
              })}
            >
              <Text style={{ fontSize: 13, color: theme.text.primary }} numberOfLines={1}>
                {sug.label}
              </Text>
              {sug.description && (
                <Text
                  style={{ fontSize: 11, color: theme.text.muted, marginTop: 2 }}
                  numberOfLines={1}
                >
                  {sug.description}
                </Text>
              )}
            </Pressable>
          ))}
    </View>
  )
}
