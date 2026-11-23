import { useState } from 'react'
import type { AppDeepLink } from '../utils/appDeepLink'
import { appNoteOfPick, nextAppNoteId } from '../utils/appNotes'
import type { AppElementPick, AppNote } from '../utils/appNotesTypes'

/** Mount per launching chat (or key by chat id); no global note state can leak to another chat. */
export function useAppNotes() {
  const [appNotes, onChangeAppNotes] = useState<AppNote[]>([])
  const [picking, setPicking] = useState(false)
  const addPick = (projectId: string, pick: AppElementPick, deepLink?: AppDeepLink | null) => {
    onChangeAppNotes((current) => [
      ...current,
      appNoteOfPick(nextAppNoteId(current.map((note) => note.id)), projectId, pick, deepLink),
    ])
  }
  return { appNotes, onChangeAppNotes, picking, setPicking, addPick }
}
