import { forwardRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ConfirmDialog } from '../primitives/Modal'
import { Input, type InputProps } from '../primitives/Input'
import { IconEye } from '../icons/IconEye'
import { IconEyeOff } from '../icons/IconEyeOff'
import { cn } from '../utils/cn'

export type SecretInputProps = Omit<InputProps, 'type'> & {
  /**
   * Extra classes for the outer wrapper (where the eye sits on top of the
   * input). `className` is forwarded to the underlying `<Input>` element as
   * usual.
   */
  wrapperClassName?: string
  revealConfirmTitle?: ReactNode
  revealConfirmDescription?: ReactNode
}

export const SecretInput = forwardRef<HTMLInputElement, SecretInputProps>(function SecretInput(
  {
    className,
    wrapperClassName,
    revealConfirmTitle = 'Reveal secret?',
    revealConfirmDescription = 'The value will be visible on screen until you navigate away from this page.',
    value,
    defaultValue,
    ...rest
  },
  ref,
) {
  const [revealed, setRevealed] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const hasValue =
    typeof value === 'string'
      ? value.length > 0
      : typeof defaultValue === 'string'
        ? defaultValue.length > 0
        : value != null

  const onToggle = () => {
    if (revealed) {
      setRevealed(false)
      return
    }
    if (!hasValue) {
      // Nothing to reveal — toggle without confirming.
      setRevealed(true)
      return
    }
    setConfirmOpen(true)
  }

  return (
    <div className={cn('relative inline-block w-full', wrapperClassName)}>
      <Input
        ref={ref}
        {...rest}
        value={value}
        defaultValue={defaultValue}
        type={revealed ? 'text' : 'password'}
        className={cn('pr-9', className)}
      />
      <button
        type="button"
        onClick={onToggle}
        title={revealed ? 'Hide' : 'Reveal'}
        aria-label={revealed ? 'Hide secret' : 'Reveal secret'}
        className="absolute inset-y-0 right-2 my-auto flex h-6 w-6 items-center justify-center rounded text-text-muted hover:text-text-primary"
      >
        {revealed ? <IconEyeOff className="h-4 w-4" /> : <IconEye className="h-4 w-4" />}
      </button>
      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          setRevealed(true)
          setConfirmOpen(false)
        }}
        title={revealConfirmTitle}
        description={revealConfirmDescription}
        confirmLabel="Reveal"
      />
    </div>
  )
})
