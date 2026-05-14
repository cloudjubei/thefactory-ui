import { useState, type ReactNode } from 'react'

import SegmentedControl from '../../primitives/SegmentedControl'
import Spinner from '../../primitives/Spinner'
import { Button } from '../../primitives/Button'
import { IconSave } from '../../icons'

import { MARKDOWN_PANE_OPTIONS, type MarkdownEditorPaneView } from '../MarkdownEditor'

// Reuses the same three-way pane control as MarkdownEditor — the underlying
// "edit / both / preview" semantics carry over verbatim, so we treat its
// view union as a generic editor-pane view type.
export type HtmlEditorPaneView = MarkdownEditorPaneView

export type HtmlEditorProps = {
  value: string
  onChange: (next: string) => void
  /** Optional title shown left of the pane-visibility switch (typically the file name). */
  title?: ReactNode
  /** When set, surfaces the save button. Disabled until `isDirty` is true. */
  onSave?: () => void | Promise<void>
  isDirty?: boolean
  /** Replaces the editor body with a centred spinner. */
  loading?: boolean
  /** Initial pane visibility. Defaults to `'both'`. */
  initialView?: HtmlEditorPaneView
  /** Controlled pane visibility (mirrors MarkdownEditor). */
  view?: HtmlEditorPaneView
  onViewChange?: (next: HtmlEditorPaneView) => void
  /** Skip rendering the internal header (host provides its own). */
  hideHeader?: boolean
}

export default function HtmlEditor({
  value,
  onChange,
  title,
  onSave,
  isDirty = false,
  loading = false,
  initialView = 'both',
  view: controlledView,
  onViewChange,
  hideHeader = false,
}: HtmlEditorProps) {
  const [internalView, setInternalView] = useState<HtmlEditorPaneView>(initialView)
  const view = controlledView ?? internalView
  const setView = (next: HtmlEditorPaneView) => {
    if (onViewChange) onViewChange(next)
    if (controlledView === undefined) setInternalView(next)
  }

  const showEdit = view === 'edit' || view === 'both'
  const showPreview = view === 'preview' || view === 'both'

  const handleSave = async () => {
    if (!onSave || !isDirty) return
    await onSave()
  }

  return (
    <div className="flex flex-col h-full">
      {!hideHeader && (
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
              onChange={(v) => setView(v as HtmlEditorPaneView)}
              options={MARKDOWN_PANE_OPTIONS.map((o) => ({
                value: o.value,
                label: o.label,
                icon: o.icon,
              }))}
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
      )}

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
              <iframe
                title="HTML preview"
                srcDoc={value}
                // `sandbox=""` (no flags) is the strictest setting: no JS, no
                // form submission, no top-navigation, unique origin. This
                // matches how rehype-sanitize behaves for Markdown previews
                // — we render the markup, we don't run the page.
                sandbox=""
                referrerPolicy="no-referrer"
                className="flex-1 w-full border-0"
                style={{ background: 'white' }}
              />
            </section>
          )}
        </div>
      )}
    </div>
  )
}
