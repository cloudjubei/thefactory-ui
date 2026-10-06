import { useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import { nativeSpace } from '../../../tokens/native'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import { useNativeTheme } from '../../hooks/useNativeTheme'
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

/** Native peer of web's `ProjectTicketSettings`: a project's Jira, following its main group by default. */
export default function ProjectTicketSettings({ projectId }: ProjectTicketSettingsProps) {
  const { theme } = useNativeTheme()
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
    <View style={{ gap: nativeSpace[3] }}>
      <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text.primary }}>Jira</Text>
      <Text style={{ fontSize: 13, color: theme.text.secondary }}>
        {mainGroup
          ? `Agents in ${project.title} use ${mainGroup.title}'s Jira unless you choose otherwise here.`
          : `${project.title} is in no main group, so its agents get Jira only if you choose a connection here.`}
      </Text>
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
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: nativeSpace[2],
        }}
      >
        {saved && !dirty ? (
          <Text style={{ fontSize: 13, color: theme.text.secondary }}>Saved</Text>
        ) : null}
        <Button onPress={() => void save()} loading={saving} disabled={!dirty || saving}>
          Save
        </Button>
      </View>
    </View>
  )
}
