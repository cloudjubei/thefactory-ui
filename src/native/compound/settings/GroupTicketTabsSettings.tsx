import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import {
  GROUP_TICKET_TAB_SPRINT_LABELS,
  GROUP_TICKET_TAB_SPRINTS,
  GROUP_TICKET_TABS_MAX,
  GROUP_TICKET_TABS_TEXT as TEXT,
  GROUP_TICKETS_TEXT,
  ticketStatusesText,
  useGroupTicketTabsSettings,
  type GroupTicketTabEditorRow,
  type GroupTicketTabsChange,
  type GroupTicketTabsEditorView,
  type GroupTicketTabSprint,
} from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconArrowDown, IconArrowUp, IconDelete } from '../../icons'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import IconButton from '../../primitives/IconButton'
import { ConfirmDialog } from '../../primitives/Modal'
import SegmentedControl from '../../primitives/SegmentedControl'
import { SavedField } from './GroupSlackSettings'

export type GroupTicketTabsPanelProps = {
  view: GroupTicketTabsEditorView
  onChange: (change: GroupTicketTabsChange) => void
  onReset: () => void
  onRetry: () => void
  /** Start with this tab opened — for a fixed showcase state. */
  openFirst?: string
  /** Start with Reset to default's confirm open — for a fixed showcase state. */
  confirmingReset?: boolean
}

/**
 * Native peer of web's `GroupTicketTabsPanel`: the group's ticket tabs in
 * Settings → Group, each with its name, statuses, sprint and what Yours and
 * Others may do, added, renamed, moved and deleted here, each change shown at
 * once and saved. Reset to default goes back to Jira's status categories.
 */
export function GroupTicketTabsPanel({
  view,
  onChange,
  onReset,
  onRetry,
  openFirst,
  confirmingReset = false,
}: GroupTicketTabsPanelProps) {
  const { theme } = useNativeTheme()
  const [open, setOpen] = useState<string | undefined>(openFirst)
  const [confirming, setConfirming] = useState(confirmingReset)
  const muted = { fontSize: 13, color: theme.text.secondary }
  return (
    <View accessibilityLabel={TEXT.heading} style={{ gap: nativeSpace[3] }}>
      <View style={{ gap: 4 }}>
        <Text
          accessibilityRole="header"
          style={{ fontSize: 15, fontWeight: '600', color: theme.text.primary }}
        >
          {TEXT.heading}
        </Text>
        <Text style={muted}>{TEXT.intro}</Text>
      </View>
      {view.kind === 'loading' ? <Text style={muted}>{GROUP_TICKETS_TEXT.loading}</Text> : null}
      {view.kind === 'failed' ? (
        <View style={{ gap: nativeSpace[2] }}>
          <Alert variant="error">{view.error}</Alert>
          <View style={{ alignItems: 'flex-start' }}>
            <Button size="sm" variant="secondary" onPress={onRetry}>
              {TEXT.tryAgain}
            </Button>
          </View>
        </View>
      ) : null}
      {view.kind === 'tabs' ? (
        <>
          {!view.custom ? <Text style={muted}>{TEXT.defaults}</Text> : null}
          {view.error ? <Alert variant="error">{view.error}</Alert> : null}
          <View
            style={{
              borderRadius: nativeRadii[3],
              borderWidth: 1,
              borderColor: theme.border.subtle,
              backgroundColor: theme.surface.raised,
              overflow: 'hidden',
            }}
          >
            {view.rows.map((row, at) => (
              <TabRow
                key={row.tab.id}
                row={row}
                divided={at > 0}
                open={open === row.tab.id}
                onToggle={() => setOpen(open === row.tab.id ? undefined : row.tab.id)}
                onChange={onChange}
              />
            ))}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
            <Button
              size="sm"
              variant="secondary"
              disabled={!view.canAdd}
              onPress={() => onChange({ kind: 'add' })}
            >
              {TEXT.add}
            </Button>
            {view.custom ? (
              <Button size="sm" variant="ghost" onPress={() => setConfirming(true)}>
                {TEXT.reset}
              </Button>
            ) : null}
            {view.saving ? (
              <Text style={{ fontSize: 12, color: theme.text.muted }}>{TEXT.saving}</Text>
            ) : null}
            {!view.canAdd ? (
              <Text style={{ fontSize: 12, color: theme.text.muted }}>
                {TEXT.tooMany(GROUP_TICKET_TABS_MAX)}
              </Text>
            ) : null}
          </View>
          <ConfirmDialog
            isOpen={confirming}
            onClose={() => setConfirming(false)}
            onConfirm={() => {
              setConfirming(false)
              onReset()
            }}
            title={TEXT.reset}
            description={TEXT.resetConfirm}
            confirmLabel={TEXT.reset}
          />
        </>
      ) : null}
    </View>
  )
}

function Label({ children }: { children: string }) {
  const { theme } = useNativeTheme()
  return (
    <Text
      style={{
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 0.6,
        textTransform: 'uppercase',
        color: theme.text.muted,
      }}
    >
      {children}
    </Text>
  )
}

function TabRow({
  row,
  divided,
  open,
  onToggle,
  onChange,
}: {
  row: GroupTicketTabEditorRow
  divided: boolean
  open: boolean
  onToggle: () => void
  onChange: (change: GroupTicketTabsChange) => void
}) {
  const { theme } = useNativeTheme()
  const { tab } = row
  const id = tab.id
  return (
    <View style={divided ? { borderTopWidth: 1, borderTopColor: theme.border.subtle } : undefined}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          paddingHorizontal: nativeSpace[2],
          paddingVertical: 6,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          onPress={onToggle}
          style={({ pressed }) => ({
            flex: 1,
            minHeight: 44,
            justifyContent: 'center',
            borderRadius: nativeRadii[2],
            paddingHorizontal: 6,
            backgroundColor: pressed ? theme.surface.hover : 'transparent',
          })}
        >
          <Text style={{ fontSize: 14, fontWeight: '500', color: theme.text.primary }}>
            {tab.name}
          </Text>
          <Text numberOfLines={1} style={{ fontSize: 12, color: theme.text.muted }}>
            {row.summary}
          </Text>
        </Pressable>
        <IconButton
          size="sm"
          disabled={!row.canMoveUp}
          accessibilityLabel={TEXT.moveUp(tab.name)}
          onPress={() => onChange({ kind: 'move', id, by: -1 })}
        >
          <IconArrowUp size={16} color={theme.text.muted} />
        </IconButton>
        <IconButton
          size="sm"
          disabled={!row.canMoveDown}
          accessibilityLabel={TEXT.moveDown(tab.name)}
          onPress={() => onChange({ kind: 'move', id, by: 1 })}
        >
          <IconArrowDown size={16} color={theme.text.muted} />
        </IconButton>
        <IconButton
          size="sm"
          accessibilityLabel={TEXT.remove(tab.name)}
          onPress={() => onChange({ kind: 'remove', id })}
        >
          <IconDelete size={16} color={theme.text.muted} />
        </IconButton>
      </View>
      {open ? (
        <View
          style={{
            gap: nativeSpace[3],
            borderTopWidth: 1,
            borderTopColor: theme.border.subtle,
            backgroundColor: theme.surface.base,
            padding: nativeSpace[3],
          }}
        >
          <SavedField
            label={TEXT.name}
            hint=""
            placeholder={tab.name}
            saved={tab.name}
            onSave={(name) => onChange({ kind: 'rename', id, name })}
          />
          <View style={{ gap: 6 }}>
            <Label>{TEXT.categories}</Label>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {row.categories.map((c) => (
                <Toggle
                  key={c.category}
                  label={c.label}
                  on={c.on}
                  onPress={() => onChange({ kind: 'category', id, category: c.category })}
                />
              ))}
            </View>
          </View>
          <SavedField
            label={TEXT.statuses}
            hint={TEXT.statusesHint}
            placeholder={TEXT.statusesPlaceholder}
            saved={ticketStatusesText(tab.statuses)}
            onSave={(text) => onChange({ kind: 'statuses', id, text })}
          />
          <View style={{ gap: 6 }}>
            <Label>{TEXT.sprint}</Label>
            <SegmentedControl
              size="sm"
              ariaLabel={TEXT.sprint}
              value={tab.sprint}
              onChange={(next) =>
                onChange({ kind: 'sprint', id, sprint: next as GroupTicketTabSprint })
              }
              options={GROUP_TICKET_TAB_SPRINTS.map((value) => ({
                value,
                label: GROUP_TICKET_TAB_SPRINT_LABELS[value],
              }))}
            />
          </View>
          {row.sides.map((side) => (
            <View key={side.side} style={{ gap: 6 }}>
              <Label>{`${TEXT.actions} · ${side.label}`}</Label>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {side.actions.map((a) => (
                  <Toggle
                    key={a.action}
                    label={a.label}
                    on={a.on}
                    onPress={() =>
                      onChange({ kind: 'action', id, side: side.side, action: a.action })
                    }
                  />
                ))}
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  )
}

/** One choice that is on or off, as a pill. */
function Toggle({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const { theme } = useNativeTheme()
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      hitSlop={4}
      onPress={onPress}
      style={{
        borderRadius: nativeRadii.round,
        borderWidth: 1,
        borderColor: on ? theme.accent.primary : theme.border.subtle,
        backgroundColor: on ? theme.accent.softBg : 'transparent',
        paddingHorizontal: 10,
        paddingVertical: 4,
      }}
    >
      <Text style={{ fontSize: 12, color: on ? theme.text.primary : theme.text.muted }}>
        {label}
      </Text>
    </Pressable>
  )
}

export type GroupTicketTabsSettingsProps = { groupId: string }

/** Native peer of web's `GroupTicketTabsSettings`: the panel on the group's live tabs, in Settings → Group. */
export default function GroupTicketTabsSettings({ groupId }: GroupTicketTabsSettingsProps) {
  const tabs = useGroupTicketTabsSettings(groupId)
  return (
    <GroupTicketTabsPanel
      view={tabs.view}
      onChange={tabs.change}
      onReset={tabs.reset}
      onRetry={tabs.retry}
    />
  )
}
