import { Text, View } from 'react-native'
import Field from '../../primitives/Field'
import { Input } from '../../primitives/Input'
import { Switch } from '../../primitives/Switch'
import { Textarea } from '../../primitives/Textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../primitives/Select'
import { nativeLightStatus, nativeLightTheme } from '../../../tokens/native'

export interface ToolArgInputProps {
  name: string
  /** The JSON-Schema fragment for this single property. */
  schema: unknown
  required: boolean
  value: unknown
  /** Receives the raw input value — host coerces via headless `coerceValue`. */
  onChange: (value: unknown) => void
}

/**
 * Native peer of web `ToolsView`'s `ArgInput`. Renders one typed input for a
 * JSON-Schema property: string → text, integer/number → numeric text,
 * boolean → switch, enum → select, array → comma-separated text, object →
 * JSON textarea. Required fields carry a red `*`.
 */
export default function ToolArgInput({
  name,
  schema,
  required,
  value,
  onChange,
}: ToolArgInputProps) {
  const s = (schema && typeof schema === 'object' ? schema : {}) as Record<string, unknown>
  const type = (s.type as string | undefined) ?? 'string'
  const description = (s.description as string | undefined) ?? name
  const label = (
    <Text>
      {description}
      {required ? <Text style={{ color: nativeLightStatus.stuck.bg }}> *</Text> : null}
    </Text>
  )

  if (Array.isArray(s.enum)) {
    return (
      <Field label={label}>
        <Select
          value={typeof value === 'string' ? value : ''}
          onValueChange={(v) => onChange(v || undefined)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select…" />
          </SelectTrigger>
          <SelectContent>
            {(s.enum as unknown[]).map((opt) => (
              <SelectItem key={String(opt)} value={String(opt)}>
                {String(opt)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    )
  }

  if (type === 'boolean') {
    return (
      <Field label={label}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Switch checked={value === true} onCheckedChange={(c) => onChange(c)} />
          <Text style={{ fontSize: 13, color: nativeLightTheme.text.muted }}>
            {value === true ? 'true' : 'false'}
          </Text>
        </View>
      </Field>
    )
  }

  if (type === 'array') {
    return (
      <Field label={label} hint="Enter a comma-separated list.">
        <Input
          value={Array.isArray(value) ? (value as unknown[]).join(', ') : ''}
          onChangeText={onChange}
          placeholder="value1, value2, …"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </Field>
    )
  }

  if (type === 'object') {
    return (
      <Field label={label} hint="Provide a valid JSON object.">
        <Textarea
          rows={5}
          value={
            typeof value === 'string' ? value : value ? JSON.stringify(value, null, 2) : ''
          }
          onChangeText={onChange}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </Field>
    )
  }

  if (type === 'integer' || type === 'number') {
    return (
      <Field label={label}>
        <Input
          keyboardType="numeric"
          value={typeof value === 'number' ? String(value) : ((value as string) ?? '')}
          onChangeText={onChange}
        />
      </Field>
    )
  }

  return (
    <Field label={label}>
      <Input
        value={typeof value === 'string' ? value : ((value as string) ?? '')}
        onChangeText={onChange}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </Field>
  )
}
