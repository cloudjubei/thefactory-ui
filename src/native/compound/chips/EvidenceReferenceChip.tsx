import { useState } from 'react'
import { Image } from 'react-native'
import type { ReferenceDescription, ResourceLink } from 'thefactory-tools/types'
import {
  EVIDENCE_REFERENCE_COPY,
  useEvidenceReference,
  type EvidenceLink,
  type EvidenceOpenTarget,
  type EvidenceReferenceView,
  type ReferencePreview,
} from '../../../headless'
import { nativeRadii } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import EvidenceTargetOverlay from '../chat/EvidenceTargetOverlay'
import ReferenceChip from './ReferenceChip'
import { evidenceGlyph } from './referenceGlyphs'

export type EvidenceReferenceChipViewProps = {
  link: EvidenceLink
  view: EvidenceReferenceView
  /** Opens the screenshot or the recording in place. */
  onOpenTarget?: (target: EvidenceOpenTarget) => void
  /** Follows the link, for an item with nothing to open in place. */
  onFollow?: (link: ResourceLink) => void
}

function chipLabel(view: EvidenceReferenceView): string {
  if (view.phase === 'gone') return `${view.label} · ${EVIDENCE_REFERENCE_COPY.notKept}`
  return view.time ? `${view.label} ${view.time}` : view.label
}

function Thumbnail({ url }: { url: string }) {
  const { theme } = useNativeTheme()
  return (
    <Image
      source={{ uri: url }}
      resizeMode="cover"
      style={{
        width: '100%',
        aspectRatio: 16 / 10,
        borderRadius: nativeRadii[2],
        borderWidth: 1,
        borderColor: theme.border.subtle,
        backgroundColor: '#000000',
      }}
    />
  )
}

/**
 * Native peer of web's `EvidenceReferenceChipView`: a cited evidence item
 * inline in the text — its short title, the time of a moment, an issue's
 * severity — a tap that opens the screenshot or the recording at the moment,
 * and a long press that shows its preview with both. Something gone reads
 * calmly as not kept.
 */
export function EvidenceReferenceChipView({
  link,
  view,
  onOpenTarget,
  onFollow,
}: EvidenceReferenceChipViewProps) {
  const open = view.open
  const following = view.phase === 'ready' || view.phase === 'failed'
  const description: ReferenceDescription = {
    kind: 'evidence',
    label: chipLabel(view),
    detail: view.citation,
    ...(view.phase === 'loading' ? { loading: true } : {}),
    ...((open && onOpenTarget) || (following && onFollow) ? { link } : {}),
  }
  const [primary, second] = view.card.actions
  const preview: ReferencePreview = {
    caption: view.card.caption,
    title: view.card.title,
    lines: view.card.lines,
    ...(view.card.severity ? { status: view.card.severity } : {}),
    ...(primary && onOpenTarget ? { primary: { label: primary.label, link } } : {}),
  }
  const thumbnail = view.card.thumbnail?.kind === 'image' ? view.card.thumbnail.url : undefined
  return (
    <ReferenceChip
      description={description}
      glyph={evidenceGlyph(view.glyph)}
      preview={preview}
      onOpen={(to) => {
        if (open && onOpenTarget) onOpenTarget(open)
        else onFollow?.(to)
      }}
      {...(view.severity ? { status: view.severity } : {})}
      {...(second && onOpenTarget
        ? { secondary: { label: second.label, onSelect: () => onOpenTarget(second.target) } }
        : {})}
    >
      {thumbnail ? <Thumbnail url={thumbnail} /> : null}
    </ReferenceChip>
  )
}

export type EvidenceReferenceChipProps = {
  link: EvidenceLink
  /** Follows the link — the app's evidence screen — for an item with nothing to open in place. */
  onOpen?: (link: ResourceLink) => void
}

/**
 * Native peer of web's `EvidenceReferenceChip`: a cited evidence item read once
 * however many chips cite it, with what an issue says happened, opened in place.
 */
export default function EvidenceReferenceChip({ link, onOpen }: EvidenceReferenceChipProps) {
  const { view } = useEvidenceReference(link, { withIssue: true })
  const [opened, setOpened] = useState<EvidenceOpenTarget | undefined>()
  if (!view) return null
  return (
    <>
      <EvidenceReferenceChipView
        link={link}
        view={view}
        onOpenTarget={setOpened}
        {...(onOpen ? { onFollow: onOpen } : {})}
      />
      {opened ? (
        <EvidenceTargetOverlay target={opened} onClose={() => setOpened(undefined)} />
      ) : null}
    </>
  )
}
