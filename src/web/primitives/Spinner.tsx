type SpinnerProps = {
  size?: number
  className?: string
  /** Stroke colour; defaults to `currentColor` so it inherits from text colour. */
  color?: string
}

export default function Spinner({ size = 16, className, color = 'currentColor' }: SpinnerProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      role="status"
      aria-label="Loading"
    >
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="3" fill="none" opacity="0.25" />
      <path
        d="M22 12a10 10 0 0 1-10 10"
        stroke={color}
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      >
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 12 12"
          to="360 12 12"
          dur="0.9s"
          repeatCount="indefinite"
        />
      </path>
    </svg>
  )
}
