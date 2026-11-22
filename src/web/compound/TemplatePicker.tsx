import { useTemplates, type Template } from '../../headless/contexts/TemplatesContext'
import { templateDifficultyLabel } from '../../headless/utils/createFromTemplate'
import { cn } from '../utils/cn'

export type TemplatePickerProps = {
  /** Currently selected template id (controlled). */
  value?: string
  /** Called when the user picks a template. */
  onSelect: (template: Template) => void
  className?: string
}

/**
 * Web peer for the template-picker step in the project-create wizard.
 * Lists every template returned by `GET /api/v1/templates` as a card with
 * thumbnail, difficulty and estimated time. The wizard hosting it owns the
 * surrounding chrome (back/next, header, footer).
 */
export default function TemplatePicker({ value, onSelect, className }: TemplatePickerProps) {
  const { templates, isLoaded, loadError } = useTemplates()

  if (loadError) {
    return (
      <div className={cn('text-sm text-(--text-primary)', className)} role="alert">
        Couldn&apos;t load templates: {loadError.message}
      </div>
    )
  }
  if (!isLoaded) {
    return (
      <div className={cn('text-sm text-(--text-secondary)', className)}>Loading templates…</div>
    )
  }
  if (templates.length === 0) {
    return (
      <div className={cn('text-sm text-(--text-secondary)', className)}>
        No templates available.
      </div>
    )
  }

  return (
    <ul
      className={cn('m-0 grid list-none gap-3 p-0 sm:grid-cols-2', className)}
      role="listbox"
      aria-label="Templates"
    >
      {templates.map((t) => {
        const selected = value === t.id
        const difficulty = templateDifficultyLabel(t.difficulty)
        return (
          <li key={t.id}>
            <button
              type="button"
              role="option"
              aria-selected={selected}
              onClick={() => onSelect(t)}
              className={cn(
                'flex w-full flex-col overflow-hidden rounded-lg border bg-(--surface-base) text-left transition-colors',
                selected
                  ? 'border-2 border-(--accent-primary)'
                  : 'border border-(--border-subtle) hover:border-(--border-strong)',
              )}
            >
              <div className="aspect-video w-full bg-(--surface-muted)">
                {t.thumbnailUrl ? (
                  <img src={t.thumbnailUrl} alt="" className="block size-full object-cover" />
                ) : (
                  <div
                    className="flex size-full items-center justify-center text-xs text-(--text-muted)"
                    aria-hidden
                  >
                    {t.name.slice(0, 1)}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1.5 p-3">
                <div className="text-sm font-semibold text-(--text-primary)">{t.name}</div>
                <div className="line-clamp-2 text-[13px] text-(--text-secondary)">
                  {t.description}
                </div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {difficulty ? (
                    <span className="rounded-md bg-(--surface-muted) px-1.5 py-0.5 text-[11px] text-(--text-secondary)">
                      {difficulty}
                    </span>
                  ) : null}
                  {t.estimatedTime ? (
                    <span className="rounded-md bg-(--surface-muted) px-1.5 py-0.5 text-[11px] text-(--text-secondary)">
                      {t.estimatedTime}
                    </span>
                  ) : null}
                </div>
              </div>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
