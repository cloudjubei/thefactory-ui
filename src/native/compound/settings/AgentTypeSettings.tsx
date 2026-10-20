import { useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { AGENT_RUN_TYPES } from 'thefactory-tools/constants'
import type { AgentRunType, AgentTypeSlot, ResolvedAgentType } from 'thefactory-tools/types'

import {
  AGENT_TYPE_ACTIONS,
  AGENT_TYPE_BUILTINS_HEADING,
  AGENT_TYPE_FIELD_HINTS,
  AGENT_TYPE_FIELD_LABELS,
  AGENT_TYPE_INHERITED_HEADING,
  AGENT_TYPE_NONE_YET,
  AGENT_TYPE_NOT_PROVING_TAG,
  AGENT_TYPE_OWN_HEADING,
  AGENT_TYPE_PROVING_ROLES,
  AGENT_TYPE_REMOVE_CONFIRM,
  AGENT_TYPE_SETTINGS_GROUP_INTRO,
  AGENT_TYPE_SETTINGS_HEADING,
  AGENT_TYPE_SETTINGS_PROJECT_INTRO,
  AGENT_TYPE_SLOT_DEFAULTS_HEADING,
  AGENT_TYPE_SLOT_DEFAULTS_NOTE,
  agentRoleLabel,
  agentTypeDraftOf,
  agentTypeDraftProblem,
  agentTypeSaveRequest,
  agentTypeSettingsView,
  agentTypeSlotsWith,
  useAgentTypeSettings,
  type AgentTypeDraft,
  type AgentTypeOwner,
  type AgentTypeRowView,
} from '../../../headless'
import { nativeFontFamilies, nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import Field from '../../primitives/Field'
import { Input } from '../../primitives/Input'
import { ConfirmDialog, Modal } from '../../primitives/Modal'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../primitives/Select'
import { Switch } from '../../primitives/Switch'
import { Textarea } from '../../primitives/Textarea'

export interface AgentTypeSettingsProps {
  /** The project or the group whose agent types these are. */
  owner: AgentTypeOwner
}

/** The slot choice that sets nothing, so the slot falls back. */
const FALLBACK = '__fallback__'

const capitalized = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1)

/**
 * Native peer of [web's `AgentTypeSettings`](../../../web/compound/settings/AgentTypeSettings.tsx):
 * the slot defaults a launch starts from, the types the owner keeps — tapped to
 * edit — and, for a project, the ones its group gives it.
 */
export default function AgentTypeSettings({ owner }: AgentTypeSettingsProps) {
  const { theme } = useNativeTheme()
  const settings = useAgentTypeSettings(owner)
  const [draft, setDraft] = useState<AgentTypeDraft | undefined>(undefined)
  const [removing, setRemoving] = useState<string | undefined>(undefined)
  const view = useMemo(
    () => (settings.data ? agentTypeSettingsView(settings.data, owner) : undefined),
    [settings.data, owner],
  )
  const ownSlots =
    owner.kind === 'project'
      ? (settings.data?.ownSlotDefaults ?? {})
      : (settings.data?.slotDefaults ?? {})
  const takenIds = settings.data?.agentTypes.map((t) => t.id) ?? []
  const problem = draft ? agentTypeDraftProblem(draft, takenIds) : undefined
  const proving = draft ? AGENT_TYPE_PROVING_ROLES.includes(draft.baseRole) : false
  const patch = (next: Partial<AgentTypeDraft>) =>
    setDraft((prev) => (prev ? { ...prev, ...next } : prev))
  const storedOf = (id: string): ResolvedAgentType | undefined =>
    settings.data?.agentTypes.find((t) => t.id === id)
  const saveDraft = async () => {
    if (!draft || problem) return
    if (await settings.save(agentTypeSaveRequest(draft))) setDraft(undefined)
  }
  const setSlot = (slot: AgentTypeSlot, value: string) =>
    void settings.saveSlots(
      agentTypeSlotsWith(ownSlots, slot, value === FALLBACK ? undefined : value),
    )

  const heading = { fontSize: 13, fontWeight: '600' as const, color: theme.text.primary }
  const muted = { fontSize: 12, color: theme.text.secondary }
  const tag = (text: string) => (
    <Text
      style={{
        fontSize: 10,
        color: theme.text.secondary,
        borderWidth: 1,
        borderColor: theme.border.default,
        borderRadius: nativeRadii.round,
        paddingHorizontal: 6,
      }}
    >
      {text}
    </Text>
  )
  const list = (rows: AgentTypeRowView[], editable: boolean) => (
    <View
      style={{ borderWidth: 1, borderColor: theme.border.subtle, borderRadius: nativeRadii[2] }}
    >
      {rows.map((row, i) => (
        <Pressable
          key={row.id}
          disabled={!editable}
          accessibilityRole={editable ? 'button' : undefined}
          onPress={() => setDraft(agentTypeDraftOf(storedOf(row.id)))}
          style={{
            minHeight: 44,
            justifyContent: 'center',
            gap: 2,
            paddingHorizontal: nativeSpace[3],
            paddingVertical: nativeSpace[2],
            ...(i > 0 ? { borderTopWidth: 1, borderTopColor: theme.border.subtle } : {}),
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Text style={{ fontSize: 13, fontWeight: '500', color: theme.text.primary }}>
              {row.label}
            </Text>
            <Text
              style={{ fontFamily: nativeFontFamilies.mono, fontSize: 11, color: theme.text.muted }}
            >
              {row.id}
            </Text>
            {tag(capitalized(row.roleLabel))}
            {row.notProving ? tag(AGENT_TYPE_NOT_PROVING_TAG) : null}
          </View>
          {row.description ? <Text style={muted}>{row.description}</Text> : null}
        </Pressable>
      ))}
    </View>
  )

  return (
    <View style={{ gap: nativeSpace[4] }}>
      <View style={{ gap: nativeSpace[1] }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text.primary }}>
          {AGENT_TYPE_SETTINGS_HEADING}
        </Text>
        <Text style={{ fontSize: 13, color: theme.text.secondary }}>
          {owner.kind === 'project'
            ? AGENT_TYPE_SETTINGS_PROJECT_INTRO
            : AGENT_TYPE_SETTINGS_GROUP_INTRO}
        </Text>
      </View>
      {settings.error && !draft ? <Alert>{settings.error}</Alert> : null}
      {view ? (
        <>
          <View style={{ gap: nativeSpace[2] }}>
            <Text style={heading}>{AGENT_TYPE_SLOT_DEFAULTS_HEADING}</Text>
            <Text style={muted}>{AGENT_TYPE_SLOT_DEFAULTS_NOTE}</Text>
            {view.slots.map((slot) => (
              <Field key={slot.slot} label={slot.slotLabel} hint={slot.sourceLabel}>
                <Select
                  value={slot.value ?? FALLBACK}
                  onValueChange={(value) => setSlot(slot.slot, value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={slot.fallbackLabel} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={FALLBACK}>{slot.fallbackLabel}</SelectItem>
                    {slot.options.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {`${option.label} · ${option.scopeLabel}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            ))}
          </View>

          <View style={{ gap: nativeSpace[1] }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Text style={heading}>{AGENT_TYPE_OWN_HEADING}</Text>
              <Button size="sm" variant="secondary" onPress={() => setDraft(agentTypeDraftOf())}>
                {AGENT_TYPE_ACTIONS.add}
              </Button>
            </View>
            {view.own.length > 0 ? (
              list(view.own, true)
            ) : (
              <Text style={muted}>{AGENT_TYPE_NONE_YET}</Text>
            )}
          </View>

          {view.inherited.length > 0 ? (
            <View style={{ gap: nativeSpace[1] }}>
              <Text style={heading}>{AGENT_TYPE_INHERITED_HEADING}</Text>
              {list(view.inherited, false)}
            </View>
          ) : null}

          <View style={{ gap: nativeSpace[1] }}>
            <Text style={heading}>{AGENT_TYPE_BUILTINS_HEADING}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {view.builtins.map((type) => (
                <View key={type.id}>{tag(type.label)}</View>
              ))}
            </View>
          </View>
        </>
      ) : null}

      {draft ? (
        <Modal
          isOpen
          onClose={() => setDraft(undefined)}
          title={draft.isNew ? AGENT_TYPE_ACTIONS.add : draft.label || draft.id}
          size="lg"
          footer={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
              {!draft.isNew ? (
                <Button
                  variant="danger"
                  onPress={() => setRemoving(draft.id)}
                  disabled={settings.busy}
                >
                  {AGENT_TYPE_ACTIONS.remove}
                </Button>
              ) : null}
              <View style={{ flex: 1 }} />
              <Button variant="ghost" onPress={() => setDraft(undefined)}>
                {AGENT_TYPE_ACTIONS.cancel}
              </Button>
              <Button
                onPress={() => void saveDraft()}
                loading={settings.busy}
                disabled={problem !== undefined || settings.busy}
              >
                {AGENT_TYPE_ACTIONS.save}
              </Button>
            </View>
          }
        >
          <View style={{ gap: nativeSpace[3] }}>
            {settings.error ? <Alert>{settings.error}</Alert> : null}
            {problem ? <Text style={muted}>{problem}</Text> : null}
            <Field label={AGENT_TYPE_FIELD_LABELS.id} hint={AGENT_TYPE_FIELD_HINTS.id}>
              <Input
                value={draft.id}
                disabled={!draft.isNew}
                autoCapitalize="none"
                onChangeText={(id) => patch({ id })}
              />
            </Field>
            <Field label={AGENT_TYPE_FIELD_LABELS.label}>
              <Input value={draft.label} onChangeText={(label) => patch({ label })} />
            </Field>
            <Field label={AGENT_TYPE_FIELD_LABELS.description}>
              <Input
                value={draft.description}
                onChangeText={(description) => patch({ description })}
              />
            </Field>
            <Field label={AGENT_TYPE_FIELD_LABELS.baseRole}>
              <Select
                value={draft.baseRole}
                onValueChange={(role) => patch({ baseRole: role as AgentRunType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AGENT_RUN_TYPES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {capitalized(agentRoleLabel(role))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label={AGENT_TYPE_FIELD_LABELS.brief}>
              <Textarea rows={5} value={draft.brief} onChangeText={(brief) => patch({ brief })} />
            </Field>
            <Switch
              checked={draft.briefMode === 'replace'}
              onCheckedChange={(on) => patch({ briefMode: on ? 'replace' : 'append' })}
              label={AGENT_TYPE_FIELD_LABELS.briefReplaces}
            />
            {proving ? (
              <View style={{ gap: nativeSpace[1] }}>
                <Switch
                  checked={draft.proves}
                  onCheckedChange={(on) => patch({ proves: on })}
                  label={AGENT_TYPE_FIELD_LABELS.proves}
                />
                <Text style={muted}>{AGENT_TYPE_FIELD_HINTS.proves}</Text>
              </View>
            ) : null}
            <Field label={AGENT_TYPE_FIELD_LABELS.tools} hint={AGENT_TYPE_FIELD_HINTS.tools}>
              <Textarea
                rows={4}
                autoCapitalize="none"
                value={draft.tools}
                onChangeText={(tools) => patch({ tools })}
              />
            </Field>
            <Field
              label={AGENT_TYPE_FIELD_LABELS.contextDocs}
              hint={AGENT_TYPE_FIELD_HINTS.contextDocs}
            >
              <Textarea
                rows={3}
                autoCapitalize="none"
                value={draft.contextDocs}
                onChangeText={(contextDocs) => patch({ contextDocs })}
              />
            </Field>
          </View>
        </Modal>
      ) : null}

      {removing ? (
        <ConfirmDialog
          isOpen
          onClose={() => setRemoving(undefined)}
          title={AGENT_TYPE_ACTIONS.remove}
          description={AGENT_TYPE_REMOVE_CONFIRM(storedOf(removing)?.label ?? removing)}
          confirmLabel={AGENT_TYPE_ACTIONS.remove}
          destructive
          onConfirm={async () => {
            if (await settings.remove(removing)) setDraft(undefined)
            setRemoving(undefined)
          }}
        />
      ) : null}
    </View>
  )
}
