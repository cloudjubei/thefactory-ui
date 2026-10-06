import { useEffect, useState } from 'react'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
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

/**
 * A group's Jira in its Settings: the connection and access its projects
 * inherit, and — beneath it — what each of its projects actually gets, since a
 * project can choose its own or opt out.
 */
export default function GroupTicketSettings({ groupId }: GroupTicketSettingsProps) {
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
    <section className="flex flex-col gap-3 max-w-2xl">
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-semibold">Jira</h3>
        <p className="text-sm text-(--text-secondary)">
          {canBind
            ? `Projects whose main group is ${group.title} use this connection unless they choose their own in their Settings.`
            : `${group.title} is a scope group. Jira is set on main groups; its projects follow their own main group.`}
        </p>
      </div>
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
          <div className="flex items-center justify-end gap-2">
            {saved && !dirty ? (
              <span className="text-sm text-(--text-secondary)">Saved</span>
            ) : null}
            <Button onClick={() => void save()} loading={saving} disabled={!dirty || saving}>
              Save
            </Button>
          </div>
        </>
      ) : null}
      {members.length > 0 ? (
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium">What each project gets</span>
          <ul className="rounded-md border border-(--border-subtle) divide-y divide-(--border-subtle)">
            {members.map((p) => (
              <li key={p.id} className="flex flex-col px-3 py-2">
                <span className="text-sm font-medium">{p.title}</span>
                <span className="text-[12px] text-(--text-secondary)">
                  {describeEffectiveTicketBinding(effectiveTicketBinding(p, groups), connections)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
