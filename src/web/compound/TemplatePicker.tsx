import { useTemplates, type Template } from '../../headless/contexts/TemplatesContext'

export type TemplatePickerProps = {
  /** Currently selected template id (controlled). */
  value?: string
  /** Called when the user picks a template. */
  onSelect: (template: Template) => void
  className?: string
}

/**
 * Web peer for the template-picker step in the project-create wizard.
 * Lists every template returned by `GET /api/v1/templates` as a card the
 * user can click. Intentionally minimal — the wizard hosting it owns the
 * surrounding chrome (back/next, header, footer).
 */
export default function TemplatePicker({ value, onSelect, className }: TemplatePickerProps) {
  const { templates, isLoaded, loadError } = useTemplates()

  if (loadError) {
    return (
      <div className={className} role="alert">
        Couldn&apos;t load templates: {loadError.message}
      </div>
    )
  }
  if (!isLoaded) {
    return <div className={className}>Loading templates…</div>
  }
  if (templates.length === 0) {
    return <div className={className}>No templates available.</div>
  }

  return (
    <ul
      className={className}
      style={{ display: 'grid', gap: 12, listStyle: 'none', padding: 0, margin: 0 }}
    >
      {templates.map((t) => {
        const selected = value === t.id
        return (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => onSelect(t)}
              aria-pressed={selected}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: 16,
                borderRadius: 8,
                border: selected ? '2px solid #2563eb' : '1px solid #e5e7eb',
                background: '#ffffff',
                cursor: 'pointer',
                font: 'inherit',
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{t.name}</div>
              <div style={{ color: '#6b7280', fontSize: 14 }}>{t.description}</div>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
