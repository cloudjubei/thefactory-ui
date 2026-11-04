import { Text, View } from 'react-native'

import {
  VIDEO_SETUP_TEXT,
  useVideoSetup,
  type VideoSetupRow,
  type VideoSetupStopTarget,
  type VideoSetupView,
} from '../../../headless'
import type { ChatContext } from '../../../headless/api'
import { nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import InlineStopConfirm from '../chips/InlineStopConfirm'
import SetUpWithAgentButton from '../chips/SetUpWithAgentButton'
import ToneBadge from '../chips/ToneBadge'
import { TerminalOutput } from '../TerminalOutput'

export interface VideoSettingsPanelProps {
  view: VideoSetupView | undefined
  checking: boolean
  loadError?: string
  agentError?: string
  agentStarting?: boolean
  onRecheck: () => void
  onInstall: (tool: 'ffmpeg' | 'whisper') => void
  onDownloadModels: () => void
  onStop: (target: VideoSetupStopTarget) => void
  onAskAgent: () => void
}

function SetupRow({
  row,
  onInstall,
  onDownloadModels,
  onStop,
}: {
  row: VideoSetupRow
  onInstall: (tool: 'ffmpeg' | 'whisper') => void
  onDownloadModels: () => void
  onStop: (target: VideoSetupStopTarget) => void
}) {
  const { theme, status } = useNativeTheme()
  const { action, progress, stop } = row
  const dot = {
    ok: '#10b981',
    missing: '#e4445a',
    busy: theme.accent.primary,
  }[row.state]
  const small = { fontSize: 12, color: theme.text.secondary }
  return (
    <View style={{ gap: nativeSpace[2] }}>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: nativeSpace[3],
        }}
      >
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: dot }} />
        <Text style={{ fontSize: 14, fontWeight: '500', color: theme.text.primary }}>
          {row.label}
        </Text>
        {row.status ? (
          <Text style={{ fontSize: 12, color: theme.text.muted }}>{row.status}</Text>
        ) : null}
        {stop ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'baseline',
              gap: nativeSpace[3],
              marginLeft: 'auto',
            }}
          >
            <InlineStopConfirm
              ask={stop.ask}
              stop={VIDEO_SETUP_TEXT.stop}
              keep={VIDEO_SETUP_TEXT.keep}
              label={stop.label}
              onStop={() => onStop(stop.target)}
            />
          </View>
        ) : null}
      </View>
      {row.note ? <Text style={small}>{row.note}</Text> : null}
      {action ? (
        <View style={{ gap: nativeSpace[2], alignItems: 'flex-start' }}>
          <Button
            variant="primary"
            size="sm"
            onPress={() =>
              action.kind === 'install' ? onInstall(action.tool) : onDownloadModels()
            }
          >
            {action.label}
          </Button>
          {action.kind === 'models' ? <Text style={small}>{action.note}</Text> : null}
        </View>
      ) : null}
      {progress ? (
        <View style={{ gap: nativeSpace[1] }}>
          <View
            style={{
              height: 4,
              overflow: 'hidden',
              borderRadius: 2,
              backgroundColor: theme.surface.muted,
            }}
          >
            <View
              style={{
                height: '100%',
                width: `${progress.percent}%`,
                backgroundColor: theme.accent.primary,
              }}
            />
          </View>
          <Text style={{ ...small, fontVariant: ['tabular-nums'] }}>{progress.line}</Text>
        </View>
      ) : null}
      {row.error ? <Text style={{ ...small, color: status.stuck.softFg }}>{row.error}</Text> : null}
      {row.output ? (
        <TerminalOutput text={row.output} label={VIDEO_SETUP_TEXT.outputLabel} />
      ) : null}
    </View>
  )
}

/** Settings › Video as it stands, grouped by what each piece gives. */
export function VideoSettingsPanel({
  view,
  checking,
  loadError,
  agentError,
  agentStarting = false,
  onRecheck,
  onInstall,
  onDownloadModels,
  onStop,
  onAskAgent,
}: VideoSettingsPanelProps) {
  const { theme } = useNativeTheme()
  const small = { fontSize: 12, color: theme.text.secondary }
  return (
    <View style={{ gap: nativeSpace[4] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[3] }}>
        {view ? <ToneBadge tone={view.overall.tone} label={view.overall.label} /> : null}
        <View style={{ marginLeft: 'auto' }}>
          <Button variant="secondary" size="sm" onPress={onRecheck} disabled={checking}>
            {checking ? VIDEO_SETUP_TEXT.checking : VIDEO_SETUP_TEXT.recheck}
          </Button>
        </View>
      </View>
      <Text style={small}>{VIDEO_SETUP_TEXT.lead}</Text>
      {loadError ? <Alert>{loadError}</Alert> : null}
      {view?.canAskAgent ? (
        <View style={{ gap: nativeSpace[2], alignItems: 'flex-start' }}>
          <SetUpWithAgentButton onPress={onAskAgent} disabled={agentStarting} />
          <Text style={small}>
            {agentStarting ? VIDEO_SETUP_TEXT.agentStarting : VIDEO_SETUP_TEXT.agentNote}
          </Text>
        </View>
      ) : null}
      {agentError ? <Alert>{agentError}</Alert> : null}
      {view?.groups.map((group) => (
        <View key={group.id} style={{ gap: nativeSpace[3] }}>
          <View style={{ gap: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[3] }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text.primary }}>
                {group.title}
              </Text>
              <ToneBadge tone={group.tone} label={group.badge} />
            </View>
            <Text style={small}>{group.note}</Text>
          </View>
          {group.rows.map((row) => (
            <SetupRow
              key={row.id}
              row={row}
              onInstall={onInstall}
              onDownloadModels={onDownloadModels}
              onStop={onStop}
            />
          ))}
        </View>
      ))}
      {view?.ready ? <Text style={small}>{VIDEO_SETUP_TEXT.offline}</Text> : null}
    </View>
  )
}

export interface VideoSettingsProps {
  /** Takes the person to the chat the setup agent was started in. */
  onOpenChat: (context: ChatContext) => void
}

/** Settings › Video: every step runs on the machine that runs Overseer, from any client. */
export default function VideoSettings({ onOpenChat }: VideoSettingsProps) {
  const {
    view,
    checking,
    loadError,
    agentError,
    agentStarting,
    recheck,
    install,
    downloadModels,
    stop,
    askAgent,
  } = useVideoSetup()
  return (
    <VideoSettingsPanel
      view={view}
      checking={checking}
      {...(loadError ? { loadError } : {})}
      {...(agentError ? { agentError } : {})}
      agentStarting={agentStarting}
      onRecheck={recheck}
      onInstall={install}
      onDownloadModels={downloadModels}
      onStop={stop}
      onAskAgent={() => askAgent(onOpenChat)}
    />
  )
}
