import type { ReactNode } from 'react'

export type FieldProps = {
  label: ReactNode
  hint?: ReactNode
  children: ReactNode
}

/**
 * Label + input + optional hint. The surrounding `<label>` element wires up
 * screen readers without needing explicit htmlFor/id, as long as the input
 * is the label's only interactive descendant.
 */
export default function Field({ label, hint, children }: FieldProps) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="text-xs opacity-60">{hint}</span>}
    </label>
  )
}
