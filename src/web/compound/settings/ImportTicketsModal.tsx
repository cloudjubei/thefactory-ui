import { useEffect, useState } from 'react'
import { useProjects, useProviderConnections } from '../../../headless'
import type { ExternalItem, GetProviderConnectionResponse } from '../../../headless/api'
import { Alert, Button, Field, NativeSelect, Spinner } from '../..'

export type ImportTicketsModalProps = {
  connection: GetProviderConnectionResponse
  onClose: () => void
}

/**
 * Lists the items assigned to a provider connection's user and imports a chosen
 * one into a selected project as a Story (carrying its `externalIds` back-link).
 * Modal CONTENT — the parent wraps it in a `Modal`.
 */
export default function ImportTicketsModal({ connection, onClose }: ImportTicketsModalProps) {
  const { listAssignedItems, importItem } = useProviderConnections()
  const { projects } = useProjects()

  const [items, setItems] = useState<ExternalItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [projectId, setProjectId] = useState('')
  const [importingId, setImportingId] = useState<string | null>(null)
  const [importedStoryByItem, setImportedStoryByItem] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!projectId && projects.length > 0) setProjectId(projects[0].id)
  }, [projects, projectId])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    listAssignedItems(connection.id)
      .then((data) => {
        if (!cancelled) setItems(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load tickets')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [connection.id, listAssignedItems])

  const doImport = async (item: ExternalItem) => {
    if (!projectId || importingId) return
    setImportingId(item.externalId)
    setError(null)
    try {
      const story = await importItem(projectId, connection.id, item.externalId)
      setImportedStoryByItem((prev) => ({ ...prev, [item.externalId]: story.id }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import the ticket')
    } finally {
      setImportingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <Alert>{error}</Alert>}

      <Field label="Import into project" hint="The imported ticket becomes a Story here.">
        <NativeSelect value={projectId} onChange={(e) => setProjectId(e.target.value)}>
          {projects.length === 0 && <option value="">No projects</option>}
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </NativeSelect>
      </Field>

      {loading ? (
        <div className="flex items-center gap-2 p-4 text-sm text-(--text-secondary)">
          <Spinner /> Loading tickets assigned to you…
        </div>
      ) : items.length === 0 ? (
        <div className="p-4 text-sm text-(--text-secondary)">No tickets assigned to you.</div>
      ) : (
        <div className="border rounded-md divide-y border-(--border-subtle) divide-(--border-subtle) max-h-96 overflow-auto">
          {items.map((item) => {
            const importedStory = importedStoryByItem[item.externalId]
            return (
              <div
                key={item.externalId}
                className="p-3 flex flex-row items-center gap-2 justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{item.title || item.externalId}</div>
                  <div className="text-sm text-(--text-secondary) truncate">
                    {item.externalId}
                    {item.status ? ` · ${item.status}` : ''}
                  </div>
                </div>
                <div className="shrink-0">
                  {importedStory ? (
                    <span className="text-sm text-(--text-secondary)">✓ Imported</span>
                  ) : (
                    <Button
                      onClick={() => void doImport(item)}
                      loading={importingId === item.externalId}
                      disabled={!projectId || importingId !== null}
                      variant="secondary"
                      size="sm"
                    >
                      Import
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="flex justify-end pt-1">
        <Button type="button" variant="secondary" onClick={onClose}>
          Done
        </Button>
      </div>
    </div>
  )
}
