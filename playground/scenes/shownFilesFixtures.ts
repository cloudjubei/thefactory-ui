import type { ChatContext } from '../../src/headless/api'
import type { ChatFileSourceOf } from '../../src/headless/utils/chatFilePreviewTypes'
import type {
  ChatVideoAttachments,
  ChatVideoDigest,
} from '../../src/headless/utils/videoAttachmentTypes'
import type { ChatMessageLike } from '../../src/headless/utils/chatTypes'
import type {
  ChatFileSaveCall,
  ChatFileSaveState,
  ChatFileSaving,
} from '../../src/headless/utils/chatFileSaveTypes'
import { onePagePdf } from './filePreviewFixtures'

const STORE = '.factory/attachments/c-7f3e2a/'

export const SHOWN_MAP = `${STORE}4b1c9e0d2a7f-battle-map.png`
export const SHOWN_TOKENS = `${STORE}9a8b7c6d5e4f-token-sheet.png`
export const SHOWN_NOTES = `${STORE}0f1e2d3c4b5a-placement-notes.md`
export const SHOWN_V1 = `${STORE}686f88790714-castle-gate-v1.jpg`
export const SHOWN_V2 = `${STORE}1508aa3203f2-castle-gate-v2.jpg`
export const SHOWN_V3 = `${STORE}3ee395c4906d-castle-gate-v3-night-lighting-with-torches.jpg`
export const SENT_SKETCH = `${STORE}a1b2c3d4e5f6-my-rough-sketch.png`
export const SHOWN_CLIP = `${STORE}7c6b5a4f3e2d-turn-two-replay.webm`
export const SHOWN_RULES = `${STORE}2e3f4a5b6c7d-deployment-rules.pdf`
export const SHOWN_ROSTER = `${STORE}5d4c3b2a1f0e-army-roster.csv`
export const SENT_SCENARIO = `${STORE}8e9f0a1b2c3d-scenario-3.pdf`
export const SHOWN_CAMPAIGN = `${STORE}6a7b8c9d0e1f-northern-campaign-deployment-plan-revised-after-playtest.pdf`
export const SHOWN_SEED = `${STORE}3c2b1a0f9e8d-map-seed.dat`

const art = (fill: string, accent: string) =>
  `data:image/svg+xml;base64,${btoa(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 160"><rect width="240" height="160" fill="${fill}"/><path d="M0 120 L60 70 L110 100 L170 40 L240 90 L240 160 L0 160 Z" fill="${accent}"/><circle cx="190" cy="36" r="14" fill="#f5c542"/><rect x="24" y="24" width="40" height="28" rx="4" fill="#ffffff" opacity="0.7"/></svg>`,
  )}`

const text = (mediaType: string, body: string) =>
  `data:${mediaType};charset=utf-8,${encodeURIComponent(body)}`

const pdf = (line: string) => `data:application/pdf;base64,${btoa(onePagePdf(line))}`

const NOTES_TEXT = `# Placement notes

- **Deployment zones** are the shaded strips on the long edges, 12" deep.
- Objective markers sit 6" in from each corner and one in the centre.
- Terrain: two ruins on the diagonal, a crater field by the centre marker.

| Zone | Units | Reserve |
| --- | --- | --- |
| North | 4 | 1 |
| South | 3 | 2 |
`

const ROSTER_TEXT = `unit,role,models,points
Marine squad,Troops,10,180
Raider pack,Fast attack,6,120
Siege walker,Heavy support,1,210
Field medic,Support,1,55
`

const CLIP_VIDEO = new URL('./assets/sample-landscape.webm', import.meta.url).href
const CLIP_DIGEST: ChatVideoDigest = {
  stage: 'ready',
  tokens: { overviewTokens: 6200, closerLookTokens: 1600 },
  transcript: 'done',
  durationSec: 42,
  sizeBytes: 9 * 1024 * 1024,
  poster: `${SHOWN_CLIP}.poster.jpg`,
}

/** The showcase chat's video, digested and with its poster, read from fixed answers. */
export const SHOWN_CLIP_CHAT: ChatVideoAttachments = {
  context: { type: 'PROJECT', projectId: 'showcase-shown' } as ChatContext,
  fixedDigests: { [SHOWN_CLIP]: CLIP_DIGEST },
  fixedMedia: { [SHOWN_CLIP]: { video: CLIP_VIDEO, still: art('#20303f', '#8a5a2b') } },
  onOpenSetup: () => {},
}

const PREVIEWS: Record<string, string> = {
  [SHOWN_NOTES]: text('text/markdown', NOTES_TEXT),
  [SHOWN_ROSTER]: text('text/csv', ROSTER_TEXT),
  [SHOWN_RULES]: pdf('Deployment rules - turn order and zones'),
  [SENT_SCENARIO]: pdf('Scenario 3 - hold the bridge'),
  [SHOWN_CAMPAIGN]: pdf('Northern campaign - deployment plan'),
  [SHOWN_SEED]: text('application/octet-stream', 'seed=4815162342\nsize=48x32\n'),
  [SHOWN_MAP]: art('#1e3a5f', '#3d7a4a'),
  [SHOWN_TOKENS]: art('#3b2f4a', '#a0522d'),
  [SHOWN_V1]: art('#5a4632', '#8c7a5b'),
  [SHOWN_V2]: art('#2f4a3b', '#6b8f5e'),
  [SHOWN_V3]: art('#141c2e', '#c2702d'),
  [SENT_SKETCH]: art('#e8e2d4', '#9a9486'),
}

export const SHOWN_PREVIEW_URI = (path: string): string | undefined => PREVIEWS[path]

export const shownPreviewUrl = async (path: string): Promise<string | null> =>
  PREVIEWS[path] ?? null

/** Where the showcase chat holds its files: the fixtures above, read as a chat's store is. */
export const shownSourceOf: ChatFileSourceOf = async (path) => {
  const url = PREVIEWS[path]
  return url ? { url } : null
}

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

export const SENT_SKETCH_BY_PERSON: ChatMessageLike = {
  id: 'sent-sketch',
  role: 'user',
  content: 'Paint the castle gate from my sketch, a few takes.',
  files: [SENT_SKETCH],
}

export const SHOWN_TAKES_REPLY: ChatMessageLike = {
  id: 'shown-takes',
  role: 'assistant',
  content:
    'Three takes on the gate: V1 keeps your framing, V2 pulls back to show the wall, V3 is the same view at night.',
  files: [SHOWN_V1, SHOWN_V2, SHOWN_V3],
}

export const SHOWN_MIXED_REPLY: ChatMessageLike = {
  id: 'shown-mixed',
  role: 'assistant',
  content:
    'Here is the replay of turn two, the deployment rules I followed, and the roster as a spreadsheet.',
  files: [SHOWN_CLIP, SHOWN_RULES, SHOWN_ROSTER],
}

export const SHOWN_CLIP_REPLY: ChatMessageLike = {
  id: 'shown-clip',
  role: 'assistant',
  content: 'Here is the replay of turn two.',
  files: [SHOWN_CLIP],
}

export const SHOWN_CHIPS_REPLY: ChatMessageLike = {
  id: 'shown-chips',
  role: 'assistant',
  content:
    'The deployment rules I followed, the roster, my placement notes, the full campaign plan and the map seed.',
  files: [SHOWN_RULES, SHOWN_ROSTER, SHOWN_NOTES, SHOWN_CAMPAIGN, SHOWN_SEED],
}

export const SENT_BY_PERSON: ChatMessageLike = {
  id: 'sent',
  role: 'user',
  content: 'Draw the map for scenario 3 and show it to me.',
  files: [SENT_SCENARIO],
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
