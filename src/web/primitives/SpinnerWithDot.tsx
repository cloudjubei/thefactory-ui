import Spinner from './Spinner'
import DotBadge from './DotBadge'

export type SpinnerWithDotProps = {
  size?: number
  showDot?: boolean
  className?: string
  dotTitle?: string
  dotColorClass?: string
}

export default function SpinnerWithDot({
  size = 16,
  showDot = false,
  className = '',
  dotTitle,
  dotColorClass,
}: SpinnerWithDotProps) {
  const dotSizeClass = size <= 14 ? 'w-1.5 h-1.5' : 'w-2 h-2'
  return (
    <span
      className={['relative inline-flex items-center justify-center', className].join(' ')}
      aria-hidden
    >
      <Spinner size={size} />
      {showDot && (
        <span className="absolute -top-0 -right-0 translate-x-1 -translate-y-1">
          <DotBadge
            className={[dotSizeClass, 'ring-2'].join(' ')}
            title={dotTitle}
            colorClass={dotColorClass}
          />
        </span>
      )}
    </span>
  )
}
