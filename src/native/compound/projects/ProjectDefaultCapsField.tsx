import { useEffect, useState } from 'react'
import { Text, View } from 'react-native'

import {
  LAUNCH_CAPS_COPY,
  processDefaultCapFields,
  processDefaultCapsError,
  readProcessDefaultCaps,
  withProcessDefaultCaps,
  type LaunchCapsTyped,
} from '../../../headless'
import { nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { LaunchCapField } from '../chat/LaunchCapsFields'

export type ProjectDefaultCapsFieldProps = {
  /** The project's metadata. */
  metadata: Record<string, unknown>
  /** The metadata with the defaults as edited. */
  onChange: (metadata: Record<string, unknown>) => void
  /** What stops a save while a limit cannot be kept; nothing once it can. */
  onErrorChange?: (error: string | undefined) => void
  busy?: boolean
}

/** Native peer of the web `ProjectDefaultCapsField`. */
export default function ProjectDefaultCapsField({
  metadata,
  onChange,
  onErrorChange,
  busy = false,
}: ProjectDefaultCapsFieldProps) {
  const { theme } = useNativeTheme()
  const [typed, setTyped] = useState<LaunchCapsTyped>({})
  const stored = readProcessDefaultCaps(metadata.processDefaultCaps)
  const fields = processDefaultCapFields(stored, typed)
  const error = processDefaultCapsError(fields)
  useEffect(() => onErrorChange?.(error), [error, onErrorChange])
  return (
    <View style={{ gap: nativeSpace[2] }}>
      <View>
        <Text style={{ fontSize: 14, fontWeight: '500', color: theme.text.primary }}>
          {LAUNCH_CAPS_COPY.projectHeading}
        </Text>
        <Text style={{ fontSize: 12, color: theme.text.secondary }}>
          {LAUNCH_CAPS_COPY.projectHint}
        </Text>
      </View>
      {fields.map((field) => (
        <LaunchCapField
          key={field.key}
          field={field}
          busy={busy}
          onChange={(text) => {
            const next = { ...typed, [field.key]: text }
            setTyped(next)
            onChange(withProcessDefaultCaps(metadata, processDefaultCapFields(stored, next)))
          }}
        />
      ))}
    </View>
  )
}
