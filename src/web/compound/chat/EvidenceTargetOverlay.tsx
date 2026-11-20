import { EVIDENCE_REFERENCE_COPY, evidenceTime, type EvidenceOpenTarget } from '../../../headless'
import { FullScreenOverlay } from '../../primitives/FullScreenOverlay'
import EvidenceImageOverlay from './EvidenceImageOverlay'
import { WalkthroughRecording } from './signoff/WalkthroughTab'

export type EvidenceTargetOverlayProps = {
  target: EvidenceOpenTarget
  onClose: () => void
}

/**
 * A cited evidence item opened in place: a screenshot large in the evidence
 * image viewer, or its recording in the walkthrough player, opened at the
 * moment the text named and playing from it.
 */
export default function EvidenceTargetOverlay({ target, onClose }: EvidenceTargetOverlayProps) {
  if (target.kind === 'image') {
    return (
      <EvidenceImageOverlay
        isOpen
        onClose={onClose}
        title={target.title}
        images={[{ id: target.url, caption: target.caption, dataUri: target.url }]}
      />
    )
  }
  return (
    <FullScreenOverlay isOpen onClose={onClose} title={target.title}>
      <div className="flex h-full min-h-0 w-full items-start justify-center overflow-auto bg-(--surface-sunken) p-4 sm:p-8">
        <div className="flex w-full max-w-[880px] flex-col gap-2">
          <WalkthroughRecording
            projectId={target.projectId}
            tile={{
              ref: { id: target.evidenceId, mediaType: target.mediaType },
              caption: target.caption,
            }}
            label={EVIDENCE_REFERENCE_COPY.recording}
            {...(target.atSec !== undefined ? { startAt: target.atSec } : {})}
          />
          <p className="m-0 text-[12.5px] text-(--text-secondary)">
            {target.atSec !== undefined ? (
              <>
                {EVIDENCE_REFERENCE_COPY.openedAt}{' '}
                <b className="text-(--text-primary)">{evidenceTime(target.atSec)}</b>
                {' · '}
              </>
            ) : null}
            {target.caption}
          </p>
        </div>
      </div>
    </FullScreenOverlay>
  )
}
