import { Fragment, useMemo, useState, type CSSProperties } from 'react'

import {
  TERMINAL_BACKGROUND,
  TERMINAL_BORDER,
  TERMINAL_DIM_OPACITY,
  TERMINAL_FOREGROUND,
  TERMINAL_MAX_HEIGHT,
  TERMINAL_OUTPUT_LABEL,
  TERMINAL_PALETTE,
  terminalOutputView,
  type TerminalSpan,
} from '../../headless'
import { IconChevronRight } from '../icons'
import { CopyButton } from './CopyButton'

export type TerminalOutputProps = {
  text: string
  /** The heading above the block — "Output" when omitted. */
  label?: string
  /** Folds the block behind its heading, starting closed. */
  collapsed?: boolean
}

function spanStyle(span: TerminalSpan): CSSProperties | undefined {
  if (!span.color && !span.bold && !span.dim) return undefined
  return {
    ...(span.color ? { color: TERMINAL_PALETTE[span.color] } : {}),
    ...(span.bold ? { fontWeight: 600 } : {}),
    ...(span.dim ? { opacity: TERMINAL_DIM_OPACITY } : {}),
  }
}

/**
 * Command output as a terminal shows it — dark in both themes, monospace, its
 * colour codes drawn as colour and every other escape sequence dropped — in a
 * container that scrolls on its own, with a copy of the plain text.
 */
export function TerminalOutput({ text, label, collapsed = false }: TerminalOutputProps) {
  const view = useMemo(() => terminalOutputView(text), [text])
  const [open, setOpen] = useState(!collapsed)
  if (view.lines.length === 0) return null
  const heading = label ?? TERMINAL_OUTPUT_LABEL
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        {collapsed ? (
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-(--text-muted) hover:text-(--text-primary)"
          >
            <IconChevronRight
              className={`size-3 transition-transform ${open ? 'rotate-90' : ''}`}
            />
            {heading}
          </button>
        ) : (
          <span className="text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)">
            {heading}
          </span>
        )}
        <span className="flex-1" />
        {open ? <CopyButton text={view.plain} /> : null}
      </div>
      {open ? (
        <pre
          className="m-0 overflow-auto rounded-md border p-2.5 font-mono text-[11px] leading-relaxed whitespace-pre-wrap wrap-break-word"
          style={{
            maxHeight: TERMINAL_MAX_HEIGHT,
            background: TERMINAL_BACKGROUND,
            borderColor: TERMINAL_BORDER,
            color: TERMINAL_FOREGROUND,
          }}
        >
          {view.lines.map((spans, i) => (
            <Fragment key={i}>
              {i > 0 ? '\n' : null}
              {spans.map((span, j) => (
                <span key={j} style={spanStyle(span)}>
                  {span.text}
                </span>
              ))}
            </Fragment>
          ))}
        </pre>
      ) : null}
    </div>
  )
}

export default TerminalOutput
