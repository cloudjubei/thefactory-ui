import type { GetProjectsGroupStatusResponse } from '../api/generated/types.gen'
import type { CheckMethodRow } from './checkMethodTypes'
import type { ProcessStatusTone } from './processView'
import type { ProcessRunAttentionSectionId } from './processRunAttentionTypes'

/** `GET /projects-groups/:id/status`: the group's roll-up, one row per member. */
export type ProjectsGroupStatus = GetProjectsGroupStatusResponse

/** One member's row of the roll-up. */
export type ProjectsGroupMemberStatus = ProjectsGroupStatus['members'][number]

/** How the group's home arranges its members. */
export type GroupHomeLayout = 'needs-you-first' | 'cards' | 'table'

/** What a member wants from the person, most urgent first. */
export type GroupMemberAttention = 'needs-you' | 'working' | 'quiet'

/** A soft status pill on the group's home. */
export interface GroupStatusBadge {
  id: string
  label: string
  tone: ProcessStatusTone
  /** What its hover says, when there is more to it than its label. */
  title?: string
}

/** A current run on a member, as its row in the Processes list reads. */
export interface GroupMemberRunRow {
  id: string
  projectId: string
  title: string
  line: string
  tone: ProcessStatusTone
  section: ProcessRunAttentionSectionId
}

/** A member's stories and features done, over what counts. */
export interface GroupMemberProgress {
  stories?: string
  features?: string
  percent: number
}

/** A member's checkout: the branch and how far it is from its upstream, or why it is not known. */
export interface GroupMemberGit {
  branch?: string
  divergence?: string
  unread?: string
}

/** A failing check, as the check chip the app already shows. */
export type GroupMemberCheck = Pick<CheckMethodRow, 'id' | 'label' | 'state' | 'available'> & {
  /** What the check said last. */
  title: string
}

/** One member, arranged for one render. */
export interface GroupMemberView {
  projectId: string
  attention: GroupMemberAttention
  badges: GroupStatusBadge[]
  runs: GroupMemberRunRow[]
  progress?: GroupMemberProgress
  git?: GroupMemberGit
  checks: GroupMemberCheck[]
  /** How long ago anything last happened on it. */
  activity?: string
}

/** A group run still open, once however many members it spans. */
export interface GroupRunRow {
  id: string
  title: string
  label: string
  tone: ProcessStatusTone
  projectIds: string[]
}

/** Members who want the same thing from the person. */
export interface GroupStatusSection {
  id: GroupMemberAttention
  label: string
  members: GroupMemberView[]
}

/** The group's home, arranged for one render. */
export interface GroupStatusView {
  /** The group added up. Empty when nothing is going on. */
  headline: GroupStatusBadge[]
  groupRuns: GroupRunRow[]
  /** In the group's order. */
  members: GroupMemberView[]
  /** The same members, what wants the person first. */
  sections: GroupStatusSection[]
}
