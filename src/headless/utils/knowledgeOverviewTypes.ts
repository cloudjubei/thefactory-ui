import type { GetProjectKnowledgeOverviewResponse } from '../api/generated'

/** What the project's Knowledge route answers: the stored overview, the map build and whether it has a checkout. */
export type ProjectKnowledgeOverview = GetProjectKnowledgeOverviewResponse

/** A project's stored overview, as the Knowledge route answers it. */
export type ProjectOverviewData = NonNullable<ProjectKnowledgeOverview['overview']>

/** The map upkeep's status for a project, as the Knowledge route answers it. */
export type KnowledgeMapStatus = NonNullable<ProjectKnowledgeOverview['map']>

/** The parts of an overview, in the order the tab shows them. */
export type KnowledgeSectionId =
  | 'purpose'
  | 'capabilities'
  | 'modules'
  | 'recordedWork'
  | 'documentWork'

/** A model wrote this entry: when, and whether the code it describes may have changed since. */
export type KnowledgeModelMark = {
  refreshedAt: string
  /** When, as the app writes times. */
  when: string
  /** "Model · <when>", as the mark reads. */
  label: string
  /** "Written by a model, <when>", with the out-of-date note when stale — the mark's hover and spoken label. */
  title: string
  stale: boolean
}

/** A file an entry is read from, opened at its line where it names one. */
export type KnowledgeSource = {
  /** What the chip reads: the file's own name, at its line — short enough for a phone. */
  label: string
  /** The definition it points at, when it names one — shown after the label. */
  name?: string
  path: string
  line?: number
}

/** One grounded entry: the purpose, a capability or a main module. */
export type KnowledgeClaimRow = {
  key: string
  /** The capability's or module's name; absent for the purpose. */
  name?: string
  text: string
  /** The overview could not say: shown quietly, never as a failure. */
  quiet: boolean
  model?: KnowledgeModelMark
  sources: KnowledgeSource[]
}

/** A recorded story or feature, drawn as the app's story chip beside its title. */
export type KnowledgeWorkRow = {
  key: string
  /** `storyId` or `storyId.featureId`, as the story chips resolve them. */
  dependency: string
  title: string
  status: string
}

/** A recorded open story with its open features. */
export type KnowledgeWorkStory = KnowledgeWorkRow & {
  features: KnowledgeWorkRow[]
  /** "And N more open features", when the overview left some out. */
  more?: string
}

/** Work listed in the project's own documents. */
export type KnowledgePlannedRow = {
  key: string
  text: string
  /** How deep it sits under the work it belongs to: 0 for top-level work. */
  depth: number
  /** Where it is written: a file to open, or a reference (a ticket) shown as it is. */
  source?: KnowledgeSource | { label: string; name?: undefined; path?: undefined; line?: undefined }
}

/** A line under a section's title: its count, or what the overview says about the part. */
export type KnowledgeNote = {
  text: string
  quiet: boolean
}

type KnowledgeSectionBase = {
  id: KnowledgeSectionId
  title: string
  /** "Refreshed <when>". */
  refreshed: string
  refreshedAt: string
  /** The part may be out of date: the code or work it describes changed since it was written. */
  stale: boolean
  note?: KnowledgeNote
  /** "And N more …", when the overview left entries out. */
  more?: string
}

export type KnowledgeSectionView =
  | (KnowledgeSectionBase & { kind: 'claims'; rows: KnowledgeClaimRow[] })
  | (KnowledgeSectionBase & { kind: 'work'; stories: KnowledgeWorkStory[] })
  | (KnowledgeSectionBase & { kind: 'planned'; items: KnowledgePlannedRow[] })

/** Why the tab has no overview to show. */
export type KnowledgeEmptyReason = 'no-checkout' | 'queued' | 'building' | 'failed' | 'none'

/** Everything the Knowledge tab draws, the same on every client. */
export type KnowledgeView =
  | { kind: 'loading'; title: string }
  | { kind: 'error'; title: string; message: string; retry: string }
  | {
      kind: 'empty'
      reason: KnowledgeEmptyReason
      title: string
      body: string
      /** The build's own progress estimate, 0–100, while building. */
      percent?: number
    }
  | {
      kind: 'overview'
      sections: KnowledgeSectionView[]
      /** A quiet line while the map is built again behind the overview shown. */
      updating?: string
    }

/** What the Knowledge view is made from. */
export type KnowledgeViewInput = {
  data: ProjectKnowledgeOverview | undefined
  /** True once a read finished or failed. */
  loaded: boolean
  error: string | null
}

/** How the view writes times and durations; injectable so a test or a capture draws fixed text. */
export type KnowledgeViewFormat = {
  when: (iso: string) => string
  duration: (ms: number) => string
}

/**
 * How the tab draws two of its choices — open on the Design view's board until one is chosen: capabilities as a
 * list or as cards, and a model-written entry's mark as a pill, a rail beside it or a caption after it.
 */
export type KnowledgeLook = {
  capabilities: 'list' | 'cards'
  modelMark: 'pill' | 'rail' | 'caption'
}

/** A run of an entry's text: plain, or a code span the overview wrote in backticks. */
export type KnowledgeTextPart = { text: string; code: boolean }
