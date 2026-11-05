import type { GetProjectsGroupConstellationResponse } from '../api/generated/types.gen'

/** `GET /projects-groups/:id/constellation`: the members and the package edges among them. */
export type ProjectsGroupConstellation = GetProjectsGroupConstellationResponse

/** How the group's dependencies are drawn. */
export type GroupConstellationLayout = 'layers' | 'ring' | 'list'

/** A project on the map, by the corner it is drawn from. */
export interface GroupConstellationNode {
  projectId: string
  x: number
  y: number
  /** What is missing from it, when something is. */
  note?: string
}

/** A dependency on the map, from box edge to box edge, bent round the boxes between. */
export interface GroupConstellationEdge {
  id: string
  from: string
  to: string
  x1: number
  y1: number
  x2: number
  y2: number
  /** The line, as an SVG path: straight, or one curve. */
  path: string
  /** Only a dev dependency: drawn dashed. */
  dashed: boolean
  /** Its arrowhead, the tip first. */
  arrow: readonly { x: number; y: number }[]
}

/** The group's dependencies, placed for one width. */
export interface GroupConstellationMap {
  width: number
  height: number
  nodes: GroupConstellationNode[]
  edges: GroupConstellationEdge[]
}

/** The other end of a dependency, as a list reads it. */
export interface GroupConstellationLink {
  projectId: string
  label: string
  dashed: boolean
}

/** One project's dependencies, both ways. */
export interface GroupConstellationLinks {
  projectId: string
  note?: string
  dependsOn: GroupConstellationLink[]
  usedBy: GroupConstellationLink[]
}
