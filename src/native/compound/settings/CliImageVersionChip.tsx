import { Text, View } from 'react-native'

import { cliImageChip } from '../../../headless/utils/cliImageView'
import type { CliImageChipTone, CliImageRow } from '../../../headless/utils/cliImageViewTypes'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'

export type CliImageVersionChipProps = {
  version: CliImageRow | undefined
  loading: boolean
}

/**
 * Native peer of web's `CliImageVersionChip` — a CLI sandbox image's version:
 * installed, update available, building, missing or unknown.
 */
export function CliImageVersionChip({ version, loading }: CliImageVersionChipProps) {
  const { theme, status } = useNativeTheme()
  const chip = cliImageChip(version, loading)
  const colors: Record<CliImageChipTone, { bg: string; fg: string }> = {
    muted: { bg: theme.surface.muted, fg: theme.text.secondary },
    warning: { bg: status.working.softBg, fg: status.working.softFg },
    error: { bg: `${status.stuck.bg}1A`, fg: status.stuck.bg },
  }
  const { bg, fg } = colors[chip.tone]
  return (
    <View
      accessible
      accessibilityLabel={chip.label}
      accessibilityHint={chip.hint}
      style={{
        borderRadius: nativeRadii[1],
        backgroundColor: bg,
        paddingHorizontal: nativeSpace[3],
        paddingVertical: 2,
      }}
    >
      <Text style={{ fontSize: 11, color: fg }}>{chip.label}</Text>
    </View>
  )
}

export default CliImageVersionChip
