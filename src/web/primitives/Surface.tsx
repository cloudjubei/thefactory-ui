import type { ComponentPropsWithoutRef, CSSProperties, ElementType, ReactNode } from 'react'
import { cn } from '../utils/cn'

type SurfaceOwnProps<E extends ElementType> = {
  /** Tag to render as. Defaults to `div`; use `'ul'` for lists, `'section'` for grouped content, etc. */
  as?: E
  className?: string
  style?: CSSProperties
  children?: ReactNode
}

export type SurfaceProps<E extends ElementType = 'div'> = SurfaceOwnProps<E> &
  Omit<ComponentPropsWithoutRef<E>, keyof SurfaceOwnProps<E>>

/**
 * Rounded panel with the standard surface-raised background and subtle
 * border. Encapsulates the styling that recurs across nearly every list,
 * card, and grouped block in the app — pass layout / sizing via `className`,
 * other element-specific attributes (e.g. `onSubmit`) flow through unchanged.
 */
export default function Surface<E extends ElementType = 'div'>({
  as,
  className,
  style,
  children,
  ...rest
}: SurfaceProps<E>) {
  const Tag = (as ?? 'div') as ElementType
  return (
    <Tag
      className={cn('rounded border', className)}
      style={{
        borderColor: 'var(--border-subtle)',
        background: 'var(--surface-raised)',
        ...style,
      }}
      {...rest}
    >
      {children}
    </Tag>
  )
}
