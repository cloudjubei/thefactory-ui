import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Text, View } from 'react-native'

import {
  fileNameSlug,
  formatBytes,
  useReviewEvidenceImage,
  useReviewEvidenceMediaUrl,
  VIDEO_PAIRS_COPY,
  type EvidenceTile,
  type ProofVideoPairView,
} from '../../../../headless'
import { nativeRadii } from '../../../../tokens/native'
import { useNativeTheme } from '../../../hooks/useNativeTheme'
import { IconDownload } from '../../../icons'
import { Button } from '../../../primitives/Button'
import { useMediaHost } from './MediaHostContext'
import type { InlineVideoHandle, SaveFileHandler } from './signoffTypes'
import TraceDownload from './TraceDownload'

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

export type WalkthroughRecordingProps = {
  projectId: string
  tile: EvidenceTile
  /** Shown in place of the recording's own caption — a pair's "Before" or "After". */
  label?: string
  onSaveFile?: SaveFileHandler
  footer?: ReactNode
  /** Set while mounted, when the host's player can seek: plays on from a moment. */
  seekRef?: { current: ((atSec: number) => void) | null }
  /** Where the playhead is, and how long the recording runs, as the host's player says them. */
  onProgress?: (atSec: number, durationSec: number) => void
}

/**
 * One recording, played by the host's player. Asked to seek, it plays in the
 * host's seekable player when the host has one.
 */
export function WalkthroughRecording({
  projectId,
  tile,
  label,
  onSaveFile,
  footer,
  seekRef,
  onProgress,
}: WalkthroughRecordingProps) {
  const { theme } = useNativeTheme()
  const { renderVideo, renderInlineVideo } = useMediaHost()
  const seekable = seekRef && renderInlineVideo ? renderInlineVideo : undefined
  const playable = Boolean(seekable ?? renderVideo)
  const { url, loading } = useReviewEvidenceMediaUrl(playable ? projectId : undefined, tile.ref.id)
  const [failed, setFailed] = useState(false)
  const handleRef = useRef<InlineVideoHandle | null>(null)
  const progressRef = useRef({ atSec: 0, durationSec: 0 })
  const progressHandler = useRef(onProgress)
  useEffect(() => {
    progressHandler.current = onProgress
  }, [onProgress])
  useEffect(() => {
    if (!seekRef) return
    seekRef.current = (atSec) => handleRef.current?.seek?.(atSec)
    return () => {
      seekRef.current = null
    }
  }, [seekRef])
  const player = useMemo(() => {
    if (!url) return null
    if (seekable) {
      const report = (next: Partial<{ atSec: number; durationSec: number }>) => {
        progressRef.current = { ...progressRef.current, ...next }
        progressHandler.current?.(progressRef.current.atSec, progressRef.current.durationSec)
      }
      return seekable({
        uri: url,
        handleRef,
        onMetadata: () => setFailed(false),
        onFailed: () => setFailed(true),
        onPlayingChange: () => {},
        onTimeChange: (atSec) => report({ atSec }),
        onDuration: (durationSec) => report({ durationSec }),
      })
    }
    return renderVideo ? renderVideo(url) : null
  }, [url, seekable, renderVideo])
  // Legacy hosts save bytes; fetch them only after an explicit save, never for playback.
  const [saving, setSaving] = useState(false)
  const [saveFailed, setSaveFailed] = useState(false)
  const { dataUri, error: saveError } = useReviewEvidenceImage(
    saving ? projectId : undefined,
    tile.ref.id,
    tile.ref.mediaType,
  )
  useEffect(() => {
    if (saving && saveError) {
      setSaving(false)
      setSaveFailed(true)
    }
  }, [saving, saveError])
  const ext = tile.ref.mediaType.split('/')[1] ?? 'mp4'
  useEffect(() => {
    if (dataUri && saving && onSaveFile) {
      setSaving(false)
      void onSaveFile({ name: `${fileNameSlug(tile.caption, 'walkthrough')}.${ext}`, dataUri })
    }
  }, [dataUri, saving, onSaveFile, tile.caption, ext])
  const size = formatBytes(tile.ref.bytes)

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
            disabled={saving}
            onPress={() => {
              setSaveFailed(false)
              setSaving(true)
            }}
          >
            <IconDownload size={16} color={theme.text.primary} />
          </Button>
        ) : null}
      </View>
      {player && !failed ? (
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
          {player}
        </View>
      ) : playable ? (
        <Stage>
          <StageNote>
            {loading && !failed ? 'Loading the recording…' : 'The recording could not be loaded.'}
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
      {saveFailed ? (
        <Text accessibilityRole="alert" style={{ fontSize: 12, color: theme.text.secondary }}>
          The recording could not be saved. Try again.
        </Text>
      ) : null}
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
      <WalkthroughRecording
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
      {recordings.map((tile) =>
        tile.ref.kind === 'trace' ? (
          <TraceDownload key={tile.ref.id} projectId={projectId} tile={tile} />
        ) : (
          <WalkthroughRecording
            key={tile.ref.id}
            projectId={projectId}
            tile={tile}
            {...(onSaveFile ? { onSaveFile } : {})}
            {...(renderFooter ? { footer: renderFooter(tile) } : {})}
          />
        ),
      )}
    </View>
  )
}
