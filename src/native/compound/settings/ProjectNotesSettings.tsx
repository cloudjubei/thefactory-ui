import { useState } from 'react'
import { ScrollView, Text, View } from 'react-native'

import { useProjectNotes, useProjectNoteReveal } from '../../../headless'
import type { ProjectNoteSummary } from '../../../headless/api'
import { canRevealNote, noteAccessLabel, noteKindLabel } from '../../../headless/utils/projectNotes'
import { NOTE_ACCESS_NOTE, NOTE_VALUE_MASK } from '../../../headless/utils/projectNotesConstants'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import { ConfirmDialog, Modal } from '../../primitives/Modal'
import { chipPillStyle, chipPillTextStyle } from '../chips/pillStyles'
import { IconDelete, IconEdit, IconEye, IconEyeOff, IconPlus } from '../../icons'
import ProjectNotesForm from './ProjectNotesForm'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'

export interface ProjectNotesSettingsProps {
  /** Project whose notes are managed. Undefined renders an idle empty state. */
  projectId: string | undefined
}

type ModalRoute =
  | { kind: 'create' }
  | { kind: 'edit'; note: ProjectNoteSummary }
  | { kind: 'delete'; note: ProjectNoteSummary }

function formatUpdated(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString()
}

/**
 * Native peer of
 * [web's `ProjectNotesSettings`](../../../web/compound/settings/ProjectNotesSettings.tsx).
 * Same prop surface. A stored value is never rendered in the list; Reveal
 * fetches one on demand and masks it again shortly after.
 */
export default function ProjectNotesSettings({ projectId }: ProjectNotesSettingsProps) {
  const { theme } = useNativeTheme()
  const { isLoaded, loadError, notes, createNote, updateNote, deleteNote, revealNote } =
    useProjectNotes(projectId)
  const { revealedNoteId, revealedValue, revealingNoteId, revealError, reveal, hide } =
    useProjectNoteReveal(revealNote)
  const [modal, setModal] = useState<ModalRoute | null>(null)

  const placeholder = (text: string) => (
    <View style={{ padding: nativeSpace[5] }}>
      <Text style={{ fontSize: 13, color: theme.text.secondary }}>{text}</Text>
    </View>
  )

  return (
    <View style={{ gap: nativeSpace[3] }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: nativeSpace[3],
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: '600', color: theme.text.primary }}>
          Project notes &amp; secrets
        </Text>
        <Button
          size="icon"
          accessibilityLabel="Add note"
          disabled={!projectId}
          onPress={() => setModal({ kind: 'create' })}
        >
          <IconPlus size={18} />
        </Button>
      </View>

      {loadError ? <Alert variant="error">{loadError.message}</Alert> : null}
      {revealError ? <Alert variant="error">{revealError}</Alert> : null}

      <View
        style={{
          borderWidth: 1,
          borderColor: theme.border.subtle,
          borderRadius: nativeRadii[3],
          overflow: 'hidden',
        }}
      >
        {!projectId
          ? placeholder('Pick a project to manage its notes and secrets.')
          : !isLoaded
            ? placeholder('Loading…')
            : notes.length === 0
              ? placeholder(
                  'Nothing stored yet. Tap + to add a note or a secret an agent can reach for.',
                )
              : notes.map((note, index) => {
                  const isRevealed = revealedNoteId === note.id
                  return (
                    <View
                      key={note.id}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: nativeSpace[3],
                        padding: nativeSpace[3],
                        borderTopWidth: index === 0 ? 0 : 1,
                        borderTopColor: theme.border.subtle,
                      }}
                    >
                      <View style={{ flex: 1, gap: nativeSpace[2] }}>
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: nativeSpace[2],
                          }}
                        >
                          <Text
                            style={{ fontSize: 14, fontWeight: '500', color: theme.text.primary }}
                          >
                            {note.label}
                          </Text>
                          <View style={chipPillStyle(theme)}>
                            <Text style={chipPillTextStyle(theme)}>{noteKindLabel(note.kind)}</Text>
                          </View>
                          <View style={chipPillStyle(theme)}>
                            <Text style={chipPillTextStyle(theme)}>
                              {noteAccessLabel(note.access)}
                            </Text>
                          </View>
                        </View>
                        {note.description ? (
                          <Text style={{ fontSize: 13, color: theme.text.secondary }}>
                            {note.description}
                          </Text>
                        ) : null}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                          <Text
                            selectable={isRevealed}
                            style={{
                              fontFamily: 'Courier',
                              fontSize: 12,
                              color: theme.text.secondary,
                            }}
                          >
                            {isRevealed && revealedValue !== null ? revealedValue : NOTE_VALUE_MASK}
                          </Text>
                        </ScrollView>
                        <Text style={{ fontSize: 12, color: theme.text.muted }}>
                          Updated {formatUpdated(note.updatedAt)}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: nativeSpace[2] }}>
                        {canRevealNote(note) ? (
                          <Button
                            variant="outline"
                            size="icon"
                            accessibilityLabel={isRevealed ? 'Hide' : 'Reveal'}
                            loading={revealingNoteId === note.id}
                            onPress={() => (isRevealed ? hide() : void reveal(note.id))}
                          >
                            {isRevealed ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                          </Button>
                        ) : null}
                        <Button
                          variant="outline"
                          size="icon"
                          accessibilityLabel="Edit"
                          onPress={() => setModal({ kind: 'edit', note })}
                        >
                          <IconEdit size={16} />
                        </Button>
                        <Button
                          variant="danger"
                          size="icon"
                          accessibilityLabel="Delete"
                          onPress={() => setModal({ kind: 'delete', note })}
                        >
                          <IconDelete size={16} />
                        </Button>
                      </View>
                    </View>
                  )
                })}
      </View>

      <Text style={{ fontSize: 12, color: theme.text.secondary }}>{NOTE_ACCESS_NOTE}</Text>

      {modal?.kind === 'create' ? (
        <Modal isOpen onClose={() => setModal(null)} title="New project note">
          <ProjectNotesForm
            mode={{ kind: 'create', onSubmit: createNote }}
            onClose={() => setModal(null)}
          />
        </Modal>
      ) : null}
      {modal?.kind === 'edit' ? (
        <Modal isOpen onClose={() => setModal(null)} title={`Edit: ${modal.note.label}`}>
          <ProjectNotesForm
            mode={{
              kind: 'edit',
              note: modal.note,
              onSubmit: (patch) => updateNote(modal.note.id, patch),
            }}
            onClose={() => setModal(null)}
          />
        </Modal>
      ) : null}
      {modal?.kind === 'delete' ? (
        <ConfirmDialog
          isOpen
          onClose={() => setModal(null)}
          title="Delete project note"
          description={`This permanently removes "${modal.note.label}". Agents working on this project will no longer be able to read it.`}
          confirmLabel="Delete"
          destructive
          onConfirm={() => deleteNote(modal.note.id)}
        />
      ) : null}
    </View>
  )
}
