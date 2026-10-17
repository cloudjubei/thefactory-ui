import { useMemo } from 'react'
import { highlight, languages } from 'prismjs'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-diff'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-typescript'
import 'prismjs/themes/prism-tomorrow.css'

import { useCodeBlockTheme } from '../../headless/hooks/useCodeBlockTheme'
import type { CodeBlockTheme } from '../../headless/types/settings'

const SUPPORTED: Record<string, true> = {
  bash: true,
  diff: true,
  json: true,
  python: true,
  text: true,
  typescript: true,
}

const MAX_HIGHLIGHT_CHARS = 50000

export type CodeProps = {
  code: string
  language: 'bash' | 'diff' | 'json' | 'python' | 'text' | 'typescript' | (string & {})
  /** Explicit override; defaults to the value resolved by
   *  `useCodeBlockTheme()` so call-sites usually omit this. */
  theme?: CodeBlockTheme
}

// Syntax-highlighted code block. Falls back to a plain `<pre>` for unknown
// languages or when the requested grammar isn't loaded yet. Each theme has
// its own surface and token colours (`CODE_BLOCK_PALETTES`, the same on
// mobile): `dark` is prism-tomorrow on `#2d2d2d`; `light` is white with the
// light palette, which `styles/components/code-block.css` paints over Prism's
// tokens.
// The `!` modifiers are required because `prism-tomorrow.css` sets
// `background` on `pre[class*="language-"]` with class-level specificity,
// and our Tailwind classes are loaded earlier in the cascade.
export default function Code({ code, language, theme }: CodeProps) {
  const resolvedTheme = useCodeBlockTheme()
  const blockTheme = theme ?? resolvedTheme
  const lang = SUPPORTED[language] ? language : 'text'

  const html = useMemo(() => {
    if (lang === 'text') return null
    // Prism tokenises synchronously on the main thread; skip it for pathologically large strings (a huge
    // tool result) and render a plain <pre> instead, so highlighting can never freeze the UI.
    if (code.length > MAX_HIGHLIGHT_CHARS) return null
    const grammar = languages[lang]
    if (!grammar) return null
    return highlight(code, grammar, lang)
  }, [code, lang])

  const themeClass = blockTheme === 'dark' ? 'bg-[#2d2d2d]! text-[#ccc]' : 'code-light bg-white!'

  if (lang === 'text' || html === null) {
    return (
      <pre className={`text-sm ${themeClass} p-2 rounded-md overflow-x-auto whitespace-pre-wrap`}>
        <code>{code}</code>
      </pre>
    )
  }

  return (
    <pre
      className={`language-${lang} text-sm ${themeClass} p-2 rounded-md overflow-x-auto`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
