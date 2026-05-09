import { memo, type FC } from 'react'
import ReactMarkdown, { type Options } from 'react-markdown'
import rehypeExternalLinks from 'rehype-external-links'
import remarkGfm from 'remark-gfm'

// Slim markdown renderer for chat / story content.
//
// Skips features the chat surface doesn't need (math/LaTeX, raw HTML,
// sanitization). If math support is required later, plumb in remark-math /
// rehype-katex behind a `math?: boolean` prop and add the deps.
//
// Styling lives in `@uikit/web/styles/components/markdown.css` under the
// `.markdown-content` scope — keeping it as plain CSS (rather than the
// Tailwind Typography plugin) lets us route through design tokens.
//
// External links get `target="_blank"` + safe `rel` via rehype-external-links;
// in-page anchors and relative links are left alone, which is the right
// default for chat content.

const MemoizedReactMarkdown: FC<Options> = memo(
  ReactMarkdown as FC<Options>,
  (prev, next) => prev.children === next.children,
)

const REHYPE_PLUGINS = [
  [rehypeExternalLinks, { target: '_blank', rel: ['noopener', 'noreferrer'] }],
] as Options['rehypePlugins']

const REMARK_PLUGINS = [remarkGfm] as Options['remarkPlugins']

export type MarkdownProps = {
  text: string
}

export default function Markdown({ text }: MarkdownProps) {
  return (
    <div className="markdown-content">
      <MemoizedReactMarkdown remarkPlugins={REMARK_PLUGINS} rehypePlugins={REHYPE_PLUGINS}>
        {text}
      </MemoizedReactMarkdown>
    </div>
  )
}
