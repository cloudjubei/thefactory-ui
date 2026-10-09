import { useCallback, useEffect, useRef, useState } from 'react'
import { ScrollView, Text, View, type LayoutChangeEvent } from 'react-native'
import type { ResourceLink } from 'thefactory-tools/types'

import {
  rankMentionMatches,
  useFiles,
  useGroupNotes,
  useProjectNotes,
  useProjectNoteReveal,
  useProjectNoteTexts,
} from '../../../headless'
import { useProjectReferenceRenderer } from '../../hooks/useReferenceRenderer'
import RichText from '../files/RichText'
import type { NoteSummary, NotesOwner } from '../../../headless/utils/projectNotesTypes'
import {
  canRevealNote,
  linkedNoteState,
  noteAccessLabel,
  noteAuthorLabel,
  noteKindLabel,
} from '../../../headless/utils/projectNotes'
import {
  NOTE_ACCESS_NOTE,
  NOTE_LINK_MISSING,
  NOTE_VALUE_MASK,
  NOTES_SCREEN_COPY,
} from '../../../headless/utils/projectNotesConstants'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import { ConfirmDialog, Modal } from '../../primitives/Modal'
import { chipPillStyle, chipPillTextStyle } from '../chips/pillStyles'
import { IconDelete, IconEdit, IconEye, IconEyeOff, IconPlus } from '../../icons'
import ProjectNotesForm from './ProjectNotesForm'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'

export interface NotesSettingsProps {
  /** Whose notes are managed — a project's or a group's. An undefined id renders an idle empty state. */
  owner: NotesOwner
  /** Opens what a note points at — a story, feature, note or file. */
  onOpenReference?: (link: ResourceLink) => void
  /** The note a link opened the screen on (`?note=`): shown selected. */
  selectedNoteId?: string
  /**
   * Where the selected note's row lies, from the top of these settings, once laid out — for the
   * host's scroll view to bring it into view.
   */
  onSelectedNoteLayout?: (y: number) => void
}

type ModalRoute =
  | { kind: 'create' }
  | { kind: 'edit'; note: NoteSummary }
  | { kind: 'delete'; note: NoteSummary }

function formatUpdated(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString()
}

/**
 * Native peer of
 * [web's `NotesSettings`](../../../web/compound/settings/NotesSettings.tsx).
 * Same prop surface. A stored value is never rendered in the list; Reveal
 * fetches one on demand and masks it again shortly after.
 */
export default function NotesSettings({
  owner,
  onOpenReference,
  selectedNoteId,
  onSelectedNoteLayout,
}: NotesSettingsProps) {
  const { theme } = useNativeTheme()
  const projectId = owner.kind === 'project' ? owner.projectId : undefined
  const groupId = owner.kind === 'group' ? owner.groupId : undefined
  // Both stores are always called (an undefined id idles one), so the hook order
  // never depends on whose notes these are.
  const projectStore = useProjectNotes(projectId)
  const groupStore = useGroupNotes(groupId)
  const { isLoaded, loadError, notes, createNote, updateNote, deleteNote, revealNote } =
    owner.kind === 'project' ? projectStore : groupStore
  const ownerId = projectId ?? groupId
  const copy = NOTES_SCREEN_COPY[owner.kind]
  const { revealedNoteId, revealedValue, revealingNoteId, revealError, reveal, hide } =
    useProjectNoteReveal(revealNote)
  const [modal, setModal] = useState<ModalRoute | null>(null)
  const noteTexts = useProjectNoteTexts(notes, revealNote)
  const { references, renderReference } = useProjectReferenceRenderer({
    projectId,
    ...(onOpenReference ? { onOpen: onOpenReference } : {}),
  })
  const { paths } = useFiles()
  const onSearchFiles = useCallback((token: string) => rankMentionMatches(paths, token, 5), [paths])
  const mentions = {
    onSearchFiles,
    onSearchReferences: references.searchWork,
    onSearchHandles: references.searchHandles,
  }

  const linked = linkedNoteState(notes, selectedNoteId, isLoaded)
  const listY = useRef<number | undefined>(undefined)
  const selectedY = useRef<number | undefined>(undefined)
  const reportedFor = useRef<string | undefined>(undefined)
  const reportSelected = useCallback(() => {
    if (listY.current === undefined || selectedY.current === undefined || !selectedNoteId) return
    if (reportedFor.current === selectedNoteId) return
    reportedFor.current = selectedNoteId
    onSelectedNoteLayout?.(listY.current + selectedY.current)
  }, [selectedNoteId, onSelectedNoteLayout])
  useEffect(() => {
    selectedY.current = undefined
  }, [selectedNoteId])

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
          {copy.title}
        </Text>
        <Button
          size="icon"
          accessibilityLabel="Add note"
          disabled={!ownerId}
          onPress={() => setModal({ kind: 'create' })}
        >
          <IconPlus size={18} />
        </Button>
      </View>

      {copy.intro ? (
        <Text style={{ fontSize: 13, color: theme.text.secondary }}>{copy.intro}</Text>
      ) : null}
      {loadError ? <Alert variant="error">{loadError.message}</Alert> : null}
      {revealError ? <Alert variant="error">{revealError}</Alert> : null}
      {linked === 'missing' ? <Alert variant="info">{NOTE_LINK_MISSING}</Alert> : null}

      <View
        onLayout={(e) => {
          listY.current = e.nativeEvent.layout.y
          reportSelected()
        }}
        style={{
          borderWidth: 1,
          borderColor: theme.border.subtle,
          borderRadius: nativeRadii[3],
          overflow: 'hidden',
        }}
      >
        {!ownerId
          ? placeholder(copy.idle)
          : !isLoaded
            ? placeholder('Loading…')
            : notes.length === 0
              ? placeholder(`Nothing stored yet. Tap + to add ${copy.addWhat}.`)
              : notes.map((note, index) => {
                  const isRevealed = revealedNoteId === note.id
                  return (
                    <View
                      key={note.id}
                      {...(note.id === selectedNoteId
                        ? {
                            accessibilityState: { selected: true },
                            onLayout: (e: LayoutChangeEvent) => {
                              selectedY.current = e.nativeEvent.layout.y
                              reportSelected()
                            },
                          }
                        : {})}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: nativeSpace[3],
                        padding: nativeSpace[3],
                        borderTopWidth: index === 0 ? 0 : 1,
                        borderTopColor: theme.border.subtle,
                        ...(note.id === selectedNoteId
                          ? {
                              backgroundColor: theme.surface.muted,
                              borderLeftWidth: 3,
                              borderLeftColor: theme.accent.primary,
                            }
                          : {}),
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
                          {noteAuthorLabel(note) ? (
                            <View style={chipPillStyle(theme)}>
                              <Text style={chipPillTextStyle(theme)}>{noteAuthorLabel(note)}</Text>
                            </View>
                          ) : null}
                        </View>
                        {note.description ? (
                          <RichText
                            text={note.description}
                            renderReference={renderReference}
                            typedReferences
                            textColor={theme.text.secondary}
                          />
                        ) : null}
                        {note.kind === 'secret' ? (
                          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <Text
                              selectable={isRevealed}
                              style={{
                                fontFamily: 'Courier',
                                fontSize: 12,
                                color: theme.text.secondary,
                              }}
                            >
                              {isRevealed && revealedValue !== null
                                ? revealedValue
                                : NOTE_VALUE_MASK}
                            </Text>
                          </ScrollView>
                        ) : noteTexts.has(note.id) ? (
                          <RichText
                            text={noteTexts.get(note.id) ?? ''}
                            renderReference={renderReference}
                            typedReferences
                            textColor={theme.text.secondary}
                          />
                        ) : null}
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
            mentions={mentions}
            canonicalize={references.canonicalize}
            toTyped={references.toTyped}
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
            mentions={mentions}
            canonicalize={references.canonicalize}
            toTyped={references.toTyped}
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
