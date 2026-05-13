import { forwardRef } from 'react'
import type { InputHTMLAttributes } from 'react'
import { cn } from '../utils/cn'

export type InputSize = 'sm' | 'md' | 'lg'

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: InputSize
  invalid?: boolean
}

const sizeClass: Record<InputSize, string> = {
  sm: 'h-8 text-sm px-2.5',
  md: 'h-9 text-sm px-3',
  lg: 'h-10 text-base px-3.5',
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, size = 'md', invalid = false, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        'w-full rounded-md border bg-surface-raised text-text-primary placeholder:text-text-muted',
        'focus:outline-none focus:ring-2',
        'disabled:opacity-60 disabled:cursor-not-allowed',
        invalid ? 'border-red-400 focus:ring-red-400' : 'border border-border focus:ring',
        sizeClass[size],
        className,
      )}
      {...props}
    />
  )
})
