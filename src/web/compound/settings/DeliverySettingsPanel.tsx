import type { ReactNode } from 'react'
import {
  DELIVERY_SETTINGS_COPY,
  type DeliveryFormDraft,
  type DeliveryMergeChoice,
  type DeliveryPrFirstChoice,
  type DeliverySettingsView,
} from '../../../headless'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import Field from '../../primitives/Field'
import { Input } from '../../primitives/Input'
import SegmentedControl from '../../primitives/SegmentedControl'

function ChoiceField({
  label,
  hint,
  children,
}: {
  label: string
  hint: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium">{label}</span>
      {children}
      <span className="text-xs opacity-60">{hint}</span>
    </div>
  )
}

export interface DeliverySettingsPanelProps {
  /** What the form shows; nothing until the owner is read. */
  view: DeliverySettingsView | undefined
  draft: DeliveryFormDraft
  /** Why the last save failed. */
  error: string | null
  onChange: (next: DeliveryFormDraft) => void
  /** Save the form; resolves `true` when kept. */
  onSave: () => Promise<boolean>
  onReset: () => void
}

/**
 * A group's or a project's delivery in its Settings: the branch name template
 * with the name it makes, the base branch, the pull request title template
 * with the title it makes, pull request first, and the merge method. Native peer: `native/compound/settings/DeliverySettingsPanel`.
 */
export default function DeliverySettingsPanel({
  view,
  draft,
  error,
  onChange,
  onSave,
  onReset,
}: DeliverySettingsPanelProps) {
  return (
    <section className="flex max-w-2xl flex-col gap-3">
      <div className="flex min-w-0 flex-col gap-1">
        <h3 className="text-base font-semibold">{DELIVERY_SETTINGS_COPY.heading}</h3>
        {view ? <p className="text-sm text-(--text-secondary)">{view.intro}</p> : null}
      </div>
      {!view ? (
        <p className="text-sm text-(--text-secondary)">{DELIVERY_SETTINGS_COPY.loading}</p>
      ) : (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            void onSave()
          }}
        >
          {error ? <Alert>{error}</Alert> : null}
          <Field
            label={DELIVERY_SETTINGS_COPY.templateField}
            hint={DELIVERY_SETTINGS_COPY.templateHint}
            error={view.problems.branchTemplate}
          >
            <Input
              value={draft.branchTemplate}
              disabled={!view.editable}
              placeholder={view.templatePlaceholder}
              spellCheck={false}
              className="font-mono"
              onChange={(e) => onChange({ ...draft, branchTemplate: e.target.value })}
            />
          </Field>
          {'branch' in view.preview ? (
            <div className="-mt-1 flex min-w-0 items-center gap-2 text-[12px] text-(--text-secondary)">
              <span className="shrink-0">{DELIVERY_SETTINGS_COPY.previewLabel}</span>
              <code className="min-w-0 truncate rounded bg-(--surface-sunken) px-1.5 py-0.5 font-mono text-(--text-primary)">
                {view.preview.branch}
              </code>
            </div>
          ) : null}
          <Field
            label={DELIVERY_SETTINGS_COPY.baseField}
            hint={DELIVERY_SETTINGS_COPY.baseHint}
            error={view.problems.baseBranch}
          >
            <Input
              value={draft.baseBranch}
              disabled={!view.editable}
              placeholder={view.basePlaceholder}
              spellCheck={false}
              className="font-mono"
              onChange={(e) => onChange({ ...draft, baseBranch: e.target.value })}
            />
          </Field>
          <Field
            label={DELIVERY_SETTINGS_COPY.titleField}
            hint={DELIVERY_SETTINGS_COPY.titleHint}
            error={view.problems.prTitleTemplate}
          >
            <Input
              value={draft.prTitleTemplate}
              disabled={!view.editable}
              placeholder={view.titlePlaceholder}
              spellCheck={false}
              className="font-mono"
              onChange={(e) => onChange({ ...draft, prTitleTemplate: e.target.value })}
            />
          </Field>
          <div className="-mt-1 flex min-w-0 items-center gap-2 text-[12px] text-(--text-secondary)">
            <span className="shrink-0">{DELIVERY_SETTINGS_COPY.previewLabel}</span>
            <span className="min-w-0 truncate text-(--text-primary)">{view.titlePreview}</span>
          </div>
          <ChoiceField
            label={DELIVERY_SETTINGS_COPY.prFirstField}
            hint={DELIVERY_SETTINGS_COPY.prFirstHint}
          >
            <SegmentedControl
              ariaLabel={DELIVERY_SETTINGS_COPY.prFirstField}
              size="sm"
              className="self-start"
              value={draft.prFirst}
              options={view.prFirstOptions}
              onChange={(prFirst) =>
                view.editable && onChange({ ...draft, prFirst: prFirst as DeliveryPrFirstChoice })
              }
            />
          </ChoiceField>
          <ChoiceField
            label={DELIVERY_SETTINGS_COPY.mergeField}
            hint={DELIVERY_SETTINGS_COPY.mergeHint}
          >
            <SegmentedControl
              ariaLabel={DELIVERY_SETTINGS_COPY.mergeField}
              size="sm"
              className="self-start"
              value={draft.mergeMethod}
              options={view.mergeOptions}
              onChange={(mergeMethod) =>
                view.editable &&
                onChange({ ...draft, mergeMethod: mergeMethod as DeliveryMergeChoice })
              }
            />
          </ChoiceField>
          {view.editable ? (
            <div className="flex items-center justify-end gap-2">
              {view.dirty ? (
                <Button type="button" variant="ghost" size="sm" onClick={onReset}>
                  {DELIVERY_SETTINGS_COPY.reset}
                </Button>
              ) : null}
              <Button type="submit" size="sm" disabled={!view.canSave}>
                {DELIVERY_SETTINGS_COPY.save}
              </Button>
            </div>
          ) : null}
        </form>
      )}
    </section>
  )
}
