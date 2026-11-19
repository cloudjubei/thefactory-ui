export function IconPointer({ className }: { className?: string }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M9 11V5a2 2 0 0 1 4 0v6" />
      <path d="M13 9a2 2 0 0 1 4 0v3" />
      <path d="M17 11a2 2 0 0 1 4 0v4a7 7 0 0 1-7 7h-1a7 7 0 0 1-6-3.4L4 14a2 2 0 0 1 3.4-2L9 14" />
    </svg>
  )
}
