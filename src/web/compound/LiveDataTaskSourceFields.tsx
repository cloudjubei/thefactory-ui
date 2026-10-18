import {
  LIVE_DATA_FORM_LABELS,
  LIVE_DATA_FRESHNESS_UNITS,
  LIVE_DATA_TASK_SOURCE_NOTE,
} from '../../headless/utils/liveDataFormConstants'
import type { LiveDataSourceForm } from '../../headless/utils/liveDataForm'
import Alert from '../primitives/Alert'
import Field from '../primitives/Field'
import { Input } from '../primitives/Input'
import { NativeSelect } from '../primitives/NativeSelect'
import { Switch } from '../primitives/Switch'

export type LiveDataTaskSourceFieldsProps = {
  /** The edit form of a task source (`sourceToForm`, `adapterKind: 'task'`). */
  form: LiveDataSourceForm
  onChange: <K extends keyof LiveDataSourceForm>(key: K, value: LiveDataSourceForm[K]) => void
}

/**
 * The edit form's body for a source a project declares: its name and script read-only, its
 * schedule — freshness and auto-update — editable, since that is all a task source accepts.
 */
export default function LiveDataTaskSourceFields({
  form,
  onChange,
}: LiveDataTaskSourceFieldsProps) {
  return (
    <div className="flex flex-col gap-3">
      <Alert variant="info">{LIVE_DATA_TASK_SOURCE_NOTE}</Alert>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="text-(--text-secondary)">{LIVE_DATA_FORM_LABELS.name}</dt>
        <dd>{form.name}</dd>
        <dt className="text-(--text-secondary)">{LIVE_DATA_FORM_LABELS.script}</dt>
        <dd className="font-mono text-[13px] break-all">{form.taskScript}</dd>
      </dl>
      <div className="grid grid-cols-2 items-end gap-2">
        <Field label={LIVE_DATA_FORM_LABELS.freshness}>
          <Input
            type="number"
            min="1"
            value={form.freshnessValue}
            onChange={(e) => onChange('freshnessValue', e.target.value)}
          />
        </Field>
        <Field label={LIVE_DATA_FORM_LABELS.unit}>
          <NativeSelect
            value={form.freshnessUnit}
            onChange={(e) =>
              onChange('freshnessUnit', e.target.value as LiveDataSourceForm['freshnessUnit'])
            }
          >
            {LIVE_DATA_FRESHNESS_UNITS.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <Switch
        checked={form.autoUpdate}
        onCheckedChange={(v) => onChange('autoUpdate', v)}
        label={LIVE_DATA_FORM_LABELS.autoUpdate}
      />
    </div>
  )
}
