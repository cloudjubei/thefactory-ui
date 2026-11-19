export function IconRoute({ className }: { className?: string }) {
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
      className={className}
      aria-hidden="true"
    >
      <circle cx="5.25" cy="18.75" r="2.25" />
      <circle cx="18.75" cy="5.25" r="2.25" />
      <path d="M7.5 18.75h8.25a3 3 0 0 0 0-6h-7.5a3 3 0 0 1 0-6h8.25" />
    </svg>
  )
}

export default IconRoute
