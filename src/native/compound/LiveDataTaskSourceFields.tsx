import { Text, View } from 'react-native'
import { nativeFontFamilies } from '../../tokens/native'
import {
  LIVE_DATA_FORM_LABELS,
  LIVE_DATA_FRESHNESS_UNITS,
  LIVE_DATA_TASK_SOURCE_NOTE,
} from '../../headless/utils/liveDataFormConstants'
import type { LiveDataSourceForm } from '../../headless/utils/liveDataForm'
import { useNativeTheme } from '../hooks/useNativeTheme'
import Alert from '../primitives/Alert'
import Field from '../primitives/Field'
import { Input } from '../primitives/Input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../primitives/Select'
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
  const { theme } = useNativeTheme()
  const label = { fontSize: 13, color: theme.text.secondary }
  const value = { fontSize: 14, color: theme.text.primary }
  return (
    <View style={{ gap: 12 }}>
      <Alert variant="info">{LIVE_DATA_TASK_SOURCE_NOTE}</Alert>
      <View style={{ gap: 4 }}>
        <Text style={label}>{LIVE_DATA_FORM_LABELS.name}</Text>
        <Text style={value}>{form.name}</Text>
        <Text style={label}>{LIVE_DATA_FORM_LABELS.script}</Text>
        <Text style={[value, { fontFamily: nativeFontFamilies.mono, fontSize: 13 }]} selectable>
          {form.taskScript}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Field label={LIVE_DATA_FORM_LABELS.freshness}>
            <Input
              value={form.freshnessValue}
              onChangeText={(v) => onChange('freshnessValue', v)}
              keyboardType="number-pad"
            />
          </Field>
        </View>
        <View style={{ flex: 1 }}>
          <Field label={LIVE_DATA_FORM_LABELS.unit}>
            <Select
              value={form.freshnessUnit}
              onValueChange={(v) =>
                onChange('freshnessUnit', v as LiveDataSourceForm['freshnessUnit'])
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={LIVE_DATA_FORM_LABELS.unit} />
              </SelectTrigger>
              <SelectContent>
                {LIVE_DATA_FRESHNESS_UNITS.map((unit) => (
                  <SelectItem key={unit} value={unit}>
                    {unit}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={value}>{LIVE_DATA_FORM_LABELS.autoUpdate}</Text>
        <Switch
          checked={form.autoUpdate}
          onCheckedChange={(v) => onChange('autoUpdate', v)}
          accessibilityLabel={LIVE_DATA_FORM_LABELS.autoUpdate}
        />
      </View>
    </View>
  )
}
