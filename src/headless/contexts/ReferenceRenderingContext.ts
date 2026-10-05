import { createContext, useContext, useMemo, type ReactNode } from 'react'
import type { ReferenceTarget, ResourceLink } from 'thefactory-tools/types'
import type { References } from '../hooks/useReferences'

/**
 * How text outside a chat shows what it points at: the renderer every
 * `Markdown` and `RichText` falls back to, and where a chip opens. An app
 * provides it once for the project in view, so a story card, a note or a
 * markdown file shows chips without each surface wiring its own.
 */
export type ReferenceRendering = {
  renderReference: (target: ReferenceTarget) => ReactNode | undefined
  onOpen?: (link: ResourceLink) => void
  /** The project's references — for `#` / `&` suggestions, saving typed tokens as ids, `asText`. */
  references?: References
}

export const ReferenceRenderingContext = createContext<ReferenceRendering | null>(null)

/** The app's reference rendering, or `null` where none is provided. */
export function useReferenceRendering(): ReferenceRendering | null {
  return useContext(ReferenceRenderingContext)
}

/**
 * The renderer a text surface uses: its own, else the app's. Unless the text is
 * one people write references into (`typed`), only what was sent as ids becomes
 * a chip — a `#12` in a document or a log means something else.
 */
export function useEffectiveReferenceRenderer(
  own: ((target: ReferenceTarget) => ReactNode | undefined) | undefined,
  typed: boolean,
): ((target: ReferenceTarget) => ReactNode | undefined) | undefined {
  const rendering = useReferenceRendering()
  const render = own ?? rendering?.renderReference
  return useMemo(() => {
    if (!render || typed) return render
    return (target: ReferenceTarget) => (target.type === 'typed' ? undefined : render(target))
  }, [render, typed])
}

const asTyped = (text: string): string => text

/**
 * Turns what was typed (`#3.2`, `&qa-login`) into ids, in the project in view,
 * for an input that saves text outside a form — a rejection reason, an answer,
 * a sign-off note. Without the app's references, text is saved as typed.
 */
export function useCanonicalizeReferences(): (text: string, before?: string) => string {
  return useReferenceRendering()?.references?.canonicalize ?? asTyped
}
