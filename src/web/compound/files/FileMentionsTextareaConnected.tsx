import React, { useCallback } from 'react'
import { FileMentionsTextarea as FileMentionsTextareaPackage } from '../..'
import { rankMentionMatches } from '../../../headless'
import { useFiles } from '../../../headless'
import { useActiveProject } from '../../../headless'
import { useReferences } from '../../../headless/hooks/useReferences'
import type { ReferenceSigil } from '../../../headless/utils/reference'

export type FileMentionsTextareaConnectedProps = {
  id?: string
  value: string
  disableAutocomplete?: boolean
  onChange: (val: string) => void
  placeholder?: string
  rows?: number
  disabled?: boolean
  className?: string
  style?: React.CSSProperties
  ariaLabel?: string
  onFileMentionSelected?: (path: string) => void
  onReferenceSelected?: (ref: string) => void
  inputRef?: React.RefObject<HTMLTextAreaElement | null>
  onKeyDown?: React.KeyboardEventHandler<HTMLTextAreaElement>
  onSelect?: React.ReactEventHandler<HTMLTextAreaElement>
  onMouseUp?: React.MouseEventHandler<HTMLTextAreaElement>
  onFocus?: React.FocusEventHandler<HTMLTextAreaElement>
}

const MAX_FILE_SUGGESTIONS = 8
const MAX_REF_SUGGESTIONS = 20

/**
 * Connected wrapper around the shared `FileMentionsTextarea` primitive. Wires
 * the active project's file paths, stories and features, and notes into the
 * primitive's `@file`, `#` and `&` autocomplete searches. `onReferenceSelected`
 * hears a `#` pick only — a story or feature, never a note.
 */
export default function FileMentionsTextareaConnected({
  id,
  value,
  disableAutocomplete,
  onChange,
  placeholder,
  rows,
  disabled,
  className,
  style,
  ariaLabel,
  onFileMentionSelected,
  onReferenceSelected,
  inputRef,
  onKeyDown,
  onSelect,
  onMouseUp,
  onFocus,
}: FileMentionsTextareaConnectedProps) {
  const { paths } = useFiles()
  const { projectId } = useActiveProject()
  const references = useReferences({ scope: projectId ? { projectId } : undefined })
  const { searchWork, searchHandles } = references

  const onSearchFiles = useCallback(
    (token: string) =>
      disableAutocomplete ? [] : rankMentionMatches(paths, token, MAX_FILE_SUGGESTIONS),
    [paths, disableAutocomplete],
  )
  const onSearchReferences = useCallback(
    (token: string) => (disableAutocomplete ? [] : searchWork(token).slice(0, MAX_REF_SUGGESTIONS)),
    [searchWork, disableAutocomplete],
  )
  const onSearchHandles = useCallback(
    (token: string) =>
      disableAutocomplete ? [] : searchHandles(token).slice(0, MAX_REF_SUGGESTIONS),
    [searchHandles, disableAutocomplete],
  )
  const onAcceptReference = useCallback(
    (refValue: string, sigil: ReferenceSigil) => {
      if (sigil === '#') onReferenceSelected?.(refValue)
    },
    [onReferenceSelected],
  )

  return (
    <FileMentionsTextareaPackage
      ref={inputRef}
      id={id}
      value={value}
      onChange={onChange}
      onSearchFiles={onSearchFiles}
      onSearchReferences={onSearchReferences}
      onSearchHandles={onSearchHandles}
      onAcceptFileMention={onFileMentionSelected}
      onAcceptReference={onAcceptReference}
      placeholder={placeholder}
      rows={rows}
      disabled={disabled}
      className={className}
      style={style}
      ariaLabel={ariaLabel}
      onKeyDown={onKeyDown}
      onSelect={onSelect}
      onMouseUp={onMouseUp}
      onFocus={onFocus}
    />
  )
}
