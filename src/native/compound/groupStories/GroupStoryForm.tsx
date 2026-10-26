import { useEffect, useRef, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'

import {
  extractErrorMessage,
  groupStoryFormProblems,
  groupStoryFormRequest,
  groupStoryNeedOptions,
  type GroupProjectStoryOption,
  type GroupStoryForm as GroupStoryFormValue,
  type GroupStoryFormRow,
  type GroupStoryPartChoice,
  type GroupStoryWriteBody,
} from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import Field from '../../primitives/Field'
import { Input } from '../../primitives/Input'
import { Modal } from '../../primitives/Modal'
import SegmentedControl from '../../primitives/SegmentedControl'
import { Textarea } from '../../primitives/Textarea'
import { GroupStoryChip } from './GroupStoryBits'

const CHOICES: { value: GroupStoryPartChoice; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'existing', label: 'Use a story' },
  { value: 'new', label: 'New story' },
]

export type GroupStoryFormProps = {
  form: GroupStoryFormValue
  onChange: (form: GroupStoryFormValue) => void
  storiesByProject: Readonly<Record<string, readonly GroupProjectStoryOption[]>>
  disabled?: boolean
}

/**
 * Native peer of
 * [web's `GroupStoryFormFields`](../../../web/compound/groupStories/GroupStoryForm.tsx):
 * title, description and a row per member project — no part, one of its
 * stories, or a new one — with the other parts it needs first.
 */
export function GroupStoryFormFields({
  form,
  onChange,
  storiesByProject,
  disabled = false,
}: GroupStoryFormProps) {
  const { theme } = useNativeTheme()
  const setRow = (projectId: string, change: Partial<GroupStoryFormRow>) => {
    const rows = form.rows.map((r) => (r.projectId === projectId ? { ...r, ...change } : r))
    const taking = new Set(rows.filter((r) => r.choice !== 'none').map((r) => r.projectId))
    onChange({
      ...form,
      rows: rows.map((r) => ({ ...r, needs: r.needs.filter((n) => taking.has(n)) })),
    })
  }
  return (
    <View style={{ gap: nativeSpace[4] }}>
      <Field label="Title">
        <Input
          value={form.title}
          disabled={disabled}
          placeholder="What the whole feature is"
          onChangeText={(title) => onChange({ ...form, title })}
        />
      </Field>
      <Field label="Description" hint="New part stories start with it too.">
        <Textarea
          rows={3}
          value={form.description}
          disabled={disabled}
          onChangeText={(description) => onChange({ ...form, description })}
        />
      </Field>
      <Text
        style={{
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.6,
          textTransform: 'uppercase',
          color: theme.text.muted,
        }}
      >
        Parts — one story per project
      </Text>
      <View
        style={{ borderWidth: 1, borderColor: theme.border.subtle, borderRadius: nativeRadii[3] }}
      >
        {form.rows.map((row, i) => (
          <PartRow
            key={row.projectId}
            row={row}
            form={form}
            first={i === 0}
            stories={storiesByProject[row.projectId]}
            disabled={disabled}
            onChange={(change) => setRow(row.projectId, change)}
          />
        ))}
      </View>
    </View>
  )
}

function PartRow({
  row,
  form,
  first,
  stories,
  disabled,
  onChange,
}: {
  row: GroupStoryFormRow
  form: GroupStoryFormValue
  first: boolean
  stories: readonly GroupProjectStoryOption[] | undefined
  disabled: boolean
  onChange: (change: Partial<GroupStoryFormRow>) => void
}) {
  const { theme } = useNativeTheme()
  const [picking, setPicking] = useState(false)
  const needOptions = groupStoryNeedOptions(form, row.projectId)
  const picked = stories?.find((s) => s.id === row.storyId)
  return (
    <View
      style={{
        gap: nativeSpace[2],
        padding: nativeSpace[3],
        borderTopWidth: first ? 0 : 1,
        borderTopColor: theme.border.subtle,
      }}
    >
      <Text style={{ fontSize: 14, fontWeight: '500', color: theme.text.primary }}>
        {row.projectTitle}
      </Text>
      <SegmentedControl
        size="sm"
        ariaLabel={`How ${row.projectTitle} takes part`}
        options={CHOICES}
        value={row.choice}
        onChange={(value) => onChange({ choice: value as GroupStoryPartChoice })}
      />
      {row.choice === 'existing' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${row.projectTitle}’s story`}
          disabled={disabled}
          onPress={() => setPicking(true)}
          style={{
            minHeight: 44,
            justifyContent: 'center',
            paddingHorizontal: nativeSpace[3],
            borderWidth: 1,
            borderColor: theme.border.default,
            borderRadius: nativeRadii[2],
            backgroundColor: theme.surface.raised,
          }}
        >
          <Text
            numberOfLines={1}
            style={{ fontSize: 14, color: picked ? theme.text.primary : theme.text.muted }}
          >
            {picked?.title ?? (stories ? 'Pick a story…' : 'Loading its stories…')}
          </Text>
        </Pressable>
      ) : null}
      {row.choice === 'new' ? (
        <Input
          size="sm"
          disabled={disabled}
          accessibilityLabel={`${row.projectTitle}’s new story`}
          placeholder={form.title.trim() || 'The group story’s title'}
          value={row.newStoryTitle ?? ''}
          onChangeText={(newStoryTitle) => onChange({ newStoryTitle })}
        />
      ) : null}
      {row.choice !== 'none' && needOptions.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 12, color: theme.text.muted }}>Needs first</Text>
          {needOptions.map((option) => {
            const on = row.needs.includes(option.id)
            return (
              <GroupStoryChip
                key={option.id}
                label={option.title}
                tone={on ? 'blocks' : 'neutral'}
                accessibilityLabel={`${on ? 'Needs' : 'Does not need'} ${option.title} first`}
                onPress={() =>
                  onChange({
                    needs: on
                      ? row.needs.filter((n) => n !== option.id)
                      : [...row.needs, option.id],
                  })
                }
              />
            )
          })}
        </View>
      ) : null}
      <Modal
        isOpen={picking}
        onClose={() => setPicking(false)}
        title={`${row.projectTitle}’s stories`}
      >
        <ScrollView style={{ maxHeight: 420 }}>
          {(stories ?? []).length === 0 ? (
            <Text style={{ padding: nativeSpace[3], fontSize: 13, color: theme.text.secondary }}>
              {stories ? 'This project has no stories.' : 'Loading its stories…'}
            </Text>
          ) : (
            (stories ?? []).map((s) => (
              <Pressable
                key={s.id}
                accessibilityRole="button"
                onPress={() => {
                  onChange({ storyId: s.id })
                  setPicking(false)
                }}
                style={({ pressed }) => ({
                  minHeight: 44,
                  justifyContent: 'center',
                  paddingHorizontal: nativeSpace[3],
                  backgroundColor:
                    s.id === row.storyId || pressed ? theme.surface.hover : 'transparent',
                })}
              >
                <Text numberOfLines={2} style={{ fontSize: 14, color: theme.text.primary }}>
                  {s.title}
                </Text>
              </Pressable>
            ))
          )}
        </ScrollView>
      </Modal>
    </View>
  )
}

export type GroupStoryFormDialogProps = {
  isOpen: boolean
  onClose: () => void
  mode: 'new' | 'edit'
  initialForm: GroupStoryFormValue
  storiesByProject: Readonly<Record<string, readonly GroupProjectStoryOption[]>>
  onSave: (body: GroupStoryWriteBody) => Promise<void>
}

/** Native peer of web's `GroupStoryFormDialog`: the new — or edit — group story form, saved once nothing stops it. */
export function GroupStoryFormDialog({
  isOpen,
  onClose,
  mode,
  initialForm,
  storiesByProject,
  onSave,
}: GroupStoryFormDialogProps) {
  const { theme } = useNativeTheme()
  const [form, setForm] = useState(initialForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const wasOpen = useRef(false)
  useEffect(() => {
    if (isOpen && !wasOpen.current) {
      setForm(initialForm)
      setError(null)
    }
    wasOpen.current = isOpen
  }, [isOpen, initialForm])

  const problems = groupStoryFormProblems(form)
  const save = () => {
    setSaving(true)
    setError(null)
    void onSave(groupStoryFormRequest(form))
      .then(onClose)
      .catch((err: unknown) => setError(extractErrorMessage(err, 'It could not be saved.')))
      .finally(() => setSaving(false))
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      fillHeight
      title={mode === 'new' ? 'New group story' : 'Edit group story'}
      footer={
        <View style={{ gap: nativeSpace[2] }}>
          {problems.length > 0 ? (
            <Text style={{ fontSize: 12, color: theme.text.muted }}>{problems[0]}</Text>
          ) : null}
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: nativeSpace[2] }}>
            <Button variant="secondary" onPress={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={saving}
              disabled={problems.length > 0 || saving}
              onPress={save}
            >
              {mode === 'new' ? 'Create' : 'Save'}
            </Button>
          </View>
        </View>
      }
    >
      <ScrollView contentContainerStyle={{ gap: nativeSpace[3] }}>
        {error ? <Alert variant="error">{error}</Alert> : null}
        <GroupStoryFormFields
          form={form}
          onChange={setForm}
          storiesByProject={storiesByProject}
          disabled={saving}
        />
      </ScrollView>
    </Modal>
  )
}
