import { useState } from 'react'
import type { ReferenceDescription, ResourceLink } from 'thefactory-tools/types'
import { designReferencePreview, useDesignPreview } from '../../../headless'
import { IconMaximize } from '../../icons'
import ReferenceChip from '../chips/ReferenceChip'
import DesignFileThumb from './DesignFileThumb'
import DesignFileViewer from './DesignFileViewer'

type DesignLink = Extract<ResourceLink, { kind: 'design' }>

export type DesignReferenceChipProps = {
  description: ReferenceDescription
  link: DesignLink
  onOpen?: (link: ResourceLink) => void
}

function Preview({ link, onExpand }: { link: DesignLink; onExpand: () => void }) {
  const { index, isLoaded, contentUrl } = useDesignPreview(link.projectId)
  const shown = designReferencePreview(index, link)
  if (!isLoaded) return <span className="text-(--text-muted)">Loading…</span>
  if (!shown) return null
  return (
    <div className="relative mt-1 self-start">
      <DesignFileThumb shown={shown} src={contentUrl(shown)} width={224} />
      <button
        type="button"
        aria-label={`Open ${shown.name}`}
        title="Open"
        className="absolute top-1 right-1 rounded bg-(--surface-raised) p-1 shadow-sm hover:bg-(--surface-hover)"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onExpand()
        }}
      >
        <IconMaximize className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

function Viewer({ link, onClose }: { link: DesignLink; onClose: () => void }) {
  const { index, contentUrl } = useDesignPreview(link.projectId)
  const shown = designReferencePreview(index, link)
  return (
    <DesignFileViewer shown={shown} src={shown ? contentUrl(shown) : undefined} onClose={onClose} />
  )
}

/**
 * A design screen or state a text points at, as a chip: its miniature on hover
 * — the state's current look, or for a screen its first state's — with a
 * control that opens it full size; a click opens it in the Design tab.
 */
export default function DesignReferenceChip({
  description,
  link,
  onOpen,
}: DesignReferenceChipProps) {
  const [expanded, setExpanded] = useState(false)
  return (
    <>
      <ReferenceChip
        description={description}
        {...(onOpen ? { onOpen } : {})}
        {...(description.missing
          ? {}
          : { preview: <Preview link={link} onExpand={() => setExpanded(true)} /> })}
      />
      {expanded ? <Viewer link={link} onClose={() => setExpanded(false)} /> : null}
    </>
  )
}
