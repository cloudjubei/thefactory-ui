import { describe, expect, it } from 'vitest'
import { GROUP_CONSTELLATION_NODE } from './groupConstellationViewConstants'
import { groupConstellationLinks, groupConstellationMap } from './groupConstellationView'
import type { ProjectsGroupConstellation } from './groupConstellationViewTypes'

const project = (
  projectId: string,
  over: Partial<ProjectsGroupConstellation['projects'][number]> = {},
) => ({
  projectId,
  projectRoot: `/work/${projectId}`,
  systemLevel: { level: 4, name: 'System', items: [] },
  ...over,
})

const dep = (
  sourceProjectId: string,
  targetProjectId: string,
  mechanism = 'dependency',
  over: Partial<ProjectsGroupConstellation['dependencies'][number]> = {},
) => ({ sourceProjectId, targetProjectId, mechanism, ...over })

const constellation = (
  ids: string[],
  dependencies: ProjectsGroupConstellation['dependencies'] = [],
): ProjectsGroupConstellation => ({
  groupId: 'g',
  title: 'G',
  projects: ids.map((id) => project(id)),
  dependencies,
})

const rowsOf = (map: ReturnType<typeof groupConstellationMap>) => {
  const rows = new Map<number, string[]>()
  for (const node of map.nodes) rows.set(node.y, [...(rows.get(node.y) ?? []), node.projectId])
  return [...rows.entries()].sort(([a], [b]) => a - b).map(([, ids]) => ids)
}

const overlaps = (map: ReturnType<typeof groupConstellationMap>) => {
  const { width, height } = GROUP_CONSTELLATION_NODE
  return map.nodes.some((a, i) =>
    map.nodes.slice(i + 1).some((b) => Math.abs(a.x - b.x) < width && Math.abs(a.y - b.y) < height),
  )
}

/** Points along a path's `M … L …` or `M … Q …`, as the line is drawn. */
const pathPoints = (path: string) => {
  const n = path.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? []
  const [x1 = 0, y1 = 0] = n
  const [cx = x1, cy = y1, x2 = cx, y2 = cy] = n.slice(2)
  return Array.from({ length: 41 }, (_, i) => {
    const t = i / 40
    return {
      x: (1 - t) ** 2 * x1 + 2 * (1 - t) * t * cx + t ** 2 * x2,
      y: (1 - t) ** 2 * y1 + 2 * (1 - t) * t * cy + t ** 2 * y2,
    }
  })
}

const insideBox = (point: { x: number; y: number }, box?: { x: number; y: number }) =>
  !!box &&
  point.x > box.x &&
  point.x < box.x + GROUP_CONSTELLATION_NODE.width &&
  point.y > box.y &&
  point.y < box.y + GROUP_CONSTELLATION_NODE.height

describe('groupConstellationMap, in layers', () => {
  const stack = constellation(
    ['web', 'ui', 'tools'],
    [dep('web', 'ui'), dep('ui', 'tools'), dep('web', 'tools')],
  )

  it('puts what is built on at the bottom, what builds on it above', () => {
    expect(rowsOf(groupConstellationMap(stack, 'layers', 800))).toEqual([
      ['web'],
      ['ui'],
      ['tools'],
    ])
  })

  it('keeps projects with nothing between them on one row', () => {
    expect(rowsOf(groupConstellationMap(constellation(['a', 'b', 'c']), 'layers', 800))).toEqual([
      ['a', 'b', 'c'],
    ])
  })

  it('wraps a row wider than the space it has, and overlaps nothing', () => {
    const map = groupConstellationMap(constellation(['a', 'b', 'c', 'd', 'e']), 'layers', 340)
    expect(rowsOf(map).length).toBeGreaterThan(1)
    expect(overlaps(map)).toBe(false)
    for (const node of map.nodes) {
      expect(node.x).toBeGreaterThanOrEqual(0)
      expect(node.x + GROUP_CONSTELLATION_NODE.width).toBeLessThanOrEqual(map.width)
    }
  })

  it('stays narrow enough for one node at any width', () => {
    const map = groupConstellationMap(constellation(['a', 'b']), 'layers', 40)
    expect(overlaps(map)).toBe(false)
    expect(map.width).toBeGreaterThanOrEqual(GROUP_CONSTELLATION_NODE.width)
  })

  it('finishes on a dependency cycle, drawing each project once', () => {
    const cycle = constellation(['a', 'b', 'c'], [dep('a', 'b'), dep('b', 'c'), dep('c', 'a')])
    const map = groupConstellationMap(cycle, 'layers', 800)
    expect(map.nodes.map((n) => n.projectId).sort()).toEqual(['a', 'b', 'c'])
    expect(map.edges).toHaveLength(3)
  })

  it('draws an edge from the edge of its source to the edge of its target', () => {
    const map = groupConstellationMap(constellation(['a', 'b'], [dep('a', 'b')]), 'layers', 800)
    const [a, b] = ['a', 'b'].map((id) => map.nodes.find((n) => n.projectId === id))
    const [edge] = map.edges
    expect(edge?.y1).toBe((a?.y ?? 0) + GROUP_CONSTELLATION_NODE.height)
    expect(edge?.y2).toBe(b?.y)
    expect(edge?.path).toBe(`M ${edge?.x1} ${edge?.y1} L ${edge?.x2} ${edge?.y2}`)
  })

  it('bends an edge round a box it would otherwise run through', () => {
    const skipping = constellation(
      ['web', 'ui', 'tools'],
      [dep('web', 'ui'), dep('ui', 'tools'), dep('web', 'tools')],
    )
    const map = groupConstellationMap(skipping, 'layers', 800)
    const edge = map.edges.find((e) => e.from === 'web' && e.to === 'tools')
    const between = map.nodes.find((n) => n.projectId === 'ui')
    expect(edge?.path).toContain('Q')
    for (const point of pathPoints(edge?.path ?? '')) {
      expect(insideBox(point, between), `${point.x},${point.y}`).toBe(false)
    }
  })

  it('keeps a bent edge on the map', () => {
    const skipping = constellation(
      ['web', 'ui', 'tools'],
      [dep('web', 'ui'), dep('ui', 'tools'), dep('web', 'tools')],
    )
    for (const width of [340, GROUP_CONSTELLATION_NODE.width]) {
      const map = groupConstellationMap(skipping, 'layers', width)
      const edge = map.edges.find((e) => e.from === 'web' && e.to === 'tools')
      for (const point of pathPoints(edge?.path ?? '')) {
        expect(point.x).toBeGreaterThanOrEqual(0)
        expect(point.x).toBeLessThanOrEqual(map.width)
      }
    }
  })

  it('draws a clear edge straight', () => {
    const map = groupConstellationMap(constellation(['a', 'b'], [dep('a', 'b')]), 'layers', 800)
    expect(map.edges[0]?.path).toContain('L')
    expect(map.edges[0]?.path).not.toContain('Q')
  })

  it('leaves out an edge to a project that is not drawn', () => {
    const map = groupConstellationMap(constellation(['a'], [dep('a', 'gone')]), 'layers', 800)
    expect(map.edges).toEqual([])
  })

  it('draws one edge for a pair the view lists twice', () => {
    const map = groupConstellationMap(
      constellation(['a', 'b'], [dep('a', 'b'), dep('a', 'b', 'import')]),
      'layers',
      800,
    )
    expect(map.edges).toHaveLength(1)
  })

  it('is empty for an empty group', () => {
    expect(groupConstellationMap(constellation([]), 'layers', 800).nodes).toEqual([])
  })
})

describe('groupConstellationMap, in a ring', () => {
  it('draws every project apart, within its bounds', () => {
    const ids = ['a', 'b', 'c', 'd', 'e', 'f']
    const map = groupConstellationMap(constellation(ids, [dep('a', 'b')]), 'ring', 800)
    expect(map.nodes).toHaveLength(ids.length)
    expect(overlaps(map)).toBe(false)
    for (const node of map.nodes) {
      expect(node.x).toBeGreaterThanOrEqual(0)
      expect(node.y).toBeGreaterThanOrEqual(0)
      expect(node.x + GROUP_CONSTELLATION_NODE.width).toBeLessThanOrEqual(map.width)
      expect(node.y + GROUP_CONSTELLATION_NODE.height).toBeLessThanOrEqual(map.height)
    }
  })

  it('stays apart on a narrow screen', () => {
    const ids = ['a', 'b', 'c', 'd', 'e', 'f']
    expect(overlaps(groupConstellationMap(constellation(ids), 'ring', 340))).toBe(false)
  })
})

describe('an edge’s look', () => {
  const edgeOf = (mechanism: string, over = {}) =>
    groupConstellationMap(
      constellation(['a', 'b'], [dep('a', 'b', mechanism, over)]),
      'layers',
      800,
    ).edges[0]

  it('draws a dev-only dependency dashed', () => {
    expect(edgeOf('devDependency')?.dashed).toBe(true)
    expect(edgeOf('dependency')?.dashed).toBe(false)
    expect(edgeOf('import')?.dashed).toBe(false)
  })

  it('gives its arrowhead three points at the target', () => {
    const edge = edgeOf('dependency')
    expect(edge?.arrow).toHaveLength(3)
    expect(edge?.arrow[0]).toEqual({ x: edge?.x2, y: edge?.y2 })
  })
})

describe('a node’s note', () => {
  const noteOf = (over: Partial<ProjectsGroupConstellation['projects'][number]>) =>
    groupConstellationMap(
      { groupId: 'g', title: 'G', projects: [project('a', over)], dependencies: [] },
      'layers',
      800,
    ).nodes[0]?.note

  it('says a project with no checkout has none', () => {
    expect(noteOf({ projectRoot: '' })).toBe('No checkout')
  })

  it('says a project with no map has none', () => {
    expect(noteOf({ systemLevel: null })).toBe('No map yet')
  })

  it('has nothing to say otherwise', () => {
    expect(noteOf({})).toBeUndefined()
  })
})

describe('groupConstellationLinks', () => {
  it('says what each project depends on and what uses it, in group order', () => {
    const links = groupConstellationLinks(
      constellation(
        ['web', 'ui', 'tools'],
        [
          dep('web', 'ui'),
          dep('ui', 'tools', 'devDependency'),
          dep('web', 'tools', 'import', { importCount: 240 }),
        ],
      ),
    )
    expect(links.map((row) => row.projectId)).toEqual(['web', 'ui', 'tools'])
    expect(links[0]?.dependsOn).toEqual([
      { projectId: 'ui', label: 'dependency', dashed: false },
      { projectId: 'tools', label: 'import · 240', dashed: false },
    ])
    expect(links[1]?.dependsOn).toEqual([{ projectId: 'tools', label: 'dev', dashed: true }])
    expect(links[2]?.usedBy.map((link) => link.projectId)).toEqual(['ui', 'web'])
  })

  it('leaves out a project that is not a member', () => {
    const links = groupConstellationLinks(
      constellation(['a'], [dep('a', 'gone'), dep('gone', 'a')]),
    )
    expect(links[0]?.dependsOn).toEqual([])
    expect(links[0]?.usedBy).toEqual([])
  })
})
