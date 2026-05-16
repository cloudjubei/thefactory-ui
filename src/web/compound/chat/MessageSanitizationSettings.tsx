import { Switch } from '../../primitives/Switch'

export type MessageSanitization = {
  enabled: boolean
  keepLastMessages?: number
  maxAssistantChars?: number
  maxToolArgChars?: number
  maxToolContentChars?: number
  toolContentPreviewChars?: number
}

export type MessageSanitizationSettingsProps = {
  messageSanitization?: MessageSanitization
  persistSettings: (patch: {
    messageSanitization?: MessageSanitization
  }) => Promise<void> | void
}

/**
 * Message-sanitization sub-control for the `ChatSettingsDropdown`'s
 * `extraContent` slot. Mirrors `overseer-local`'s component 1:1.
 */
export default function MessageSanitizationSettings({
  messageSanitization,
  persistSettings,
}: MessageSanitizationSettingsProps) {
  const effectiveEnabled = messageSanitization?.enabled ?? false
  const effectiveKeepLast = messageSanitization?.keepLastMessages ?? 8

  return (
    <div className="space-y-3 pt-2 border-t border-(--border-subtle)">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-xs font-medium text-(--text-secondary)">
            Message sanitization
          </span>
          <span className="text-[10px] text-(--text-tertiary)">
            Clamp very large tool outputs/arguments before sending to the LLM
          </span>
        </div>
        <Switch
          checked={effectiveEnabled}
          onCheckedChange={(checked) =>
            persistSettings({
              messageSanitization: {
                ...(messageSanitization ?? {}),
                enabled: !!checked,
                keepLastMessages: effectiveKeepLast,
              },
            })
          }
        />
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label
            className="text-xs font-medium text-(--text-secondary)"
            htmlFor="keepLastMessages"
          >
            Keep last messages:
            <span className="pl-4 text-[14px] text-(--text-secondary)">{effectiveKeepLast}</span>
          </label>
        </div>

        <input
          id="keepLastMessages"
          type="range"
          min={0}
          max={30}
          step={1}
          value={effectiveKeepLast}
          onChange={(e) =>
            persistSettings({
              messageSanitization: {
                ...(messageSanitization ?? {}),
                enabled: effectiveEnabled,
                keepLastMessages: Number(e.target.value),
              },
            })
          }
          className="w-full"
          disabled={!effectiveEnabled}
        />

        <div className="flex justify-between text-[10px] text-(--text-tertiary)">
          <span>0</span>
          <span>30</span>
        </div>
      </div>
    </div>
  )
}
