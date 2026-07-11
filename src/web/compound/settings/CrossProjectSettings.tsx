import type { FeatureRequestAcceptance } from 'thefactory-tools/types'
import { useActiveProject, useCrossProjectSettings } from '../../../headless'
import { NativeSelect } from '../../primitives/NativeSelect'

/**
 * `autonomous` is intentionally omitted — its auto-accept/auto-run handling is deferred, so only the
 * two backend-enforced modes are offered. `off` → inbound requests are auto-rejected; `manual` →
 * they wait for a human accept.
 */
const ACCEPTANCE_OPTIONS: { value: FeatureRequestAcceptance; label: string }[] = [
  { value: 'manual', label: 'Manual — hold for my approval' },
  { value: 'off', label: 'Off — decline inbound requests' },
]

const USE_DEFAULT = '__default'

/**
 * D.6 settings: the receiver **cross-project acceptance** policy (a user-global default + an optional
 * per-project override), bound to {@link useCrossProjectSettings} — which the backend resolver
 * actually enforces at emit. The sender "resume mode" control ships disabled (`notify` only) until
 * `auto_resume` lands. Shared by web + desktop; mobile renders its own.
 */
export default function CrossProjectSettings() {
  const { projectId, project } = useActiveProject()
  const { loading, effective, global, override, setGlobal, setOverride } =
    useCrossProjectSettings(projectId)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-1 text-xl font-semibold">Cross-project requests</h2>
        <p className="text-sm text-(--text-secondary)">
          How your projects handle feature requests that other projects (or their agents) send them.
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Accepting requests — default for all projects</label>
        <NativeSelect
          value={global}
          disabled={loading}
          onChange={(e) => void setGlobal(e.target.value as FeatureRequestAcceptance)}
        >
          {ACCEPTANCE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </NativeSelect>
      </div>

      {projectId ? (
        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            Override for {project?.title ?? 'this project'}
          </label>
          <NativeSelect
            value={override ?? USE_DEFAULT}
            disabled={loading}
            onChange={(e) => {
              const v = e.target.value
              void setOverride(v === USE_DEFAULT ? undefined : (v as FeatureRequestAcceptance))
            }}
          >
            <option value={USE_DEFAULT}>Use default ({global})</option>
            {ACCEPTANCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </NativeSelect>
          <p className="text-xs text-(--text-secondary)">
            Effective for this project: <span className="font-medium">{effective}</span>
          </p>
        </div>
      ) : null}

      <div className="space-y-1.5 opacity-60">
        <label className="text-sm font-medium">When a request you sent completes</label>
        <NativeSelect value="notify" disabled>
          <option value="notify">Notify me — I reopen the chat and continue</option>
        </NativeSelect>
        <p className="text-xs text-(--text-secondary)">Auto-resume is coming soon.</p>
      </div>
    </div>
  )
}
