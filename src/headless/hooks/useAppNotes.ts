import { useRef, useState } from 'react'
import type { AppDeepLink } from '../utils/appDeepLink'
import { appNoteOfPick } from '../utils/appNotes'
import { APP_NOTE_ID_PREFIX } from '../utils/appNotesConstants'
import type { AppElementPick, AppNote } from '../utils/appNotesTypes'

/** Mount per launching chat (or key by chat id); no global note state can leak to another chat. */
export function useAppNotes() {
  const [appNotes, onChangeAppNotes] = useState<AppNote[]>([])
  const [picking, setPicking] = useState(false)
  const nextId = useRef(0)
  const addPick = (projectId: string, pick: AppElementPick, deepLink?: AppDeepLink | null) => {
    const note = appNoteOfPick(
      `${APP_NOTE_ID_PREFIX}${++nextId.current}`,
      projectId,
      pick,
      deepLink,
    )
    onChangeAppNotes((current) => [...current, note])
  }
  return { appNotes, onChangeAppNotes, picking, setPicking, addPick }
}
