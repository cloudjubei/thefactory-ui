import { Text, View } from 'react-native'

import {
  LIVE_CHECK_COPY,
  type LaunchLiveCheckView,
  type LiveCheckChoice,
  type LiveCheckDraft,
} from '../../../headless'
import { nativeRadii } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import SegmentedControl from '../../primitives/SegmentedControl'
import { Switch } from '../../primitives/Switch'
import LiveCheckNoteLink from './LiveCheckNoteLink'

export type LaunchLiveCheckRowProps = {
  view: LaunchLiveCheckView
  onChange: (change: Partial<LiveCheckDraft>) => void
  title?: string
  projectId?: string
  busy?: boolean
}

/** Native peer of the web `LaunchLiveCheckRow`. */
export default function LaunchLiveCheckRow({
  view,
  onChange,
  title,
  projectId,
  busy = false,
}: LaunchLiveCheckRowProps) {
  const { theme, status } = useNativeTheme()
  const name = title ? `${LIVE_CHECK_COPY.title}: ${title}` : LIVE_CHECK_COPY.title
  return (
    <View
      style={{ gap: 6, opacity: busy ? 0.5 : 1 }}
      pointerEvents={busy ? 'none' : 'auto'}
      testID="launch-live-check"
    >
      <Text
        style={{
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 0.8,
          textTransform: 'uppercase',
          color: theme.text.muted,
        }}
      >
        {LIVE_CHECK_COPY.title}
        {title ? (
          <Text
            style={{
              fontWeight: '400',
              letterSpacing: 0,
              textTransform: 'none',
              color: theme.text.secondary,
            }}
          >
            {` · ${title}`}
          </Text>
        ) : null}
      </Text>
      <SegmentedControl
        size="sm"
        ariaLabel={name}
        testID="launch-live-check-choice"
        value={view.choice}
        onChange={(next) => onChange({ choice: next as LiveCheckChoice })}
        options={view.options.map(({ value, label }) => ({ value, label }))}
      />
      {view.showsBeforeAndAfter ? (
        <Switch
          checked={view.beforeAndAfter}
          onCheckedChange={(beforeAndAfter) => onChange({ beforeAndAfter })}
          label={LIVE_CHECK_COPY.beforeAndAfter}
          accessibilityLabel={`${LIVE_CHECK_COPY.beforeAndAfter}: ${name}`}
          testID="launch-live-check-before-after"
          disabled={busy}
        />
      ) : null}
      <Text style={{ fontSize: 11.5, color: theme.text.secondary }}>{view.line}</Text>
      <Text style={{ fontSize: 11, color: theme.text.muted }}>{view.advice}</Text>
      {view.clearsLogins ? (
        <Text style={{ fontSize: 11, color: theme.text.secondary }}>{view.clearsLogins}</Text>
      ) : null}
      {view.secretHint ? (
        <View
          style={{
            gap: 6,
            backgroundColor: status.review.softBg,
            borderRadius: nativeRadii[2],
            paddingHorizontal: 8,
            paddingVertical: 5,
          }}
        >
          <Text style={{ fontSize: 11.5, color: status.review.softFg }}>{view.secretHint}</Text>
          {projectId ? <LiveCheckNoteLink projectId={projectId} /> : null}
        </View>
      ) : null}
    </View>
  )
}
