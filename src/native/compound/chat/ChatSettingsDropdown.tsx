import { type ReactNode } from 'react'
import { Dimensions, ScrollView, Text, View } from 'react-native'
import BottomSheet from '../../primitives/BottomSheet'
import { Button } from '../../primitives/Button'
import { Switch } from '../../primitives/Switch'
import { Textarea } from '../../primitives/Textarea'
import { Slider } from '../../primitives/Slider'
import { nativeLightTheme, nativeRadii, nativeSpace } from '../../../tokens/native'

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

  persistSettings: (patch: Partial<CompletionSettingsLike>) => Promise<void> | void

  onDeleteChat: () => Promise<void> | void
  /** Hide the delete-chat button (e.g. the General chat cannot be deleted). */
  canDelete?: boolean

  /** Slot beneath the standard fields — host renders history-summarization /
   *  message-sanitization sub-controls here. */
  extraContent?: ReactNode
  title?: string
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
  persistSettings,
  onDeleteChat,
  canDelete = true,
  extraContent,
  title = 'Chat settings',
}: ChatSettingsDropdownProps) {
  // Sheet takes ~80% of viewport (user-requested) and the inner scroller
  // takes ~70% — leaves room for the sheet handle, title bar, and a bit of
  // bottom safe-area inset before the scroll content kicks in.
  const maxBodyHeight = Math.round(Dimensions.get('window').height * 0.7)

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={title} maxHeightFraction={0.8}>
      <ScrollView
        style={{ maxHeight: maxBodyHeight }}
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

        {completion ? (
          <View style={{ gap: nativeSpace[4] }}>
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
                    color: nativeLightTheme.text.secondary,
                  }}
                >
                  Finish turn on errors
                </Text>
                <Text style={{ fontSize: 11, color: nativeLightTheme.text.muted, marginTop: 2 }}>
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

        {extraContent}

        {/* Tools */}
        <View style={{ gap: nativeSpace[2] }}>
          <SectionLabel>Tools</SectionLabel>
          <View
            style={{
              borderWidth: 1,
              borderColor: nativeLightTheme.border.subtle,
              borderRadius: nativeRadii[3],
            }}
          >
            {tools.length === 0 ? (
              <Text
                style={{
                  fontSize: 12,
                  color: nativeLightTheme.text.secondary,
                  paddingHorizontal: nativeSpace[3],
                  paddingVertical: nativeSpace[4],
                }}
              >
                No tools available for this context.
              </Text>
            ) : (
              tools.map((tool, i) => (
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
                    borderTopWidth: i === 0 ? 0 : 1,
                    borderTopColor: nativeLightTheme.border.subtle,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{ fontSize: 13, color: nativeLightTheme.text.primary }}
                      numberOfLines={1}
                    >
                      {tool.name}
                    </Text>
                    {tool.description ? (
                      <Text
                        style={{ fontSize: 11, color: nativeLightTheme.text.muted }}
                        numberOfLines={1}
                      >
                        {tool.description}
                      </Text>
                    ) : null}
                  </View>
                  <View style={{ alignItems: 'center', gap: 2 }}>
                    <Text style={{ fontSize: 10, color: nativeLightTheme.text.secondary }}>
                      Available
                    </Text>
                    <Switch
                      checked={tool.available}
                      onCheckedChange={() => void toggleAvailable(tool)}
                    />
                  </View>
                  <View style={{ alignItems: 'center', gap: 2 }}>
                    <Text style={{ fontSize: 10, color: nativeLightTheme.text.secondary }}>
                      Auto-call
                    </Text>
                    <Switch
                      checked={tool.available ? tool.autoCall : false}
                      onCheckedChange={() => void toggleAutoCall(tool)}
                      disabled={!tool.available}
                    />
                  </View>
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
              borderTopColor: nativeLightTheme.border.subtle,
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
  return (
    <Text style={{ fontSize: 12, fontWeight: '600', color: nativeLightTheme.text.secondary }}>
      {children}
    </Text>
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
  return (
    <View style={{ gap: nativeSpace[1] }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 12, fontWeight: '500', color: nativeLightTheme.text.secondary }}>
          {label}
        </Text>
        <Text style={{ fontSize: 13, color: nativeLightTheme.text.secondary }}>{value}</Text>
      </View>
      <Slider value={value} min={min} max={max} onChange={onChange} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 10, color: nativeLightTheme.text.muted }}>{min}</Text>
        <Text style={{ fontSize: 10, color: nativeLightTheme.text.muted }}>{max}</Text>
      </View>
    </View>
  )
}
