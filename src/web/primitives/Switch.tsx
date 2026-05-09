export interface SwitchProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  label?: string
  disabled?: boolean
  className?: string
}

export function Switch({
  checked,
  onCheckedChange,
  label,
  disabled = false,
  className,
}: SwitchProps) {
  const state = checked ? 'checked' : 'unchecked'

  const handleClick = () => {
    if (disabled) return
    onCheckedChange(!checked)
  }

  return (
    <div className={`flex items-center space-x-2 ${className ?? ''}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-disabled={disabled || undefined}
        disabled={disabled}
        onClick={handleClick}
        className="ui-switch"
        data-state={state}
        data-disabled={disabled ? 'true' : 'false'}
        title={disabled ? 'Disabled' : undefined}
      >
        <span className="ui-switch__thumb" />
      </button>
      {label && (
        <span
          className={`text-sm font-medium ${disabled ? 'text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}
        >
          {label}
        </span>
      )}
      <style>{`
        .ui-switch[data-disabled="true"] {
          opacity: 0.5;
          cursor: not-allowed;
          filter: grayscale(30%);
        }
        .ui-switch[data-state="unchecked"][data-disabled="false"] {
          opacity: 1;
        }
        .ui-switch[data-state="unchecked"][data-disabled="true"] .ui-switch__thumb {
          box-shadow: none;
        }
      `}</style>
    </div>
  )
}
