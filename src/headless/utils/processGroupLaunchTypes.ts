/** One project's part of a group run, as a launch asks for it. */
export interface ProcessGroupLegRequest {
  projectId: string
  storyId: string
  dependsOn?: string[]
  processId?: string
}

/** One leg as the launch card shows it before the work starts. */
export interface ProcessGroupLaunchLeg {
  projectId: string
  projectTitle: string
  storyId: string
  storyTitle?: string
  dependsOn: string[]
  processId?: string
  features: number
  isPrerequisite: boolean
  problem?: string
}

/** What a group launch would start, and why it cannot when it cannot. */
export interface ProcessGroupLaunchPreview {
  groupId: string
  groupTitle?: string
  legs: ProcessGroupLaunchLeg[]
  waves: string[][]
  problems: string[]
}

/** What the launch card shows of a `startGroupWork` ask. */
export interface StartGroupWorkGrantSummary {
  /** The group the ask names — the general chat's launch names one; a group chat's is its own. */
  groupId?: string
  title?: string
  legs: ProcessGroupLegRequest[]
  note?: string
  proofRequired: boolean
  runner?: 'cli' | 'api'
  spendCapUsd?: number
}
