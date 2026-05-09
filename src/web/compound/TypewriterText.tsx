import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useTypewriter } from '../../headless'
import Markdown from './Markdown'

export type TypewriterTextProps = {
  text: string
  /** ms per character. Floored at one frame internally. */
  speed?: number
  /**
   * Renderer for the partial text. Defaults to Markdown (debounced during
   * typing so the parser doesn't run on every character). Pass a custom
   * function to render with `RichText`, plain spans, etc.
   */
  render?: (text: string, isTyping: boolean) => ReactNode
  /** Hide the "Skip to end" affordance. Defaults to showing it while typing. */
  hideSkipButton?: boolean
}

/**
 * Renders `text` with a progressive typewriter reveal. Uses the headless
 * `useTypewriter` hook for animation; a "Skip to end" button surfaces while
 * the reveal is in progress.
 */
export default function TypewriterText({
  text,
  speed = 2,
  render,
  hideSkipButton,
}: TypewriterTextProps) {
  const { displayText, isTyping, skipToEnd } = useTypewriter(text, speed)
  const renderer = render ?? defaultMarkdownRender

  return (
    <div className="relative">
      {renderer(displayText, isTyping)}
      {isTyping && !hideSkipButton ? (
        <button
          type="button"
          className="absolute bottom-2 right-2 z-10 text-[11px] px-2 py-1 rounded shadow-sm border border-(--border-subtle) bg-(--surface-raised) text-(--text-primary) hover:bg-(--surface-hover)"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            skipToEnd()
          }}
          aria-label="Skip to end"
          title="Skip to end"
        >
          Skip to end
        </button>
      ) : null}
    </div>
  )
}

function defaultMarkdownRender(text: string, isTyping: boolean) {
  return <DebouncedMarkdown text={text} isTyping={isTyping} />
}

/**
 * Renders Markdown with the same pipeline whether typing or finished — the
 * animation only controls how much text is revealed. Debounces parser calls
 * during typing so we don't re-run the AST build on every character.
 */
function DebouncedMarkdown({ text, isTyping }: { text: string; isTyping: boolean }) {
  const DEBOUNCE_MS = 16
  const [debouncedText, setDebouncedText] = useState(text)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!isTyping) {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      setDebouncedText(text)
      return
    }
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setDebouncedText(text)
      timerRef.current = null
    }, DEBOUNCE_MS)
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [text, isTyping])

  return <Markdown text={isTyping ? debouncedText : text} />
}
