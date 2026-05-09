import { useMemo } from 'react'
import { highlight, languages } from 'prismjs'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-diff'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-typescript'
import 'prismjs/themes/prism-tomorrow.css'

const SUPPORTED: Record<string, true> = {
  bash: true,
  diff: true,
  json: true,
  python: true,
  text: true,
  typescript: true,
}

export type CodeProps = {
  code: string
  language: 'bash' | 'diff' | 'json' | 'python' | 'text' | 'typescript' | (string & {})
}

// Syntax-highlighted code block. Falls back to a plain `<pre>` for unknown
// languages or when the requested grammar isn't loaded yet.
export default function Code({ code, language }: CodeProps) {
  const lang = SUPPORTED[language] ? language : 'text'

  const html = useMemo(() => {
    if (lang === 'text') return null
    const grammar = languages[lang]
    if (!grammar) return null
    return highlight(code, grammar, lang)
  }, [code, lang])

  if (lang === 'text' || html === null) {
    return (
      <pre className="text-sm text-(--text-primary) bg-(--surface-raised) p-2 rounded-md overflow-x-auto whitespace-pre-wrap">
        <code>{code}</code>
      </pre>
    )
  }

  return (
    <pre
      className={`language-${lang} text-sm bg-(--surface-raised)! p-2 rounded-md overflow-x-auto`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
