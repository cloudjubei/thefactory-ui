import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Progressively reveals `text`. Designed for streaming use:
 * - Does NOT reset when `text` updates; advances from the currently displayed
 *   length toward the new target so the first characters of a stream aren't
 *   dropped.
 * - rAF-driven with a millisecond accumulator so it stays smooth across
 *   variable frame intervals and is unaffected by `setTimeout` clamping.
 * - Guards against React 18 Strict Mode double-effects via a generation token.
 */
export function useTypewriter(text: string, speed = 50) {
  const [displayText, setDisplayText] = useState('')

  const targetRef = useRef<string>(text)
  const shownLenRef = useRef<number>(0)
  const rafIdRef = useRef<number | null>(null)
  const accMsRef = useRef<number>(0)
  const lastTsRef = useRef<number | null>(null)
  const genRef = useRef<number>(0)

  // Floor at one frame so we don't try to advance more than one character per ms.
  const msPerChar = Math.max(16, Math.floor(speed || 0))
  const msPerCharRef = useRef(msPerChar)
  msPerCharRef.current = msPerChar

  const start = useCallback(() => {
    if (rafIdRef.current !== null) return
    genRef.current += 1
    const thisGen = genRef.current
    lastTsRef.current = null

    const loop = () => {
      if (thisGen !== genRef.current) return

      const target = targetRef.current
      const targetLen = target.length
      let shownLen = shownLenRef.current

      if (shownLen >= targetLen) {
        rafIdRef.current = null
        return
      }

      const now = performance.now()
      const last = lastTsRef.current
      lastTsRef.current = now
      if (last !== null) accMsRef.current += now - last

      let advanced = 0
      while (accMsRef.current >= msPerCharRef.current && shownLen < targetLen) {
        shownLen += 1
        accMsRef.current -= msPerCharRef.current
        advanced += 1
      }

      if (advanced > 0) {
        shownLenRef.current = shownLen
        setDisplayText(target.slice(0, shownLen))
      }

      if (shownLen < targetLen) {
        rafIdRef.current = requestAnimationFrame(loop)
      } else {
        rafIdRef.current = null
      }
    }

    rafIdRef.current = requestAnimationFrame(loop)
  }, [])

  const skipToEnd = useCallback(() => {
    const target = targetRef.current ?? ''
    if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current)
    rafIdRef.current = null
    shownLenRef.current = target.length
    accMsRef.current = 0
    lastTsRef.current = null
    setDisplayText(target)
  }, [])

  useEffect(() => {
    targetRef.current = text ?? ''
    const targetLen = targetRef.current.length
    const shownLen = shownLenRef.current
    if (shownLen > targetLen) {
      shownLenRef.current = targetLen
      setDisplayText(targetRef.current.slice(0, targetLen))
    } else if (shownLen < targetLen) {
      start()
    }
  }, [text, start])

  // Restart timing when speed changes without resetting progress.
  useEffect(() => {
    if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current)
    rafIdRef.current = null
    accMsRef.current = 0
    lastTsRef.current = null
    start()
  }, [msPerChar, start])

  // Mount: start fresh; cancel pending frame on unmount.
  useEffect(() => {
    genRef.current += 1
    shownLenRef.current = 0
    setDisplayText('')
    accMsRef.current = 0
    lastTsRef.current = null
    start()
    return () => {
      if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = null
    }
  }, [start])

  const isTyping = shownLenRef.current < targetRef.current.length
  return { displayText, isTyping, skipToEnd }
}
