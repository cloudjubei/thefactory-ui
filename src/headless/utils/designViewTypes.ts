import type {
  DesignApp,
  DesignCompareRow,
  DesignEntryTarget,
  DesignPlaygroundScene,
  DesignProposal,
  DesignProposalEntry,
  DesignScreen,
  DesignState,
  DesignTidyMove,
  DesignVersion,
} from '../api'

/** The part of an app's design the Design tab shows. */
export type DesignTab = 'current' | 'proposals' | 'history' | 'tidy' | 'playground'

/** What the Design tab has selected. */
export type DesignSelection = {
  appId?: string
  tab: DesignTab
  screenId?: string
  stateId?: string
  variant?: string
  proposalId?: string
}

/** What a `?app=&tab=&screen=&state=&variant=&proposal=` link asks the Design tab to show. */
export type DesignSelectionParams = {
  app?: string | null
  tab?: string | null
  screen?: string | null
  state?: string | null
  variant?: string | null
  proposal?: string | null
}

/** A screen or component as the sidebar lists it. */
export type DesignNavScreen = {
  id: string
  name: string
  states: number
  /** Cells with a proposal waiting on them. */
  waiting: number
}

/** An app's design as the sidebar lists it. */
export type DesignAppNav = {
  app: DesignApp
  screens: DesignNavScreen[]
  componentGroups: Array<{ group: string; components: DesignNavScreen[] }>
  openProposals: number
  versions: number
}

/** A proposal in the list, with what it would change in a few words. */
export type DesignProposalListItem = {
  proposal: DesignProposal
  rows: DesignCompareRow[]
  summary: string
}

/** A group of the proposal list: waiting ones, the answers to one question, or those decided. */
export type DesignProposalGroup = {
  key: string
  title: string
  question?: string
  items: DesignProposalListItem[]
}

/** The answers to one question laid out as a draft's cases: a row per choice, a column per variant. */
export type DesignCaseMatrix = {
  variants: string[]
  rows: Array<{ proposal: DesignProposal; cells: Array<DesignProposalEntry | undefined> }>
}

/** A screen's history: every state with its versions, newest first. */
export type DesignHistoryScreen = {
  screen: DesignScreen
  states: Array<{
    state: DesignState
    versions: Array<{ version: DesignVersion; current: boolean; from: string }>
  }>
}

/** A tidy-up move in the names the person knows. */
export type DesignTidyMoveView = {
  move: DesignTidyMove
  kindLabel: string
  from: string[]
  to: string
}

/** Where an image can be filed: a screen of the app and its states. */
export type DesignFileTarget = {
  screenId: string
  screenName: string
  kind: DesignScreen['kind']
  states: Array<{ id: string; name: string }>
}

/** What a design ask files, in the names the person knows: each screen, found or new, and its states. */
export type DesignAskSummary = {
  screens: Array<{
    name: string
    /** The screen the design already has, and how many versions it holds. */
    found?: { app: string; versions: number }
    states: Array<{ name: string; tag: 'replaces' | 'new' }>
  }>
  /** Images that name no screen yet. */
  unfiled: number
  /** The variants the images are drawn in, said once. */
  variants: string[]
}

/** Something a person can delete from a project's design. */
export type DesignDeleteTarget =
  | { kind: 'app'; app: DesignApp }
  | { kind: 'screen'; screen: DesignScreen }
  | { kind: 'state'; state: DesignState }
  | { kind: 'proposal'; proposal: DesignProposal }

/** One store of a project's usage, as the breakdown lists it. */
export type StorageUsageRow = {
  key: 'design' | 'evidence' | 'ui-test' | 'mobile-test'
  label: string
  bytes: number
  size: string
}

/** The OS notification for a storage warning. */
export type StorageWarningNotification = { title: string; body: string; tag: string }

/** Where a state saved from a playground scene can be filed, as the save's "Where" lists it. */
export type DesignPlaygroundSaveTarget = {
  key: string
  label: string
  target: Pick<DesignEntryTarget, 'screenId' | 'screenName' | 'screenKind'>
}

/** The scenes of one group, as the Playground lists them. */
export type DesignPlaygroundSceneGroup = {
  group: string
  scenes: DesignPlaygroundScene[]
}

export type DesignPlaygroundDevice = 'desktop' | 'phone'

/** The build the Playground's frame opened on, and when it last moved to a newer one (epoch ms). */
export type DesignPlaygroundFrame = { build?: string; refreshedAt?: number }

/** What the Playground says above a frame it keeps showing. */
export type DesignPlaygroundBar =
  | { kind: 'rebuilding'; label: string }
  | { kind: 'rebuild-failed'; label: string; error: string }
  /** The frame moved to the newer build built `at` (epoch ms); `fading` as it is about to go. */
  | { kind: 'updated'; label: string; at: number; fading: boolean }

/**
 * What the Playground shows: nothing, its first build running, why it failed,
 * or the frame on a build with what happens behind it. `ticking` while what it
 * says changes with time.
 */
export type DesignPlaygroundView =
  | { kind: 'none' }
  | { kind: 'building'; label: string; ticking: boolean }
  | { kind: 'failed'; error: string }
  | {
      kind: 'ready'
      build: string
      bar?: DesignPlaygroundBar
      /** Said beside "Save as a state" while a save would wait for a build. */
      saveHint?: string
      ticking: boolean
    }
