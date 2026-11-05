import type { FeatureRequestAcceptance, FeatureRequestResumeMode } from 'thefactory-tools/types'
import {
  CROSS_PROJECT_RESUME_COPY,
  CROSS_PROJECT_RESUME_OPTIONS,
  CROSS_PROJECT_USE_DEFAULT,
  useActiveProject,
  useCrossProjectSettings,
} from '../../../headless'
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

/**
 * D.6 settings: the receiver **cross-project acceptance** policy and the sender's **resume mode**
 * (each a user-global default + an optional per-project override), bound to
 * {@link useCrossProjectSettings} — which the backend resolvers enforce. Shared by web + desktop;
 * mobile renders its own.
 */
export default function CrossProjectSettings() {
  const { projectId, project } = useActiveProject()
  const { loading, effective, global, override, setGlobal, setOverride, resume } =
    useCrossProjectSettings(projectId)
  const resumeLabel = (mode: FeatureRequestResumeMode) =>
    CROSS_PROJECT_RESUME_OPTIONS.find((option) => option.value === mode)?.short ?? mode

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
            value={override ?? CROSS_PROJECT_USE_DEFAULT}
            disabled={loading}
            onChange={(e) => {
              const v = e.target.value
              void setOverride(
                v === CROSS_PROJECT_USE_DEFAULT ? undefined : (v as FeatureRequestAcceptance),
              )
            }}
          >
            <option value={CROSS_PROJECT_USE_DEFAULT}>Use default ({global})</option>
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

      <div className="space-y-1.5">
        <label className="text-sm font-medium">{CROSS_PROJECT_RESUME_COPY.label}</label>
        <NativeSelect
          value={resume.global}
          disabled={loading}
          onChange={(e) => void resume.setGlobal(e.target.value as FeatureRequestResumeMode)}
        >
          {CROSS_PROJECT_RESUME_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </NativeSelect>
      </div>

      {projectId ? (
        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            {CROSS_PROJECT_RESUME_COPY.override(project?.title ?? 'this project')}
          </label>
          <NativeSelect
            value={resume.override ?? CROSS_PROJECT_USE_DEFAULT}
            disabled={loading}
            onChange={(e) => {
              const v = e.target.value
              void resume.setOverride(
                v === CROSS_PROJECT_USE_DEFAULT ? undefined : (v as FeatureRequestResumeMode),
              )
            }}
          >
            <option value={CROSS_PROJECT_USE_DEFAULT}>
              {CROSS_PROJECT_RESUME_COPY.useDefault(resumeLabel(resume.global))}
            </option>
            {CROSS_PROJECT_RESUME_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </NativeSelect>
          <p className="text-xs text-(--text-secondary)">
            {CROSS_PROJECT_RESUME_COPY.effective}{' '}
            <span className="font-medium">{resumeLabel(resume.effective)}</span>
          </p>
        </div>
      ) : null}
    </div>
  )
}
