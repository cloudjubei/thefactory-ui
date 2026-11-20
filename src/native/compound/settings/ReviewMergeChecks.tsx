import { Pressable, Text, View } from 'react-native'
import {
  REVIEW_MERGE_CHECKS_TEXT as TEXT,
  type ReviewMergeCheckView,
  type ReviewMergeChecksRepositoryView,
  type ReviewMergeChecksView,
} from '../../../headless'
import { nativeFontFamilies, nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import Alert from '../../primitives/Alert'

export type ReviewMergeChecksPanelProps = {
  view: ReviewMergeChecksView
  onRequired: (repository: string, check: string, required: boolean) => void
}

/**
 * Native peer of [web's `ReviewMergeChecksPanel`](../../../web/compound/settings/ReviewMergeChecks.tsx):
 * per repository, each check seen on its recent pull requests with a
 * "Required to merge" tick box, ticked unless the group lets it go.
 */
export function ReviewMergeChecksPanel({ view, onRequired }: ReviewMergeChecksPanelProps) {
  const { theme } = useNativeTheme()
  const muted = { fontSize: 12, color: theme.text.muted }
  return (
    <View style={{ gap: nativeSpace[2] }}>
      <View style={{ gap: 2 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: theme.text.primary }}>
          {TEXT.heading}
        </Text>
        <Text style={muted}>{TEXT.hint}</Text>
      </View>
      {view.readError ? <Alert>{view.readError}</Alert> : null}
      {view.actionError ? <Alert>{view.actionError}</Alert> : null}
      {view.loading ? <Text style={muted}>{TEXT.loading}</Text> : null}
      {view.empty ? <Text style={muted}>{TEXT.none}</Text> : null}
      {view.repositories.map((repo) => (
        <RepositoryChecks key={repo.repository} repo={repo} onRequired={onRequired} />
      ))}
    </View>
  )
}

function RepositoryChecks({
  repo,
  onRequired,
}: {
  repo: ReviewMergeChecksRepositoryView
  onRequired: ReviewMergeChecksPanelProps['onRequired']
}) {
  const { theme } = useNativeTheme()
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: theme.border.subtle,
        borderRadius: nativeRadii[2],
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: nativeSpace[2],
          paddingHorizontal: 12,
          paddingVertical: 6,
          backgroundColor: theme.surface.muted,
        }}
      >
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            fontSize: 12,
            fontWeight: '500',
            fontFamily: nativeFontFamilies.mono,
            color: theme.text.primary,
          }}
        >
          {repo.repository}
        </Text>
        {repo.checks.length > 0 ? (
          <Text
            style={{
              fontSize: 10,
              fontWeight: '600',
              letterSpacing: 0.6,
              textTransform: 'uppercase',
              color: theme.text.muted,
            }}
          >
            {TEXT.required}
          </Text>
        ) : null}
      </View>
      {repo.error ? (
        <Text
          selectable
          style={{
            fontSize: 12,
            color: theme.text.muted,
            paddingHorizontal: 12,
            paddingVertical: 6,
          }}
        >
          {repo.error}
        </Text>
      ) : null}
      {repo.checks.map((check) => (
        <CheckRow key={check.name} check={check} onRequired={onRequired} />
      ))}
    </View>
  )
}

function CheckRow({
  check,
  onRequired,
}: {
  check: ReviewMergeCheckView
  onRequired: ReviewMergeChecksPanelProps['onRequired']
}) {
  const { theme } = useNativeTheme()
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: check.required }}
      accessibilityLabel={TEXT.requiredOf(check.name)}
      onPress={() => onRequired(check.repository, check.name, !check.required)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: nativeSpace[2],
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: theme.border.subtle,
        opacity: check.saving ? 0.7 : 1,
      }}
    >
      <Text
        numberOfLines={1}
        style={{
          flex: 1,
          fontSize: 13,
          color: check.required ? theme.text.primary : theme.text.muted,
        }}
      >
        {check.name}
      </Text>
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 4,
          borderWidth: 1.5,
          borderColor: check.required ? theme.accent.primary : theme.border.strong,
          backgroundColor: check.required ? theme.accent.primary : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {check.required ? (
          <Text style={{ fontSize: 12, color: theme.text.inverted, fontWeight: '700' }}>✓</Text>
        ) : null}
      </View>
    </Pressable>
  )
}
