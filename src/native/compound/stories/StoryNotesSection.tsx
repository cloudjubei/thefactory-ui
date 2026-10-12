import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import type { StoryNote } from 'thefactory-tools/types'
import {
  extractErrorMessage,
  storyNoteAuthorLabel,
  storyNoteFormError,
  storyNoteFormValues,
  storyNotePatch,
  useStories,
} from '../../../headless'
import { STORY_NOTES_COPY } from '../../../headless/utils/storyNotesConstants'
import type { StoryNoteFormValues } from '../../../headless/utils/storyNotesTypes'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import Field from '../../primitives/Field'
import { Input } from '../../primitives/Input'
import { ConfirmDialog, Modal } from '../../primitives/Modal'
import { Textarea } from '../../primitives/Textarea'
import { chipPillStyle, chipPillTextStyle } from '../chips/pillStyles'
import { IconDelete, IconEdit, IconPlus, IconSave } from '../../icons'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'

export interface StoryNotesSectionProps {
  storyId: string
  /** The feature the notes are kept with; omitted, the story's own notes. */
  featureId?: string
  notes: readonly StoryNote[]
  /** Starts with the list folded away when there are no notes, for a compact row. */
  compact?: boolean
}

type ModalRoute =
  | { kind: 'create' }
  | { kind: 'edit'; note: StoryNote }
  | { kind: 'delete'; note: StoryNote }

function formatUpdated(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString()
}

function StoryNoteForm({
  note,
  onSubmit,
}: {
  note?: StoryNote
  onSubmit: (values: StoryNoteFormValues) => Promise<void>
}) {
  const [values, setValues] = useState<StoryNoteFormValues>(() => storyNoteFormValues(note))
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const invalid = storyNoteFormError(values)

  const submit = async () => {
    if (invalid) {
      setError(invalid)
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSubmit(values)
    } catch (err) {
      setError(extractErrorMessage(err, 'The note could not be saved.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={{ gap: nativeSpace[3] }}>
      <Field label={STORY_NOTES_COPY.labelField}>
        <Input
          value={values.label}
          onChangeText={(label) => setValues((v) => ({ ...v, label }))}
          placeholder={STORY_NOTES_COPY.labelPlaceholder}
          accessibilityLabel={STORY_NOTES_COPY.labelField}
        />
      </Field>
      <Field label={STORY_NOTES_COPY.valueField}>
        <Textarea
          rows={6}
          value={values.value}
          onChangeText={(value) => setValues((v) => ({ ...v, value }))}
          placeholder={STORY_NOTES_COPY.valuePlaceholder}
          accessibilityLabel={STORY_NOTES_COPY.valueField}
        />
      </Field>
      {error ? <Alert variant="error">{error}</Alert> : null}
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
        <Button
          size="icon"
          accessibilityLabel={STORY_NOTES_COPY.save}
          loading={saving}
          disabled={invalid !== undefined}
          onPress={() => void submit()}
        >
          <IconSave size={18} />
        </Button>
      </View>
    </View>
  )
}

/**
 * The notes kept with a story or one of its features — what agents hand the
 * next run or step, and what a person adds — with add, edit and delete.
 */
export default function StoryNotesSection({
  storyId,
  featureId,
  notes,
  compact = false,
}: StoryNotesSectionProps) {
  const { theme } = useNativeTheme()
  const { addStoryNote, updateStoryNote, removeStoryNote } = useStories()
  const [modal, setModal] = useState<ModalRoute | null>(null)
  const [open, setOpen] = useState(!compact || notes.length > 0)

  const create = async (values: StoryNoteFormValues) => {
    await addStoryNote(storyId, {
      label: values.label.trim(),
      value: values.value,
      ...(featureId ? { featureId } : {}),
    })
    setModal(null)
  }

  const edit = async (note: StoryNote, values: StoryNoteFormValues) => {
    const patch = storyNotePatch(note, values)
    if (Object.keys(patch).length > 0) await updateStoryNote(storyId, note.id, patch)
    setModal(null)
  }

  return (
    <View style={{ gap: nativeSpace[2] }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: nativeSpace[2],
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          onPress={() => setOpen((o) => !o)}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: '600',
              textTransform: 'uppercase',
              color: theme.text.secondary,
            }}
          >
            {STORY_NOTES_COPY.title} ({notes.length})
          </Text>
        </Pressable>
        <Button
          size="icon"
          variant="ghost"
          accessibilityLabel={STORY_NOTES_COPY.add}
          onPress={() => setModal({ kind: 'create' })}
        >
          <IconPlus size={16} />
        </Button>
      </View>
      {open ? (
        notes.length === 0 ? (
          <Text style={{ fontSize: 13, color: theme.text.secondary }}>
            {featureId ? STORY_NOTES_COPY.featureHint : STORY_NOTES_COPY.storyHint}
          </Text>
        ) : (
          <View
            style={{
              borderWidth: 1,
              borderColor: theme.border.subtle,
              borderRadius: nativeRadii[3],
              overflow: 'hidden',
            }}
          >
            {notes.map((note, index) => (
              <View
                key={note.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: nativeSpace[2],
                  padding: nativeSpace[3],
                  borderTopWidth: index === 0 ? 0 : 1,
                  borderTopColor: theme.border.subtle,
                }}
              >
                <View style={{ flex: 1, gap: nativeSpace[1] }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      gap: nativeSpace[2],
                    }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '500', color: theme.text.primary }}>
                      {note.label}
                    </Text>
                    <View style={chipPillStyle(theme)}>
                      <Text style={chipPillTextStyle(theme)}>{storyNoteAuthorLabel(note)}</Text>
                    </View>
                  </View>
                  <Text selectable style={{ fontSize: 13, color: theme.text.secondary }}>
                    {note.value}
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.text.muted }}>
                    {STORY_NOTES_COPY.updated} {formatUpdated(note.updatedAt)}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: nativeSpace[1] }}>
                  <Button
                    size="icon"
                    variant="outline"
                    accessibilityLabel={STORY_NOTES_COPY.edit}
                    onPress={() => setModal({ kind: 'edit', note })}
                  >
                    <IconEdit size={16} />
                  </Button>
                  <Button
                    size="icon"
                    variant="danger"
                    accessibilityLabel={STORY_NOTES_COPY.remove}
                    onPress={() => setModal({ kind: 'delete', note })}
                  >
                    <IconDelete size={16} />
                  </Button>
                </View>
              </View>
            ))}
          </View>
        )
      ) : null}

      {modal?.kind === 'create' ? (
        <Modal isOpen onClose={() => setModal(null)} title={STORY_NOTES_COPY.newTitle}>
          <StoryNoteForm onSubmit={create} />
        </Modal>
      ) : null}
      {modal?.kind === 'edit' ? (
        <Modal
          isOpen
          onClose={() => setModal(null)}
          title={STORY_NOTES_COPY.editTitle(modal.note.label)}
        >
          <StoryNoteForm note={modal.note} onSubmit={(values) => edit(modal.note, values)} />
        </Modal>
      ) : null}
      {modal?.kind === 'delete' ? (
        <ConfirmDialog
          isOpen
          onClose={() => setModal(null)}
          title={STORY_NOTES_COPY.deleteTitle}
          description={STORY_NOTES_COPY.deleteDescription(modal.note.label)}
          confirmLabel={STORY_NOTES_COPY.deleteConfirm}
          destructive
          onConfirm={() => removeStoryNote(storyId, modal.note.id)}
        />
      ) : null}
    </View>
  )
}
