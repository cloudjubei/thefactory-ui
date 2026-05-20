import { useCallback, useEffect, useMemo, useState } from 'react'
import { applyMention, parseMention, type MentionParse } from '../utils/mention'
import {
  applyReference,
  parseReference,
  type ReferenceParse,
  type ReferenceSuggestion,
} from '../utils/reference'

/**
 * Headless state machine for an `@`-file / `#`-reference autocomplete input.
 * Lifted out of [web's `FileMentionsTextarea`](../../web/compound/files/FileMentionsTextarea.tsx)
 * so the native peer can consume the same logic — only the keyboard glue and
 * suggestion-list presentation differ between platforms.
 *
 * The caret can only be inside one active token at a time — `parseMention`
 * and `parseReference` are mutually exclusive by construction. The hook
 * picks whichever matches, hands the matching token to the consumer's
 * `onSearchFiles` / `onSearchReferences`, and exposes `showFileMenu` /
 * `showRefMenu` flags + a single `menuLength` / `highlight` pair so the
 * consumer can drive a single keyboard-navigable list.
 */
export interface UseFileMentionsOptions {
  value: string
  onChange: (next: string) => void
  /** Returns ranked path suggestions for the active `@<token>`. When omitted,
   *  the `@`-dropdown stays empty. */
  onSearchFiles?: (token: string) => ReadonlyArray<string>
  /** Returns ranked reference suggestions for the active `#<token>`. When
   *  omitted, the `#`-dropdown stays empty. */
  onSearchReferences?: (token: string) => ReadonlyArray<ReferenceSuggestion>
  /** Fires AFTER the user accepts an `@`-file mention. */
  onAcceptFileMention?: (path: string) => void
  /** Fires AFTER the user accepts a `#`-reference. */
  onAcceptReference?: (value: string) => void
  /** Cap on suggestions rendered. Default `5` — matches the
   *  "5 items max above the keyboard" rule for mobile suggestions. */
  maxSuggestions?: number
}

export interface UseFileMentions {
  cursor: number
  setCursor: (next: number) => void

  mentionParse: MentionParse | null
  referenceParse: ReferenceParse | null

  fileSuggestions: ReadonlyArray<string>
  refSuggestions: ReadonlyArray<ReferenceSuggestion>

  showFileMenu: boolean
  showRefMenu: boolean
  menuLength: number

  highlight: number
  setHighlight: (next: number) => void
  highlightNext: () => void
  highlightPrev: () => void

  acceptHighlighted: () => boolean
  acceptFileSuggestion: (path: string) => void
  acceptRefSuggestion: (value: string) => void

  /** Move caret past the current token so the menu hides on next render. */
  dismissMenu: () => void

  /** Bump after a programmatic edit so the consumer can restore the caret on
   *  the next render. `null` when no edit is pending. */
  pendingCursor: number | null
  clearPendingCursor: () => void
}

export function useFileMentions({
  value,
  onChange,
  onSearchFiles,
  onSearchReferences,
  onAcceptFileMention,
  onAcceptReference,
  maxSuggestions = 5,
}: UseFileMentionsOptions): UseFileMentions {
  const [cursor, setCursor] = useState(0)
  const [highlight, setHighlight] = useState(0)
  const [pendingCursor, setPendingCursor] = useState<number | null>(null)

  const mentionParse = useMemo(() => parseMention(value, cursor), [value, cursor])
  const referenceParse = useMemo(() => parseReference(value, cursor), [value, cursor])

  const fileSuggestions = useMemo<ReadonlyArray<string>>(() => {
    if (!mentionParse || !onSearchFiles) return []
    const raw = onSearchFiles(mentionParse.token)
    return raw.slice(0, maxSuggestions)
  }, [mentionParse, onSearchFiles, maxSuggestions])

  const refSuggestions = useMemo<ReadonlyArray<ReferenceSuggestion>>(() => {
    if (!referenceParse || !onSearchReferences) return []
    const raw = onSearchReferences(referenceParse.token)
    return raw.slice(0, maxSuggestions)
  }, [referenceParse, onSearchReferences, maxSuggestions])

  const showFileMenu = !!mentionParse && fileSuggestions.length > 0
  const showRefMenu = !showFileMenu && !!referenceParse && refSuggestions.length > 0
  const menuLength = showFileMenu ? fileSuggestions.length : showRefMenu ? refSuggestions.length : 0

  // Keep highlight in range whenever the menu shrinks.
  useEffect(() => {
    if (highlight >= menuLength) setHighlight(0)
  }, [menuLength, highlight])

  const highlightNext = useCallback(() => {
    if (menuLength === 0) return
    setHighlight((h) => (h + 1) % menuLength)
  }, [menuLength])

  const highlightPrev = useCallback(() => {
    if (menuLength === 0) return
    setHighlight((h) => (h - 1 + menuLength) % menuLength)
  }, [menuLength])

  const acceptFileSuggestion = useCallback(
    (path: string) => {
      if (!mentionParse) return
      const next = applyMention(value, mentionParse, path)
      setPendingCursor(next.cursor)
      onChange(next.text)
      setCursor(next.cursor)
      onAcceptFileMention?.(path)
    },
    [mentionParse, value, onChange, onAcceptFileMention],
  )

  const acceptRefSuggestion = useCallback(
    (refValue: string) => {
      if (!referenceParse) return
      const next = applyReference(value, referenceParse, refValue)
      setPendingCursor(next.cursor)
      onChange(next.text)
      setCursor(next.cursor)
      onAcceptReference?.(refValue)
    },
    [referenceParse, value, onChange, onAcceptReference],
  )

  const acceptHighlighted = useCallback((): boolean => {
    if (showFileMenu) {
      const pick = fileSuggestions[highlight]
      if (pick !== undefined) {
        acceptFileSuggestion(pick)
        return true
      }
    }
    if (showRefMenu) {
      const pick = refSuggestions[highlight]
      if (pick !== undefined) {
        acceptRefSuggestion(pick.value)
        return true
      }
    }
    return false
  }, [
    showFileMenu,
    showRefMenu,
    fileSuggestions,
    refSuggestions,
    highlight,
    acceptFileSuggestion,
    acceptRefSuggestion,
  ])

  const dismissMenu = useCallback(() => {
    if (showFileMenu && mentionParse) setCursor(mentionParse.end + 1)
    else if (showRefMenu && referenceParse) setCursor(referenceParse.end + 1)
  }, [showFileMenu, showRefMenu, mentionParse, referenceParse])

  const clearPendingCursor = useCallback(() => setPendingCursor(null), [])

  return {
    cursor,
    setCursor,
    mentionParse,
    referenceParse,
    fileSuggestions,
    refSuggestions,
    showFileMenu,
    showRefMenu,
    menuLength,
    highlight,
    setHighlight,
    highlightNext,
    highlightPrev,
    acceptHighlighted,
    acceptFileSuggestion,
    acceptRefSuggestion,
    dismissMenu,
    pendingCursor,
    clearPendingCursor,
  }
}
