import type { ChatAppNote, ChatAppNoteTarget } from '../api/generated'

/** One comment on picked App elements or marked areas, passed unchanged to the host's chat send API. */
export type AppNote = ChatAppNote

/** A picked element as a note carries it. */
export type AppNoteElementTarget = Extract<ChatAppNoteTarget, { kind: 'element' }>

export type AppElementPick = Pick<AppNoteElementTarget, 'selector' | 'outerHtml'> & {
  rect?: { x: number; y: number; width: number; height: number }
}

export interface AppNoteComposerProps {
  appNotes?: AppNote[]
  onChangeAppNotes?: (notes: AppNote[]) => void
  /** Opens this chat's App surface. The host owns navigation and chat identity. */
  onShowApp?: () => void
}
