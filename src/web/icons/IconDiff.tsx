export function IconDiff({ className }: { className?: string }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M5.8 7.2h5.8M8.7 4.3v5.8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M13 16.8h5.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M3.8 19.9L20.2 3.4" stroke="currentColor" strokeWidth="1.5" opacity="0.45" />
    </svg>
  )
}

export default IconDiff
