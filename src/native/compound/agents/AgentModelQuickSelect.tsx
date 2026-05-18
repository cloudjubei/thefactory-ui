import { Button } from '../../primitives/Button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../primitives/Select'

export interface ModelQuickSelectOption {
  id: string
  name: string
  model?: string
}

export interface AgentModelQuickSelectProps {
  value: string
  options: ReadonlyArray<ModelQuickSelectOption>
  onPick: (id: string) => void
  onOpenSettings: () => void
  emptyLabel?: string
  placeholder?: string
  manageLabel?: string
  className?: string
  ariaLabel?: string
}

const MANAGE_VALUE = '__open_settings'

export default function AgentModelQuickSelect({
  value,
  options,
  onPick,
  onOpenSettings,
  emptyLabel = 'Configure LLM…',
  placeholder = 'Select Model',
  manageLabel = 'Manage LLM Configurations…',
  className,
}: AgentModelQuickSelectProps) {
  if (!options || options.length === 0) {
    return (
      <Button className={className} variant="secondary" onPress={onOpenSettings}>
        {emptyLabel}
      </Button>
    )
  }

  return (
    <Select
      value={value}
      onValueChange={(v) => {
        if (v === MANAGE_VALUE) {
          onOpenSettings()
          return
        }
        onPick(v)
      }}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.id} value={opt.id}>
            {opt.name + (opt.model ? ` (${opt.model})` : '')}
          </SelectItem>
        ))}
        <SelectItem value={MANAGE_VALUE}>{manageLabel}</SelectItem>
      </SelectContent>
    </Select>
  )
}
