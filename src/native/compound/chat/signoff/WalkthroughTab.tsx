import { Text, View } from 'react-native'

import {
  fileNameSlug,
  formatBytes,
  useReviewEvidenceImage,
  type EvidenceTile,
} from '../../../../headless'
import { nativeRadii } from '../../../../tokens/native'
import { useNativeTheme } from '../../../hooks/useNativeTheme'
import { IconDownload } from '../../../icons'
import { Button } from '../../../primitives/Button'
import { useMediaHost } from './MediaHostContext'
import type { SaveFileHandler } from './signoffTypes'

export type WalkthroughTabProps = {
  projectId: string
  recordings: readonly EvidenceTile[]
  /** Saves a recording; omitted when the host cannot put a file anywhere. */
  onSaveFile?: SaveFileHandler
}

const STAGE_HEIGHT = 210

function Stage({ children }: { children: React.ReactNode }) {
  const { theme } = useNativeTheme()
  return (
    <View
      style={{
        height: STAGE_HEIGHT,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingHorizontal: 16,
        overflow: 'hidden',
        borderRadius: nativeRadii[2],
        borderWidth: 1,
        borderColor: theme.border.default,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
      }}
    >
      {children}
    </View>
  )
}

function StageNote({ children }: { children: string }) {
  return (
    <Text style={{ fontSize: 12, textAlign: 'center', color: 'rgba(255, 255, 255, 0.6)' }}>
      {children}
    </Text>
  )
}

function Recording({
  projectId,
  tile,
  onSaveFile,
}: {
  projectId: string
  tile: EvidenceTile
  onSaveFile?: SaveFileHandler
}) {
  const { theme } = useNativeTheme()
  const { renderVideo } = useMediaHost()
  const { dataUri, loading } = useReviewEvidenceImage(
    renderVideo || onSaveFile ? projectId : undefined,
    tile.ref.id,
    tile.ref.mediaType,
  )
  const size = formatBytes(tile.ref.bytes)
  const ext = tile.ref.mediaType.split('/')[1] ?? 'mp4'

  return (
    <View
      style={{
        gap: 8,
        padding: 10,
        borderRadius: nativeRadii[2],
        borderWidth: 1,
        borderColor: theme.border.subtle,
        backgroundColor: theme.surface.raised,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            fontSize: 10,
            fontWeight: '600',
            letterSpacing: 0.8,
            textTransform: 'uppercase',
            color: theme.text.muted,
          }}
        >
          {tile.caption}
        </Text>
        {onSaveFile ? (
          <Button
            variant="secondary"
            size="icon"
            accessibilityLabel="Save the recording"
            disabled={!dataUri}
            onPress={() =>
              dataUri &&
              void onSaveFile({
                name: `${fileNameSlug(tile.caption, 'walkthrough')}.${ext}`,
                dataUri,
              })
            }
          >
            <IconDownload size={16} color={theme.text.primary} />
          </Button>
        ) : null}
      </View>
      {renderVideo && dataUri ? (
        <View
          style={{
            height: STAGE_HEIGHT * 2,
            overflow: 'hidden',
            borderRadius: nativeRadii[2],
            borderWidth: 1,
            borderColor: theme.border.default,
            backgroundColor: '#000000',
          }}
        >
          {renderVideo(dataUri)}
        </View>
      ) : renderVideo ? (
        <Stage>
          <StageNote>
            {loading ? 'Loading the recording…' : 'The recording could not be loaded.'}
          </StageNote>
        </Stage>
      ) : (
        <Stage>
          <Text style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.8)' }}>
            {`Recording · ${tile.ref.mediaType}${size ? ` · ${size}` : ''}`}
          </Text>
          <StageNote>
            Filed as evidence on this run. This app cannot play it — open the run on the web or
            desktop client to watch it.
          </StageNote>
        </Stage>
      )}
    </View>
  )
}

/**
 * The verifier's screen recordings — proof of the PATH through the app, not
 * just its screens. Played by the host's video player (`MediaHostProvider`);
 * a host without one names and sizes each recording instead, and its bytes
 * are not fetched unless they can be saved.
 */
export default function WalkthroughTab({ projectId, recordings, onSaveFile }: WalkthroughTabProps) {
  return (
    <View style={{ gap: 8 }}>
      {recordings.map((tile) => (
        <Recording
          key={tile.ref.id}
          projectId={projectId}
          tile={tile}
          {...(onSaveFile ? { onSaveFile } : {})}
        />
      ))}
    </View>
  )
}
