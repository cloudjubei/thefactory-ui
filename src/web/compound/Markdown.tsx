import { memo, useMemo, type FC } from 'react'
import ReactMarkdown, { type Components, type Options } from 'react-markdown'
import rehypeExternalLinks from 'rehype-external-links'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import remarkGfm from 'remark-gfm'

// Markdown renderer for chat / story content.
//
// Per-element styling lives in a `components` map below (Tailwind utility
// classes). The `.markdown-content` CSS scope adds a small handful of
// container-level rules (overflow-wrap, etc.) but the bulk of the visual
// rhythm — heading weights, paragraph margins, list indentation, code-block
// chrome — is set per-tag here so consumers get pixel-stable output without
// depending on `.markdown-content` class-name discovery being wired correctly.
//
// Skips features the chat surface doesn't need (math/LaTeX, raw HTML,
// sanitization). If math support is required later, plumb in remark-math /
// rehype-katex behind a `math?: boolean` prop and add the deps.
//
// External links get `target="_blank"` + safe `rel` via rehype-external-links;
// in-page anchors and relative links are left alone, which is the right
// default for chat content.

const components: Partial<Components> = {
  pre: ({ children, ...props }) => (
    <pre
      className="p-4 rounded-md overflow-x-auto my-4 bg-(--surface-muted)"
      {...props}
    >
      {children}
    </pre>
  ),
  code: (props) => {
    const { children, className, ...rest } = props
    // Fenced code block: parent <pre> already styles the box; just pass through.
    if (/language-(\w+)/.exec(className || '')) {
      return (
        <code className={className} {...rest}>
          {children}
        </code>
      )
    }
    // Inline code: stay inline (so it doesn't break chat-bubble line flow).
    return (
      <code
        className={[
          'inline align-baseline px-1 py-px rounded text-[0.9em] font-mono break-words',
          'bg-(--surface-muted)',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      >
        {children}
      </code>
    )
  },
  p: ({ children, ...props }) => (
    <p className="my-1 leading-relaxed" {...props}>
      {children}
    </p>
  ),
  ol: ({ children, ...props }) => (
    <ol className="list-decimal list-outside ml-6 mb-4 space-y-1" {...props}>
      {children}
    </ol>
  ),
  ul: ({ children, ...props }) => (
    <ul className="list-disc list-outside ml-6 mb-4 space-y-1" {...props}>
      {children}
    </ul>
  ),
  li: ({ children, ...props }) => (
    <li className="mb-1" {...props}>
      {children}
    </li>
  ),
  table: ({ children, ...props }) => (
    <div className="overflow-x-auto w-full my-4 border border-(--border-subtle) rounded-md">
      <table className="w-full text-sm" {...props}>
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }) => (
    <thead className="bg-(--surface-muted)" {...props}>
      {children}
    </thead>
  ),
  th: ({ children, ...props }) => (
    <th
      className="p-3 border-b border-r border-(--border-subtle) text-left font-medium text-(--text-muted) last:border-r-0"
      {...props}
    >
      {children}
    </th>
  ),
  td: ({ children, ...props }) => (
    <td
      className="p-3 border-b border-r border-(--border-subtle) text-left last:border-r-0"
      {...props}
    >
      {children}
    </td>
  ),
  tr: ({ children, ...props }) => (
    <tr
      className="hover:bg-(--surface-hover) transition-colors last:border-b-0"
      {...props}
    >
      {children}
    </tr>
  ),
  strong: ({ children, ...props }) => (
    <strong className="font-semibold" {...props}>
      {children}
    </strong>
  ),
  a: ({ children, ...props }) => (
    <a
      className="text-(--accent-primary) hover:underline"
      target="_blank"
      rel="noreferrer"
      {...props}
    >
      {children}
    </a>
  ),
  h1: ({ children, ...props }) => (
    <h1
      className="text-2xl font-bold mt-4 mb-2 pb-1 border-b border-(--border-subtle)"
      {...props}
    >
      {children}
    </h1>
  ),
  h2: ({ children, ...props }) => (
    <h2
      className="text-xl font-semibold mt-4 mb-2 pb-1 border-b border-(--border-subtle)"
      {...props}
    >
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3 className="text-xl font-semibold mt-4 mb-2" {...props}>
      {children}
    </h3>
  ),
  h4: ({ children, ...props }) => (
    <h4 className="text-lg font-semibold mt-4 mb-2" {...props}>
      {children}
    </h4>
  ),
  h5: ({ children, ...props }) => (
    <h5 className="text-base font-semibold mt-4 mb-2" {...props}>
      {children}
    </h5>
  ),
  h6: ({ children, ...props }) => (
    <h6 className="text-sm font-semibold mt-4 mb-2" {...props}>
      {children}
    </h6>
  ),
  blockquote: ({ children, ...props }) => (
    <blockquote
      className="border-l-4 border-(--border-default) pl-3 my-2 text-(--text-secondary)"
      {...props}
    >
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-4 border-(--border-subtle)" />,
}

const MemoizedReactMarkdown: FC<Options> = memo(
  ReactMarkdown as FC<Options>,
  (prev, next) => prev.children === next.children,
)

// Allow `className`, `target`, and `rel` attributes after the sanitize pass —
// the components map relies on `className` for code-block language hints, and
// external links need `target` / `rel`. Mirrors the legacy local schema.
const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    '*': [
      ...(((defaultSchema as unknown as { attributes?: Record<string, unknown[]> })
        .attributes?.['*'] as unknown[]) ?? []),
      'className',
    ],
    a: [
      ...(((defaultSchema as unknown as { attributes?: Record<string, unknown[]> })
        .attributes?.['a'] as unknown[]) ?? []),
      ['target', /^(_blank|_self|_parent|_top)$/],
      [
        'rel',
        /^(noopener|noreferrer|nofollow|ugc|external)(\s+(noopener|noreferrer|nofollow|ugc|external))*$/,
      ],
    ],
  },
}

const REMARK_PLUGINS = [remarkGfm] as Options['remarkPlugins']

export type MarkdownProps = {
  text: string
  /**
   * Allow raw HTML in the input (via `rehype-raw`) and sanitise it (via
   * `rehype-sanitize`). Defaults to `false`. Use for content where the source
   * may include literal `<details>`, `<br>`, etc. — most chat content
   * doesn't, but `.md` file preview / editor surfaces do.
   */
  allowHtml?: boolean
}

export default function Markdown({ text, allowHtml = false }: MarkdownProps) {
  const rehypePlugins = useMemo(() => {
    const plugins: NonNullable<Options['rehypePlugins']> = []
    if (allowHtml) {
      plugins.push(rehypeRaw)
      plugins.push([rehypeSanitize, sanitizeSchema])
    }
    plugins.push([rehypeExternalLinks, { target: '_blank', rel: ['noopener', 'noreferrer'] }])
    return plugins
  }, [allowHtml])

  return (
    <div className="markdown-content">
      <MemoizedReactMarkdown
        remarkPlugins={REMARK_PLUGINS}
        rehypePlugins={rehypePlugins}
        components={components}
      >
        {text}
      </MemoizedReactMarkdown>
    </div>
  )
}
