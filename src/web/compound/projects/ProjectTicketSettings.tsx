import { useEffect, useState } from 'react'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import {
  readTicketConnection,
  useProjects,
  useProjectsGroups,
  withTicketConnection,
} from '../../../headless'
import { extractErrorMessage, updateProject } from '../../../headless/api'
import TicketConnectionPicker, { type TicketConnectionPickerValue } from './TicketConnectionPicker'

export interface ProjectTicketSettingsProps {
  projectId: string
}

/**
 * A project's Jira in its Settings: follow its main group, opt out, or choose
 * its own connection and access. What the agents in this project actually get.
 */
export default function ProjectTicketSettings({ projectId }: ProjectTicketSettingsProps) {
  const { projects } = useProjects()
  const { groups } = useProjectsGroups()
  const project = projects.find((p) => p.id === projectId)
  const metadata = project?.metadata as Record<string, unknown> | undefined
  const stored = readTicketConnection(metadata?.ticketConnection)
  const mainGroup = groups.find((g) => g.id === project?.mainGroupId)

  const [value, setValue] = useState<TicketConnectionPickerValue>(stored)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const storedKey = JSON.stringify(stored ?? null)
  useEffect(() => {
    setValue(readTicketConnection(JSON.parse(storedKey)))
  }, [storedKey])

  if (!project) return null
  const dirty = JSON.stringify(value ?? null) !== storedKey

  const save = async () => {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      await updateProject({
        path: { id: projectId },
        body: { metadata: withTicketConnection(metadata, value) },
        throwOnError: true,
      })
      setSaved(true)
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not save the Jira setting. Try again.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="flex flex-col gap-3 max-w-2xl">
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-semibold">Jira</h3>
        <p className="text-sm text-(--text-secondary)">
          {mainGroup
            ? `Agents in ${project.title} use ${mainGroup.title}'s Jira unless you choose otherwise here.`
            : `${project.title} is in no main group, so its agents get Jira only if you choose a connection here.`}
        </p>
      </div>
      {error ? <Alert>{error}</Alert> : null}
      <TicketConnectionPicker
        value={value}
        onChange={(next) => {
          setValue(next)
          setSaved(false)
        }}
        {...(mainGroup
          ? { inherited: { groupTitle: mainGroup.title, binding: mainGroup.ticketConnection } }
          : {})}
      />
      <div className="flex items-center justify-end gap-2">
        {saved && !dirty ? <span className="text-sm text-(--text-secondary)">Saved</span> : null}
        <Button onClick={() => void save()} loading={saving} disabled={!dirty || saving}>
          Save
        </Button>
      </div>
    </section>
  )
}
