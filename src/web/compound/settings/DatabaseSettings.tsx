import DataLocationSettingsPanel from './DataLocationSettingsPanel'
import DbHealthPanel from './DbHealthPanel'
import DockerDiskSettingsPanel from './DockerDiskSettingsPanel'
import IngestionPanel from './IngestionPanel'

/**
 * Database settings. App-wide Settings passes no `projectId` and shows only
 * what acts on every project; a project's own Settings names it, adding what
 * acts on that project alone: reindexing it and moving its data.
 */
export default function DatabaseSettings({ projectId }: { projectId?: string }) {
  return (
    <div className="flex flex-col gap-8">
      <DbHealthPanel />
      <DockerDiskSettingsPanel />
      <IngestionPanel projectId={projectId} />
      {projectId && <DataLocationSettingsPanel projectId={projectId} />}
    </div>
  )
}
