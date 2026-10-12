import type { ReactNode } from 'react'
import { Text, View } from 'react-native'
import DependencyChip, { type DependencyChipVariant } from '../DependencyChip'
import { FeatureCard } from '../FeatureCard'
import { StoryCard } from '../StoryCard'
import StatusControl from '../StatusControl'
import type { ResolvedDependency } from '../../../headless/utils/storyDependencyTypes'
import { nativeRadii, nativeSpace, type NativeSemanticTheme } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'

export type {
  DependencyCardShape,
  ResolvedDependency,
} from '../../../headless/utils/storyDependencyTypes'

export interface DependencyBulletProps {
  resolved: ResolvedDependency | null
  className?: string
  dependency?: string
  notFoundDisplay?: string
  isOutbound?: boolean
  onRemove?: () => void
  interactive?: boolean
  disableHoverInfo?: boolean
  onPress?: (resolved: ResolvedDependency) => void
  renderTooltip?: (resolved: ResolvedDependency) => ReactNode
}

function defaultTooltip(resolved: ResolvedDependency, theme: NativeSemanticTheme): ReactNode {
  if (resolved.kind === 'loading') {
    return (
      <View
        style={{
          padding: nativeSpace[6],
          borderRadius: nativeRadii[2],
          gap: nativeSpace[4],
          maxWidth: 280,
          minWidth: 200,
        }}
      >
        <Text style={{ fontSize: 11, color: theme.text.muted }}>{resolved.project}</Text>
        <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text.primary }}>Loading</Text>
        <Text style={{ fontSize: 12, color: theme.text.secondary }}>
          Looking this up in {resolved.project}'s stories.
        </Text>
      </View>
    )
  }
  if (resolved.kind === 'missing') {
    return (
      <View
        style={{
          padding: nativeSpace[6],
          borderRadius: nativeRadii[2],
          gap: nativeSpace[4],
          maxWidth: 280,
          minWidth: 200,
        }}
      >
        <Text style={{ fontSize: 11, color: theme.text.muted }}>Not found</Text>
        <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text.primary }}>
          Dependency missing
        </Text>
        <Text style={{ fontSize: 12, color: theme.text.secondary }}>
          The referenced story or feature could not be resolved.
        </Text>
        <StatusControl status="-" />
      </View>
    )
  }
  if (resolved.kind === 'feature') {
    return <FeatureCard feature={resolved.feature} style={{ maxWidth: 280 }} />
  }
  return <StoryCard story={resolved.story} style={{ maxWidth: 280 }} />
}

export default function DependencyBullet({
  resolved,
  className,
  dependency,
  notFoundDisplay,
  isOutbound = false,
  onRemove,
  interactive = true,
  disableHoverInfo = false,
  onPress,
  renderTooltip,
}: DependencyBulletProps) {
  const { theme } = useNativeTheme()
  const effective: ResolvedDependency = resolved ?? {
    kind: 'missing',
    display: notFoundDisplay ?? dependency ?? '?',
  }

  const display =
    effective.kind === 'missing' ? (notFoundDisplay ?? effective.display) : effective.display

  const variant: DependencyChipVariant =
    effective.kind === 'missing' || effective.kind === 'loading'
      ? effective.kind
      : isOutbound
        ? 'blocks'
        : 'ok'

  const project = 'project' in effective ? effective.project : undefined

  const tooltip = renderTooltip ? renderTooltip(effective) : defaultTooltip(effective, theme)

  return (
    <DependencyChip
      className={className}
      display={display}
      {...(project ? { project } : {})}
      kind={effective.kind}
      variant={variant}
      tooltip={tooltip}
      disableHoverInfo={disableHoverInfo}
      interactive={interactive}
      onPress={
        effective.kind === 'missing' || effective.kind === 'loading'
          ? undefined
          : () => onPress?.(effective)
      }
      onRemove={onRemove}
      title={`${project ? `${project} ` : ''}${display}${isOutbound ? ' (requires this)' : ''}`}
    />
  )
}
