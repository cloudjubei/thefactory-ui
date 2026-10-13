import type { ChatContext, Feature, ProcessRun, Story } from 'thefactory-tools/types'

import type { CostSource } from './costDetailsTypes'
import type { ProcessStatusTone } from './processView'
import type { ProcessTimeDetailsView } from './processTimeDetailsTypes'
import type { StepsStripModel } from './stepsStripTypes'

/** What a chat is about, as its header tile and the chat list show it. */
export type ChatKind =
  | 'project'
  | 'topic'
  | 'story'
  | 'feature'
  | 'run'
  | 'request'
  | 'group'
  | 'assistant'

/** The palette ramp a kind's tile is drawn from. */
export type ChatKindRamp = 'brand' | 'pink' | 'teal' | 'purple' | 'orange' | 'gray'

/** How a chat kind looks: its name and its tile's colour. */
export type ChatKindView = { label: string; ramp: ChatKindRamp }

/** The facts a chat header is drawn from — whatever of them the host has. */
export type ChatHeaderInput = {
  context: ChatContext
  /** The title stored on the chat — a topic's name. */
  chatTitle?: string
  projectName?: string
  groupName?: string
  /** How many projects the group holds, for a group chat's context line. */
  groupProjectCount?: number
  story?: Pick<Story, 'id' | 'title' | 'status'> & {
    features: readonly Pick<Feature, 'id' | 'title' | 'status'>[]
  }
  feature?: Pick<Feature, 'id' | 'title' | 'status' | 'acceptance'>
  storyDisplayIndex?: (storyId: string) => number | undefined
  featureDisplayIndex?: (storyId: string, featureId: string) => number | undefined
  /** The process run a run chat belongs to, once it is read. */
  run?: ProcessRun
  /** What the chat's own messages cost. */
  messagesCost?: CostSource
  /** The clock a running run's time is read against. */
  now: number
  /** The person archived the chat from their list. */
  listHidden?: boolean
}

/** A status pill in the package's semantic tones. */
export type ChatHeaderPill = { label: string; tone: ProcessStatusTone }

/** What a chat header shows. */
export type ChatHeaderView = {
  kind: ChatKind
  kindLabel: string
  title: string
  pill?: ChatHeaderPill
  /** The line under the title — where the chat sits: `Story #7 · Sign-off`. */
  context: string
  /** A run's working time, with where it went. */
  duration?: { label: string; details?: ProcessTimeDetailsView; title: string }
  cost?: { label: string; cost?: CostSource; title?: string }
  /** The steps, features or done-when criteria under the header. */
  strip?: StepsStripModel
}
