import type { FormEvent, MutableRefObject } from 'react'
import {
  useCreateFromTemplateForm,
  type UseCreateFromTemplateForm,
  type UseCreateFromTemplateFormOptions,
} from '../../headless/hooks/useCreateFromTemplateForm'
import {
  Alert,
  Field,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
} from '..'
import ProjectGithubRepoField from './projects/ProjectGithubRepoField'
import TemplatePicker from './TemplatePicker'

export type CreateFromTemplateFormProps = UseCreateFromTemplateFormOptions & {
  /** Form element id so a host footer button can submit via `form={formId}`. */
  formId?: string
  className?: string
  /**
   * Latest form controller for a host footer (Abort while submitting, disable
   * Create until `canSubmit`). Updated every render; read via `.current`.
   */
  formRef?: MutableRefObject<UseCreateFromTemplateForm | null>
}

/**
 * Shared create-from-template wizard: template cards, name, collision-checked
 * id, optional MAIN group, optional GitHub create-repo, and fork progress.
 * Driven by {@link useCreateFromTemplateForm}.
 */
export default function CreateFromTemplateForm({
  formId = 'create-from-template-form',
  className,
  formRef,
  ...opts
}: CreateFromTemplateFormProps) {
  const form = useCreateFromTemplateForm(opts)
  if (formRef) formRef.current = form

  const {
    template,
    setTemplate,
    name,
    setName,
    id,
    setId,
    idAvailability,
    mainGroupId,
    setMainGroupId,
    mainGroups,
    github,
    errors,
    submitting,
    progressLabel,
    submit,
    copy,
  } = form

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    void submit()
  }

  const idHint =
    idAvailability === 'taken'
      ? copy.idTakenHint
      : idAvailability === 'available'
        ? copy.idAvailableHint
        : copy.idHint

  return (
    <form id={formId} onSubmit={onSubmit} className={className ?? 'flex flex-col gap-4'}>
      {submitting ? (
        <div
          className="flex flex-col items-center justify-center gap-3 rounded-lg border border-(--border-subtle) bg-(--surface-muted) px-4 py-8"
          role="status"
          aria-live="polite"
        >
          <Spinner size={28} />
          <div className="text-sm font-medium text-(--text-primary)">{copy.creating}</div>
          {progressLabel ? (
            <div className="text-xs text-(--text-secondary)">{progressLabel}</div>
          ) : null}
        </div>
      ) : (
        <>
          <div>
            <div className="mb-2 text-sm font-medium">{copy.pickTemplate}</div>
            <TemplatePicker value={template?.id} onSelect={setTemplate} />
          </div>

          <Field label={copy.nameLabel} hint={copy.nameHint}>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My investments"
              disabled={!template}
            />
          </Field>

          <Field
            label={copy.idLabel}
            hint={idHint}
            error={idAvailability === 'taken' ? copy.idTakenHint : undefined}
          >
            <Input
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="my-investments"
              spellCheck={false}
              disabled={!template}
              aria-invalid={idAvailability === 'taken' || undefined}
            />
          </Field>

          {mainGroups.length > 0 ? (
            <Field label={copy.groupLabel}>
              <Select
                value={mainGroupId ?? '__none__'}
                onValueChange={(v) => setMainGroupId(v === '__none__' ? null : v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={copy.groupNone} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{copy.groupNone}</SelectItem>
                  {mainGroups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          ) : null}

          <ProjectGithubRepoField github={github} />
        </>
      )}

      {errors.length > 0 ? (
        <Alert variant="error">
          <ul className="list-disc pl-5">
            {errors.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </Alert>
      ) : null}
    </form>
  )
}
