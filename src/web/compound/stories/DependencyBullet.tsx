import type { ReactNode } from 'react'
import DependencyChip from '../DependencyChip'
import { FeatureCard } from '../FeatureCard'
import { StoryCard, type StoryStatus } from '../StoryCard'
import StatusControl from '../StatusControl'

export type DependencyCardShape = {
  id: string
  title: string
  description?: string
  status: StoryStatus
  blockers?: ReadonlyArray<string>
}

export type ResolvedDependency =
  | { kind: 'missing'; display: string }
  | { kind: 'story'; display: string; storyId: string; story: DependencyCardShape }
  | {
      kind: 'feature'
      display: string
      storyId: string
      featureId: string
      feature: DependencyCardShape
    }

export type DependencyBulletProps = {
  /** Pre-resolved dependency — host supplies the shape via its own context.
   *  Pass `null` (or a `missing` variant) to render the not-found bullet. */
  resolved: ResolvedDependency | null
  className?: string
  /** Raw token used as a fallback label when `resolved` is null. */
  dependency?: string
  /** Custom display when missing (defaults to the raw token). */
  notFoundDisplay?: string
  isOutbound?: boolean
  onRemove?: () => void
  interactive?: boolean
  disableHoverInfo?: boolean
  onClick?: (resolved: ResolvedDependency) => void
  /** Optional override of the hover-card body. When omitted, the chip renders
   *  the canonical `StoryCard` / `FeatureCard` (missing → small not-found card). */
  renderTooltip?: (resolved: ResolvedDependency) => ReactNode
}

function defaultTooltip(resolved: ResolvedDependency): ReactNode {
  if (resolved.kind === 'missing') {
    return (
      <div className="p-3 rounded-md max-w-xs" style={{ minWidth: 200 }}>
        <div className="text-xs opacity-60 mb-1">Not found</div>
        <h3 className="text-sm font-semibold mb-2">Dependency missing</h3>
        <p className="text-xs opacity-80">
          The referenced story or feature could not be resolved.
        </p>
        <div className="mt-2">
          <StatusControl status="-" />
        </div>
      </div>
    )
  }
  if (resolved.kind === 'feature') {
    return <FeatureCard feature={resolved.feature} className="max-w-xs" />
  }
  return <StoryCard story={resolved.story} className="max-w-xs" />
}

/**
 * Presentational dependency-bullet — pure rendering over the shared
 * `DependencyChip` primitive, with a tooltip card resolved from the
 * caller-supplied `ResolvedDependency` shape.
 *
 * Hosts wire their own context lookup ("dep string → resolved story or
 * feature") and pass the result in; that keeps this component free of any
 * routing / store dependencies and ready for direct reuse in RN with a
 * different chip primitive layered underneath.
 */
export default function DependencyBullet({
  resolved,
  className = '',
  dependency,
  notFoundDisplay,
  isOutbound = false,
  onRemove,
  interactive = true,
  disableHoverInfo = false,
  onClick,
  renderTooltip,
}: DependencyBulletProps) {
  const effectiveResolved: ResolvedDependency =
    resolved ?? { kind: 'missing', display: notFoundDisplay ?? dependency ?? '?' }

  const display =
    effectiveResolved.kind === 'missing'
      ? (notFoundDisplay ?? effectiveResolved.display)
      : effectiveResolved.display

  const variant: 'ok' | 'blocks' | 'missing' =
    effectiveResolved.kind === 'missing' ? 'missing' : isOutbound ? 'blocks' : 'ok'

  const chipKind: 'story' | 'feature' | 'missing' = effectiveResolved.kind

  const tooltip = (renderTooltip ?? defaultTooltip)(effectiveResolved)

  return (
    <DependencyChip
      className={className}
      display={display}
      kind={chipKind}
      variant={variant}
      tooltip={tooltip}
      disableHoverInfo={disableHoverInfo}
      interactive={interactive}
      onClick={effectiveResolved.kind === 'missing' ? undefined : () => onClick?.(effectiveResolved)}
      onRemove={onRemove}
      title={`${display}${isOutbound ? ' (requires this)' : ''}`}
    />
  )
}
