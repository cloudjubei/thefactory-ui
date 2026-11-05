import {
  GROUP_CONSTELLATION_ARROW,
  GROUP_CONSTELLATION_COPY,
  GROUP_CONSTELLATION_GAP,
  GROUP_CONSTELLATION_NODE,
} from './groupConstellationViewConstants'
import type {
  ProjectsGroupConstellation,
  GroupConstellationEdge,
  GroupConstellationLayout,
  GroupConstellationLinks,
  GroupConstellationMap,
  GroupConstellationNode,
} from './groupConstellationViewTypes'

type Project = ProjectsGroupConstellation['projects'][number]
type Dependency = ProjectsGroupConstellation['dependencies'][number]
type Point = { x: number; y: number }

const DEV_MECHANISM = 'devDependency'
const IMPORT_MECHANISM = 'import'
const RING_MIN_RADIUS = 90
const RING_ROW_SPACE = 12
const RING_GROWTH = 1.25
const RING_TURN = 0.3
const RING_ATTEMPTS = 24

const BEND_CLEARANCE = 4
const BEND_SAMPLES = 24

const { width: NODE_W, height: NODE_H } = GROUP_CONSTELLATION_NODE

const BEND_STEPS = [0, 0.7, -0.7, 1.2, -1.2, 1.8, -1.8, 2.6, -2.6].map((step) => step * NODE_W)

function noteOf(project: Project): string | undefined {
  if (!project.projectRoot) return GROUP_CONSTELLATION_COPY.noCheckout
  return project.systemLevel ? undefined : GROUP_CONSTELLATION_COPY.noMap
}

function nodeOf(project: Project, x: number, y: number): GroupConstellationNode {
  const note = noteOf(project)
  return { projectId: project.projectId, x, y, ...(note ? { note } : {}) }
}

/** How many layers each project sits above what it builds on. A cycle does not add one. */
function layersOf(constellation: ProjectsGroupConstellation): Map<string, number> {
  const targets = new Map<string, string[]>()
  for (const { sourceProjectId, targetProjectId } of constellation.dependencies) {
    targets.set(sourceProjectId, [...(targets.get(sourceProjectId) ?? []), targetProjectId])
  }
  const members = new Set(constellation.projects.map((project) => project.projectId))
  const layers = new Map<string, number>()
  const visiting = new Set<string>()
  const layerOf = (id: string): number => {
    const known = layers.get(id)
    if (known !== undefined) return known
    if (visiting.has(id)) return 0
    visiting.add(id)
    const below = (targets.get(id) ?? []).filter((target) => members.has(target)).map(layerOf)
    visiting.delete(id)
    const layer = below.length > 0 ? Math.max(...below) + 1 : 0
    layers.set(id, layer)
    return layer
  }
  for (const id of members) layerOf(id)
  return layers
}

function layeredNodes(constellation: ProjectsGroupConstellation, width: number) {
  const layers = layersOf(constellation)
  const perRow = Math.max(
    1,
    Math.floor((width + GROUP_CONSTELLATION_GAP.x) / (NODE_W + GROUP_CONSTELLATION_GAP.x)),
  )
  const byLayer = new Map<number, Project[]>()
  for (const project of constellation.projects) {
    const layer = layers.get(project.projectId) ?? 0
    byLayer.set(layer, [...(byLayer.get(layer) ?? []), project])
  }
  const nodes: GroupConstellationNode[] = []
  let y = 0
  for (const layer of [...byLayer.keys()].sort((a, b) => b - a)) {
    const projects = byLayer.get(layer) ?? []
    for (let start = 0; start < projects.length; start += perRow) {
      const row = projects.slice(start, start + perRow)
      const rowWidth = row.length * NODE_W + (row.length - 1) * GROUP_CONSTELLATION_GAP.x
      row.forEach((project, index) => {
        const x = (width - rowWidth) / 2 + index * (NODE_W + GROUP_CONSTELLATION_GAP.x)
        nodes.push(nodeOf(project, x, y))
      })
      y += NODE_H + GROUP_CONSTELLATION_GAP.y
    }
  }
  return { nodes, height: Math.max(0, y - GROUP_CONSTELLATION_GAP.y) }
}

function collide(nodes: readonly GroupConstellationNode[]): boolean {
  return nodes.some((a, index) =>
    nodes
      .slice(index + 1)
      .some((b) => Math.abs(a.x - b.x) < NODE_W && Math.abs(a.y - b.y) < NODE_H),
  )
}

function ringNodes(constellation: ProjectsGroupConstellation, width: number) {
  const { projects } = constellation
  const radiusX = (width - NODE_W) / 2
  let radiusY = Math.max(RING_MIN_RADIUS, (projects.length * (NODE_H + RING_ROW_SPACE)) / 2)
  let turn = 0
  const place = () =>
    projects.map((project, index) => {
      const angle = (index / projects.length) * 2 * Math.PI + turn
      return nodeOf(project, radiusX * (1 + Math.sin(angle)), radiusY * (1 - Math.cos(angle)))
    })
  let nodes = place()
  for (let attempt = 0; attempt < RING_ATTEMPTS && collide(nodes); attempt += 1) {
    radiusY *= RING_GROWTH
    turn = RING_TURN
    nodes = place()
  }
  return { nodes, height: 2 * radiusY + NODE_H }
}

/** Where the line between two boxes' centres leaves the box at `from`, heading for `to`. */
function boxExit(from: Point, to: Point): Point {
  const dx = to.x - from.x
  const dy = to.y - from.y
  if (Math.abs(dx) * NODE_H > Math.abs(dy) * NODE_W) {
    const side = Math.sign(dx) * (NODE_W / 2)
    return { x: from.x + side, y: from.y + (dy * side) / dx }
  }
  const side = Math.sign(dy) * (NODE_H / 2)
  return { x: from.x + (dy === 0 ? 0 : (dx * side) / dy), y: from.y + side }
}

function arrowAt(tip: Point, tail: Point): Point[] {
  const angle = Math.atan2(tip.y - tail.y, tip.x - tail.x)
  const { length, halfWidth } = GROUP_CONSTELLATION_ARROW
  const back = { x: tip.x - length * Math.cos(angle), y: tip.y - length * Math.sin(angle) }
  const side = { x: halfWidth * Math.sin(angle), y: -halfWidth * Math.cos(angle) }
  return [
    tip,
    { x: back.x + side.x, y: back.y + side.y },
    { x: back.x - side.x, y: back.y - side.y },
  ]
}

const centreOf = (node: GroupConstellationNode): Point => ({
  x: node.x + NODE_W / 2,
  y: node.y + NODE_H / 2,
})

const inBox = (point: Point, box: GroupConstellationNode): boolean =>
  point.x > box.x - BEND_CLEARANCE &&
  point.x < box.x + NODE_W + BEND_CLEARANCE &&
  point.y > box.y - BEND_CLEARANCE &&
  point.y < box.y + NODE_H + BEND_CLEARANCE

function curvePoints(start: Point, control: Point, end: Point): Point[] {
  return Array.from({ length: BEND_SAMPLES + 1 }, (_, index) => {
    const t = index / BEND_SAMPLES
    const a = (1 - t) ** 2
    const b = 2 * (1 - t) * t
    const c = t ** 2
    return {
      x: a * start.x + b * control.x + c * end.x,
      y: a * start.y + b * control.y + c * end.y,
    }
  })
}

/** The way from one box to the other: straight, or bent far enough round the boxes between. */
function routeBetween(
  source: GroupConstellationNode,
  target: GroupConstellationNode,
  nodes: readonly GroupConstellationNode[],
  width: number,
): { start: Point; control?: Point; end: Point } {
  const from = centreOf(source)
  const to = centreOf(target)
  const others = nodes.filter((node) => node !== source && node !== target)
  const length = Math.hypot(to.x - from.x, to.y - from.y) || 1
  const across = { x: -(to.y - from.y) / length, y: (to.x - from.x) / length }
  for (const bend of BEND_STEPS) {
    const control = {
      x: (from.x + to.x) / 2 + across.x * bend,
      y: (from.y + to.y) / 2 + across.y * bend,
    }
    const start = boxExit(from, bend === 0 ? to : control)
    const end = boxExit(to, bend === 0 ? from : control)
    const line = curvePoints(start, control, end)
    const clear = line.every(
      (point) => point.x >= 0 && point.x <= width && !others.some((other) => inBox(point, other)),
    )
    if (clear) return bend === 0 ? { start, end } : { start, control, end }
  }
  return { start: boxExit(from, to), end: boxExit(to, from) }
}

function edgesOf(
  dependencies: readonly Dependency[],
  nodes: readonly GroupConstellationNode[],
  width: number,
): GroupConstellationEdge[] {
  const byId = new Map(nodes.map((node) => [node.projectId, node]))
  const edges = new Map<string, GroupConstellationEdge>()
  for (const { sourceProjectId: from, targetProjectId: to, mechanism } of dependencies) {
    const source = byId.get(from)
    const target = byId.get(to)
    if (!source || !target || from === to) continue
    const id = `${from}>${to}`
    const dashed = mechanism === DEV_MECHANISM
    const known = edges.get(id)
    if (known) {
      known.dashed = known.dashed && dashed
      continue
    }
    const { start, control, end } = routeBetween(source, target, nodes, width)
    edges.set(id, {
      id,
      from,
      to,
      x1: start.x,
      y1: start.y,
      x2: end.x,
      y2: end.y,
      path: control
        ? `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`
        : `M ${start.x} ${start.y} L ${end.x} ${end.y}`,
      dashed,
      arrow: arrowAt(end, control ?? start),
    })
  }
  return [...edges.values()]
}

/**
 * The group's dependencies placed for a width. `layers` puts what is built on
 * at the bottom and what builds on it above, wrapping a layer wider than the
 * space; `ring` draws the members round one loop. Boxes are the caller's to
 * draw: both clients place their own at these corners, over these lines. Pure.
 */
export function groupConstellationMap(
  constellation: ProjectsGroupConstellation,
  layout: Exclude<GroupConstellationLayout, 'list'>,
  availableWidth: number,
): GroupConstellationMap {
  const width = Math.max(availableWidth, NODE_W)
  const { nodes, height } =
    layout === 'ring' ? ringNodes(constellation, width) : layeredNodes(constellation, width)
  return { width, height, nodes, edges: edgesOf(constellation.dependencies, nodes, width) }
}

function linkLabel({ mechanism, importCount }: Dependency): string {
  if (mechanism === DEV_MECHANISM) return GROUP_CONSTELLATION_COPY.dev
  if (mechanism === IMPORT_MECHANISM && importCount !== undefined) {
    return GROUP_CONSTELLATION_COPY.imports(importCount)
  }
  return mechanism
}

/** Each member's dependencies, both ways, in group order: the map as a list. Pure. */
export function groupConstellationLinks(
  constellation: ProjectsGroupConstellation,
): GroupConstellationLinks[] {
  const members = new Set(constellation.projects.map((project) => project.projectId))
  const known = constellation.dependencies.filter(
    (dependency) =>
      members.has(dependency.sourceProjectId) && members.has(dependency.targetProjectId),
  )
  return constellation.projects.map((project) => {
    const note = noteOf(project)
    const link = (projectId: string, dependency: Dependency) => ({
      projectId,
      label: linkLabel(dependency),
      dashed: dependency.mechanism === DEV_MECHANISM,
    })
    return {
      projectId: project.projectId,
      ...(note ? { note } : {}),
      dependsOn: known
        .filter((dependency) => dependency.sourceProjectId === project.projectId)
        .map((dependency) => link(dependency.targetProjectId, dependency)),
      usedBy: known
        .filter((dependency) => dependency.targetProjectId === project.projectId)
        .map((dependency) => link(dependency.sourceProjectId, dependency)),
    }
  })
}
