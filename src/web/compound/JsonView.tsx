import type { ReactNode } from 'react'

function tokenizeJsonString(json: string): ReactNode[] {
  const regex =
    /(\"[^\"\n\r]*\"(?=\s*:))|(\"(?:\\.|[^\"\n\r])*\"(?!\s*:))|\b(true|false|null)\b|(-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b)/g
  const nodes: ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = regex.exec(json)) !== null) {
    const [full] = match
    const start = match.index
    if (start > lastIndex) {
      const text = json.slice(lastIndex, start)
      if (text) nodes.push(<span key={`${lastIndex}-t`}>{text}</span>)
    }
    let className = ''
    if (match[1]) className = 'text-emerald-600 dark:text-emerald-400'
    else if (match[2]) className = 'text-amber-700 dark:text-amber-300'
    else if (match[3]) className = 'text-purple-700 dark:text-purple-300'
    else if (match[4]) className = 'text-blue-700 dark:text-blue-300'
    nodes.push(
      <span key={`${start}-m`} className={className}>
        {full}
      </span>,
    )
    lastIndex = start + full.length
  }
  if (lastIndex < json.length) {
    nodes.push(<span key={`${lastIndex}-tail`}>{json.slice(lastIndex)}</span>)
  }
  return nodes
}

export type JsonViewProps = {
  value: unknown
}

export default function JsonView({ value }: JsonViewProps) {
  const json = typeof value === 'string' ? value : JSON.stringify(value, null, 2)
  return (
    <pre className="text-xs whitespace-pre-wrap break-words font-mono leading-relaxed">
      {tokenizeJsonString(json)}
    </pre>
  )
}
