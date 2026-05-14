import type { HTMLAttributes, ReactNode } from 'react'
import Tooltip from '../primitives/Tooltip'
import { IconXCircle } from '../icons'

/**
 * Presentational dependency chip — pure rendering, no resolver context.
 *
 * Apps pass in the *already-resolved* shape (kind + display + variant) plus
 * optional tooltip content / click handler. This keeps the package free of
 * app-specific dependency-resolution wiring (different storyId↔displayIdx
 * maps, different navigators) while giving both apps an identical chip
 * surface.
 */

export type DependencyChipKind = 'story' | 'feature' | 'missing'
export type DependencyChipVariant = 'ok' | 'blocks' | 'missing'

export type DependencyChipProps = {
  /** Text shown after the leading `#`. Typically `"3"` or `"3.2"`, or the
   *  raw dependency string when the resolver couldn't match it. */
  display: string
  kind: DependencyChipKind
  variant: DependencyChipVariant
  /** Optional rich content rendered inside a hover tooltip. */
  tooltip?: ReactNode
  /** When true, the tooltip is suppressed even if `tooltip` is provided
   *  (used inside another tooltip / hover card where nesting would clash). */
  disableHoverInfo?: boolean
  /** Whether the chip is keyboard / mouse interactive. */
  interactive?: boolean
  onClick?: () => void
  /** When provided, a close-X is rendered after the label and clicking it
   *  invokes the handler instead of the regular `onClick`. */
  onRemove?: () => void
  className?: string
  title?: string
}

const VARIANT_CLASS: Record<DependencyChipVariant, string> = {
  ok: 'chip--ok',
  blocks: 'chip--blocks',
  missing: 'chip--missing',
}

const KIND_CLASS: Record<DependencyChipKind, string> = {
  story: 'story',
  feature: 'feature',
  missing: '',
}

export default function DependencyChip({
  display,
  kind,
  variant,
  tooltip,
  disableHoverInfo = false,
  interactive = true,
  onClick,
  onRemove,
  className = '',
  title,
}: DependencyChipProps) {
  const spanProps: HTMLAttributes<HTMLSpanElement> = {}
  if (interactive && !onRemove) {
    // `onClick` only fires the chip's main action when there's no inline
    // remove affordance. When `onRemove` is provided, the X-button below
    // owns its own click; the chip body stays non-interactive so a click
    // anywhere outside the X doesn't accidentally trigger a remove.
    spanProps.onClick = (e) => {
      e.preventDefault()
      e.stopPropagation()
      onClick?.()
    }
    spanProps.role = 'button'
    spanProps.tabIndex = 0
    spanProps.onKeyDown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onClick?.()
      }
    }
  }

  const chip = (
    <span
      className={`${className} chip ${KIND_CLASS[kind]} ${VARIANT_CLASS[variant]}`}
      title={title ?? display}
      {...spanProps}
    >
      #{display}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onRemove()
          }}
          className="chip__close"
          aria-label="Remove"
          title="Remove"
        >
          <IconXCircle className="w-3.5 h-3" />
        </button>
      )}
    </span>
  )

  if (!tooltip || disableHoverInfo) return chip

  return (
    <Tooltip
      placement="bottom"
      allowedPlacements={['bottom', 'top', 'right', 'left']}
      content={tooltip}
      zIndex={2000}
      /* The hover content (`StoryCard` / `FeatureCard`) already paints its
       * own surface — `bare` strips the default tooltip chrome so we don't
       * get a card-inside-a-tooltip "double card" effect. */
      variant="bare"
    >
      {chip}
    </Tooltip>
  )
}
