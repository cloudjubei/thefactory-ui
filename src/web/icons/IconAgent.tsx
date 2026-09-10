export function IconAgent({ className }: { className?: string; filled?: boolean }) {
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
      <path d="M12 3l2.2 5.3L19.5 10.5l-5.3 2.2L12 18l-2.2-5.3L4.5 10.5l5.3-2.2z" />
      <path
        d="M19 16l.8 1.9 1.9.8-1.9.8L19 21.4l-.8-1.9-1.9-.8 1.9-.8z"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  )
}
