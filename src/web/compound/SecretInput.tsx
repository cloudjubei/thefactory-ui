import { forwardRef } from 'react'
import type { ReactNode } from 'react'
import { ConfirmDialog } from '../primitives/Modal'
import { Input, type InputProps } from '../primitives/Input'
import { IconEye } from '../icons/IconEye'
import { IconEyeOff } from '../icons/IconEyeOff'
import { cn } from '../utils/cn'
import { useSecretReveal } from '../../headless/hooks/useSecretReveal'
import { SECRET_REVEAL_FAILED_TEXT } from '../../headless/utils/secretRevealConstants'

export type SecretInputProps = Omit<InputProps, 'type'> & {
  /**
   * Extra classes for the outer wrapper (where the eye sits on top of the
   * input). `className` is forwarded to the underlying `<Input>` element as
   * usual.
   */
  wrapperClassName?: string
  revealConfirmTitle?: ReactNode
  revealConfirmDescription?: ReactNode
  /**
   * Fetches the stored secret the field does not hold — given only when one is
   * stored. The eye then shows it, once the person confirmed, without changing
   * the field's value: left as it is, the stored secret is kept.
   */
  onReveal?: () => Promise<string>
}

export const SecretInput = forwardRef<HTMLInputElement, SecretInputProps>(function SecretInput(
  {
    className,
    wrapperClassName,
    revealConfirmTitle = 'Reveal secret?',
    revealConfirmDescription = 'The value will be visible on screen until you navigate away from this page.',
    onReveal,
    value,
    defaultValue,
    onChange,
    ...rest
  },
  ref,
) {
  const typed =
    typeof value === 'string' ? value : typeof defaultValue === 'string' ? defaultValue : ''
  const reveal = useSecretReveal({
    typed,
    ...(onReveal ? { onReveal } : {}),
    confirmTyped: true,
  })
  const revealed = !reveal.shown.masked

  return (
    <div className={cn('inline-block w-full', wrapperClassName)}>
      <div className="relative">
        <Input
          ref={ref}
          autoComplete="off"
          // Discourage password managers + browser extensions (1Password,
          // LastPass, MetaMask injectors, …) from autofilling / overwriting
          // these fields. They occasionally clear or stomp the rendered value
          // — visible as a key intermittently showing as empty.
          data-1p-ignore="true"
          data-lpignore="true"
          data-bwignore="true"
          data-form-type="other"
          {...rest}
          value={typeof value === 'string' ? reveal.shown.value : value}
          defaultValue={defaultValue}
          onChange={(e) => {
            reveal.typed()
            onChange?.(e)
          }}
          type={revealed ? 'text' : 'password'}
          className={cn('pr-9', className)}
        />
        <button
          type="button"
          onClick={reveal.toggle}
          disabled={reveal.fetching}
          title={revealed ? 'Hide' : 'Reveal'}
          aria-label={revealed ? 'Hide secret' : 'Reveal secret'}
          className="absolute inset-y-0 right-2 my-auto flex h-6 w-6 items-center justify-center rounded text-text-muted hover:text-text-primary"
        >
          {revealed ? <IconEyeOff className="h-4 w-4" /> : <IconEye className="h-4 w-4" />}
        </button>
      </div>
      {reveal.failed && (
        <p role="alert" className="mt-1 text-xs text-red-500">
          {SECRET_REVEAL_FAILED_TEXT}
        </p>
      )}
      <ConfirmDialog
        isOpen={reveal.confirming}
        onClose={reveal.cancel}
        onConfirm={reveal.confirm}
        title={revealConfirmTitle}
        description={revealConfirmDescription}
        confirmLabel="Reveal"
      />
    </div>
  )
})
