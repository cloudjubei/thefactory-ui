import { useEffect, useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { useProjects, useProviderConnections } from '../../../headless'
import type { ExternalItem, GetProviderConnectionResponse } from '../../../headless/api'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import Field from '../../primitives/Field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../primitives/Select'
import Spinner from '../../primitives/Spinner'

export interface ImportTicketsModalProps {
  connection: GetProviderConnectionResponse
  onClose: () => void
}

/**
 * Native peer of web's `ImportTicketsModal`: lists the items assigned to the
 * connection's user and imports a chosen one into a project as a Story. Modal
 * CONTENT — the parent wraps it in a `Modal`.
 */
export default function ImportTicketsModal({ connection, onClose }: ImportTicketsModalProps) {
  const { listAssignedItems, importItem } = useProviderConnections()
  const { projects } = useProjects()

  const [items, setItems] = useState<ExternalItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [projectId, setProjectId] = useState('')
  const [importingId, setImportingId] = useState<string | null>(null)
  const [imported, setImported] = useState<Record<string, true>>({})

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
      await importItem(projectId, connection.id, item.externalId)
      setImported((prev) => ({ ...prev, [item.externalId]: true }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import the ticket')
    } finally {
      setImportingId(null)
    }
  }

  return (
    <View className="gap-4">
      {error && <Alert>{error}</Alert>}

      <Field label="Import into project" hint="The imported ticket becomes a Story here.">
        <Select value={projectId} onValueChange={setProjectId}>
          <SelectTrigger>
            <SelectValue placeholder="No projects" />
          </SelectTrigger>
          <SelectContent>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {loading ? (
        <View className="flex-row items-center gap-2 p-4">
          <Spinner />
          <Text className="text-sm text-[var(--text-secondary)]">
            Loading tickets assigned to you…
          </Text>
        </View>
      ) : items.length === 0 ? (
        <Text className="p-4 text-sm text-[var(--text-secondary)]">
          No tickets assigned to you.
        </Text>
      ) : (
        <ScrollView
          style={{ maxHeight: 384 }}
          className="rounded-md border border-[var(--border-subtle)]"
        >
          {items.map((item, idx) => (
            <View
              key={item.externalId}
              className={`flex-row items-center justify-between gap-2 p-3${
                idx > 0 ? ' border-t border-[var(--border-subtle)]' : ''
              }`}
            >
              <View className="flex-1">
                <Text className="text-sm font-medium text-[var(--text-primary)]" numberOfLines={1}>
                  {item.title || item.externalId}
                </Text>
                <Text className="text-sm text-[var(--text-secondary)]" numberOfLines={1}>
                  {item.externalId}
                  {item.status ? ` · ${item.status}` : ''}
                </Text>
              </View>
              {imported[item.externalId] ? (
                <Text className="text-sm text-[var(--text-secondary)]">✓ Imported</Text>
              ) : (
                <Button
                  onPress={() => void doImport(item)}
                  loading={importingId === item.externalId}
                  disabled={!projectId || importingId !== null}
                  variant="secondary"
                  size="sm"
                >
                  Import
                </Button>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      <View className="flex-row justify-end pt-1">
        <Button variant="secondary" onPress={onClose}>
          Done
        </Button>
      </View>
    </View>
  )
}
