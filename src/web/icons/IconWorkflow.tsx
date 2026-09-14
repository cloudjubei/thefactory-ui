export function IconWorkflow({ className }: { className?: string }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <line x1="7" y1="7" x2="17" y2="7" stroke="#60A5FA" strokeWidth="2" />
      <line x1="17" y1="7" x2="17" y2="17" stroke="#A855F7" strokeWidth="2" />
      <line x1="17" y1="17" x2="7" y2="17" stroke="#10B981" strokeWidth="2" />
      <circle cx="5" cy="7" r="2.5" fill="#F59E0B" />
      <circle cx="19" cy="12" r="2.5" fill="#EF4444" />
      <circle cx="5" cy="17" r="2.5" fill="#22D3EE" />
    </svg>
  )
}
