import { useState } from 'react'
import {
  SIGN_OFF_OUTPUT_COPY,
  SIGN_OFF_OUTPUT_EMPTY_DRAFT,
  SIGN_OFF_OUTPUT_PROBLEMS,
  SIGN_OFF_OUTPUTS_DEFAULT_LAYOUT,
  signOffOutputDraftOf,
  signOffOutputDraftProblem,
  signOffOutputOfDraft,
  type SignOffOutputFormDraft,
  type SignOffOutputSettingView,
  type SignOffOutputsLayout,
  type SignOffTemplateChoice,
} from '../../../headless'
import type { SignOffOutputDefinition } from '../../../headless/api'
import { IconChevronDown } from '../../icons/IconChevronDown'
import { IconChevronRight } from '../../icons/IconChevronRight'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import Field from '../../primitives/Field'
import { Input } from '../../primitives/Input'
import { ConfirmDialog, Modal } from '../../primitives/Modal'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../primitives/Select'
import Surface from '../../primitives/Surface'
import { Switch } from '../../primitives/Switch'

export interface SignOffOutputSettingsPanelProps {
  /** What to show of each output; nothing is listed until they are read. */
  views: SignOffOutputSettingView[] | undefined
  /** The outputs kept here, which a new one must not repeat. */
  own: readonly SignOffOutputDefinition[]
  /** The notes a template can be. */
  choices: readonly SignOffTemplateChoice[]
  /** What to say when there is no note to choose. */
  noNotes: string
  /** Who gets them. */
  intro: string
  canAdd: boolean
  /** Why the last change failed. */
  error: string | null
  busy: boolean
  /** Save an output, in the place of the one with key `editing`; resolves `true` when kept. */
  onSave: (output: SignOffOutputDefinition, editing: string | undefined) => Promise<boolean>
  /** Remove the output with this key; resolves `true` when it is gone. */
  onRemove: (key: string) => Promise<boolean>
  /** How the outputs are laid out. */
  layout?: SignOffOutputsLayout
  /** An output to show opened first. */
  initialOpenKey?: string
  /** Start on the add form, with this in it. */
  initialDraft?: SignOffOutputFormDraft
  /** Start on the confirm to remove this output. */
  initialRemovingKey?: string
}

function OutputSummary({ view }: { view: SignOffOutputSettingView }) {
  return (
    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
      <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
        <span className="max-w-full min-w-0 truncate text-sm font-medium">{view.label}</span>
        {view.sourceLabel || view.replaces ? (
          <span className="shrink-0 rounded-full border border-(--border-default) px-1.5 text-[10px] text-(--text-secondary)">
            {view.sourceLabel ?? view.replaces}
          </span>
        ) : null}
      </span>
      <span className="truncate text-[12px] text-(--text-secondary)">
        {view.templateLabel} · {view.shapeLabel}
      </span>
    </span>
  )
}

function OutputFields({
  draft,
  problem,
  choices,
  noNotes,
  onChange,
}: {
  draft: SignOffOutputFormDraft
  problem: string | undefined
  choices: readonly SignOffTemplateChoice[]
  noNotes: string
  onChange: (next: SignOffOutputFormDraft) => void
}) {
  const missing =
    draft.templateNoteId !== '' && !choices.some((choice) => choice.id === draft.templateNoteId)
  return (
    <div className="flex flex-col gap-3">
      <Field
        label={SIGN_OFF_OUTPUT_COPY.labelField}
        hint={SIGN_OFF_OUTPUT_COPY.labelHint}
        error={problem === SIGN_OFF_OUTPUT_PROBLEMS.repeated ? problem : undefined}
      >
        <Input
          value={draft.label}
          onChange={(e) => onChange({ ...draft, label: e.target.value })}
          placeholder={SIGN_OFF_OUTPUT_COPY.labelPlaceholder}
        />
      </Field>
      <Field
        label={SIGN_OFF_OUTPUT_COPY.templateField}
        hint={choices.length > 0 ? SIGN_OFF_OUTPUT_COPY.templateHint : noNotes}
      >
        <Select
          value={draft.templateNoteId}
          onValueChange={(templateNoteId) => {
            if (templateNoteId) onChange({ ...draft, templateNoteId })
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder={SIGN_OFF_OUTPUT_COPY.templatePlaceholder} />
          </SelectTrigger>
          <SelectContent>
            {choices.map((choice) => (
              <SelectItem key={choice.id} value={choice.id}>
                {choice.label}
              </SelectItem>
            ))}
            {missing ? (
              <SelectItem value={draft.templateNoteId}>
                {SIGN_OFF_OUTPUT_COPY.deletedNote}
              </SelectItem>
            ) : null}
          </SelectContent>
        </Select>
      </Field>
      <div className="flex flex-col gap-1">
        <Switch
          checked={draft.perRepo}
          onCheckedChange={(perRepo) => onChange({ ...draft, perRepo })}
          label={SIGN_OFF_OUTPUT_COPY.perRepoField}
        />
        <span className="text-xs opacity-60">{SIGN_OFF_OUTPUT_COPY.perRepoHint}</span>
      </div>
    </div>
  )
}

/** One output's form, or what a project gets from its group, read-only. */
function OutputBody({
  view,
  own,
  choices,
  noNotes,
  busy,
  error,
  onSaved,
  onSave,
  onRemove,
}: {
  view: SignOffOutputSettingView
  own: readonly SignOffOutputDefinition[]
  choices: readonly SignOffTemplateChoice[]
  noNotes: string
  busy: boolean
  error: string | null
  onSaved: () => void
  onSave: SignOffOutputSettingsPanelProps['onSave']
  onRemove: (key: string) => void
}) {
  const [draft, setDraft] = useState(signOffOutputDraftOf(view.definition))
  if (!view.editable) {
    return (
      <div className="flex flex-col gap-2 text-sm">
        <span>
          {SIGN_OFF_OUTPUT_COPY.templateField}: {view.templateLabel}
        </span>
        <span>{view.shapeLabel}</span>
        {view.templateProblem ? <Alert>{view.templateProblem}</Alert> : null}
        <span className="text-[12px] text-(--text-secondary)">
          {SIGN_OFF_OUTPUT_COPY.changeOnGroup(view.groupTitle ?? '')}
        </span>
      </div>
    )
  }
  const problem = signOffOutputDraftProblem(draft, { outputs: own, choices, editing: view.key })
  const save = async () => {
    if (problem) return
    if (await onSave(signOffOutputOfDraft(draft), view.key)) onSaved()
  }
  return (
    <div className="flex flex-col gap-3">
      {error ? <Alert>{error}</Alert> : null}
      {view.templateProblem ? <Alert>{view.templateProblem}</Alert> : null}
      <OutputFields
        draft={draft}
        problem={problem}
        choices={choices}
        noNotes={noNotes}
        onChange={setDraft}
      />
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" onClick={() => onRemove(view.key)}>
          {SIGN_OFF_OUTPUT_COPY.remove}
        </Button>
        <Button onClick={() => void save()} loading={busy} disabled={problem !== undefined || busy}>
          {SIGN_OFF_OUTPUT_COPY.save}
        </Button>
      </div>
    </div>
  )
}

/**
 * A project's or a group's sign-off outputs: the documents a run writes beside its
 * proof. Add, edit and remove them, choosing the template note and whether each
 * is per repo. A project also lists what it gets from its main group, read-only.
 * `SignOffOutputSettings` reads and changes them. Native peer:
 * `native/compound/settings/SignOffOutputSettingsPanel`.
 */
export default function SignOffOutputSettingsPanel({
  views,
  own,
  choices,
  noNotes,
  intro,
  canAdd,
  error,
  busy,
  onSave,
  onRemove,
  layout = SIGN_OFF_OUTPUTS_DEFAULT_LAYOUT,
  initialOpenKey,
  initialDraft,
  initialRemovingKey,
}: SignOffOutputSettingsPanelProps) {
  const [draft, setDraft] = useState<SignOffOutputFormDraft | undefined>(initialDraft)
  const [openKey, setOpenKey] = useState<string | undefined>(initialOpenKey)
  const [removingKey, setRemovingKey] = useState<string | undefined>(initialRemovingKey)
  const opened = views?.find((view) => view.key === openKey)
  const removing = views?.find((view) => view.key === removingKey)
  const problem = draft ? signOffOutputDraftProblem(draft, { outputs: own, choices }) : undefined

  const saveDraft = async () => {
    if (!draft || problem) return
    if (await onSave(signOffOutputOfDraft(draft), undefined)) setDraft(undefined)
  }

  const body = (view: SignOffOutputSettingView) => (
    <OutputBody
      key={view.key}
      view={view}
      own={own}
      choices={choices}
      noNotes={noNotes}
      busy={busy}
      error={error}
      onSaved={() => setOpenKey(undefined)}
      onSave={onSave}
      onRemove={setRemovingKey}
    />
  )

  return (
    <section className="flex max-w-2xl flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="text-base font-semibold">{SIGN_OFF_OUTPUT_COPY.heading}</h3>
          <p className="text-sm text-(--text-secondary)">{intro}</p>
        </div>
        {canAdd ? (
          <Button
            variant="secondary"
            size="sm"
            className="shrink-0"
            onClick={() => setDraft(SIGN_OFF_OUTPUT_EMPTY_DRAFT)}
          >
            {SIGN_OFF_OUTPUT_COPY.add}
          </Button>
        ) : null}
      </div>

      {error && !draft && !opened ? <Alert>{error}</Alert> : null}

      {!views ? (
        <p className="text-sm text-(--text-secondary)">{SIGN_OFF_OUTPUT_COPY.loading}</p>
      ) : views.length === 0 ? (
        canAdd ? (
          <p className="text-sm text-(--text-secondary)">{SIGN_OFF_OUTPUT_COPY.noneYet}</p>
        ) : null
      ) : layout === 'cards' ? (
        <div className="flex flex-col gap-2">
          {views.map((view) => (
            <Surface key={view.key} className="flex flex-col gap-3 p-3">
              <OutputSummary view={view} />
              {body(view)}
            </Surface>
          ))}
        </div>
      ) : (
        <ul className="divide-y divide-(--border-subtle) rounded-md border border-(--border-subtle)">
          {views.map((view) => {
            const unfolded = layout === 'folds' && view.key === openKey
            return (
              <li key={view.key}>
                <button
                  type="button"
                  onClick={() => setOpenKey(unfolded ? undefined : view.key)}
                  {...(layout === 'folds' ? { 'aria-expanded': unfolded } : {})}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-(--surface-raised)"
                >
                  <OutputSummary view={view} />
                  {view.templateProblem ? (
                    <span className="badge badge--soft badge--sm badge--onhold shrink-0">
                      {SIGN_OFF_OUTPUT_COPY.noTemplate}
                    </span>
                  ) : null}
                  {layout === 'folds' ? (
                    <IconChevronDown
                      className={`h-4 w-4 shrink-0 text-(--text-muted) ${unfolded ? 'rotate-180' : ''}`}
                    />
                  ) : (
                    <IconChevronRight className="h-4 w-4 shrink-0 text-(--text-muted)" />
                  )}
                </button>
                {unfolded ? (
                  <div className="border-t border-(--border-subtle) p-3">{body(view)}</div>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}

      {layout === 'rows' && opened ? (
        <Modal isOpen onClose={() => setOpenKey(undefined)} title={opened.label}>
          {body(opened)}
        </Modal>
      ) : null}

      {draft ? (
        <Modal
          isOpen
          onClose={() => setDraft(undefined)}
          title={SIGN_OFF_OUTPUT_COPY.add}
          footer={
            <div className="flex w-full items-center justify-end gap-2">
              <Button variant="ghost" onClick={() => setDraft(undefined)}>
                {SIGN_OFF_OUTPUT_COPY.cancel}
              </Button>
              <Button
                onClick={() => void saveDraft()}
                loading={busy}
                disabled={problem !== undefined || busy}
              >
                {SIGN_OFF_OUTPUT_COPY.add}
              </Button>
            </div>
          }
        >
          <div className="flex flex-col gap-3">
            {error ? <Alert>{error}</Alert> : null}
            <OutputFields
              draft={draft}
              problem={problem}
              choices={choices}
              noNotes={noNotes}
              onChange={setDraft}
            />
          </div>
        </Modal>
      ) : null}

      {removing ? (
        <ConfirmDialog
          isOpen
          onClose={() => setRemovingKey(undefined)}
          title={`${SIGN_OFF_OUTPUT_COPY.remove} ${removing.label}`}
          description={SIGN_OFF_OUTPUT_COPY.removeConfirm(removing.label)}
          confirmLabel={SIGN_OFF_OUTPUT_COPY.remove}
          destructive
          onConfirm={async () => {
            if (await onRemove(removing.key)) setOpenKey(undefined)
            setRemovingKey(undefined)
          }}
        />
      ) : null}
    </section>
  )
}
