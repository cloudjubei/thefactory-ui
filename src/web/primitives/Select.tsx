import * as React from 'react'
import * as SelectPrimitive from '@radix-ui/react-select'
import { cn } from '../utils/cn'

// Radix-backed Select composite. Use this for popover-style pickers with
// custom item rendering. For a plain native `<select>` use `NativeSelect`.

export type SelectTriggerSize = 'sm' | 'md' | 'lg'

export const Select = SelectPrimitive.Root
export const SelectGroup = SelectPrimitive.Group
export const SelectValue = SelectPrimitive.Value

export const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> & {
    size?: SelectTriggerSize
  }
>(function SelectTrigger({ className, children, size = 'md', ...props }, ref) {
  const sizeCls =
    size === 'sm'
      ? 'h-8 text-sm px-2.5'
      : size === 'lg'
        ? 'h-10 text-base px-3.5'
        : 'h-9 text-sm px-3'
  return (
    <SelectPrimitive.Trigger
      ref={ref}
      className={cn(
        'flex items-center justify-between rounded-md border bg-(--surface-raised) text-(--text-primary)',
        'placeholder:text-(--text-muted) focus:outline-none focus:ring-2',
        'border-(--border-default) focus:ring-(--focus-ring)',
        sizeCls,
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon className="ml-2 text-(--text-muted)">▾</SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
})

export const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(function SelectContent({ className, children, position = 'popper', ...props }, ref) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        ref={ref}
        className={cn(
          'z-[2000] min-w-[10rem] overflow-hidden rounded-md border bg-(--surface-raised) text-(--text-primary) shadow-md',
          'border-(--border-default)',
          className,
        )}
        position={position}
        side="bottom"
        sideOffset={6}
        avoidCollisions={false}
        {...props}
      >
        <SelectPrimitive.ScrollUpButton className="flex items-center justify-center py-1 text-(--text-muted)">
          ▲
        </SelectPrimitive.ScrollUpButton>
        <SelectPrimitive.Viewport className="p-1 max-h-60 overflow-auto">
          {children}
        </SelectPrimitive.Viewport>
        <SelectPrimitive.ScrollDownButton className="flex items-center justify-center py-1 text-(--text-muted)">
          ▼
        </SelectPrimitive.ScrollDownButton>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
})

export const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(function SelectItem({ className, children, ...props }, ref) {
  return (
    <SelectPrimitive.Item
      ref={ref}
      className={cn(
        'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none',
        'data-[highlighted]:bg-(--surface-muted) data-[highlighted]:text-(--text-primary)',
        'data-[state=checked]:font-semibold',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="ml-2" aria-hidden>
        ✓
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  )
})
