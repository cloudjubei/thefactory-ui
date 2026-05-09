import { forwardRef } from 'react'
import type { SelectHTMLAttributes } from 'react'
import { cn } from '../utils/cn'

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  size?: 'sm' | 'md' | 'lg'
  invalid?: boolean
}

const sizeClass = {
  sm: 'h-8 text-sm px-2.5',
  md: 'h-9 text-sm px-3',
  lg: 'h-10 text-base px-3.5',
}

/**
 * Thin native-select wrapper. A rich Radix-backed select exists in the
 * renderer but for the current surface area (status pickers, simple enum
 * choices) the native control is sufficient and keyboard-accessible for free.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, size = 'md', invalid = false, children, ...props },
  ref,
) {
  return (
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        'w-full rounded-md border bg-surface-raised text-text-primary',
        'focus:outline-none focus:ring-2',
        invalid ? 'border-red-400 focus:ring-red-400' : 'border border-border focus:ring',
        sizeClass[size],
        className,
      )}
      {...props}
    >
      {children}
    </select>
  )
})
