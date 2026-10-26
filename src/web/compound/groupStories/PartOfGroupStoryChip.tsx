import type { GroupStoryMembership } from '../../../headless'

export type PartOfGroupStoryChipProps = {
  /** The group stories this story is a part of — nothing is drawn for none. */
  memberships: readonly GroupStoryMembership[]
  onOpen: (groupId: string, groupStoryId: string) => void
}

/** A part story's way back, in its header: "Part of <group> › <group story>", opening the group story. */
export default function PartOfGroupStoryChip({ memberships, onOpen }: PartOfGroupStoryChipProps) {
  if (memberships.length === 0) return null
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {memberships.map((m) => (
        <button
          key={`${m.groupId}/${m.groupStoryId}`}
          type="button"
          onClick={() => onOpen(m.groupId, m.groupStoryId)}
          className="chip chip--ok max-w-full truncate"
          title={`Open the group story “${m.title}” in ${m.groupTitle}`}
        >
          <span className="text-(--text-muted)">Part of</span> {m.groupTitle} › {m.title}
        </button>
      ))}
    </span>
  )
}
