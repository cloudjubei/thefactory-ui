import type { ReactNode } from 'react'
import { cn } from '../utils/cn'
import { renderLanguageIcon, type CodeInfoLanguage } from './codeInfoIcons'
import Tooltip from '../primitives/Tooltip'

export type CodeInfoChipProps = {
  type: 'language' | 'framework' | 'testFramework'
  value: string
  isInteractive?: boolean
  onClick?: () => void
  className?: string
}

/**
 * Pill-shaped tag summarising one slice of a project's code-info: language,
 * framework, or testFramework. Language chips render a small coloured icon
 * (see `renderLanguageIcon`); framework / testFramework chips render the
 * raw string. Used by the desktop + web project editors.
 */
export function CodeInfoChip({
  type,
  value,
  isInteractive,
  onClick,
  className,
}: CodeInfoChipProps): ReactNode {
  const content = (
    <span
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        isInteractive && onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick()
              }
            }
          : undefined
      }
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
        'border-(--border-subtle) bg-(--surface-raised) text-(--text-primary)',
        isInteractive && 'cursor-pointer hover:bg-(--surface-muted)',
        className,
      )}
    >
      {type === 'language' ? renderLanguageIcon(value as CodeInfoLanguage, 'w-4 h-4') : value}
    </span>
  )

  if (type === 'language') {
    return (
      <Tooltip content={value} placement="top">
        {content}
      </Tooltip>
    )
  }

  return content
}
