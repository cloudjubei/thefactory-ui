import type {
  ChatAppNote,
  ChatAppNoteTarget,
  ChatContext,
  RemoteBrowserActionResult,
  RemoteBrowserNoteResult,
  RemoteBrowserSession,
  SendRemoteBrowserInputData,
  UiScreencastFrame,
  UiScreencastFrameMetadata,
} from '../api/generated'

export type {
  RemoteBrowserActionResult,
  RemoteBrowserNoteResult,
  RemoteBrowserSession,
  UiScreencastFrame as RemoteBrowserFrame,
  UiScreencastFrameMetadata as RemoteBrowserFrameMetadata,
}

/** One thing done to a page: a click, a move, the wheel, a key or typed text, at viewport points. */
export type RemoteBrowserInput = SendRemoteBrowserInputData['body']

/** What a press on the page does: drive it, pick an element, or mark an area. */
export type RemoteBrowserMode = 'browse' | 'pick' | 'mark'

/**
 * Where the shown browser stands: none yet, a page on its way, live frames, the socket gone
 * (frames come back on their own), or the browser closed.
 */
export type RemoteBrowserStatus = 'idle' | 'opening' | 'live' | 'reconnecting' | 'ended'

/** Who drives the shown browser: the person, or the chat's agent until the person takes over. */
export type RemoteBrowserDriver = 'person' | 'agent'

export type RemoteBrowserPoint = { x: number; y: number }

export type RemoteBrowserBox = { x: number; y: number; width: number; height: number }

export type RemoteBrowserSize = { width: number; height: number }

/**
 * A pick or mark: first the popover's subject, then staged until it goes with a message. Its box
 * is in page viewport points at the scroll it was taken at; a pick's target comes from the
 * browser, so it is pending until then.
 */
export type RemoteBrowserNote = {
  id: string
  kind: 'pick' | 'mark'
  box: RemoteBrowserBox
  scroll: RemoteBrowserPoint
  url: string
  comment: string
  target?: ChatAppNoteTarget
  screenshotFile?: string
}

export type RemoteBrowserState = {
  /** The chat's browsers: the person's own and those its agent opened. */
  sessions: RemoteBrowserSession[]
  shownId: string | null
  /** The shown page's address, as the address field reads it. */
  address: string
  title: string
  status: RemoteBrowserStatus
  frame: UiScreencastFrame | null
  mode: RemoteBrowserMode
  /** The person drives the agent's browser. */
  takenOver: boolean
  draft: RemoteBrowserNote | null
  notes: RemoteBrowserNote[]
  /** The addresses the person went through, for Back and Forward. */
  history: string[]
  historyAt: number
  error: string | null
}

/** The routes the browser beside a chat is driven through. */
export interface RemoteBrowserApi {
  list: (projectId: string, context: ChatContext) => Promise<RemoteBrowserSession[]>
  open: (
    projectId: string,
    context: ChatContext,
    body: { url: string; viewport?: RemoteBrowserSize },
  ) => Promise<RemoteBrowserSession>
  close: (projectId: string, context: ChatContext, sessionId: string) => Promise<void>
  input: (
    projectId: string,
    context: ChatContext,
    sessionId: string,
    input: RemoteBrowserInput,
  ) => Promise<RemoteBrowserActionResult>
  resize: (
    projectId: string,
    context: ChatContext,
    sessionId: string,
    viewport: RemoteBrowserSize,
  ) => Promise<RemoteBrowserActionResult>
  pick: (
    projectId: string,
    context: ChatContext,
    sessionId: string,
    point: RemoteBrowserPoint,
  ) => Promise<RemoteBrowserNoteResult>
  mark: (
    projectId: string,
    context: ChatContext,
    sessionId: string,
    box: RemoteBrowserBox,
  ) => Promise<RemoteBrowserNoteResult>
}

/** The part of the app's socket the browser uses: `WsClient` fits it. */
export interface RemoteBrowserSocket {
  on: <T>(event: string, handler: (data: T) => void) => () => void
  onReconnect: (handler: () => void) => () => void
  send: (message: object) => boolean
}

export type RemoteBrowserStoreOptions = {
  projectId: string
  context: ChatContext
  api: RemoteBrowserApi
  socket: RemoteBrowserSocket
  /**
   * Takes each note as it is added, for the chat's composer. Without it the notes stay staged in
   * the browser's own list.
   */
  onAddNotes?: (notes: ChatAppNote[]) => void
}
