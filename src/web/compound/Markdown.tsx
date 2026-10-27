import { memo, useMemo, type FC, type ReactNode } from 'react'
import ReactMarkdown, { defaultUrlTransform, type Components, type Options } from 'react-markdown'
import rehypeExternalLinks from 'rehype-external-links'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import remarkGfm from 'remark-gfm'
import {
  parseAppUrlAsResourceLink,
  parseReferenceToken,
  parseResourceLink,
  withReferencesAsCode,
} from 'thefactory-tools/utils'
import type { ReferenceTarget, ResourceLink } from 'thefactory-tools/types'
import { useEffectiveReferenceRenderer } from '../../headless/contexts/ReferenceRenderingContext'

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
    <pre className="p-4 rounded-md overflow-x-auto my-4 bg-(--surface-muted)" {...props}>
      {children}
    </pre>
  ),
  code: (props) => {
    const { children, className, ...rest } = props
    // Fenced code block: parent <pre> already styles the box. The theme's text colour wins over
    // prism-tomorrow's `code[class*="language-"]` grey, which is meant for its dark surface.
    if (/language-(\w+)/.exec(className || '')) {
      return (
        <code className={`${className} text-(--text-primary)!`} {...rest}>
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
      className="p-3 border-b border-r border-(--border-subtle) min-w-24 text-left wrap-anywhere last:border-r-0"
      {...props}
    >
      {children}
    </td>
  ),
  tr: ({ children, ...props }) => (
    <tr className="hover:bg-(--surface-hover) transition-colors last:border-b-0" {...props}>
      {children}
    </tr>
  ),
  strong: ({ children, ...props }) => (
    <strong className="font-semibold" {...props}>
      {children}
    </strong>
  ),
  // A link the sanitiser emptied (a scheme it does not allow, e.g. `overseer://` with no
  // handler) would point at the page the user is on — it is shown as text instead.
  a: ({ children, ...props }) =>
    props.href ? (
      <a
        className="text-(--accent-primary) hover:underline"
        target="_blank"
        rel="noreferrer"
        {...props}
      >
        {children}
      </a>
    ) : (
      <span>{children}</span>
    ),
  h1: ({ children, ...props }) => (
    <h1 className="text-2xl font-bold mt-4 mb-2 pb-1 border-b border-(--border-subtle)" {...props}>
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
  (prev, next) => prev.children === next.children && prev.components === next.components,
)

// Allow `className`, `target`, and `rel` attributes after the sanitize pass —
// the components map relies on `className` for code-block language hints, and
// external links need `target` / `rel`. Mirrors the legacy local schema.
const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    '*': [
      ...(((defaultSchema as unknown as { attributes?: Record<string, unknown[]> }).attributes?.[
        '*'
      ] as unknown[]) ?? []),
      'className',
    ],
    a: [
      ...(((defaultSchema as unknown as { attributes?: Record<string, unknown[]> }).attributes?.[
        'a'
      ] as unknown[]) ?? []),
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
  /**
   * Called when the user activates an in-app resource link — an `overseer://…` href the LLM emitted,
   * or a link back into this app's own origin (`http://localhost:5173/projects/…`), which models
   * write often enough that treating it as external would open a second tab of the app the user is
   * already in. When set, such links render as an in-app chip (no `target="_blank"`) and route here
   * instead of opening externally; ordinary links are unaffected. Omitted ⇒ every link opens
   * externally.
   */
  onResourceLink?: (link: ResourceLink) => void
  /**
   * Shows what the text points at as chips: a reference token (`#<storyId>`,
   * `&<noteId>`, `@path`, or a backticked project path) and an `overseer://`
   * link. Returning `undefined` leaves it as code or a plain link.
   */
  renderReference?: (target: ReferenceTarget) => ReactNode | undefined
  /**
   * Chip what was typed (`#3.2`, `&qa-login`) as well as what was sent as ids.
   * For text people write references into — a chat, a story. Off, a `#12` in a
   * document or a log stays text.
   */
  typedReferences?: boolean
  /** Text inside a line — a table cell, a list row: paragraphs render as spans, with no block margins. */
  inline?: boolean
  /**
   * Text on an accent (user) bubble: fenced/inline code and links use on-accent
   * chrome so they stay readable on `--accent-primary` (peer of native `onAccent`).
   */
  onAccent?: boolean
}

const INLINE_PARAGRAPH: Partial<Components> = {
  p: ({ children }) => <span>{children}</span>,
}

const ACCENT_LINK = 'text-(--text-on-accent) underline decoration-white/50 hover:decoration-white'
const ACCENT_CODE_INLINE =
  'inline align-baseline px-1 py-px rounded text-[0.9em] font-mono break-words bg-white/20 text-(--text-on-accent)'
const ACCENT_PRE = 'p-4 rounded-md overflow-x-auto my-4 bg-black/25 text-(--text-on-accent)'

export default function Markdown({
  text,
  allowHtml = false,
  onResourceLink,
  renderReference: ownRenderReference,
  typedReferences = false,
  inline = false,
  onAccent = false,
}: MarkdownProps) {
  const renderReference = useEffectiveReferenceRenderer(ownRenderReference, typedReferences)
  const rehypePlugins = useMemo(() => {
    const plugins: NonNullable<Options['rehypePlugins']> = []
    if (allowHtml) {
      plugins.push(rehypeRaw)
      plugins.push([rehypeSanitize, sanitizeSchema])
    }
    plugins.push([rehypeExternalLinks, { target: '_blank', rel: ['noopener', 'noreferrer'] }])
    return plugins
  }, [allowHtml])

  // react-markdown sanitises hrefs through `urlTransform` BEFORE components render; its default
  // allowlist (http/https/mailto/…) rewrites our custom `overseer://` scheme to '', which would kill
  // the interception below. Preserve `overseer://` when a handler is present; keep the safe default
  // (XSS protection) for every other scheme.
  const urlTransform = useMemo<NonNullable<Options['urlTransform']>>(
    () =>
      onResourceLink || renderReference
        ? (url) => (url.startsWith('overseer://') ? url : defaultUrlTransform(url))
        : defaultUrlTransform,
    [onResourceLink, renderReference],
  )

  // A model that has seen the app's own URLs writes `http://localhost:5173/projects/x`
  // rather than the `overseer://` form; same-origin links must navigate in place
  // instead of opening a second tab of the app the user is already in.
  const appOrigin = typeof window !== 'undefined' ? window.location.origin : ''

  const activeComponents = useMemo<Partial<Components>>(() => {
    const linkClass = onAccent ? ACCENT_LINK : 'text-(--accent-primary) hover:underline'
    const themed: Partial<Components> = onAccent
      ? {
          ...components,
          pre: ({ children, ...props }) => (
            <pre className={ACCENT_PRE} {...props}>
              {children}
            </pre>
          ),
          code: (props) => {
            const { children, className, ...rest } = props
            if (/language-(\w+)/.exec(className || '')) {
              // Inverted text — never text-primary, which washes out on the accent.
              return (
                <code className={`${className ?? ''} text-(--text-on-accent)!`} {...rest}>
                  {children}
                </code>
              )
            }
            return (
              <code className={[ACCENT_CODE_INLINE, className].filter(Boolean).join(' ')} {...rest}>
                {children}
              </code>
            )
          },
          a: ({ children, ...props }) =>
            props.href ? (
              <a className={ACCENT_LINK} target="_blank" rel="noreferrer" {...props}>
                {children}
              </a>
            ) : (
              <span>{children}</span>
            ),
        }
      : components
    const base: Partial<Components> = renderReference
      ? {
          ...themed,
          code: (props) => {
            const inlineCode = !/language-(\w+)/.exec(props.className || '')
            const token = typeof props.children === 'string' ? props.children : undefined
            const parsed =
              inlineCode && token !== undefined ? parseReferenceToken(token) : undefined
            const chip = parsed ? renderReference(parsed) : undefined
            if (chip !== undefined) return <>{chip}</>
            const Code = themed.code as FC<typeof props>
            return <Code {...props} />
          },
          a: (props) => {
            const link =
              typeof props.href === 'string'
                ? (parseResourceLink(props.href) ??
                  parseAppUrlAsResourceLink(props.href, appOrigin))
                : undefined
            const chip = link ? renderReference({ type: 'link', link }) : undefined
            if (chip !== undefined) return <>{chip}</>
            const A = themed.a as FC<typeof props>
            return <A {...props} />
          },
        }
      : themed
    if (!onResourceLink) return base
    return {
      ...base,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      a: ({ children, href, target: _target, rel: _rel, ...props }) => {
        const link =
          typeof href === 'string'
            ? (parseResourceLink(href) ?? parseAppUrlAsResourceLink(href, appOrigin))
            : undefined
        const chip = link && renderReference ? renderReference({ type: 'link', link }) : undefined
        if (chip !== undefined) return <>{chip}</>
        if (link) {
          return (
            <a
              className={`${linkClass} cursor-pointer`}
              href={href}
              onClick={(e) => {
                e.preventDefault()
                onResourceLink(link)
              }}
              {...props}
            >
              {children}
            </a>
          )
        }
        if (!href) return <span>{children}</span>
        return (
          <a className={linkClass} href={href} target="_blank" rel="noreferrer" {...props}>
            {children}
          </a>
        )
      },
    }
  }, [onResourceLink, renderReference, appOrigin, onAccent])

  const shownComponents = useMemo(
    () => (inline ? { ...activeComponents, ...INLINE_PARAGRAPH } : activeComponents),
    [activeComponents, inline],
  )
  const Wrapper = inline ? 'span' : 'div'

  return (
    <Wrapper className="markdown-content">
      <MemoizedReactMarkdown
        remarkPlugins={REMARK_PLUGINS}
        rehypePlugins={rehypePlugins}
        urlTransform={urlTransform}
        components={shownComponents}
      >
        {renderReference ? withReferencesAsCode(text) : text}
      </MemoizedReactMarkdown>
    </Wrapper>
  )
}
