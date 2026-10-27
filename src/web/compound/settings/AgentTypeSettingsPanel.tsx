import { useMemo, useState } from 'react'
import { AGENT_RUN_TYPES } from 'thefactory-tools/constants'
import type {
  AgentRunType,
  AgentTypeSlot,
  AgentTypeSlotMap,
  ResolvedAgentType,
} from 'thefactory-tools/types'

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
  type AgentTypeDraft,
  type AgentTypeOwner,
  type AgentTypeRowView,
  type AgentTypeSaveRequest,
  type AgentTypeSettingsData,
} from '../../../headless'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import Field from '../../primitives/Field'
import { Input } from '../../primitives/Input'
import { ConfirmDialog, Modal } from '../../primitives/Modal'
import { NativeSelect } from '../../primitives/NativeSelect'
import { Switch } from '../../primitives/Switch'
import { Textarea } from '../../primitives/Textarea'

export interface AgentTypeSettingsPanelProps {
  /** The project or the group whose agent types these are. */
  owner: AgentTypeOwner
  /** Its types and slot defaults; nothing is listed until they are read. */
  data: AgentTypeSettingsData | undefined
  /** Why the last read or change failed. */
  error: string | null
  busy: boolean
  /** Save a type; resolves `true` when it was kept. */
  onSave: (request: AgentTypeSaveRequest) => Promise<boolean>
  /** Delete one of the owner's types; resolves `true` when it is gone. */
  onRemove: (agentTypeId: string) => Promise<boolean>
  /** Replace the owner's own slot defaults. */
  onSaveSlots: (slots: AgentTypeSlotMap) => Promise<boolean>
  /** A type to open in the editor first. */
  initialEditId?: string
}

const capitalized = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1)

function Tag({ children }: { children: string }) {
  return (
    <span className="shrink-0 rounded-full border border-(--border-default) px-1.5 text-[10px] text-(--text-secondary)">
      {children}
    </span>
  )
}

function TypeRow({ row, onOpen }: { row: AgentTypeRowView; onOpen?: () => void }) {
  const body = (
    <>
      <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
        <span className="max-w-full min-w-0 truncate text-sm font-medium">{row.label}</span>
        <span className="min-w-0 font-mono text-[11px] break-all text-(--text-muted)">
          {row.id}
        </span>
        <Tag>{capitalized(row.roleLabel)}</Tag>
        {row.notProving ? <Tag>{AGENT_TYPE_NOT_PROVING_TAG}</Tag> : null}
      </span>
      {row.description ? (
        <span className="text-[12px] text-(--text-secondary)">{row.description}</span>
      ) : null}
    </>
  )
  return onOpen ? (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full flex-col gap-0.5 px-3 py-2 text-left hover:bg-(--surface-raised)"
      >
        {body}
      </button>
    </li>
  ) : (
    <li className="flex flex-col gap-0.5 px-3 py-2">{body}</li>
  )
}

/**
 * A project's or a group's agent types as its Settings show them: the slot
 * defaults a launch starts from — which a project sets itself and which it
 * inherits from its group — the types it keeps, opened to edit, and, for a
 * project, the ones its group gives it. `AgentTypeSettings` reads and changes
 * them. Native peer: `native/compound/settings/AgentTypeSettings`.
 */
export default function AgentTypeSettingsPanel({
  owner,
  data,
  error,
  busy,
  onSave,
  onRemove,
  onSaveSlots,
  initialEditId,
}: AgentTypeSettingsPanelProps) {
  const [draft, setDraft] = useState<AgentTypeDraft | undefined>(() => {
    const initial = initialEditId ? data?.agentTypes.find((t) => t.id === initialEditId) : undefined
    return initial ? agentTypeDraftOf(initial) : undefined
  })
  const [removing, setRemoving] = useState<string | undefined>(undefined)
  const view = useMemo(() => (data ? agentTypeSettingsView(data, owner) : undefined), [data, owner])
  const ownSlots =
    owner.kind === 'project' ? (data?.ownSlotDefaults ?? {}) : (data?.slotDefaults ?? {})
  const takenIds = data?.agentTypes.map((t) => t.id) ?? []
  const problem = draft ? agentTypeDraftProblem(draft, takenIds) : undefined
  const proving = draft ? AGENT_TYPE_PROVING_ROLES.includes(draft.baseRole) : false
  const patch = (next: Partial<AgentTypeDraft>) =>
    setDraft((prev) => (prev ? { ...prev, ...next } : prev))
  const storedOf = (id: string): ResolvedAgentType | undefined =>
    data?.agentTypes.find((t) => t.id === id)

  const saveDraft = async () => {
    if (!draft || problem) return
    if (await onSave(agentTypeSaveRequest(draft))) setDraft(undefined)
  }
  const setSlot = (slot: AgentTypeSlot, agentTypeId: string) =>
    void onSaveSlots(agentTypeSlotsWith(ownSlots, slot, agentTypeId || undefined))

  return (
    <section className="flex max-w-2xl flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-semibold">{AGENT_TYPE_SETTINGS_HEADING}</h3>
        <p className="text-sm text-(--text-secondary)">
          {owner.kind === 'project'
            ? AGENT_TYPE_SETTINGS_PROJECT_INTRO
            : AGENT_TYPE_SETTINGS_GROUP_INTRO}
        </p>
      </div>
      {error && !draft ? <Alert>{error}</Alert> : null}
      {view ? (
        <>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">{AGENT_TYPE_SLOT_DEFAULTS_HEADING}</span>
            <span className="text-[12px] text-(--text-secondary)">
              {AGENT_TYPE_SLOT_DEFAULTS_NOTE}
            </span>
            {view.slots.map((slot) => (
              <div key={slot.slot} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="w-28 shrink-0 text-sm">{slot.slotLabel}</span>
                <NativeSelect
                  size="sm"
                  aria-label={slot.slotLabel}
                  value={slot.value ?? ''}
                  disabled={busy}
                  onChange={(e) => setSlot(slot.slot, e.target.value)}
                  className="max-w-xs min-w-48 flex-1"
                >
                  <option value="">{slot.fallbackLabel}</option>
                  {slot.options.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label} · {option.scopeLabel}
                    </option>
                  ))}
                </NativeSelect>
                <Tag>{slot.sourceLabel}</Tag>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{AGENT_TYPE_OWN_HEADING}</span>
              <Button size="sm" variant="secondary" onClick={() => setDraft(agentTypeDraftOf())}>
                {AGENT_TYPE_ACTIONS.add}
              </Button>
            </div>
            {view.own.length > 0 ? (
              <ul className="divide-y divide-(--border-subtle) rounded-md border border-(--border-subtle)">
                {view.own.map((row) => (
                  <TypeRow
                    key={row.id}
                    row={row}
                    onOpen={() => setDraft(agentTypeDraftOf(storedOf(row.id)))}
                  />
                ))}
              </ul>
            ) : (
              <span className="text-[12px] text-(--text-secondary)">{AGENT_TYPE_NONE_YET}</span>
            )}
          </div>

          {view.inherited.length > 0 ? (
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">{AGENT_TYPE_INHERITED_HEADING}</span>
              <ul className="divide-y divide-(--border-subtle) rounded-md border border-(--border-subtle)">
                {view.inherited.map((row) => (
                  <TypeRow key={row.id} row={row} />
                ))}
              </ul>
            </div>
          ) : null}

          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">{AGENT_TYPE_BUILTINS_HEADING}</span>
            <div className="flex flex-wrap gap-1.5">
              {view.builtins.map((type) => (
                <Tag key={type.id}>{type.label}</Tag>
              ))}
            </div>
          </div>
        </>
      ) : null}

      {draft ? (
        <Modal
          isOpen
          onClose={() => setDraft(undefined)}
          title={draft.isNew ? AGENT_TYPE_ACTIONS.add : draft.label || draft.id}
          size="lg"
          footer={
            <div className="flex w-full items-center gap-2">
              {!draft.isNew ? (
                <Button variant="danger" onClick={() => setRemoving(draft.id)} disabled={busy}>
                  {AGENT_TYPE_ACTIONS.remove}
                </Button>
              ) : null}
              <span className="flex-1" />
              <Button variant="ghost" onClick={() => setDraft(undefined)}>
                {AGENT_TYPE_ACTIONS.cancel}
              </Button>
              <Button
                onClick={() => void saveDraft()}
                loading={busy}
                disabled={problem !== undefined || busy}
              >
                {AGENT_TYPE_ACTIONS.save}
              </Button>
            </div>
          }
        >
          <div className="flex flex-col gap-3">
            {error ? <Alert>{error}</Alert> : null}
            {problem ? (
              <span className="text-[12px] text-(--text-secondary)">{problem}</span>
            ) : null}
            <Field label={AGENT_TYPE_FIELD_LABELS.id} hint={AGENT_TYPE_FIELD_HINTS.id}>
              <Input
                value={draft.id}
                disabled={!draft.isNew}
                onChange={(e) => patch({ id: e.target.value })}
              />
            </Field>
            <Field label={AGENT_TYPE_FIELD_LABELS.label}>
              <Input value={draft.label} onChange={(e) => patch({ label: e.target.value })} />
            </Field>
            <Field label={AGENT_TYPE_FIELD_LABELS.description}>
              <Input
                value={draft.description}
                onChange={(e) => patch({ description: e.target.value })}
              />
            </Field>
            <Field label={AGENT_TYPE_FIELD_LABELS.baseRole}>
              <NativeSelect
                value={draft.baseRole}
                onChange={(e) => patch({ baseRole: e.target.value as AgentRunType })}
              >
                {AGENT_RUN_TYPES.map((role) => (
                  <option key={role} value={role}>
                    {capitalized(agentRoleLabel(role))}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label={AGENT_TYPE_FIELD_LABELS.brief}>
              <Textarea
                rows={5}
                value={draft.brief}
                onChange={(e) => patch({ brief: e.target.value })}
              />
            </Field>
            <Switch
              checked={draft.briefMode === 'replace'}
              onCheckedChange={(on) => patch({ briefMode: on ? 'replace' : 'append' })}
              label={AGENT_TYPE_FIELD_LABELS.briefReplaces}
            />
            {proving ? (
              <div className="flex flex-col gap-1">
                <Switch
                  checked={draft.proves}
                  onCheckedChange={(on) => patch({ proves: on })}
                  label={AGENT_TYPE_FIELD_LABELS.proves}
                />
                <span className="text-xs opacity-60">{AGENT_TYPE_FIELD_HINTS.proves}</span>
              </div>
            ) : null}
            <Field label={AGENT_TYPE_FIELD_LABELS.tools} hint={AGENT_TYPE_FIELD_HINTS.tools}>
              <Textarea
                rows={4}
                value={draft.tools}
                onChange={(e) => patch({ tools: e.target.value })}
                className="font-mono text-[12px]"
              />
            </Field>
            <Field
              label={AGENT_TYPE_FIELD_LABELS.contextDocs}
              hint={AGENT_TYPE_FIELD_HINTS.contextDocs}
            >
              <Textarea
                rows={3}
                value={draft.contextDocs}
                onChange={(e) => patch({ contextDocs: e.target.value })}
                className="font-mono text-[12px]"
              />
            </Field>
          </div>
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
            if (await onRemove(removing)) setDraft(undefined)
            setRemoving(undefined)
          }}
        />
      ) : null}
    </section>
  )
}
