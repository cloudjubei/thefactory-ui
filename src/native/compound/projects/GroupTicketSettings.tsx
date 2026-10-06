import { useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import {
  describeEffectiveTicketBinding,
  effectiveTicketBinding,
  useProjects,
  useProjectsGroups,
  useProviderConnections,
} from '../../../headless'
import { extractErrorMessage } from '../../../headless/api'
import TicketConnectionPicker, { type TicketConnectionPickerValue } from './TicketConnectionPicker'

export interface GroupTicketSettingsProps {
  groupId: string
}

/** Native peer of web's `GroupTicketSettings`: the group's Jira, and what each of its projects gets. */
export default function GroupTicketSettings({ groupId }: GroupTicketSettingsProps) {
  const { theme } = useNativeTheme()
  const { groups, updateGroup } = useProjectsGroups()
  const { projects } = useProjects()
  const { connections } = useProviderConnections()
  const group = groups.find((g) => g.id === groupId)

  const stored: TicketConnectionPickerValue = group?.ticketConnection
  const storedKey = JSON.stringify(stored ?? null)
  const [value, setValue] = useState<TicketConnectionPickerValue>(stored)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  useEffect(() => {
    setValue(JSON.parse(storedKey) ?? undefined)
  }, [storedKey])

  if (!group) return null
  const dirty = JSON.stringify(value === 'none' ? null : (value ?? null)) !== storedKey
  const members = projects.filter((p) => p.mainGroupId === groupId)
  const canBind = group.type === 'MAIN' || stored !== undefined

  const save = async () => {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      await updateGroup(groupId, {
        ticketConnection: value === undefined || value === 'none' ? null : value,
      })
      setSaved(true)
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not save the Jira connection. Try again.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={{ gap: nativeSpace[3] }}>
      <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text.primary }}>Jira</Text>
      <Text style={{ fontSize: 13, color: theme.text.secondary }}>
        {canBind
          ? `Projects whose main group is ${group.title} use this connection unless they choose their own in their Settings.`
          : `${group.title} is a scope group. Jira is set on main groups; its projects follow their own main group.`}
      </Text>
      {error ? <Alert>{error}</Alert> : null}
      {canBind ? (
        <>
          <TicketConnectionPicker
            value={value}
            onChange={(next) => {
              setValue(next)
              setSaved(false)
            }}
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
        </>
      ) : null}
      {members.length > 0 ? (
        <View style={{ gap: nativeSpace[1] }}>
          <Text style={{ fontSize: 13, fontWeight: '500', color: theme.text.primary }}>
            What each project gets
          </Text>
          <View
            style={{
              borderWidth: 1,
              borderColor: theme.border.subtle,
              borderRadius: nativeRadii[2],
            }}
          >
            {members.map((p, i) => (
              <View
                key={p.id}
                style={{
                  paddingHorizontal: nativeSpace[3],
                  paddingVertical: nativeSpace[2],
                  ...(i > 0 ? { borderTopWidth: 1, borderTopColor: theme.border.subtle } : {}),
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '500', color: theme.text.primary }}>
                  {p.title}
                </Text>
                <Text style={{ fontSize: 12, color: theme.text.secondary }}>
                  {describeEffectiveTicketBinding(effectiveTicketBinding(p, groups), connections)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  )
}
