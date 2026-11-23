import { useEffect, useRef, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'

import {
  extractErrorMessage,
  GROUP_STORY_FORM_LABELS as TEXT,
  groupStoryFormMovedPart,
  groupStoryFormPartMoves,
  groupStoryFormProblems,
  groupStoryFormRequest,
  groupStoryFormWithLink,
  groupStoryFormWithLinkStory,
  groupStoryFormWithoutLink,
  groupStoryFormWithoutPart,
  groupStoryFormWithPart,
  groupStoryNeedOptions,
  type GroupProjectStoryOption,
  type GroupStoryForm as GroupStoryFormValue,
  type GroupStoryFormLink,
  type GroupStoryFormRow,
  type GroupStoryPartChoice,
  type GroupStoryWriteBody,
} from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconArrowDown, IconArrowUp, IconDelete, IconPlus } from '../../icons'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import Field from '../../primitives/Field'
import IconButton from '../../primitives/IconButton'
import { Input } from '../../primitives/Input'
import { Modal } from '../../primitives/Modal'
import SegmentedControl from '../../primitives/SegmentedControl'
import { Textarea } from '../../primitives/Textarea'
import { GroupStoryChip } from './GroupStoryBits'

const CHOICES: { value: GroupStoryPartChoice; label: string }[] = [
  { value: 'existing', label: TEXT.existing },
  { value: 'new', label: TEXT.new },
]

export type GroupStoryFormProps = {
  form: GroupStoryFormValue
  onChange: (form: GroupStoryFormValue) => void
  storiesByProject: Readonly<Record<string, readonly GroupProjectStoryOption[]>>
  disabled?: boolean
}

function Heading({ title, hint }: { title: string; hint: string }) {
  const { theme } = useNativeTheme()
  return (
    <View style={{ gap: 2 }}>
      <Text
        style={{
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.6,
          textTransform: 'uppercase',
          color: theme.text.muted,
        }}
      >
        {title}
      </Text>
      <Text style={{ fontSize: 12, color: theme.text.muted }}>{hint}</Text>
    </View>
  )
}

/**
 * Native peer of
 * [web's `GroupStoryFormFields`](../../../web/compound/groupStories/GroupStoryForm.tsx):
 * title and description; its parts, each project's in the order they run —
 * one of its stories or a new one, moved up or down, with the other projects'
 * parts it needs first; and the stories it links, tracked only.
 */
export function GroupStoryFormFields({
  form,
  onChange,
  storiesByProject,
  disabled = false,
}: GroupStoryFormProps) {
  const { theme } = useNativeTheme()
  const [linking, setLinking] = useState(false)
  const setRow = (key: string, change: Partial<GroupStoryFormRow>) =>
    onChange({ ...form, rows: form.rows.map((r) => (r.key === key ? { ...r, ...change } : r)) })
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
      <Heading title={TEXT.parts} hint={TEXT.partsHint} />
      <View
        style={{ borderWidth: 1, borderColor: theme.border.subtle, borderRadius: nativeRadii[3] }}
      >
        {form.projects.map((project, i) => {
          const rows = form.rows.filter((r) => r.projectId === project.id)
          return (
            <View
              key={project.id}
              style={{
                gap: nativeSpace[2],
                padding: nativeSpace[3],
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: theme.border.subtle,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
                <Text
                  numberOfLines={1}
                  style={{ flex: 1, fontSize: 14, fontWeight: '500', color: theme.text.primary }}
                >
                  {project.title}
                </Text>
                {rows.length === 0 ? (
                  <Text style={{ fontSize: 12, color: theme.text.muted }}>{TEXT.noParts}</Text>
                ) : null}
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={disabled}
                  accessibilityLabel={`${TEXT.addPart} in ${project.title}`}
                  onPress={() => onChange(groupStoryFormWithPart(form, project.id))}
                >
                  <IconPlus size={14} color={theme.text.secondary} />
                  <Text style={{ fontSize: 13, color: theme.text.secondary }}>{TEXT.addPart}</Text>
                </Button>
              </View>
              {rows.map((row, place) => (
                <PartRow
                  key={row.key}
                  row={row}
                  place={rows.length > 1 ? place + 1 : undefined}
                  form={form}
                  storiesByProject={storiesByProject}
                  disabled={disabled}
                  onChange={(change) => setRow(row.key, change)}
                  onMove={(direction) =>
                    onChange(groupStoryFormMovedPart(form, row.key, direction))
                  }
                  onRemove={() => onChange(groupStoryFormWithoutPart(form, row.key))}
                />
              ))}
            </View>
          )
        })}
      </View>
      <Heading title={TEXT.linked} hint={TEXT.linkedHint} />
      {form.links.map((link) => (
        <LinkRow
          key={link.key}
          link={link}
          stories={storiesByProject[link.projectId]}
          disabled={disabled}
          onPick={(storyId) => onChange(groupStoryFormWithLinkStory(form, link.key, storyId))}
          onRemove={() => onChange(groupStoryFormWithoutLink(form, link.key))}
        />
      ))}
      <Button variant="secondary" size="sm" disabled={disabled} onPress={() => setLinking(true)}>
        {`${TEXT.addLink}…`}
      </Button>
      <Modal isOpen={linking} onClose={() => setLinking(false)} title={TEXT.addLink}>
        <ScrollView style={{ maxHeight: 420 }}>
          {form.projects.map((p) => (
            <Pressable
              key={p.id}
              accessibilityRole="button"
              onPress={() => {
                onChange(groupStoryFormWithLink(form, p.id))
                setLinking(false)
              }}
              style={({ pressed }) => ({
                minHeight: 44,
                justifyContent: 'center',
                paddingHorizontal: nativeSpace[3],
                backgroundColor: pressed ? theme.surface.hover : 'transparent',
              })}
            >
              <Text style={{ fontSize: 14, color: theme.text.primary }}>{p.title}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </Modal>
    </View>
  )
}

/** A project's story picker: a field that opens the project's stories. */
function StoryPicker({
  label,
  projectTitle,
  storyId,
  stories,
  disabled,
  onPick,
}: {
  label: string
  projectTitle: string
  storyId: string | undefined
  stories: readonly GroupProjectStoryOption[] | undefined
  disabled: boolean
  onPick: (storyId: string) => void
}) {
  const { theme } = useNativeTheme()
  const [picking, setPicking] = useState(false)
  const picked = stories?.find((s) => s.id === storyId)
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        disabled={disabled}
        onPress={() => setPicking(true)}
        style={{
          flex: 1,
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
          {picked?.title ?? (stories ? TEXT.pickStory : TEXT.loadingStories)}
        </Text>
      </Pressable>
      <Modal isOpen={picking} onClose={() => setPicking(false)} title={`${projectTitle}’s stories`}>
        <ScrollView style={{ maxHeight: 420 }}>
          {(stories ?? []).length === 0 ? (
            <Text style={{ padding: nativeSpace[3], fontSize: 13, color: theme.text.secondary }}>
              {stories ? 'This project has no stories.' : TEXT.loadingStories}
            </Text>
          ) : (
            (stories ?? []).map((s) => (
              <Pressable
                key={s.id}
                accessibilityRole="button"
                onPress={() => {
                  onPick(s.id)
                  setPicking(false)
                }}
                style={({ pressed }) => ({
                  minHeight: 44,
                  justifyContent: 'center',
                  paddingHorizontal: nativeSpace[3],
                  backgroundColor:
                    s.id === storyId || pressed ? theme.surface.hover : 'transparent',
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
    </>
  )
}

function PartRow({
  row,
  place,
  form,
  storiesByProject,
  disabled,
  onChange,
  onMove,
  onRemove,
}: {
  row: GroupStoryFormRow
  place: number | undefined
  form: GroupStoryFormValue
  storiesByProject: Readonly<Record<string, readonly GroupProjectStoryOption[]>>
  disabled: boolean
  onChange: (change: Partial<GroupStoryFormRow>) => void
  onMove: (direction: 'up' | 'down') => void
  onRemove: () => void
}) {
  const { theme } = useNativeTheme()
  const needOptions = groupStoryNeedOptions(form, row.key, storiesByProject)
  const moves = groupStoryFormPartMoves(form, row.key)
  const name = place ? `${row.projectTitle} story ${place}` : `${row.projectTitle}’s story`
  return (
    <View
      style={{
        gap: nativeSpace[2],
        padding: nativeSpace[2],
        borderWidth: 1,
        borderColor: theme.border.subtle,
        borderRadius: nativeRadii[2],
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[1] }}>
        {place ? (
          <Text style={{ fontSize: 12, color: theme.text.muted }}>{`${place}.`}</Text>
        ) : null}
        <View style={{ flex: 1 }}>
          <SegmentedControl
            size="sm"
            ariaLabel={`How ${name} is made`}
            options={CHOICES}
            value={row.choice}
            onChange={(value) => onChange({ choice: value as GroupStoryPartChoice })}
          />
        </View>
        {place ? (
          <>
            <IconButton
              size="sm"
              disabled={disabled || !moves.up}
              accessibilityLabel={TEXT.moveUp(name)}
              onPress={() => onMove('up')}
            >
              <IconArrowUp size={16} color={theme.text.muted} />
            </IconButton>
            <IconButton
              size="sm"
              disabled={disabled || !moves.down}
              accessibilityLabel={TEXT.moveDown(name)}
              onPress={() => onMove('down')}
            >
              <IconArrowDown size={16} color={theme.text.muted} />
            </IconButton>
          </>
        ) : null}
        <IconButton
          size="sm"
          disabled={disabled}
          accessibilityLabel={TEXT.remove(name)}
          onPress={onRemove}
        >
          <IconDelete size={16} color={theme.text.muted} />
        </IconButton>
      </View>
      {row.choice === 'existing' ? (
        <View style={{ flexDirection: 'row' }}>
          <StoryPicker
            label={name}
            projectTitle={row.projectTitle}
            storyId={row.storyId}
            stories={storiesByProject[row.projectId]}
            disabled={disabled}
            onPick={(storyId) => onChange({ storyId })}
          />
        </View>
      ) : (
        <Input
          size="sm"
          disabled={disabled}
          accessibilityLabel={`${name}, new`}
          placeholder={form.title.trim() || 'The group story’s title'}
          value={row.newStoryTitle ?? ''}
          onChangeText={(newStoryTitle) => onChange({ newStoryTitle })}
        />
      )}
      {needOptions.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 12, color: theme.text.muted }}>{TEXT.needsFirst}</Text>
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
    </View>
  )
}

function LinkRow({
  link,
  stories,
  disabled,
  onPick,
  onRemove,
}: {
  link: GroupStoryFormLink
  stories: readonly GroupProjectStoryOption[] | undefined
  disabled: boolean
  onPick: (storyId: string) => void
  onRemove: () => void
}) {
  const { theme } = useNativeTheme()
  const name = `the linked ${link.projectTitle} story`
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
      <Text style={{ fontSize: 13, fontWeight: '500', color: theme.text.primary }}>
        {link.projectTitle}
      </Text>
      <StoryPicker
        label={name}
        projectTitle={link.projectTitle}
        storyId={link.storyId}
        stories={stories}
        disabled={disabled}
        onPick={onPick}
      />
      <IconButton
        size="sm"
        disabled={disabled}
        accessibilityLabel={TEXT.remove(name)}
        onPress={onRemove}
      >
        <IconDelete size={16} color={theme.text.muted} />
      </IconButton>
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
