import { Text, View } from 'react-native'
import ToolArgInput from './ToolArgInput'
import { nativeLightTheme, nativeSpace } from '../../../tokens/native'

export interface ToolArgsFormProps {
  /** JSON-Schema `properties` map (from headless `getProperties`). */
  properties: Record<string, unknown>
  /** Required field names (from headless `getRequired`). */
  required: Set<string>
  /** Current argument values, keyed by property name. */
  values: Record<string, unknown>
  /** Receives the raw input value for a property — host coerces + stores. */
  onChange: (key: string, value: unknown, schema: unknown) => void
}

/**
 * Native peer of the typed argument editor inside web's `ToolPanel`. Renders
 * one `ToolArgInput` per schema property; tools with no properties show a
 * placeholder. Schemaless tools (no `properties`) are handled by the host's
 * raw-JSON fallback, not this form.
 */
export default function ToolArgsForm({
  properties,
  required,
  values,
  onChange,
}: ToolArgsFormProps) {
  const entries = Object.entries(properties)
  if (entries.length === 0) {
    return (
      <Text style={{ fontSize: 13, color: nativeLightTheme.text.muted }}>
        This tool has no arguments.
      </Text>
    )
  }
  return (
    <View style={{ gap: nativeSpace[4] }}>
      {entries.map(([key, schema]) => (
        <ToolArgInput
          key={key}
          name={key}
          schema={schema}
          required={required.has(key)}
          value={values[key]}
          onChange={(v) => onChange(key, v, schema)}
        />
      ))}
    </View>
  )
}
