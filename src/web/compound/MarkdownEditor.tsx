import { useState, type ReactNode } from 'react'
import Markdown from './Markdown'
import { Button } from '../primitives/Button'
import SegmentedControl from '../primitives/SegmentedControl'
import Spinner from '../primitives/Spinner'
import { IconSave } from '../icons/IconSave'

// Two-pane Markdown editor shell: textarea on the left, rendered preview on
// the right, with a header that has per-pane labels, a pane-visibility
// SegmentedControl, and an icon save button.
//
// Stateless w.r.t. file I/O — consumers (overseer-local, overseer-web) own
// the load / write-back and supply `value` + `onChange` + `onSave` + `isDirty`.
// The component only owns the pane-visibility state.

export type MarkdownEditorPaneView = 'edit' | 'both' | 'preview'

export type MarkdownEditorProps = {
  value: string
  onChange: (next: string) => void
  /**
   * Optional title shown left of the pane-visibility switch (typically the
   * file name). When omitted, the header just has the per-pane labels +
   * controls.
   */
  title?: ReactNode
  /**
   * When set, surfaces the save button. The button is disabled until
   * `isDirty` is true.
   */
  onSave?: () => void | Promise<void>
  isDirty?: boolean
  /** Replaces the editor body with a centred spinner. */
  loading?: boolean
  /** Forwarded to `<Markdown>` — required to render raw HTML in `.md` files. */
  allowHtml?: boolean
  /** Initial pane visibility. Defaults to `'both'`. */
  initialView?: MarkdownEditorPaneView
}

const PANE_OPTIONS = [
  {
    value: 'edit',
    label: 'Edit only',
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
        <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" stroke="currentColor" />
        <rect x="1.5" y="2.5" width="6.5" height="11" fill="currentColor" opacity="0.6" />
      </svg>
    ),
  },
  {
    value: 'both',
    label: 'Both panes',
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
        <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" stroke="currentColor" />
        <line x1="8" y1="2.5" x2="8" y2="13.5" stroke="currentColor" />
      </svg>
    ),
  },
  {
    value: 'preview',
    label: 'Preview only',
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
        <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" stroke="currentColor" />
        <rect x="8" y="2.5" width="6.5" height="11" fill="currentColor" opacity="0.6" />
      </svg>
    ),
  },
] as const

export default function MarkdownEditor({
  value,
  onChange,
  title,
  onSave,
  isDirty = false,
  loading = false,
  allowHtml,
  initialView = 'both',
}: MarkdownEditorProps) {
  const [view, setView] = useState<MarkdownEditorPaneView>(initialView)

  const showEdit = view === 'edit' || view === 'both'
  const showPreview = view === 'preview' || view === 'both'

  const handleSave = async () => {
    if (!onSave || !isDirty) return
    await onSave()
  }

  return (
    <div className="flex flex-col h-full">
      <header
        className="flex items-center gap-3 px-3 py-2 border-b shrink-0 text-xs"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex flex-1 min-w-0 items-center gap-2">
          {title && (
            <span className="truncate font-semibold text-(--text-primary)">{title}</span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <SegmentedControl
            size="sm"
            ariaLabel="Pane visibility"
            value={view}
            onChange={(v) => setView(v as MarkdownEditorPaneView)}
            options={PANE_OPTIONS.map((o) => ({ value: o.value, label: o.label, icon: o.icon }))}
            hideLabels
          />
          {onSave && (
            <Button
              variant="secondary"
              size="icon"
              onClick={handleSave}
              disabled={!isDirty}
              aria-label="Save"
              title={isDirty ? 'Save (Cmd/Ctrl+S)' : 'No unsaved changes'}
            >
              <IconSave className="w-4 h-4" />
            </Button>
          )}
        </div>
      </header>

      {loading ? (
        <div className="flex-1 grid place-items-center">
          <Spinner size={20} label="Loading…" />
        </div>
      ) : (
        <div className="flex flex-1 min-h-0">
          {showEdit && (
            <section
              className={['flex flex-col min-w-0', showPreview ? 'w-1/2 border-r' : 'flex-1']
                .filter(Boolean)
                .join(' ')}
              style={showPreview ? { borderColor: 'var(--border-subtle)' } : undefined}
            >
              <div
                className="px-3 py-1 border-b shrink-0 text-[11px] uppercase tracking-wide text-(--text-muted)"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                Edit view
              </div>
              <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                spellCheck={false}
                className="flex-1 w-full resize-none border-0 outline-none p-3 bg-transparent text-(--text-primary) font-mono text-[13px] leading-6"
              />
            </section>
          )}

          {showPreview && (
            <section className={['flex flex-col min-w-0', showEdit ? 'w-1/2' : 'flex-1'].join(' ')}>
              <div
                className="px-3 py-1 border-b shrink-0 text-[11px] uppercase tracking-wide text-(--text-muted)"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                Preview view
              </div>
              <div className="flex-1 overflow-auto p-3">
                <Markdown text={value || ''} allowHtml={allowHtml} />
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
