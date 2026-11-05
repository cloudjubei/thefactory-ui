import { useEffect, useMemo, useRef, useState } from 'react'
import {
  GROUP_CONSTELLATION_COPY,
  GROUP_CONSTELLATION_DEFAULT_LAYOUT,
  GROUP_CONSTELLATION_FALLBACK_WIDTH,
  GROUP_CONSTELLATION_NODE,
  GROUP_MEMBER_ATTENTION_TONE,
  groupConstellationLinks,
  groupConstellationMap,
  type GroupConstellationLayout,
  type GroupConstellationLink,
  type GroupMemberAttention,
  type ProjectsGroupConstellation,
} from '../../../headless'
import ProjectChip from '../chips/ProjectChip'

export type GroupConstellationProps = {
  constellation: ProjectsGroupConstellation
  layout?: GroupConstellationLayout
  nameOf: (projectId: string) => string
  /** What a project wants from the person, which its box's dot says. */
  attentionOf?: (projectId: string) => GroupMemberAttention | undefined
  onSelectProject: (projectId: string) => void
}

function useMeasuredWidth() {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(GROUP_CONSTELLATION_FALLBACK_WIDTH)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    setWidth(element.clientWidth)
    const observer = new ResizeObserver(() => setWidth(element.clientWidth))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return { ref, width }
}

function Links({
  title,
  links,
  nameOf,
  onSelectProject,
}: {
  title: string
  links: readonly GroupConstellationLink[]
  nameOf: (projectId: string) => string
  onSelectProject: (projectId: string) => void
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
      <span className="w-16 shrink-0 text-[11px] text-(--text-secondary)">{title}</span>
      {links.length === 0 ? (
        <span className="text-[11px] text-(--text-muted)">{GROUP_CONSTELLATION_COPY.nothing}</span>
      ) : null}
      {links.map((link) => (
        <span key={link.projectId} className="inline-flex items-center gap-1">
          <ProjectChip
            label={nameOf(link.projectId)}
            onClick={() => onSelectProject(link.projectId)}
          />
          <span className="text-[10.5px] text-(--text-muted)">{link.label}</span>
        </span>
      ))}
    </div>
  )
}

function LinksList({
  constellation,
  nameOf,
  onSelectProject,
}: Pick<GroupConstellationProps, 'constellation' | 'nameOf' | 'onSelectProject'>) {
  const rows = useMemo(() => groupConstellationLinks(constellation), [constellation])
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((row) => (
        <li key={row.projectId} className="flex min-w-0 flex-col gap-1">
          <div className="flex items-baseline gap-2">
            <span className="truncate text-sm font-medium">{nameOf(row.projectId)}</span>
            {row.note ? <span className="text-[11px] text-(--text-muted)">{row.note}</span> : null}
          </div>
          <Links
            title={GROUP_CONSTELLATION_COPY.dependsOn}
            links={row.dependsOn}
            nameOf={nameOf}
            onSelectProject={onSelectProject}
          />
          <Links
            title={GROUP_CONSTELLATION_COPY.usedBy}
            links={row.usedBy}
            nameOf={nameOf}
            onSelectProject={onSelectProject}
          />
        </li>
      ))}
    </ul>
  )
}

function ConstellationMap({
  constellation,
  layout,
  nameOf,
  attentionOf,
  onSelectProject,
}: GroupConstellationProps & { layout: Exclude<GroupConstellationLayout, 'list'> }) {
  const { ref, width } = useMeasuredWidth()
  const map = useMemo(
    () => groupConstellationMap(constellation, layout, width),
    [constellation, layout, width],
  )
  return (
    <div ref={ref} className="w-full overflow-x-auto">
      <div className="relative" style={{ width: map.width, height: map.height }}>
        <svg
          className="absolute inset-0 text-(--text-muted)"
          width={map.width}
          height={map.height}
          aria-hidden
        >
          {map.edges.map((edge) => (
            <g key={edge.id}>
              <path
                d={edge.path}
                fill="none"
                stroke="currentColor"
                strokeWidth={1}
                {...(edge.dashed ? { strokeDasharray: '4 3' } : {})}
              />
              <polygon
                points={edge.arrow.map((point) => `${point.x},${point.y}`).join(' ')}
                fill="currentColor"
              />
            </g>
          ))}
        </svg>
        {map.nodes.map((node) => {
          const attention = attentionOf?.(node.projectId)
          return (
            <button
              key={node.projectId}
              type="button"
              onClick={() => onSelectProject(node.projectId)}
              style={{
                left: node.x,
                top: node.y,
                width: GROUP_CONSTELLATION_NODE.width,
                height: GROUP_CONSTELLATION_NODE.height,
              }}
              className="absolute flex items-center gap-1.5 rounded-md border border-(--border-subtle) bg-(--surface-raised) px-2 text-left hover:border-(--border-default) hover:bg-(--surface-overlay)"
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{
                  background: `var(--status-${GROUP_MEMBER_ATTENTION_TONE[attention ?? 'quiet']}-bg)`,
                }}
                aria-hidden
              />
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-[12px] font-medium">{nameOf(node.projectId)}</span>
                {node.note ? (
                  <span className="truncate text-[10.5px] text-(--text-muted)">{node.note}</span>
                ) : null}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** The group's cross-repo dependencies: a project opens on click. */
export default function GroupConstellation({
  layout = GROUP_CONSTELLATION_DEFAULT_LAYOUT,
  ...props
}: GroupConstellationProps) {
  const { constellation } = props
  if (constellation.dependencies.length === 0) {
    return <p className="text-sm text-(--text-muted)">{GROUP_CONSTELLATION_COPY.none}</p>
  }
  return (
    <div className="flex flex-col gap-2">
      {layout === 'list' ? (
        <LinksList {...props} />
      ) : (
        <ConstellationMap {...props} layout={layout} />
      )}
      {layout === 'list' ? null : (
        <p className="text-[11px] text-(--text-muted)">{GROUP_CONSTELLATION_COPY.key}</p>
      )}
    </div>
  )
}
