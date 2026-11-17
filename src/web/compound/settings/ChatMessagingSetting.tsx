import { useChatMessagingSetting } from '../../../headless/hooks/useChatMessagingSetting'
import {
  CHAT_MESSAGING_SETTING_HINT,
  CHAT_MESSAGING_SETTING_LABEL,
} from '../../../headless/utils/chatMessagingSetting'
import { Switch } from '../../primitives/Switch'

export default function ChatMessagingSetting({ disabled = false }: { disabled?: boolean }) {
  const { allowed, ready, loading, saving, error, setAllowed, retry } = useChatMessagingSetting()
  return (
    <div className="flex flex-col gap-1.5">
      <Switch
        label={CHAT_MESSAGING_SETTING_LABEL}
        checked={allowed}
        disabled={disabled || !ready || loading || saving}
        onCheckedChange={(next) => void setAllowed(next)}
      />
      <p className="text-[12px] text-(--text-secondary)">{CHAT_MESSAGING_SETTING_HINT}</p>
      {error ? (
        <div role="alert" className="text-[12px] text-(--status-stuck-soft-fg)">
          {error}{' '}
          <button type="button" onClick={() => void retry()} className="underline">
            Reload setting
          </button>
        </div>
      ) : null}
    </div>
  )
}
