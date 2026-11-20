import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import {
  PROJECT_CHECK_HOST_CONSENT_SETTINGS as TEXT,
  useProjectCheckHostConsent,
  type UseProjectCheckHostConsent,
} from '../../../headless'

export type ProjectCheckHostConsentSettingsPanelProps = Omit<
  UseProjectCheckHostConsent,
  'reload'
> & {
  onRetry: () => void
}

/** Whether host checks are allowed for this project, with revoke when they are. */
export function ProjectCheckHostConsentSettingsPanel({
  allowed,
  saving,
  loadError,
  saveError,
  revoke,
  onRetry,
}: ProjectCheckHostConsentSettingsPanelProps) {
  return (
    <section className="flex flex-col gap-3 max-w-2xl">
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-semibold">{TEXT.title}</h3>
        <p className="text-sm text-(--text-secondary)">{TEXT.lead}</p>
      </div>
      {saveError ? <Alert>{saveError}</Alert> : null}
      {loadError && allowed === undefined ? (
        <div className="flex items-center gap-2">
          <Alert className="flex-1">{loadError}</Alert>
          <Button variant="secondary" onClick={onRetry}>
            {TEXT.retry}
          </Button>
        </div>
      ) : allowed === undefined ? (
        <p className="text-sm text-(--text-secondary)">…</p>
      ) : (
        <>
          <p className="text-sm text-(--text-primary)">
            {allowed ? TEXT.allowed : TEXT.notAllowed}
          </p>
          <p className="text-sm text-(--text-secondary)">{TEXT.note}</p>
          {allowed ? (
            <div>
              <Button variant="secondary" disabled={saving} onClick={revoke}>
                {saving ? TEXT.revoking : TEXT.revoke}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </section>
  )
}

export interface ProjectCheckHostConsentSettingsProps {
  projectId: string
}

/** Host-check consent for a project, in its Settings. */
export default function ProjectCheckHostConsentSettings({
  projectId,
}: ProjectCheckHostConsentSettingsProps) {
  const { reload, ...state } = useProjectCheckHostConsent(projectId)
  return <ProjectCheckHostConsentSettingsPanel {...state} onRetry={reload} />
}
