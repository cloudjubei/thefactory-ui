import { useEffect, useRef } from 'react'
import { ScrollView, Text, View } from 'react-native'
import RunThroughTab from '../../src/native/compound/chat/signoff/RunThroughTab'
import { MediaHostProvider } from '../../src/native/compound/chat/signoff/MediaHostContext'
import type { InlineVideo, MediaHost } from '../../src/native/compound/chat/signoff/signoffTypes'
import CheckChip from '../../src/native/compound/chips/CheckChip'
import { useNativeTheme } from '../../src/native/hooks/useNativeTheme'
import { OnFixtures } from '../scenes/onFixtures'
import {
  RUN_THROUGH_PROJECT,
  RUN_THROUGH_ROUTES,
  runThroughView,
  type RunThroughCase,
} from '../scenes/runThroughFixtures'
import type { NativeView } from './views'

const noop = () => {}

/** The browser's own player standing in for the app's: it seeks, and tells its time and length. */
function BrowserInlineVideo({ video }: { video: InlineVideo }) {
  const ref = useRef<HTMLVideoElement>(null)
  const { handleRef, onMetadata, onPlayingChange, onTimeChange, onDuration, onFailed } = video
  useEffect(() => {
    handleRef.current = {
      enterFullscreen: () => void ref.current?.requestFullscreen().catch(noop),
      seek: (atSec) => {
        if (!ref.current) return
        ref.current.currentTime = atSec
        void ref.current.play().catch(noop)
      },
      pause: () => ref.current?.pause(),
      time: () => ref.current?.currentTime ?? 0,
    }
    return () => {
      handleRef.current = null
    }
  }, [handleRef])
  return (
    <video
      ref={ref}
      src={video.uri}
      muted
      playsInline
      controls
      preload="metadata"
      style={{ width: '100%', height: '100%', backgroundColor: '#000000' }}
      onLoadedMetadata={({ currentTarget }) => {
        onMetadata({ width: currentTarget.videoWidth, height: currentTarget.videoHeight })
        onDuration?.(currentTarget.duration)
      }}
      onPlay={() => onPlayingChange(true)}
      onPause={() => onPlayingChange(false)}
      onTimeUpdate={({ currentTarget }) => onTimeChange?.(currentTarget.currentTime)}
      onError={({ currentTarget }) => onFailed('load', currentTarget.currentTime)}
    />
  )
}

const PLAYER: MediaHost = {
  renderInlineVideo: (video) => <BrowserInlineVideo video={video} />,
}

const CASES: Record<string, RunThroughCase> = {
  clean: 'clean',
  mixed: 'mixed',
  stopped: 'stopped',
  unrecorded: 'unrecorded',
}

/** The sign-off's evidence card on a phone: its chips, and the Run-through tab open under them. */
function Signoff({ which }: { which: RunThroughCase }) {
  const { theme } = useNativeTheme()
  const view = runThroughView(which)
  const chip = (id: 'report' | 'tests' | 'build' | 'diff' | 'walkthrough', label: string) => (
    <CheckChip key={id} row={{ id, label, state: 'passed' }} />
  )
  return (
    <OnFixtures routes={RUN_THROUGH_ROUTES}>
      <MediaHostProvider value={PLAYER}>
        <ScrollView style={{ backgroundColor: theme.surface.base }}>
          <View style={{ padding: 12, width: 390, maxWidth: '100%', gap: 10 }}>
            <Text style={{ fontSize: 12.5, color: theme.text.secondary }}>
              <Text style={{ fontWeight: '700', color: theme.text.primary }}>Sign-off</Text> ·
              Hot-seat play · story run
            </Text>
            <View
              style={{
                overflow: 'hidden',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.border.subtle,
                backgroundColor: theme.surface.raised,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: 8,
                  padding: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: theme.border.subtle,
                }}
              >
                {chip('report', 'Report')}
                {chip('tests', 'Tests')}
                {chip('build', 'Build')}
                {chip('diff', 'Code review')}
                {chip('walkthrough', 'Walkthrough')}
                <CheckChip
                  row={{ id: 'runthrough', label: 'Run-through', state: view.state }}
                  selected
                />
              </View>
              <View style={{ padding: 12 }}>
                <RunThroughTab projectId={RUN_THROUGH_PROJECT} view={view} />
              </View>
            </View>
          </View>
        </ScrollView>
      </MediaHostProvider>
    </OnFixtures>
  )
}

export const RUN_THROUGH_VIEWS: readonly NativeView[] = [
  {
    id: 'run-through-tab',
    title: 'Run-through tab (?state=clean|mixed|stopped|unrecorded, ?theme=dark)',
    render: (address) => <Signoff which={CASES[address.get('state') ?? ''] ?? 'stopped'} />,
  },
]
