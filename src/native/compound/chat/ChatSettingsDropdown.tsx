import { useMemo, useState, type ReactNode } from 'react'
import { Dimensions, Pressable, ScrollView, Text, View } from 'react-native'
import BottomSheet from '../../primitives/BottomSheet'
import {
  filterChatToolToggles,
  groupChatToolToggles,
  useAppSettings,
  type ChatToolToggle,
} from '../../../headless'
import { Button } from '../../primitives/Button'
import { Switch } from '../../primitives/Switch'
import { Input } from '../../primitives/Input'
import { Textarea } from '../../primitives/Textarea'
import { Slider } from '../../primitives/Slider'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'

export type ToolToggle = {
  name: string
  description: string
  available: boolean
  autoCall: boolean
  /** Groups the row under a heading. Rows without one land under "other". */
  category?: string
  /** False for a tool the transport never lets the user switch off. */
  toggleable?: boolean
  /** False on a transport with no per-tool auto-call axis. */
  supportsAutoCall?: boolean
}

/** Fill the optional grouping fields so the headless filter/group helpers apply. */
function normalizeToolToggle(tool: ToolToggle): ChatToolToggle {
  return {
    name: tool.name,
    description: tool.description,
    category: tool.category ?? 'other',
    available: tool.available,
    autoCall: tool.autoCall,
    toggleable: tool.toggleable ?? true,
    supportsAutoCall: tool.supportsAutoCall ?? true,
  }
}

export type CompletionSettingsLike = {
  maxTurns?: number
  numberMessagesToSend?: number
  finishTurnOnErrors?: boolean
  historySummarization?: unknown
  messageSanitization?: unknown
}

export interface ChatSettingsDropdownProps {
  isOpen: boolean
  onClose: () => void

  completion?: CompletionSettingsLike

  draftPrompt: string
  setDraftPrompt: (v: string) => void
  onSavePrompt: () => Promise<void> | void
  onResetPrompt: () => Promise<void> | void

  tools: ToolToggle[]
  toggleAvailable: (tool: ToolToggle) => Promise<void> | void
  toggleAutoCall: (tool: ToolToggle) => Promise<void> | void
  /** Clears the chat's own tool allowlist back to the defaults. Hidden when absent. */
  onResetTools?: () => Promise<void> | void
  /** One line under the Tools heading explaining what this chat's list governs. */
  toolsHint?: string
  /** The chat-wide "run tools without asking" switch. Hidden on a transport that reports it unsupported. */
  toolApproval?: { auto: boolean; supported: boolean }
  onToolApprovalChange?: (auto: boolean) => Promise<void> | void

  persistSettings: (patch: Partial<CompletionSettingsLike>) => Promise<void> | void

  onDeleteChat: () => Promise<void> | void
  /** Hide the delete-chat button (e.g. the General chat cannot be deleted). */
  canDelete?: boolean

  /** Slot beneath the standard fields — host renders history-summarization /
   *  message-sanitization sub-controls here. */
  extraContent?: ReactNode
  title?: string
  /** When true a settings write failed and is retrying — the body greys out and
   * input is blocked until the backend reconnects. */
  blocked?: boolean
  /** When true this chat runs a CLI agent, so the API-completion-only controls
   * (turn/history/sanitization tuning) are greyed out — they have no effect on
   * a CLI run. */
  cliBacked?: boolean
}

/**
 * Native peer of [web's `ChatSettingsDropdown`](../../../web/compound/chat/ChatSettingsDropdown.tsx).
 * On RN the settings surface is a bottom sheet with a scrollable body:
 * system-prompt editor, completion sliders, per-tool toggles, the
 * `extraContent` slot, and the delete-chat action.
 */
export default function ChatSettingsDropdown({
  isOpen,
  onClose,
  completion,
  draftPrompt,
  setDraftPrompt,
  onSavePrompt,
  onResetPrompt,
  tools,
  toggleAvailable,
  toggleAutoCall,
  onResetTools,
  toolsHint,
  toolApproval,
  onToolApprovalChange,
  persistSettings,
  onDeleteChat,
  canDelete = true,
  extraContent,
  title = 'Chat settings',
  blocked = false,
  cliBacked = false,
}: ChatSettingsDropdownProps) {
  const { theme } = useNativeTheme()
  const { settings, setUserPreferences } = useAppSettings()
  const prefs = settings.userPreferences
  const [toolFilter, setToolFilter] = useState('')
  const visibleToolGroups = useMemo(
    () => groupChatToolToggles(filterChatToolToggles(tools.map(normalizeToolToggle), toolFilter)),
    [tools, toolFilter],
  )
  // Sheet takes ~80% of viewport (user-requested) and the inner scroller
  // takes ~70% — leaves room for the sheet handle, title bar, and a bit of
  // bottom safe-area inset before the scroll content kicks in.
  const maxBodyHeight = Math.round(Dimensions.get('window').height * 0.7)

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={title} maxHeightFraction={0.8}>
      {blocked ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 10,
            alignItems: 'center',
            paddingTop: nativeSpace[4],
            backgroundColor: theme.surface.raised + 'aa',
          }}
        >
          <View
            style={{
              borderWidth: 1,
              borderColor: theme.border.subtle,
              borderRadius: nativeRadii[3],
              backgroundColor: theme.surface.overlay,
              paddingHorizontal: nativeSpace[3],
              paddingVertical: nativeSpace[2],
            }}
          >
            <Text style={{ fontSize: 12, color: theme.text.secondary }}>
              Reconnecting to save your settings…
            </Text>
          </View>
        </View>
      ) : null}
      <ScrollView
        pointerEvents={blocked ? 'none' : 'auto'}
        style={{ maxHeight: maxBodyHeight, opacity: blocked ? 0.5 : 1 }}
        contentContainerStyle={{ gap: nativeSpace[5], paddingBottom: nativeSpace[4] }}
        keyboardShouldPersistTaps="handled"
      >
        {/* System prompt */}
        <View style={{ gap: nativeSpace[2] }}>
          <SectionLabel>System prompt</SectionLabel>
          <Textarea
            value={draftPrompt}
            onChangeText={setDraftPrompt}
            rows={4}
            placeholder="Custom system prompt for this chat context…"
          />
          <View style={{ flexDirection: 'row', gap: nativeSpace[2] }}>
            <Button size="sm" onPress={() => void onSavePrompt()}>
              Save prompt
            </Button>
            <Button size="sm" variant="secondary" onPress={() => void onResetPrompt()}>
              Reset to defaults
            </Button>
          </View>
        </View>

        {cliBacked ? (
          <Text style={{ fontSize: 11, color: theme.text.muted }}>
            Completion settings apply to API agents — this chat runs a CLI agent.
          </Text>
        ) : null}

        {completion ? (
          <View
            pointerEvents={cliBacked ? 'none' : 'auto'}
            style={{ gap: nativeSpace[4], opacity: cliBacked ? 0.5 : 1 }}
          >
            <SliderRow
              label="Max turns per run"
              value={completion.maxTurns ?? 1}
              min={1}
              max={100}
              onChange={(v) => void persistSettings({ maxTurns: v })}
            />
            <SliderRow
              label="Number of messages to send"
              value={completion.numberMessagesToSend ?? 3}
              min={3}
              max={50}
              onChange={(v) => void persistSettings({ numberMessagesToSend: v })}
            />
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: nativeSpace[3],
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '500',
                    color: theme.text.secondary,
                  }}
                >
                  Finish turn on errors
                </Text>
                <Text style={{ fontSize: 11, color: theme.text.muted, marginTop: 2 }}>
                  When enabled, the agent ends the current turn if a tool call errors.
                </Text>
              </View>
              <Switch
                checked={!!completion.finishTurnOnErrors}
                onCheckedChange={(c) => void persistSettings({ finishTurnOnErrors: c })}
              />
            </View>
          </View>
        ) : null}

        {cliBacked ? (
          <View pointerEvents="none" style={{ opacity: 0.5 }}>
            {extraContent}
          </View>
        ) : (
          extraContent
        )}

        {/* Agent runs — CLI transcript display prefs (global). */}
        <View style={{ gap: nativeSpace[3] }}>
          <SectionLabel>Agent runs</SectionLabel>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: nativeSpace[3],
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: '500', color: theme.text.secondary }}>
                Show thinking
              </Text>
              <Text style={{ fontSize: 11, color: theme.text.muted, marginTop: 2 }}>
                Show the model's reasoning steps in an agent run's transcript.
              </Text>
            </View>
            <Switch
              checked={prefs.cliShowThinking ?? true}
              onCheckedChange={(c) => setUserPreferences({ cliShowThinking: c })}
            />
          </View>
        </View>

        {/* Tools */}
        <View style={{ gap: nativeSpace[2] }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <SectionLabel>Tools</SectionLabel>
            {onResetTools ? (
              <Pressable onPress={() => void onResetTools()}>
                <Text style={{ fontSize: 11, color: theme.text.muted }}>Reset to defaults</Text>
              </Pressable>
            ) : null}
          </View>
          {toolsHint ? (
            <Text style={{ fontSize: 11, color: theme.text.muted }}>{toolsHint}</Text>
          ) : null}
          {toolApproval?.supported && onToolApprovalChange ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: nativeSpace[3],
                borderWidth: 1,
                borderColor: theme.border.subtle,
                borderRadius: nativeRadii[2],
                paddingHorizontal: nativeSpace[2],
                paddingVertical: nativeSpace[2],
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: '500', color: theme.text.secondary }}>
                  Run tools without asking
                </Text>
                <Text style={{ fontSize: 11, color: theme.text.muted, marginTop: 2 }}>
                  Off, the agent stops for your approval before anything that acts. On, it runs
                  everything in the list below straight away — a tool switched off stays off.
                </Text>
              </View>
              <Switch
                checked={toolApproval.auto}
                onCheckedChange={(c) => void onToolApprovalChange(c)}
              />
            </View>
          ) : null}
          <Input value={toolFilter} onChangeText={setToolFilter} placeholder="Filter tools…" />
          <View
            style={{
              borderWidth: 1,
              borderColor: theme.border.subtle,
              borderRadius: nativeRadii[3],
            }}
          >
            {visibleToolGroups.length === 0 ? (
              <Text
                style={{
                  fontSize: 12,
                  color: theme.text.secondary,
                  paddingHorizontal: nativeSpace[3],
                  paddingVertical: nativeSpace[4],
                }}
              >
                {tools.length === 0
                  ? 'No tools available for this context.'
                  : 'No tools match that filter.'}
              </Text>
            ) : (
              visibleToolGroups.map((group, gi) => (
                <View key={group.category}>
                  <View
                    style={{
                      paddingHorizontal: nativeSpace[3],
                      paddingVertical: nativeSpace[2],
                      backgroundColor: theme.surface.raised,
                      borderTopWidth: gi === 0 ? 0 : 1,
                      borderTopColor: theme.border.subtle,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        textTransform: 'uppercase',
                        color: theme.text.muted,
                      }}
                    >
                      {group.category} · {group.tools.filter((t) => t.available).length} of{' '}
                      {group.tools.length} on
                    </Text>
                  </View>
                  {group.tools.map((tool) => (
                    <View
                      key={tool.name}
                      // Name + description on the left, two stacked
                      // (label-above-switch) toggles on the right. Labels above
                      // give the switches enough breathing room to be tappable
                      // on touch without truncating the captions; matches web's
                      // settings dropdown layout 1:1.
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: nativeSpace[3],
                        paddingHorizontal: nativeSpace[3],
                        paddingVertical: nativeSpace[3],
                        borderTopWidth: 1,
                        borderTopColor: theme.border.subtle,
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, color: theme.text.primary }} numberOfLines={1}>
                          {tool.name}
                        </Text>
                        {tool.description ? (
                          <Text style={{ fontSize: 11, color: theme.text.muted }} numberOfLines={2}>
                            {tool.description}
                          </Text>
                        ) : null}
                      </View>
                      <View style={{ alignItems: 'center', gap: 2 }}>
                        <Text style={{ fontSize: 10, color: theme.text.secondary }}>Available</Text>
                        <Switch
                          checked={tool.available}
                          onCheckedChange={() => void toggleAvailable(tool)}
                          disabled={!tool.toggleable}
                        />
                      </View>
                      {tool.supportsAutoCall ? (
                        <View style={{ alignItems: 'center', gap: 2 }}>
                          <Text style={{ fontSize: 10, color: theme.text.secondary }}>
                            Auto-call
                          </Text>
                          <Switch
                            checked={tool.available ? tool.autoCall : false}
                            onCheckedChange={() => void toggleAutoCall(tool)}
                            disabled={!tool.available}
                          />
                        </View>
                      ) : null}
                    </View>
                  ))}
                </View>
              ))
            )}
          </View>
        </View>

        {canDelete ? (
          // Compact destructive button, left-aligned (per user feedback —
          // sits where the rest of the section's content starts, not flush
          // to the right edge).
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'flex-start',
              paddingTop: nativeSpace[3],
              borderTopWidth: 1,
              borderTopColor: theme.border.subtle,
            }}
          >
            <Button size="sm" variant="danger" onPress={() => void onDeleteChat()}>
              Delete this chat
            </Button>
          </View>
        ) : null}
      </ScrollView>
    </BottomSheet>
  )
}

function SectionLabel({ children }: { children: ReactNode }) {
  const { theme } = useNativeTheme()
  return (
    <Text style={{ fontSize: 12, fontWeight: '600', color: theme.text.secondary }}>{children}</Text>
  )
}

function SliderRow({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (v: number) => void
}) {
  const { theme } = useNativeTheme()
  return (
    <View style={{ gap: nativeSpace[1] }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 12, fontWeight: '500', color: theme.text.secondary }}>
          {label}
        </Text>
        <Text style={{ fontSize: 13, color: theme.text.secondary }}>{value}</Text>
      </View>
      <Slider value={value} min={min} max={max} onChange={onChange} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 10, color: theme.text.muted }}>{min}</Text>
        <Text style={{ fontSize: 10, color: theme.text.muted }}>{max}</Text>
      </View>
    </View>
  )
}
