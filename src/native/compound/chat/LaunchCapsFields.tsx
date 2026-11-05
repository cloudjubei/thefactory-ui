import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import { LAUNCH_CAPS_COPY, type LaunchCapFieldView, type LaunchCapKey } from '../../../headless'
import { nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconChevron } from '../../icons'
import Field from '../../primitives/Field'
import { Input } from '../../primitives/Input'

export type LaunchCapsFieldsProps = {
  fields: readonly LaunchCapFieldView[]
  /** The limits set, in short: what the section says while folded. */
  summary: string
  /** The launch's worst case, shown folded or not. */
  worstCase?: string
  /** A word under the fields: a group's limits, each project's defaults. */
  note?: string
  busy?: boolean
  onChange: (key: LaunchCapKey, text: string) => void
}

/** One limit's field, the same on the launch card and in the project editor. */
export function LaunchCapField({
  field,
  busy,
  onChange,
}: {
  field: LaunchCapFieldView
  busy: boolean
  onChange: (text: string) => void
}) {
  return (
    <Field
      label={`${field.label} (${field.unit})`}
      hint={field.fromProject ? LAUNCH_CAPS_COPY.fromProject : field.hint}
      {...(field.error ? { error: field.error } : {})}
    >
      <Input
        value={field.text}
        keyboardType="decimal-pad"
        disabled={busy}
        {...(field.placeholder ? { placeholder: field.placeholder } : {})}
        accessibilityLabel={field.label}
        onChangeText={onChange}
      />
    </Field>
  )
}

/** Native peer of the web `LaunchCapsFields`: a launch's limits, folded to one line. */
export default function LaunchCapsFields({
  fields,
  summary,
  worstCase,
  note,
  busy = false,
  onChange,
}: LaunchCapsFieldsProps) {
  const { theme } = useNativeTheme()
  const invalid = fields.some((field) => field.error)
  const [open, setOpen] = useState(false)
  const shown = open || invalid
  return (
    <View style={{ gap: nativeSpace[2] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: shown }}
        onPress={() => setOpen(!open)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}
      >
        <View style={{ transform: [{ rotate: shown ? '90deg' : '0deg' }] }}>
          <IconChevron size={12} color={theme.text.muted} />
        </View>
        <Text style={{ fontSize: 12, fontWeight: '500', color: theme.text.secondary }}>
          {LAUNCH_CAPS_COPY.heading}
        </Text>
        <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 12, color: theme.text.muted }}>
          {summary}
        </Text>
      </Pressable>
      {worstCase ? (
        <Text style={{ fontSize: 11.5, color: theme.text.muted }}>{worstCase}</Text>
      ) : null}
      {shown ? (
        <View style={{ gap: nativeSpace[2] }}>
          {fields.map((field) => (
            <LaunchCapField
              key={field.key}
              field={field}
              busy={busy}
              onChange={(text) => onChange(field.key, text)}
            />
          ))}
          {note ? <Text style={{ fontSize: 11, color: theme.text.muted }}>{note}</Text> : null}
        </View>
      ) : null}
    </View>
  )
}
