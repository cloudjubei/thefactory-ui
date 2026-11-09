import type { ReactNode } from 'react'
import { Text, View } from 'react-native'

import {
  fileNameSlug,
  formatBytes,
  useReviewEvidenceImage,
  VIDEO_PAIRS_COPY,
  type EvidenceTile,
  type ProofVideoPairView,
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
  /** The before/after recordings a proof judged, each pair played side by side above the rest. */
  videoPairs?: readonly ProofVideoPairView[]
  /** Saves a recording; omitted when the host cannot put a file anywhere. */
  onSaveFile?: SaveFileHandler
  /** What each recording says under itself: whether it counts as proof. */
  renderFooter?: (tile: EvidenceTile) => ReactNode
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
  label,
  onSaveFile,
  footer,
}: {
  projectId: string
  tile: EvidenceTile
  /** Shown in place of the recording's own caption — a pair's "Before" or "After". */
  label?: string
  onSaveFile?: SaveFileHandler
  footer?: ReactNode
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
          {label ?? tile.caption}
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
      {footer}
    </View>
  )
}

/** One side of a recording pair: the recording, or why it is not here. */
function PairSide({
  projectId,
  tile,
  label,
  absent,
  onSaveFile,
}: {
  projectId: string
  tile: EvidenceTile | undefined
  label: string
  absent: string | undefined
  onSaveFile?: SaveFileHandler
}) {
  const { theme } = useNativeTheme()
  if (tile) {
    return (
      <Recording
        projectId={projectId}
        tile={tile}
        label={label}
        {...(onSaveFile ? { onSaveFile } : {})}
      />
    )
  }
  return (
    <View style={{ gap: 8 }}>
      <Text
        style={{
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 0.8,
          textTransform: 'uppercase',
          color: theme.text.muted,
        }}
      >
        {label}
      </Text>
      <Stage>
        <StageNote>{absent ?? ''}</StageNote>
      </Stage>
    </View>
  )
}

/** A before and an after recording of one path, side by side — a new screen's after alone. */
function VideoPair({
  projectId,
  pair,
  onSaveFile,
}: {
  projectId: string
  pair: ProofVideoPairView
  onSaveFile?: SaveFileHandler
}) {
  const { theme, status } = useNativeTheme()
  const save = onSaveFile ? { onSaveFile } : {}
  return (
    <View
      accessibilityLabel={pair.subject}
      style={{
        gap: 8,
        padding: 10,
        borderRadius: nativeRadii[3],
        borderWidth: 1,
        borderColor: theme.border.subtle,
        backgroundColor: theme.surface.base,
      }}
    >
      <View style={{ gap: 2 }}>
        <Text
          numberOfLines={1}
          style={{ fontSize: 12.5, fontWeight: '600', color: theme.text.primary }}
        >
          {pair.subject}
        </Text>
        <Text
          style={{
            fontSize: 11.5,
            color: pair.counted ? status.done.softFg : theme.text.secondary,
          }}
        >
          {pair.verdict}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {pair.newScreen ? null : (
          <View style={{ flex: 1, minWidth: 0 }}>
            <PairSide
              projectId={projectId}
              tile={pair.before}
              label={VIDEO_PAIRS_COPY.before}
              absent={pair.beforeAbsent}
              {...save}
            />
          </View>
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <PairSide
            projectId={projectId}
            tile={pair.after}
            label={VIDEO_PAIRS_COPY.after}
            absent={pair.afterAbsent}
            {...save}
          />
        </View>
      </View>
      {pair.note ? (
        <Text style={{ fontSize: 11.5, color: theme.text.secondary }}>{pair.note}</Text>
      ) : null}
    </View>
  )
}

/**
 * The verifier's screen recordings — proof of the PATH through the app, not
 * just its screens: the before/after pairs a proof judged first, each played
 * side by side, then every other recording. Played by the host's video player
 * (`MediaHostProvider`); a host without one names and sizes each recording
 * instead, and its bytes are not fetched unless they can be saved.
 */
export default function WalkthroughTab({
  projectId,
  recordings,
  videoPairs = [],
  onSaveFile,
  renderFooter,
}: WalkthroughTabProps) {
  const { theme } = useNativeTheme()
  return (
    <View style={{ gap: 8 }}>
      {videoPairs.length > 0 ? (
        <View style={{ gap: 8 }}>
          <View style={{ gap: 2 }}>
            <Text
              style={{
                fontSize: 10,
                fontWeight: '600',
                letterSpacing: 0.5,
                textTransform: 'uppercase',
                color: theme.text.muted,
              }}
            >
              {VIDEO_PAIRS_COPY.heading}
            </Text>
            <Text style={{ fontSize: 11.5, color: theme.text.secondary }}>
              {VIDEO_PAIRS_COPY.hint}
            </Text>
          </View>
          {videoPairs.map((pair) => (
            <VideoPair
              key={pair.key}
              projectId={projectId}
              pair={pair}
              {...(onSaveFile ? { onSaveFile } : {})}
            />
          ))}
        </View>
      ) : null}
      {recordings.map((tile) => (
        <Recording
          key={tile.ref.id}
          projectId={projectId}
          tile={tile}
          {...(onSaveFile ? { onSaveFile } : {})}
          {...(renderFooter ? { footer: renderFooter(tile) } : {})}
        />
      ))}
    </View>
  )
}
