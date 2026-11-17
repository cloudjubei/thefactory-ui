import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import Field from '../../primitives/Field'
import { Input } from '../../primitives/Input'
import { IconSave } from '../../icons'
import { SERVE_BUILD_LIMIT_COPY, useProjectServeSettings } from '../../../headless'
import type { ServeBuildLimitField } from '../../../headless'

export type ProjectServeSettingsPanelProps = {
  field: ServeBuildLimitField
  saving?: boolean
  saved?: boolean
  saveError?: string
  onChange: (text: string) => void
  onSave: () => void
}

/** The build limit as it stands. An empty field uses the default. */
export function ProjectServeSettingsPanel({
  field,
  saving = false,
  saved = false,
  saveError,
  onChange,
  onSave,
}: ProjectServeSettingsPanelProps) {
  const blocked = !field.dirty || Boolean(field.error) || saving
  return (
    <section className="flex max-w-2xl flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-semibold">{SERVE_BUILD_LIMIT_COPY.title}</h3>
        <p className="text-sm text-(--text-secondary)">{SERVE_BUILD_LIMIT_COPY.lead}</p>
      </div>
      {saveError ? <Alert>{saveError}</Alert> : null}
      <Field
        label={`${SERVE_BUILD_LIMIT_COPY.label} (${SERVE_BUILD_LIMIT_COPY.unit})`}
        {...(field.error ? { error: field.error } : { hint: field.hint })}
      >
        <Input
          value={field.text}
          placeholder={field.placeholder}
          invalid={Boolean(field.error)}
          inputMode="decimal"
          disabled={saving}
          aria-label={SERVE_BUILD_LIMIT_COPY.label}
          onChange={(event) => onChange(event.target.value)}
        />
      </Field>
      <div className="flex items-center justify-end gap-2">
        {saved && !field.dirty ? (
          <span className="text-sm text-(--text-secondary)">{SERVE_BUILD_LIMIT_COPY.saved}</span>
        ) : null}
        <Button
          type="button"
          variant="secondary"
          size="icon"
          title="Save"
          aria-label="Save"
          loading={saving}
          disabled={blocked}
          onClick={onSave}
        >
          <IconSave className="h-4 w-4" />
        </Button>
      </div>
    </section>
  )
}

export interface ProjectServeSettingsProps {
  projectId: string
}

/** A project's serve settings: the build limit, shown and saved on the project. */
export default function ProjectServeSettings({ projectId }: ProjectServeSettingsProps) {
  const { ready, field, saving, saveError, saved, setText, save } =
    useProjectServeSettings(projectId)
  if (!ready) return null
  return (
    <ProjectServeSettingsPanel
      field={field}
      saving={saving}
      saved={saved}
      {...(saveError ? { saveError } : {})}
      onChange={setText}
      onSave={save}
    />
  )
}
