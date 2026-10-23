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
  /** Opens with its picker showing, as a showcase state does. */
  defaultOpen?: boolean
}

/**
 * The model that writes every project's overview once a night, on the composer's model chip: Off, any stored API
 * config — with a key or without — or any CLI switched on, with its model and effort. Mobile renders the native
 * peer of the same name.
 */
export default function ProjectOverviewModelField({
  wiring,
  onOpenSettings,
  getPrice: priceOf = getPrice,
  defaultOpen,
}: ProjectOverviewModelFieldProps) {
  return (
    <div className="space-y-1.5">
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
        {...(defaultOpen ? { defaultOpen } : {})}
      />
      <p className="text-xs text-(--text-secondary)">{PROJECT_OVERVIEW_MODEL_TEXT.help}</p>
    </div>
  )
}
