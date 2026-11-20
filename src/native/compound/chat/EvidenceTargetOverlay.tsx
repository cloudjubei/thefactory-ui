import { ScrollView, Text } from 'react-native'

import { EVIDENCE_REFERENCE_COPY, evidenceTime, type EvidenceOpenTarget } from '../../../headless'
import { nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import FullScreenOverlay from '../../primitives/FullScreenOverlay'
import EvidenceImageOverlay from './EvidenceImageOverlay'
import { WalkthroughRecording } from './signoff/WalkthroughTab'

export type EvidenceTargetOverlayProps = {
  target: EvidenceOpenTarget
  onClose: () => void
  topInset?: number
  bottomInset?: number
}

/**
 * Native peer of web's `EvidenceTargetOverlay`: a cited screenshot full
 * screen in the evidence image viewer, or its recording in the walkthrough
 * player, opened at the moment the text named.
 */
export default function EvidenceTargetOverlay({
  target,
  onClose,
  topInset,
  bottomInset,
}: EvidenceTargetOverlayProps) {
  const { theme } = useNativeTheme()
  const insets = {
    ...(topInset !== undefined ? { topInset } : {}),
    ...(bottomInset !== undefined ? { bottomInset } : {}),
  }
  if (target.kind === 'image') {
    return (
      <EvidenceImageOverlay
        isOpen
        onClose={onClose}
        title={target.title}
        images={[{ id: target.url, caption: target.caption, dataUri: target.url }]}
        {...insets}
      />
    )
  }
  return (
    <FullScreenOverlay isOpen onClose={onClose} title={target.title} {...insets}>
      <ScrollView contentContainerStyle={{ padding: nativeSpace[3], gap: nativeSpace[2] }}>
        <WalkthroughRecording
          projectId={target.projectId}
          tile={{
            ref: { id: target.evidenceId, mediaType: target.mediaType },
            caption: target.caption,
          }}
          label={EVIDENCE_REFERENCE_COPY.recording}
          {...(target.atSec !== undefined ? { startAt: target.atSec } : {})}
        />
        <Text style={{ fontSize: 12.5, color: theme.text.secondary }}>
          {target.atSec !== undefined ? (
            <>
              {`${EVIDENCE_REFERENCE_COPY.openedAt} `}
              <Text style={{ fontWeight: '700', color: theme.text.primary }}>
                {evidenceTime(target.atSec)}
              </Text>
              {' · '}
            </>
          ) : null}
          {target.caption}
        </Text>
      </ScrollView>
    </FullScreenOverlay>
  )
}
