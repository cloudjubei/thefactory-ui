import { setProjectDataLocation } from '../../../headless/api'
import { useProjects } from '../../../headless'
import DataLocationPanel, { type DataLocation } from './DataLocationPanel'

/**
 * Per-project glue around `DataLocationPanel`. Reads the named project's
 * `dataLocation` (defaulting to `'central'` for legacy specs) and calls the
 * SDK on change. The WS broadcast (`projects:updated` from the backend's
 * `setProjectDataLocation` route) drives the refresh — never optimistic.
 *
 * The `'inProject'` option requires the project to have a linked git repo
 * (`repo_url` non-empty); the panel disables that radio otherwise.
 */
export default function DataLocationSettingsPanel({ projectId }: { projectId: string }) {
  const { projects } = useProjects()
  const project = projects.find((p) => p.id === projectId)

  if (!project) {
    return (
      <section className="flex flex-col gap-3">
        <header>
          <h2 className="text-xl font-semibold">Data location</h2>
        </header>
        <p className="text-sm opacity-70">Loading the project…</p>
      </section>
    )
  }

  const value: DataLocation = project.dataLocation ?? 'central'
  const hasRepo = project.repo_url.length > 0

  const onChange = async (next: DataLocation) => {
    await setProjectDataLocation({
      path: { id: projectId },
      body: { location: next },
      throwOnError: true,
    })
  }

  return <DataLocationPanel value={value} hasRepo={hasRepo} onChange={onChange} />
}
