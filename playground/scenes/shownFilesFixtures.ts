import type { ChatMessageLike } from '../../src/headless/utils/chatTypes'
import type {
  ChatFileSaveCall,
  ChatFileSaveState,
  ChatFileSaving,
} from '../../src/headless/utils/chatFileSaveTypes'

const STORE = '.factory/attachments/c-7f3e2a/'

export const SHOWN_MAP = `${STORE}4b1c9e0d2a7f-battle-map.png`
export const SHOWN_TOKENS = `${STORE}9a8b7c6d5e4f-token-sheet.png`
export const SHOWN_NOTES = `${STORE}0f1e2d3c4b5a-placement-notes.md`

const art = (fill: string, accent: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 160"><rect width="240" height="160" fill="${fill}"/><path d="M0 120 L60 70 L110 100 L170 40 L240 90 L240 160 L0 160 Z" fill="${accent}"/><circle cx="190" cy="36" r="14" fill="#f5c542"/><rect x="24" y="24" width="40" height="28" rx="4" fill="#ffffff" opacity="0.7"/></svg>`,
  )}`

const PREVIEWS: Record<string, string> = {
  [SHOWN_MAP]: art('#1e3a5f', '#3d7a4a'),
  [SHOWN_TOKENS]: art('#3b2f4a', '#a0522d'),
}

export const SHOWN_PREVIEW_URI = (path: string): string | undefined => PREVIEWS[path]

export const shownPreviewUrl = async (path: string): Promise<string | null> =>
  PREVIEWS[path] ?? null

const answersSaved: ChatFileSaveCall = async (_projectId, request) => ({
  ok: true,
  path: request.destination,
})

/** A project whose saves go through: each file reads as saved once Save is pressed. */
export const SHOWN_SAVING: ChatFileSaving = { projectId: 'showcase-shown', save: answersSaved }

export const SHOWN_REPLY: ChatMessageLike = {
  id: 'shown-reply',
  role: 'assistant',
  content:
    'Here is the battle map with the deployment zones marked, the token sheet, and my placement notes.',
  files: [SHOWN_MAP, SHOWN_TOKENS, SHOWN_NOTES],
}

export const SENT_BY_PERSON: ChatMessageLike = {
  id: 'sent',
  role: 'user',
  content: 'Draw the map for scenario 3 and show it to me.',
  files: [`${STORE}5d4c3b2a1f0e-scenario-3.pdf`],
}

export const SAVE_DIALOG_STATES: Record<'new' | 'exists' | 'refused', ChatFileSaveState> = {
  new: { status: 'idle' },
  exists: {
    status: 'failed',
    destination: 'battle-map.png',
    error: 'battle-map.png is already in the project.',
    exists: true,
  },
  refused: {
    status: 'failed',
    destination: '../outside/battle-map.png',
    error: 'That path is outside the project.',
    exists: false,
  },
}
