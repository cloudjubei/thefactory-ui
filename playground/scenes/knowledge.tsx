import type { ReactNode } from 'react'
import {
  KNOWLEDGE_DEFAULT_LOOK,
  knowledgeView,
  type KnowledgeLook,
  type KnowledgeMapStatus,
  type KnowledgeView,
  type KnowledgeViewFormat,
  type KnowledgeWorkRow,
  type ProjectKnowledgeOverview,
  type ProjectOverviewData,
} from 'thefactory-ui/headless'
import { DependencyBulletBase, ProjectKnowledgeView, type StoryStatus } from 'thefactory-ui/web'
import type { DesignPlaygroundControl, DesignPlaygroundPreset } from 'thefactory-tools/types'
import type { Scene, SceneState } from '../showcase/types'

const noop = () => {}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Times as the app writes them on another day, fixed so every capture draws the same text. */
const FORMAT: KnowledgeViewFormat = {
  when: (iso) => {
    const d = new Date(iso)
    const h = d.getUTCHours()
    const m = String(d.getUTCMinutes()).padStart(2, '0')
    return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${h % 12 || 12}:${m} ${h < 12 ? 'AM' : 'PM'}`
  },
  duration: (ms) => (ms < 60_000 ? `${Math.round(ms / 1000)}s` : `${Math.round(ms / 60_000)}m`),
}

const MORNING = '2026-10-23T09:05:00.000Z'
const EARLIER = '2026-10-23T08:10:00.000Z'
const YESTERDAY = '2026-10-22T16:40:00.000Z'

type Claim = ProjectOverviewData['purpose']

const claim = (text: string, citations: string[] = [], label: Claim['label'] = 'observed') => ({
  text,
  label,
  citations,
})

const fresh = (refreshedAt: string, stale = false) => ({
  refreshedAt,
  contentKey: 'a',
  currentContentKey: stale ? 'b' : 'a',
  stale,
})

const code = (itemId: string, name: string, path: string, line?: number) => ({
  itemId,
  name,
  level: 1,
  path,
  ...(line !== undefined ? { line } : {}),
  hierarchyPath: [],
  files: [path],
})

const area = (itemId: string, name: string) => ({ itemId, name, level: 2, hierarchyPath: [] })

const STORY_AI = '230b9c39-08ca-4c68-994a-a6c633d31ee1'
const STORY_PLAY = '9799e78a-2163-4de1-96f9-6c0a4ae48a74'
const STORY_STATS = '4f7d2c81-61aa-4e0b-9d5e-3c0b8e1f2a77'
const FEATURE_ASSETS = '9d64668a-66b9-41e7-b986-4cc885210cb6'
const FEATURE_SCREENS = '5c9d7121-74fb-4d3a-bb42-f6a87028dc2c'
const FEATURE_STRENGTH = 'b1e2c3d4-5f60-4a71-8b92-a3b4c5d6e7f8'

/** The stories and features the overview names, as the app's chips resolve them. */
const NAMED: Record<string, { display: string; title: string; status: StoryStatus }> = {
  [STORY_AI]: { display: '7', title: 'Phase 7 — ModelTrainer-powered AI', status: 'pending' },
  [STORY_PLAY]: { display: '9', title: 'Design pass — Play / gameplay', status: 'pending' },
  [STORY_STATS]: { display: '11', title: 'Design pass — Statistics', status: 'in_progress' },
  [`${STORY_PLAY}.${FEATURE_ASSETS}`]: {
    display: '9.1',
    title: 'Multi-game assets in the game pack',
    status: 'pending',
  },
  [`${STORY_PLAY}.${FEATURE_SCREENS}`]: {
    display: '9.2',
    title: 'Refresh the Play Design screens',
    status: 'pending',
  },
  [`${STORY_STATS}.${FEATURE_STRENGTH}`]: {
    display: '11.1',
    title: 'Unit, upgrade and card strength',
    status: 'in_progress',
  },
}

/** A recorded story or feature as the app draws it: its dependency chip, its card on hover. */
function workChip(row: KnowledgeWorkRow): ReactNode {
  const named = NAMED[row.dependency]
  if (!named) return null
  const [storyId, featureId] = row.dependency.split('.')
  const card = { id: row.dependency, title: named.title, status: named.status }
  return (
    <DependencyBulletBase
      interactive={false}
      resolved={
        featureId
          ? {
              kind: 'feature',
              display: named.display,
              storyId: storyId!,
              featureId,
              feature: card,
            }
          : { kind: 'story', display: named.display, storyId: storyId!, story: card }
      }
    />
  )
}

const CITATIONS: NonNullable<ProjectOverviewData['citations']> = {
  c4_root: area('c4_root', 'wargames'),
  'area:games/starcraft-tmg/src/rules/': area('area:games/starcraft-tmg/src/rules/', 'rules'),
  u_attack: code('u_attack', 'resolveAttack', 'games/starcraft-tmg/src/rules/attacks.ts', 41),
  'area:games/starcraft-tmg/src/ai/': area('area:games/starcraft-tmg/src/ai/', 'ai'),
  u_ai: code('u_ai', 'fullAiSupport', 'games/starcraft-tmg/src/ai/full-ai.ts', 18),
  'area:engine/': area('area:engine/', 'engine'),
  u_distance: code('u_distance', 'baseDistance', 'engine/src/geometry.ts', 112),
  u_dice: code('u_dice', 'rollDice', 'engine/src/dice.ts', 9),
  'area:app/builder/': area('area:app/builder/', 'builder'),
  u_builder: code('u_builder', 'buildArmy', 'app/builder/builder.js', 27),
  'area:app/play/': area('area:app/play/', 'play'),
  'area:games/': area('area:games/', 'games'),
  u_base: code('u_base', 'modelBase', 'games/starcraft-tmg/src/rules/game.ts', 204),
  'area:app/*': area('area:app/*', 'app'),
  u_reach: code('u_reach', 'reachKey', 'app/play-full-view.js', 66),
  doc_plan: { ...code('doc_plan', 'plan.md', 'docs/plan.md'), sourceKind: 'attachment' as const },
}

function modelOverview(): ProjectOverviewData {
  return {
    formatVersion: 3,
    projectId: 'wargames',
    purpose: claim(
      'A miniature war-game simulator that plays StarCraft TMG battles in the browser: build an army, deploy it on a table and fight turn by turn against a person or the AI.',
      ['c4_root'],
      'derived',
    ),
    purposeModelWritten: { refreshedAt: MORNING, stale: false },
    capabilities: [
      {
        id: 'area:games/starcraft-tmg/src/rules/',
        name: 'Resolve attacks and wounds',
        claim: claim(
          'Rolls attack and defence dice by the rulebook and removes models as wounds are dealt.',
          ['area:games/starcraft-tmg/src/rules/', 'u_attack'],
        ),
        modelWritten: { refreshedAt: MORNING, stale: false },
      },
      {
        id: 'area:games/starcraft-tmg/src/ai/',
        name: 'Play against the AI',
        claim: claim('Picks moves, targets and abilities for the side a person does not play.', [
          'area:games/starcraft-tmg/src/ai/',
          'u_ai',
        ]),
        modelWritten: { refreshedAt: MORNING, stale: false },
      },
      {
        id: 'area:engine/',
        name: 'engine',
        claim: claim(
          '7 files: geometry.ts, oval.ts, dice.ts and 4 more. Most referenced: baseDistance — edge-to-edge distance between two bases.',
          ['area:engine/', 'u_distance', 'u_dice'],
        ),
      },
      {
        id: 'area:app/builder/',
        name: 'Build an army list',
        claim: claim('Chooses units and upgrades within the points limit of a game.', [
          'area:app/builder/',
          'u_builder',
        ]),
        modelWritten: { refreshedAt: YESTERDAY, stale: true },
      },
    ],
    modules: [
      {
        id: 'area:games/',
        name: 'Game rules',
        claim: claim(
          'Each game’s own rules, AI and readouts — StarCraft TMG first, kept apart from the shared engine.',
          ['area:games/', 'u_base'],
        ),
        modelWritten: { refreshedAt: MORNING, stale: false },
      },
      {
        id: 'area:app/*',
        name: 'app',
        claim: claim(
          '47 files: play-full-view.js, builder-model.js, play.js and 44 more. Most referenced: reachKey — the key of one reach.',
          ['area:app/*', 'u_reach'],
        ),
      },
      {
        id: 'area:engine/',
        name: 'engine',
        claim: claim('7 files: geometry.ts, oval.ts, dice.ts and 4 more.', [
          'area:engine/',
          'u_distance',
        ]),
      },
    ],
    recordedWork: {
      stories: [
        {
          id: STORY_STATS,
          name: 'Design pass — Statistics',
          status: 'in_progress',
          claim: claim('Design pass — Statistics (in_progress)', [STORY_STATS]),
          features: [
            {
              id: FEATURE_STRENGTH,
              name: 'Unit, upgrade and card strength',
              status: 'in_progress',
              claim: claim('Unit, upgrade and card strength (in_progress)', [FEATURE_STRENGTH]),
            },
          ],
          openFeatures: 4,
        },
        {
          id: STORY_PLAY,
          name: 'Design pass — Play / gameplay',
          status: 'pending',
          claim: claim('Design pass — Play / gameplay (pending)', [STORY_PLAY]),
          features: [
            {
              id: FEATURE_ASSETS,
              name: 'Multi-game assets in the game pack',
              status: 'pending',
              claim: claim('Multi-game assets in the game pack (pending)', [FEATURE_ASSETS]),
            },
            {
              id: FEATURE_SCREENS,
              name: 'Refresh the Play Design screens',
              status: 'pending',
              claim: claim('Refresh the Play Design screens (pending)', [FEATURE_SCREENS]),
            },
          ],
          openFeatures: 2,
        },
        {
          id: STORY_AI,
          name: 'Phase 7 — ModelTrainer-powered AI',
          status: 'pending',
          claim: claim('Phase 7 — ModelTrainer-powered AI (pending)', [STORY_AI]),
          features: [],
          openFeatures: 0,
        },
      ],
      openStories: 6,
      totalStories: 25,
    },
    documentWork: [
      {
        id: 'w1',
        name: 'Online multiplayer',
        claim: claim('Online multiplayer', ['doc_plan']),
        source: { attachmentId: 'doc_plan', reference: 'docs/plan.md', line: 88 },
      },
      {
        id: 'w2',
        name: 'Lobby and invites',
        parentId: 'w1',
        claim: claim('Lobby and invites', ['doc_plan']),
        source: { attachmentId: 'doc_plan', reference: 'docs/plan.md', line: 91 },
      },
      {
        id: 'w3',
        name: '`ReplayViewer` from the turn log',
        claim: claim('`ReplayViewer` from the turn log', ['doc_plan']),
        source: { attachmentId: 'doc_plan', reference: 'WG-42' },
      },
    ],
    documentWorkStatus: claim(
      'Work extracted from recorded lists and tickets; not a live tracker status.',
      ['doc_plan'],
    ),
    omitted: { capabilities: 3, modules: 2, documentWork: 4 },
    citations: CITATIONS,
    sections: {
      purpose: fresh(MORNING),
      capabilities: fresh(MORNING),
      modules: fresh(MORNING),
      recordedWork: fresh(EARLIER),
      documentWork: fresh(EARLIER),
    },
    provenance: { source: 'llm', refreshedAt: MORNING, contentKey: 'k' },
  }
}

function codeOnlyOverview(): ProjectOverviewData {
  return {
    formatVersion: 3,
    projectId: 'thefactory-db',
    purpose: claim(
      'thefactory-db — Local-first PostgreSQL toolkit with hybrid text and vector search, Docker-managed databases, and a TypeScript API for documents and entities.',
      ['c4_root'],
      'derived',
    ),
    capabilities: [
      {
        id: 'area:src/chunking/',
        name: 'chunking',
        claim: claim(
          '6 files: dataSummary.ts, chunkDocument.ts, codeChunker.ts and 3 more. Most referenced: chunkDocument — the pieces of a document to embed.',
          ['area:src/chunking/', 'u_chunk'],
        ),
      },
      {
        id: 'area:src/client/documents.ts',
        name: 'client / documents',
        claim: claim('One file, documents.ts, with 23 definitions. Most referenced: addDocument.', [
          'u_add',
        ]),
      },
      {
        id: 'area:src/migrations/',
        name: 'migrations',
        claim: claim('9 files: runner.ts, 001-init.ts and 7 more.', ['u_migrate']),
      },
    ],
    modules: [
      {
        id: 'area:src/client/',
        name: 'client',
        claim: claim('5 files: documents.ts, entities.ts, entityQuery.ts and 2 more.', ['u_add']),
      },
      {
        id: 'area:src/*',
        name: 'src',
        claim: claim('6 files: validation.ts, runtime.ts, utils.ts and 3 more.', ['u_runtime']),
      },
    ],
    recordedWork: { stories: [], openStories: 0, totalStories: 6 },
    documentWork: [],
    documentWorkStatus: claim(
      'No plan documents or imported tickets were found; documented work is unknown.',
      [],
      'abstain',
    ),
    omitted: { capabilities: 3, modules: 0, documentWork: 0 },
    citations: {
      c4_root: area('c4_root', 'thefactory-db'),
      u_chunk: code('u_chunk', 'chunkDocument', 'src/chunking/chunkDocument.ts', 31),
      u_add: code('u_add', 'addDocument', 'src/client/documents.ts', 58),
      u_migrate: code('u_migrate', 'migrateDatabase', 'src/migrations/runner.ts', 12),
      u_runtime: code('u_runtime', 'createReusableDatabase', 'src/runtime.ts', 140),
    },
    sections: {
      purpose: fresh(EARLIER),
      capabilities: fresh(EARLIER),
      modules: fresh(EARLIER),
      recordedWork: fresh(EARLIER),
      documentWork: fresh(EARLIER),
    },
    provenance: { source: 'heuristic', refreshedAt: EARLIER, contentKey: 'k' },
  }
}

function staleOverview(): ProjectOverviewData {
  const base = modelOverview()
  delete base.purposeModelWritten
  return {
    ...base,
    purpose: claim('No README or manifest says what this project is for.', [], 'abstain'),
    capabilities: base.capabilities.map((c) =>
      c.modelWritten ? { ...c, modelWritten: { refreshedAt: YESTERDAY, stale: true } } : c,
    ),
    modules: [],
    recordedWork: undefined,
    omitted: { capabilities: 0, modules: 0, documentWork: 0 },
    sections: {
      purpose: fresh(YESTERDAY),
      capabilities: fresh(YESTERDAY, true),
      modules: fresh(YESTERDAY, true),
      recordedWork: fresh(YESTERDAY),
      documentWork: fresh(YESTERDAY, true),
    },
  }
}

const REBUILDING: KnowledgeMapStatus = { projectId: 'wargames', state: 'building', percent: 15 }

const answer = (
  overview: ProjectOverviewData | undefined,
  map?: KnowledgeMapStatus,
  hasCheckout = true,
): ProjectKnowledgeOverview => ({
  ...(overview ? { overview } : {}),
  ...(map ? { map } : {}),
  hasCheckout,
})

const viewOf = (data: ProjectKnowledgeOverview | undefined, error: string | null = null) =>
  knowledgeView({ data, loaded: true, error }, FORMAT)

const VIEWS: Record<string, KnowledgeView> = {
  full: viewOf(answer(modelOverview())),
  'no-model': viewOf(answer(codeOnlyOverview())),
  stale: viewOf(answer(staleOverview(), REBUILDING)),
  building: viewOf(
    answer(undefined, {
      projectId: 'wargames',
      state: 'building',
      percent: 40,
      elapsedMs: 50_000,
      expectedMs: 170_000,
    }),
  ),
  empty: viewOf(answer(undefined, { projectId: 'wargames', state: 'idle' })),
  'no-checkout': viewOf(answer(undefined, undefined, false)),
  failed: viewOf(
    answer(undefined, {
      projectId: 'wargames',
      state: 'failed',
      lastError: 'The map build ran past 10 minutes and was stopped',
    }),
  ),
  error: viewOf(undefined, 'The server did not answer.'),
}

function page(view: KnowledgeView, look: KnowledgeLook = KNOWLEDGE_DEFAULT_LOOK): ReactNode {
  return (
    <div className="overflow-hidden rounded-lg border border-(--border-subtle)">
      <ProjectKnowledgeView
        view={view}
        projectId="wargames"
        onOpenFile={noop}
        renderWork={workChip}
        onRetry={noop}
        look={look}
      />
    </div>
  )
}

function state(id: keyof typeof VIEWS, title: string, description: string): SceneState {
  return { id, title, description, render: () => page(VIEWS[id]!) }
}

const CONTROLS: DesignPlaygroundControl[] = [
  {
    id: 'overview',
    label: 'Overview',
    kind: 'choice',
    options: [
      { id: 'full', label: 'With model-written parts' },
      { id: 'no-model', label: 'Read from the code only' },
      { id: 'stale', label: 'Out of date, map building again' },
    ],
    default: 'full',
  },
  {
    id: 'mark',
    label: 'Model mark',
    kind: 'choice',
    options: [
      { id: 'pill', label: 'Pill beside the name (shipped)' },
      { id: 'rail', label: 'Rail beside the entry' },
      { id: 'caption', label: 'Caption after the text' },
    ],
    default: 'pill',
  },
  {
    id: 'capabilities',
    label: 'Capabilities',
    kind: 'choice',
    options: [
      { id: 'list', label: 'List (shipped)' },
      { id: 'cards', label: 'Cards' },
    ],
    default: 'list',
  },
]

const PRESETS: DesignPlaygroundPreset[] = [
  {
    id: 'shipped',
    name: 'Shipped look',
    values: { overview: 'full', mark: 'pill', capabilities: 'list' },
  },
  {
    id: 'rail-mark',
    name: 'Model mark as a rail',
    values: { overview: 'full', mark: 'rail', capabilities: 'list' },
  },
  {
    id: 'caption-mark',
    name: 'Model mark as a caption',
    values: { overview: 'full', mark: 'caption', capabilities: 'list' },
  },
  {
    id: 'cards',
    name: 'Capabilities as cards',
    values: { overview: 'full', mark: 'pill', capabilities: 'cards' },
  },
]

const MARKS: readonly KnowledgeLook['modelMark'][] = ['pill', 'rail', 'caption']
const LAYOUTS: readonly KnowledgeLook['capabilities'][] = ['list', 'cards']

/** The scene with the look the controls choose — the board the Design view switches alternatives on. */
function play(values: Record<string, string>): ReactNode {
  const look: KnowledgeLook = {
    modelMark: MARKS.find((m) => m === values.mark) ?? KNOWLEDGE_DEFAULT_LOOK.modelMark,
    capabilities:
      LAYOUTS.find((l) => l === values.capabilities) ?? KNOWLEDGE_DEFAULT_LOOK.capabilities,
  }
  return page(VIEWS[values.overview ?? 'full'] ?? VIEWS.full!, look)
}

export const KNOWLEDGE_SCENES: Scene[] = [
  {
    id: 'project-knowledge',
    title: 'Knowledge tab',
    component: 'ProjectKnowledgeView',
    group: 'Project',
    kind: 'screen',
    wide: true,
    description:
      "A project's Knowledge tab on web, desktop and mobile (mobile pushes the native peer of the same name from the drawer): what its stored overview says — Purpose, Capabilities, Main modules, Recorded work and Planned in documents — each part with when it was refreshed and an Out of date badge when what it describes changed since. Entries a model wrote carry a Model mark with its time; entries read from the code carry none. What the overview could not say is written quietly in italics, never as a failure. The files an entry is read from are file chips that open the Files tab at the line; recorded stories and features are the app's dependency chips. “And N more …” says what was left out. Without an overview it says why: the map building (with its progress), queued, failed, no checkout on this machine, or a read that failed (with Try again). Read on opening the tab and whenever the window comes back into view. Two looks are open on the board: how a model-written entry is marked (pill, shipped; rail; caption) and capabilities as a list (shipped) or as cards.",
    states: [
      state(
        'full',
        'With model-written parts',
        'A model wrote the purpose, three capabilities and a module; one capability is from yesterday and may be out of date (orange dot, hover says so). Recorded work: 6 open of 25 stories with their open features as chips. Planned work nested under its parent, opened at its line in docs/plan.md; a ticket reference shown as text.',
      ),
      state(
        'no-model',
        'Read from the code only',
        'No model chosen: every entry is read from the code, so no mark appears. 0 open of 6 recorded stories; no plan documents, said quietly.',
      ),
      state(
        'stale',
        'Out of date',
        'Capabilities, modules and planned work are out of date, the map is being built again (quiet line at the top), the purpose could not be said, no modules were found and recorded work is not known — each said quietly.',
      ),
      state(
        'building',
        'Map building',
        'No overview yet: the map is being built, 40% done with about 2m left, and the overview follows.',
      ),
      state('empty', 'No overview yet', 'The map is built but no overview has been written yet.'),
      state(
        'no-checkout',
        'Not on this machine',
        'The project has no checkout here, so nothing can be read or built.',
      ),
      state(
        'failed',
        'Map failed',
        'The last map build failed; its reason is shown as the upkeep gave it.',
      ),
      state('error', 'Read failed', 'The overview could not be read: the reason and Try again.'),
    ],
    controls: CONTROLS,
    presets: PRESETS,
    play,
  },
]
