import { useEffect, useRef, type RefObject } from 'react'
import { Button } from '../../primitives/Button'
import { Modal } from '../../primitives/Modal'
import { Switch } from '../../primitives/Switch'

export type ToolToggle = {
  name: string
  description: string
  available: boolean
  autoCall: boolean
}

export type CompletionSettingsLike = {
  maxTurns?: number
  numberMessagesToSend?: number
  finishTurnOnErrors?: boolean
  /** Free-form — host wires its own historySummarization config. */
  historySummarization?: unknown
  messageSanitization?: unknown
}

export type ChatSettingsDropdownProps = {
  isOpen: boolean
  onClose: () => void

  /** Anchor: the settings button. Used to ignore clicks for outside-click detection. */
  settingsBtnRef: RefObject<HTMLButtonElement | null>

  completion?: CompletionSettingsLike

  draftPrompt: string
  setDraftPrompt: (v: string) => void
  onSavePrompt: () => Promise<void> | void
  onResetPrompt: () => Promise<void> | void

  tools: ToolToggle[]
  toggleAvailable: (tool: ToolToggle) => Promise<void> | void
  toggleAutoCall: (tool: ToolToggle) => Promise<void> | void

  persistSettings: (patch: Partial<CompletionSettingsLike>) => Promise<void> | void

  onDeleteChat: () => Promise<void> | void

  /** Slot beneath the standard fields. Used by hosts that need to render
   * their own history-summarization / message-sanitization sub-controls. */
  extraContent?: React.ReactNode
  /** Render as a centered modal (X + tappable backdrop) instead of an
   * absolute dropdown — used on small screens. */
  asModal?: boolean
}

export default function ChatSettingsDropdown({
  isOpen,
  onClose,
  settingsBtnRef,
  completion,
  draftPrompt,
  setDraftPrompt,
  onSavePrompt,
  onResetPrompt,
  tools,
  toggleAvailable,
  toggleAutoCall,
  persistSettings,
  onDeleteChat,
  extraContent,
  asModal = false,
}: ChatSettingsDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!isOpen || asModal) return
    function onDocClick(e: MouseEvent) {
      const t = e.target as Node
      if (dropdownRef.current && dropdownRef.current.contains(t)) return
      if (settingsBtnRef.current && settingsBtnRef.current.contains(t)) return
      onClose()
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [isOpen, asModal, onClose, settingsBtnRef])

  if (!isOpen) return null

  const body = (
    <div className={asModal ? 'p-3 space-y-4' : 'p-3 space-y-4 max-h-[70vh] overflow-auto'}>
      <div className="space-y-2">
        <div className="text-xs font-medium text-(--text-secondary)">System Prompt</div>
        <textarea
          value={draftPrompt}
          onChange={(e) => setDraftPrompt(e.target.value)}
          className="w-full min-h-[100px] p-2 border border-(--border-subtle) bg-(--surface-overlay) rounded-md text-sm"
          placeholder="Custom system prompt for this chat context…"
        />
        <div className="flex items-center gap-2">
          <Button onClick={() => void onSavePrompt()}>Save prompt</Button>
          <Button variant="secondary" onClick={() => void onResetPrompt()}>
            Reset to defaults
          </Button>
        </div>
      </div>

      {completion ? (
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-(--text-secondary)" htmlFor="maxTurns">
                Max turns per run:
                <span className="pl-4 text-[14px] text-(--text-secondary)">
                  {completion.maxTurns ?? ''}
                </span>
              </label>
            </div>
            <input
              id="maxTurns"
              type="range"
              min={1}
              max={100}
              step={1}
              value={completion.maxTurns ?? 1}
              onChange={(e) => void persistSettings({ maxTurns: Number(e.target.value) })}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-(--text-tertiary)">
              <span>1</span>
              <span>100</span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label
                className="text-xs font-medium text-(--text-secondary)"
                htmlFor="numberMessagesToSend"
              >
                Number of messages to send:
                <span className="pl-4 text-[14px] text-(--text-secondary)">
                  {completion.numberMessagesToSend ?? ''}
                </span>
              </label>
            </div>
            <input
              id="numberMessagesToSend"
              type="range"
              min={3}
              max={50}
              step={1}
              value={completion.numberMessagesToSend ?? 3}
              onChange={(e) =>
                void persistSettings({
                  numberMessagesToSend: Number(e.target.value),
                })
              }
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-(--text-tertiary)">
              <span>3</span>
              <span>50</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-(--text-secondary)">
                Finish turn on errors
              </span>
              <span className="text-[10px] text-(--text-tertiary)">
                When enabled, the agent ends the current turn if a tool call errors.
              </span>
            </div>
            <Switch
              checked={!!completion.finishTurnOnErrors}
              onCheckedChange={(checked) => void persistSettings({ finishTurnOnErrors: !!checked })}
            />
          </div>
        </div>
      ) : null}

      {extraContent}

      <div className="space-y-2">
        <div className="text-xs font-medium text-(--text-secondary)">Tools</div>
        <div className="rounded-md border border-(--border-subtle) divide-y divide-(--border-subtle)">
          {tools.length === 0 ? (
            <div className="text-xs text-(--text-secondary) px-2 py-3">
              No tools available for this context.
            </div>
          ) : (
            tools.map((tool) => (
              <div key={tool.name} className="px-2 py-2 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="text-sm text-(--text-primary) truncate">{tool.name}</div>
                    <div className="text-xs text-neutral-500 font-light truncate">
                      {tool.description}
                    </div>
                  </div>
                  {/* Two label-above-switch toggles side by side. Mirrors
                      the native peer 1:1 — Available on the left, Auto-call
                      on the right, each with its caption above. */}
                  <div className="flex flex-row items-center gap-3">
                    <div className="flex flex-col items-center space-y-px">
                      <span className="text-[10px] text-(--text-secondary)">Available</span>
                      <Switch
                        checked={tool.available}
                        onCheckedChange={() => void toggleAvailable(tool)}
                      />
                    </div>
                    <div className="flex flex-col items-center space-y-px">
                      <span className="text-[10px] text-(--text-secondary)">Auto-call</span>
                      <Switch
                        checked={tool.available ? tool.autoCall : false}
                        onCheckedChange={() => void toggleAutoCall(tool)}
                        disabled={!tool.available}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="pt-2 border-t border-(--border-subtle)">
        <Button variant="danger" onClick={() => void onDeleteChat()}>
          Delete this chat
        </Button>
      </div>
    </div>
  )

  if (asModal) {
    return (
      <Modal isOpen onClose={onClose} title="Chat Settings" size="lg" contentClassName="p-0">
        {body}
      </Modal>
    )
  }

  return (
    <div
      ref={dropdownRef}
      className="absolute top-full right-3 left-3 mt-2 w-auto max-w-[520px] ml-auto rounded-md border border-(--border-subtle) bg-(--surface-raised) shadow-xl z-50"
      role="menu"
      aria-label="Chat Settings"
    >
      <div className="px-3 py-2 border-b border-(--border-subtle)">
        <div className="text-sm font-semibold text-(--text-primary)">Chat Settings</div>
        <div className="text-xs text-(--text-secondary)">Controls for this chat</div>
      </div>
      {body}
    </div>
  )
}
