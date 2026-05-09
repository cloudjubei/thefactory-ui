import { forwardRef } from 'react'
import type { TextareaHTMLAttributes } from 'react'
import { cn } from '../utils/cn'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, invalid = false, rows = 4, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cn(
        'w-full rounded-md border text-sm px-3 py-2 bg-surface-raised text-text-primary placeholder:text-text-muted',
        'focus:outline-none focus:ring-2',
        invalid ? 'border-red-400 focus:ring-red-400' : 'border border-border focus:ring',
        className,
      )}
      {...props}
    />
  )
})
