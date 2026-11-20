import { Text, View } from 'react-native'
import type { ProjectGeneratorSetting } from 'thefactory-tools/types'

import {
  PROJECT_GENERATOR_INPUTS_LABEL,
  PROJECT_GENERATOR_OUTPUTS_LABEL,
  PROJECT_GENERATORS_HEADING,
  projectGeneratorLines,
} from '../../../headless'
import { nativeFontFamilies, nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'

export type ProjectGeneratorsListProps = {
  /** The generators the project declares, as its checks listing returns them. */
  generators: readonly ProjectGeneratorSetting[]
}

/**
 * The project's generators on its checks listing: each one's name, command,
 * what it reads and what it writes. Nothing when there are none. Web peer:
 * `web/compound/process/ProjectGeneratorsList`.
 */
export default function ProjectGeneratorsList({ generators }: ProjectGeneratorsListProps) {
  const { theme } = useNativeTheme()
  const lines = projectGeneratorLines(generators)
  if (lines.length === 0) return null
  const mono = { fontFamily: nativeFontFamilies.mono }
  return (
    <View
      accessibilityLabel={PROJECT_GENERATORS_HEADING}
      style={{
        gap: 8,
        padding: nativeSpace[2],
        borderRadius: nativeRadii[2],
        borderWidth: 1,
        borderColor: theme.border.subtle,
        backgroundColor: theme.surface.raised,
      }}
    >
      <Text
        style={{
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 0.6,
          textTransform: 'uppercase',
          color: theme.text.muted,
        }}
      >
        {PROJECT_GENERATORS_HEADING}
      </Text>
      {lines.map((line, at) => (
        <View key={`${at}:${line.name}`} style={{ gap: 2 }}>
          <Text
            numberOfLines={1}
            style={{ fontSize: 12, fontWeight: '500', color: theme.text.primary }}
          >
            {line.name}
          </Text>
          <Text numberOfLines={1} style={{ ...mono, fontSize: 11, color: theme.text.secondary }}>
            {line.command}
          </Text>
          {line.reads.length > 0 ? (
            <Text style={{ fontSize: 11, color: theme.text.secondary }}>
              {PROJECT_GENERATOR_INPUTS_LABEL}: <Text style={mono}>{line.reads.join(', ')}</Text>
            </Text>
          ) : null}
          <Text style={{ fontSize: 11, color: theme.text.secondary }}>
            {PROJECT_GENERATOR_OUTPUTS_LABEL}: <Text style={mono}>{line.writes.join(', ')}</Text>
          </Text>
        </View>
      ))}
    </View>
  )
}
