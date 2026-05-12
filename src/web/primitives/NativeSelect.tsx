import { forwardRef } from 'react'
import type { SelectHTMLAttributes } from 'react'
import { cn } from '../utils/cn'

export type NativeSelectSize = 'sm' | 'md' | 'lg'

export interface NativeSelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  size?: NativeSelectSize
  invalid?: boolean
}

const sizeClass: Record<NativeSelectSize, string> = {
  sm: 'h-8 text-sm px-2.5',
  md: 'h-9 text-sm px-3',
  lg: 'h-10 text-base px-3.5',
}

// Thin native-`<select>` wrapper. Use this for simple enum pickers where the
// browser-native dropdown is fine. For rich popovers with custom item rendering
// use the Radix-backed `Select` composite instead.
export const NativeSelect = forwardRef<HTMLSelectElement, NativeSelectProps>(function NativeSelect(
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
