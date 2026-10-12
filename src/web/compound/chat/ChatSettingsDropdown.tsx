import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { CHAT_TOOLS_HINT } from '../../../headless/utils/chatToolTogglesConstants'
import {
  CHAT_TURN_LIMIT_HINT,
  CHAT_TURN_LIMIT_MAX,
  CHAT_TURN_LIMIT_MIN,
} from '../../../headless/utils/chatTurnLimitConstants'
import {
  applyChatTurnLimit,
  buildChatTurnLimit,
  filterChatToolToggles,
  groupChatToolToggles,
  useAppSettings,
  type ChatToolToggle,
} from '../../../headless'
import { Button } from '../../primitives/Button'
import { Modal } from '../../primitives/Modal'
import { Switch } from '../../primitives/Switch'
import ChatRulesPanel from '../rules/ChatRulesPanel'
import { TurnLimitField } from '../TurnLimitField'

export type ToolToggle = {
  name: string
  description: string
  available: boolean
  /** Groups the row under a heading. Rows without one land under "other". */
  category?: string
  /** False for a tool the transport never lets the user switch off. */
  toggleable?: boolean
}

/** Fill the optional grouping fields so the headless filter/group helpers apply. */
function normalizeToolToggle(tool: ToolToggle): ChatToolToggle {
  return {
    name: tool.name,
    description: tool.description,
    category: tool.category ?? 'other',
    available: tool.available,
    toggleable: tool.toggleable ?? true,
  }
}

export type CompletionSettingsLike = {
  limitTurns?: boolean
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
  /** Puts the chat's tools and approval switch back to its chat type's — on every model. */
  onResetTools: () => Promise<void> | void
  /** The chat-wide "run tools without asking" switch — one on every transport. Hidden when absent. */
  toolApproval?: { auto: boolean }
  onToolApprovalChange?: (auto: boolean) => Promise<void> | void
  /** This chat's key: shows "Rules for this chat" — its own always-allow rules, removable. Hidden when absent. */
  rulesChatContextId?: string

  persistSettings: (patch: Partial<CompletionSettingsLike>) => Promise<void> | void

  onDeleteChat: () => Promise<void> | void

  /** Slot beneath the standard fields. Used by hosts that need to render
   * their own history-summarization / message-sanitization sub-controls. */
  extraContent?: React.ReactNode
  /** Render as a centered modal (X + tappable backdrop) instead of an
   * absolute dropdown — used on small screens. */
  asModal?: boolean
  /** When true a settings write failed and is retrying — the body greys out and
   * input is blocked until the backend reconnects. */
  blocked?: boolean
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
  onResetTools,
  toolApproval,
  onToolApprovalChange,
  rulesChatContextId,
  persistSettings,
  onDeleteChat,
  extraContent,
  asModal = false,
  blocked = false,
}: ChatSettingsDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement | null>(null)
  const { settings, setUserPreferences } = useAppSettings()
  const prefs = settings.userPreferences
  const turnLimit = buildChatTurnLimit(completion)
  const [toolFilter, setToolFilter] = useState('')
  const visibleToolGroups = useMemo(
    () => groupChatToolToggles(filterChatToolToggles(tools.map(normalizeToolToggle), toolFilter)),
    [tools, toolFilter],
  )

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
    <div
      className={
        'relative ' +
        (asModal ? 'p-3 space-y-4' : 'p-3 space-y-4 max-h-[70vh] overflow-auto') +
        (blocked ? ' pointer-events-none opacity-50' : '')
      }
    >
      {blocked ? (
        <div className="absolute inset-0 z-10 flex items-start justify-center bg-(--surface-raised)/60 backdrop-blur-[1px]">
          <div className="mt-4 rounded-md border border-(--border-subtle) bg-(--surface-overlay) px-3 py-2 text-xs text-(--text-secondary) shadow">
            Reconnecting to save your settings…
          </div>
        </div>
      ) : null}
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
          <TurnLimitField
            label="Limit turns per run"
            hint={CHAT_TURN_LIMIT_HINT}
            sliderLabel="Max turns per run"
            limited={turnLimit.limited}
            maxTurns={turnLimit.maxTurns}
            min={CHAT_TURN_LIMIT_MIN}
            max={CHAT_TURN_LIMIT_MAX}
            onChange={(next) =>
              void persistSettings(
                next.limited === turnLimit.limited
                  ? { maxTurns: next.maxTurns }
                  : applyChatTurnLimit(next.limited, completion),
              )
            }
          />

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
        <div className="text-xs font-medium text-(--text-secondary)">Agent runs</div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-(--text-secondary)">Show thinking</span>
              <span className="text-[10px] text-(--text-tertiary)">
                Show the model's reasoning steps in an agent run's transcript.
              </span>
            </div>
            <Switch
              checked={prefs.cliShowThinking ?? true}
              onCheckedChange={(checked) => setUserPreferences({ cliShowThinking: !!checked })}
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-medium text-(--text-secondary)">Tools</div>
          <button
            type="button"
            className="text-[11px] text-(--text-tertiary) underline"
            onClick={() => void onResetTools()}
          >
            Reset to defaults
          </button>
        </div>
        <div className="text-[11px] text-(--text-tertiary)">{CHAT_TOOLS_HINT}</div>
        {toolApproval && onToolApprovalChange ? (
          <div className="flex items-center justify-between gap-3 rounded-md border border-(--border-subtle) px-2 py-2">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-(--text-secondary)">
                Run tools without asking
              </span>
              <span className="text-[10px] text-(--text-tertiary)">
                Off, the agent stops for your approval before anything that acts. On, it runs
                everything in the list above straight away — a tool switched off stays off.
              </span>
            </div>
            <Switch
              checked={toolApproval.auto}
              onCheckedChange={(checked) => void onToolApprovalChange(!!checked)}
            />
          </div>
        ) : null}
        {rulesChatContextId ? (
          <div className="rounded-md border border-(--border-subtle) px-2 py-2">
            <ChatRulesPanel chatContextId={rulesChatContextId} />
          </div>
        ) : null}
        <input
          value={toolFilter}
          onChange={(e) => setToolFilter(e.target.value)}
          placeholder="Filter tools…"
          aria-label="Filter tools"
          className="w-full px-2 py-1 border border-(--border-subtle) bg-(--surface-overlay) rounded-md text-xs"
        />
        <div className="rounded-md border border-(--border-subtle) divide-y divide-(--border-subtle)">
          {visibleToolGroups.length === 0 ? (
            <div className="text-xs text-(--text-secondary) px-2 py-3">
              {tools.length === 0
                ? 'No tools available for this context.'
                : 'No tools match that filter.'}
            </div>
          ) : (
            visibleToolGroups.map(({ category, tools: groupTools }) => (
              <div key={category}>
                <div className="px-2 py-1 bg-(--surface-raised) text-[10px] uppercase tracking-wide text-(--text-tertiary)">
                  {category} · {groupTools.filter((t) => t.available).length} of {groupTools.length}{' '}
                  on
                </div>
                <div className="divide-y divide-(--border-subtle)">
                  {groupTools.map((tool) => (
                    <div key={tool.name} className="px-2 py-2 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="text-sm font-mono text-(--text-primary) truncate">
                            {tool.name}
                          </div>
                          <div className="text-xs text-neutral-500 font-light line-clamp-2">
                            {tool.description}
                          </div>
                        </div>
                        {/* The label-above-switch toggle. Mirrors the native peer 1:1. */}
                        <div className="flex flex-row items-center gap-3">
                          <div
                            className="flex flex-col items-center space-y-px"
                            title={
                              tool.toggleable === false
                                ? 'Always available in this chat'
                                : undefined
                            }
                          >
                            <span className="text-[10px] text-(--text-secondary)">Available</span>
                            <Switch
                              checked={tool.available}
                              onCheckedChange={() => void toggleAvailable(tool)}
                              disabled={tool.toggleable === false}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
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
