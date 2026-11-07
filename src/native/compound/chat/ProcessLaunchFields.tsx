import { useState, type ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'
import type { ProcessInput, ProcessInputField } from 'thefactory-tools/types'

import {
  PROCESS_LAUNCH_COPY,
  addProcessLaunchVariant,
  isProcessLaunchOneRef,
  processLaunchLayout,
  processLaunchPatchLabel,
  processLaunchRefToggleLabel,
  processLaunchVariantRows,
  processLaunchVariants,
  removeProcessLaunchVariant,
  setProcessLaunchRef,
  setProcessLaunchValue,
  setProcessLaunchVariantField,
  setProcessLaunchVariantLabel,
  toggleProcessLaunchOneRef,
  type ProcessLaunchDraft,
  type ProcessLaunchFieldDraft,
  type ProcessLaunchProblem,
  type ProcessLaunchRefDraft,
  type ProcessLaunchRepos,
  type ProcessLaunchVariantDraft,
} from '../../../headless'
import { nativeFontFamilies, nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconChevronRight, IconClose, IconDocument, IconPlus } from '../../icons'
import { Input } from '../../primitives/Input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../primitives/Select'
import { Textarea } from '../../primitives/Textarea'
import RefChip from '../chips/RefChip'

/** A note the form can pick. */
export type ProcessLaunchNote = { id: string; label: string }

export type ProcessLaunchFieldsProps = {
  inputs: readonly ProcessInput[]
  draft: ProcessLaunchDraft
  repos: ProcessLaunchRepos
  problem: ProcessLaunchProblem | undefined
  /** Mark the field that holds it: once the form was touched, or it came with one. */
  marked: boolean
  notes: readonly ProcessLaunchNote[]
  /** Reads a note's text, for a patch. */
  loadNote: (noteId: string) => Promise<string>
  busy: boolean
  onChange: (next: ProcessLaunchDraft) => void
  /** Push a variant's own screen. Without it a variant opens in place, for a card in a chat. */
  onOpenVariant?: (inputName: string, variantKey: string) => void
}

const NONE = '__none__'

function FieldLabel({ text, optional }: { text: string; optional?: boolean }) {
  const { theme } = useNativeTheme()
  return (
    <Text style={{ fontSize: 12.5, fontWeight: '500', color: theme.text.secondary }}>
      {text}
      {optional ? (
        <Text style={{ fontWeight: '400', color: theme.text.muted }}>
          {`  ${PROCESS_LAUNCH_COPY.optional}`}
        </Text>
      ) : null}
    </Text>
  )
}

function NoteField({
  label,
  value,
  notes,
  optional,
  busy,
  onPick,
}: {
  label: string
  value: string
  notes: readonly ProcessLaunchNote[]
  optional?: boolean
  busy: boolean
  onPick: (noteId: string) => void
}) {
  return (
    <View style={{ gap: 4 }}>
      <FieldLabel text={label} {...(optional ? { optional } : {})} />
      <Select value={value || NONE} onValueChange={(v) => onPick(v === NONE ? '' : v)}>
        <SelectTrigger accessibilityLabel={label} disabled={busy}>
          <SelectValue placeholder={PROCESS_LAUNCH_COPY.chooseNote} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>
            {optional ? PROCESS_LAUNCH_COPY.patchNone : PROCESS_LAUNCH_COPY.chooseNote}
          </SelectItem>
          {notes.map((note) => (
            <SelectItem key={note.id} value={note.id}>
              {note.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </View>
  )
}

function TextField({
  label,
  value,
  bad,
  busy,
  numeric,
  mono,
  placeholder,
  onChange,
}: {
  label: string
  value: string
  bad: boolean
  busy: boolean
  numeric?: boolean
  mono?: boolean
  placeholder?: string
  onChange: (value: string) => void
}) {
  return (
    <View style={{ gap: 4 }}>
      <FieldLabel text={label} />
      <Input
        value={value}
        invalid={bad}
        disabled={busy}
        accessibilityLabel={label}
        autoCapitalize={mono ? 'none' : 'sentences'}
        {...(numeric ? { keyboardType: 'number-pad' as const } : {})}
        {...(mono ? { style: { fontFamily: nativeFontFamilies.mono } } : {})}
        {...(placeholder ? { placeholder } : {})}
        onChangeText={onChange}
      />
    </View>
  )
}

function RefRows({
  rows,
  fieldKey,
  props,
  onChange,
}: {
  rows: readonly ProcessLaunchRefDraft[]
  fieldKey: string
  props: ProcessLaunchFieldsProps
  onChange: (rows: readonly ProcessLaunchRefDraft[]) => void
}) {
  const { theme } = useNativeTheme()
  const { repos, notes, problem, marked, busy, loadNote } = props
  const [picked, setPicked] = useState<Readonly<Record<string, string>>>({})
  const toggle = processLaunchRefToggleLabel(rows, repos)
  const one = isProcessLaunchOneRef(rows, repos)
  const pickPatch = (row: ProcessLaunchRefDraft, noteId: string) => {
    setPicked((prev) => ({ ...prev, [row.repo.key]: noteId }))
    if (!noteId) return onChange(setProcessLaunchRef(rows, row.repo.key, { patch: '' }))
    const label = notes.find((n) => n.id === noteId)?.label
    void loadNote(noteId).then((patch) =>
      onChange(
        setProcessLaunchRef(rows, row.repo.key, { patch, ...(label ? { patchLabel: label } : {}) }),
      ),
    )
  }
  return (
    <View style={{ gap: nativeSpace[3] }}>
      {rows.map((row) => (
        <TextField
          key={row.repo.key}
          label={one ? PROCESS_LAUNCH_COPY.ref : row.repo.label}
          value={row.ref}
          bad={marked && problem?.fieldKey === fieldKey && row.ref.trim() === ''}
          busy={busy}
          mono
          placeholder={PROCESS_LAUNCH_COPY.refPlaceholder}
          onChange={(ref) => onChange(setProcessLaunchRef(rows, row.repo.key, { ref }))}
        />
      ))}
      {toggle ? (
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => onChange(toggleProcessLaunchOneRef(rows, repos))}
        >
          <Text style={{ fontSize: 12, color: theme.accent.primary }}>{toggle}</Text>
        </Pressable>
      ) : null}
      {rows.map((row) => (
        <NoteField
          key={row.repo.key}
          label={processLaunchPatchLabel(row.repo, rows.length)}
          value={picked[row.repo.key] ?? ''}
          notes={notes}
          optional
          busy={busy}
          onPick={(noteId) => pickPatch(row, noteId)}
        />
      ))}
    </View>
  )
}

function InputField({
  field,
  value,
  fieldKey,
  props,
  onChange,
}: {
  field: Pick<ProcessInputField, 'kind' | 'label' | 'required'>
  value: ProcessLaunchFieldDraft | undefined
  fieldKey: string
  props: ProcessLaunchFieldsProps
  onChange: (value: ProcessLaunchFieldDraft) => void
}) {
  const { problem, marked, busy, notes } = props
  const bad = marked && problem?.fieldKey === fieldKey
  if (field.kind === 'refs') {
    return (
      <RefRows
        rows={typeof value === 'string' || !value ? [] : value}
        fieldKey={fieldKey}
        props={props}
        onChange={onChange}
      />
    )
  }
  const text = typeof value === 'string' ? value : ''
  if (field.kind === 'note-reference') {
    return (
      <NoteField
        label={field.label}
        value={text}
        notes={notes}
        {...(field.required ? {} : { optional: true })}
        busy={busy}
        onPick={onChange}
      />
    )
  }
  if (field.kind === 'number') {
    return (
      <TextField
        label={field.label}
        value={text}
        bad={bad}
        busy={busy}
        numeric
        onChange={onChange}
      />
    )
  }
  return (
    <View style={{ gap: 4 }}>
      <FieldLabel text={field.label} {...(field.required ? {} : { optional: true })} />
      <Textarea
        rows={3}
        value={text}
        invalid={bad}
        disabled={busy}
        accessibilityLabel={field.label}
        onChangeText={onChange}
      />
    </View>
  )
}

/** One variant's fields: inside its row in a chat, or on its own pushed screen. */
export function ProcessLaunchVariantForm({
  input,
  variant,
  props,
}: {
  input: ProcessInput
  variant: ProcessLaunchVariantDraft
  props: ProcessLaunchFieldsProps
}) {
  const { draft, problem, marked, busy, onChange } = props
  return (
    <View style={{ gap: nativeSpace[3] }}>
      <TextField
        label={PROCESS_LAUNCH_COPY.variantLabel}
        value={variant.label}
        bad={marked && problem?.fieldKey === `${input.name}.${variant.key}.label`}
        busy={busy}
        placeholder={PROCESS_LAUNCH_COPY.variantLabelHint}
        onChange={(label) =>
          onChange(setProcessLaunchVariantLabel(draft, input.name, variant.key, label))
        }
      />
      {(input.fields ?? []).map((field) => (
        <InputField
          key={field.name}
          field={field}
          value={variant.values[field.name]}
          fieldKey={`${input.name}.${variant.key}.${field.name}`}
          props={props}
          onChange={(value) =>
            onChange(
              setProcessLaunchVariantField(draft, input.name, variant.key, field.name, value),
            )
          }
        />
      ))}
    </View>
  )
}

function VariantList({ input, props }: { input: ProcessInput; props: ProcessLaunchFieldsProps }) {
  const { theme, status } = useNativeTheme()
  const { draft, repos, problem, marked, busy, onChange, onOpenVariant } = props
  const variants = processLaunchVariants(draft, input.name)
  const [picked, setPicked] = useState<string | undefined | null>(
    !onOpenVariant && variants.length === 1 && variants[0]!.label === ''
      ? variants[0]!.key
      : undefined,
  )
  const open = onOpenVariant ? undefined : (picked ?? (marked ? problem?.variantKey : undefined))
  const rows = processLaunchVariantRows(variants, marked ? problem : undefined)
  return (
    <View style={{ gap: 6 }}>
      <FieldLabel text={input.label} />
      <View
        style={{
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: theme.border.default,
          borderRadius: nativeRadii[3],
        }}
      >
        {rows.map((row, at) => {
          const shown = open === row.key
          return (
            <View
              key={row.key}
              style={{
                borderTopWidth: at === 0 ? 0 : 1,
                borderTopColor: theme.border.subtle,
                ...(row.bad ? { backgroundColor: status.stuck.softBg } : {}),
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: shown }}
                  onPress={() =>
                    onOpenVariant
                      ? onOpenVariant(input.name, row.key)
                      : setPicked(shown ? null : row.key)
                  }
                  style={{ flex: 1, gap: 6, paddingHorizontal: 12, paddingVertical: 10 }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text
                      numberOfLines={1}
                      style={{
                        flex: 1,
                        fontSize: 13.5,
                        fontWeight: '600',
                        color: row.unnamed ? theme.text.muted : theme.text.primary,
                      }}
                    >
                      {row.name}
                    </Text>
                    <IconChevronRight size={14} color={theme.text.muted} />
                  </View>
                  {shown ? null : row.chips.length > 0 ? (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                      {row.chips.map((chip) =>
                        chip.kind === 'ref' ? (
                          <RefChip key={chip.key} value={chip.text} kind="commit" />
                        ) : (
                          <View
                            key={chip.key}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 4,
                              paddingHorizontal: 8,
                              paddingVertical: 1,
                              borderRadius: 999,
                              borderWidth: 1,
                              borderColor: theme.border.default,
                            }}
                          >
                            <IconDocument size={12} color={theme.text.secondary} />
                            <Text style={{ fontSize: 11.5, color: theme.text.secondary }}>
                              {chip.text}
                            </Text>
                          </View>
                        ),
                      )}
                    </View>
                  ) : (
                    <Text style={{ fontSize: 12, color: theme.text.muted }}>
                      {PROCESS_LAUNCH_COPY.notSet}
                    </Text>
                  )}
                </Pressable>
                {onOpenVariant ? null : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={PROCESS_LAUNCH_COPY.removeVariant(at + 1)}
                    disabled={busy}
                    onPress={() => onChange(removeProcessLaunchVariant(draft, input.name, row.key))}
                    style={{ padding: 10 }}
                  >
                    <IconClose size={14} color={theme.text.secondary} />
                  </Pressable>
                )}
              </View>
              {shown ? (
                <View
                  style={{
                    padding: 12,
                    borderTopWidth: 1,
                    borderTopColor: theme.border.subtle,
                  }}
                >
                  <ProcessLaunchVariantForm input={input} variant={variants[at]!} props={props} />
                </View>
              ) : null}
            </View>
          )
        })}
      </View>
      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={() => {
          const next = addProcessLaunchVariant(draft, input, repos)
          onChange(next)
          const added = processLaunchVariants(next, input.name).at(-1)?.key
          if (added && onOpenVariant) onOpenVariant(input.name, added)
          else setPicked(added)
        }}
        style={{
          flexDirection: 'row',
          alignSelf: 'flex-start',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: 10,
          paddingVertical: 5,
          borderRadius: 999,
          borderWidth: 1,
          borderStyle: 'dashed',
          borderColor: theme.border.strong,
        }}
      >
        <IconPlus size={12} color={theme.text.muted} />
        <Text style={{ fontSize: 11.5, color: theme.text.muted }}>
          {PROCESS_LAUNCH_COPY.addVariant}
        </Text>
      </Pressable>
    </View>
  )
}

function Fill({
  input,
  props,
}: {
  input: ProcessInput
  props: ProcessLaunchFieldsProps
}): ReactNode {
  const { draft, onChange } = props
  if (input.kind === 'variants') return <VariantList input={input} props={props} />
  return (
    <InputField
      field={input as ProcessInput & Pick<ProcessInputField, 'kind'>}
      value={draft.values[input.name] as ProcessLaunchFieldDraft | undefined}
      fieldKey={input.name}
      props={props}
      onChange={(next) => onChange(setProcessLaunchValue(draft, input.name, next))}
    />
  )
}

/** Native peer of web's `ProcessLaunchFields`: the same form, one field under the other. */
export default function ProcessLaunchFields(props: ProcessLaunchFieldsProps) {
  const { short, long } = processLaunchLayout(props.inputs)
  return (
    <View style={{ gap: nativeSpace[4] }}>
      {[...short, ...long].map((input) => (
        <Fill key={input.name} input={input} props={props} />
      ))}
    </View>
  )
}
