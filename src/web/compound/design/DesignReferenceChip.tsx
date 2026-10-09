import { useState } from 'react'
import type { ReferenceDescription, ResourceLink } from 'thefactory-tools/types'
import { designReferencePreview, useDesignPreview } from '../../../headless'
import { IconMaximize } from '../../icons'
import ReferenceChip from '../chips/ReferenceChip'
import DesignItemThumb from './DesignItemThumb'
import DesignItemViewer from './DesignItemViewer'

type DesignLink = Extract<ResourceLink, { kind: 'design' }>

export type DesignReferenceChipProps = {
  description: ReferenceDescription
  link: DesignLink
  onOpen?: (link: ResourceLink) => void
}

function Preview({ link, onExpand }: { link: DesignLink; onExpand: (itemId: string) => void }) {
  const { tree, isLoaded, contentUrl } = useDesignPreview(link.projectId)
  const item = designReferencePreview(tree, link)
  if (!isLoaded) return <span className="text-(--text-muted)">Loading…</span>
  if (!item) return null
  return (
    <div className="relative mt-1 self-start">
      <DesignItemThumb item={item} src={contentUrl(item.id)} width={224} />
      <button
        type="button"
        aria-label={`Open ${item.name}`}
        title="Open"
        className="absolute top-1 right-1 rounded bg-(--surface-raised) p-1 shadow-sm hover:bg-(--surface-hover)"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onExpand(item.id)
        }}
      >
        <IconMaximize className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

function Viewer({
  projectId,
  itemId,
  onClose,
}: {
  projectId: string
  itemId: string
  onClose: () => void
}) {
  const { tree, contentUrl } = useDesignPreview(projectId)
  const item = designReferencePreview(tree, { itemId })
  return <DesignItemViewer item={item} src={contentUrl(itemId)} onClose={onClose} />
}

/**
 * A design screen or item a text points at, as a chip: its miniature on hover
 * — the approved design for a screen, else its latest built version — with a
 * control that opens it full size; a click opens it in the Design tab.
 */
export default function DesignReferenceChip({
  description,
  link,
  onOpen,
}: DesignReferenceChipProps) {
  const [expanded, setExpanded] = useState<string | undefined>(undefined)
  return (
    <>
      <ReferenceChip
        description={description}
        {...(onOpen ? { onOpen } : {})}
        {...(description.missing
          ? {}
          : { preview: <Preview link={link} onExpand={setExpanded} /> })}
      />
      {expanded ? (
        <Viewer
          projectId={link.projectId}
          itemId={expanded}
          onClose={() => setExpanded(undefined)}
        />
      ) : null}
    </>
  )
}
