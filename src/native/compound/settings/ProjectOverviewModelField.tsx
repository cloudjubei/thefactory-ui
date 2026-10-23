import { Text, View } from 'react-native'
import { PROJECT_OVERVIEW_MODEL_TEXT } from '../../../headless'
import type { ProjectOverviewModelChipWiring } from '../../../headless'
import { getPrice } from '../../../headless/api'
import { ModelChip, type ModelChipProps } from '../ModelChip'

export interface ProjectOverviewModelFieldProps {
  /** The overview model as the chip takes it — `useProjectOverviewModelChip` in the apps. */
  wiring: ProjectOverviewModelChipWiring
  /** Where the picker's "Manage…" entries lead. */
  onOpenSettings: () => void
  getPrice?: ModelChipProps['getPrice']
}

/**
 * Native peer of web's `ProjectOverviewModelField`: the composer's model chip with Off — any stored API config,
 * keyed or not, or any CLI switched on — that writes every project's overview.
 */
export default function ProjectOverviewModelField({
  wiring,
  onOpenSettings,
  getPrice: priceOf = getPrice,
}: ProjectOverviewModelFieldProps) {
  return (
    <View style={{ gap: 6, alignItems: 'flex-start' }}>
      <ModelChip
        editable={!wiring.loading}
        mode="activity"
        {...(wiring.useCli && wiring.cliModelId ? { model: wiring.cliModelId } : {})}
        activeConfig={wiring.activeConfig}
        recents={wiring.configs}
        configs={wiring.configs}
        onPick={wiring.onPickConfig}
        onOpenSettings={onOpenSettings}
        getPrice={priceOf}
        useCli={wiring.useCli}
        onToggleUseCli={wiring.onToggleUseCli}
        enabledClis={wiring.enabledClis}
        activeCli={wiring.activeCli}
        onPickCli={wiring.onPickCli}
        cliModels={wiring.cliModels}
        onPickCliModel={wiring.onPickCliModel}
        authWarning={wiring.authWarning}
        effort={wiring.effort}
        cliSwitchError={wiring.switchError}
        off={{ selected: wiring.off, onPick: wiring.onPickOff }}
      />
      <Text className="text-xs text-[var(--text-secondary)]">
        {PROJECT_OVERVIEW_MODEL_TEXT.help}
      </Text>
    </View>
  )
}
