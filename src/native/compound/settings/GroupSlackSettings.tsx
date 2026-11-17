import { useState, type ReactNode } from 'react'
import { Linking, Pressable, Text, View } from 'react-native'
import {
  SLACK_SETTINGS_TEXT as TEXT,
  slackClientIdProblem,
  slackThreadLinkProblem,
  useGroupSlackSettings,
  type SlackReviewSettingsState,
} from '../../../headless'
import { nativeFontFamilies, nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import Field from '../../primitives/Field'
import { Input } from '../../primitives/Input'
import { ConfirmDialog } from '../../primitives/Modal'
import { Switch } from '../../primitives/Switch'
import ToneBadge from '../chips/ToneBadge'
import { useClipboardHost } from '../ClipboardHostContext'
import ProviderOAuthWaiting from './ProviderOAuthWaiting'

export type SlackReviewSettingsActions = {
  onClientIdChange: (clientId: string) => void
  onSignIn: () => void
  onSignInAgain: () => void
  onOpenAgain: () => void
  onBackOut: () => void
  onWatch: (permalink: string, offerExistingReplies: boolean) => void
  onClear: () => void
}

export type SlackReviewSettingsPanelProps = SlackReviewSettingsActions & {
  state: SlackReviewSettingsState
  /** Start with the thread link being changed — for a fixed showcase state. */
  editingThread?: boolean
  /** Start with this link typed — for a fixed showcase state. */
  typedLink?: string
  /** Start with Clear's confirm open — for a fixed showcase state. */
  confirmingClear?: boolean
}

/**
 * Native peer of [web's `SlackReviewSettingsPanel`](../../../web/compound/settings/GroupSlackSettings.tsx)
 * in the layout that ships, Two steps: connect the person's own Slack app,
 * then watch the group's review thread.
 */
export function SlackReviewSettingsPanel({
  state,
  editingThread = false,
  typedLink = '',
  confirmingClear = false,
  ...actions
}: SlackReviewSettingsPanelProps) {
  const { theme } = useNativeTheme()
  const { view } = state
  return (
    <View style={{ gap: nativeSpace[4] }}>
      <View style={{ gap: 4 }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text.primary }}>
          {TEXT.heading}
        </Text>
        <Text style={{ fontSize: 13, color: theme.text.secondary }}>{TEXT.intro}</Text>
      </View>
      {view.readError ? <Alert>{view.readError}</Alert> : null}
      {view.actionError ? <Alert>{view.actionError}</Alert> : null}
      <Step n={1} title={TEXT.connectStep}>
        <ConnectionPart state={state} actions={actions} />
      </Step>
      <Step n={2} title={TEXT.threadStep} muted={!view.canWatch}>
        {view.canWatch ? (
          <ThreadPart
            state={state}
            actions={actions}
            editingThread={editingThread}
            typedLink={typedLink}
            confirmingClear={confirmingClear}
          />
        ) : (
          <Text style={{ fontSize: 13, color: theme.text.secondary }}>{TEXT.connectFirst}</Text>
        )}
      </Step>
    </View>
  )
}

function Step({
  n,
  title,
  muted = false,
  children,
}: {
  n: number
  title: string
  muted?: boolean
  children: ReactNode
}) {
  const { theme } = useNativeTheme()
  const ink = muted ? theme.text.muted : theme.accent.primary
  return (
    <View style={{ flexDirection: 'row', gap: nativeSpace[3] }}>
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: muted ? theme.border.subtle : ink,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 12, fontWeight: '600', color: ink }}>{n}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: nativeSpace[2] }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: theme.text.primary }}>{title}</Text>
        {children}
      </View>
    </View>
  )
}

type PartProps = { state: SlackReviewSettingsState; actions: SlackReviewSettingsActions }

function ConnectionPart({ state, actions }: PartProps) {
  const { theme } = useNativeTheme()
  const { copyText } = useClipboardHost()
  const [copied, setCopied] = useState(false)
  const { view, clientId, signIn } = state
  const { connection } = view
  const muted = { fontSize: 13, color: theme.text.secondary }
  if (signIn.step === 'waiting') {
    return (
      <ProviderOAuthWaiting
        error={signIn.error}
        onOpenAgain={actions.onOpenAgain}
        onBackOut={actions.onBackOut}
      />
    )
  }
  if (connection.kind === 'connected') {
    return (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        <ToneBadge tone="done" label={TEXT.connected} />
        <Text style={{ fontSize: 14, fontWeight: '500', color: theme.text.primary }}>
          {connection.workspace}
        </Text>
      </View>
    )
  }
  if (connection.kind === 'sign-in-again') {
    return (
      <View style={{ gap: nativeSpace[2] }}>
        {signIn.error ? <Alert>{signIn.error}</Alert> : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          <ToneBadge tone="stuck" label={TEXT.needsSignIn} />
          <Text style={{ fontSize: 14, fontWeight: '500', color: theme.text.primary }}>
            {connection.workspace}
          </Text>
        </View>
        <Text style={muted}>{TEXT.signInAgainWhy}</Text>
        <Button
          variant="primary"
          loading={signIn.step === 'opening'}
          onPress={actions.onSignInAgain}
        >
          {TEXT.signInAgain}
        </Button>
      </View>
    )
  }
  const typed = clientId.trim() !== ''
  const clientIdProblem = slackClientIdProblem(clientId)
  return (
    <View style={{ gap: nativeSpace[3] }}>
      <Text style={muted}>{TEXT.why}</Text>
      {signIn.error ? <Alert>{signIn.error}</Alert> : null}
      <Field
        label={TEXT.clientId}
        hint={TEXT.clientIdHint}
        error={typed ? clientIdProblem : undefined}
      >
        <Input
          value={clientId}
          onChangeText={actions.onClientIdChange}
          placeholder={TEXT.clientIdPlaceholder}
          accessibilityLabel={TEXT.clientId}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="numbers-and-punctuation"
        />
      </Field>
      <View style={{ gap: 4 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: theme.text.primary }}>
          {TEXT.redirectUrl}
        </Text>
        <Text
          selectable
          style={{
            fontFamily: nativeFontFamilies.mono,
            fontSize: 12,
            color: theme.text.primary,
            borderWidth: 1,
            borderColor: theme.border.subtle,
            borderRadius: nativeRadii[2],
            backgroundColor: theme.surface.muted,
            paddingHorizontal: nativeSpace[2],
            paddingVertical: 6,
          }}
        >
          {view.redirectUrl}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ flex: 1, fontSize: 12, color: theme.text.muted }}>
            {TEXT.redirectUrlHint}
          </Text>
          {copyText ? (
            <Button
              size="sm"
              variant="secondary"
              onPress={() => {
                void copyText(view.redirectUrl).then(() => setCopied(true))
              }}
            >
              {copied ? '✓' : TEXT.copy}
            </Button>
          ) : null}
        </View>
      </View>
      <Button
        variant="primary"
        disabled={!connection.canSignIn || clientIdProblem !== undefined}
        loading={signIn.step === 'opening'}
        onPress={actions.onSignIn}
      >
        {TEXT.signIn}
      </Button>
      {!connection.canSignIn ? (
        <Text style={{ fontSize: 12, color: theme.text.muted }}>{TEXT.cannotSignIn}</Text>
      ) : null}
    </View>
  )
}

function ThreadPart({
  state,
  actions,
  editingThread,
  typedLink,
  confirmingClear,
}: PartProps & { editingThread: boolean; typedLink: string; confirmingClear: boolean }) {
  const { theme, status } = useNativeTheme()
  const { thread } = state.view
  const [editing, setEditing] = useState(editingThread)
  const [confirming, setConfirming] = useState(confirmingClear)
  const [tried, setTried] = useState(typedLink)
  if (thread.kind === 'none' || editing) {
    return (
      <ThreadLinkForm
        initial={tried || (thread.kind === 'watching' ? thread.permalink : '')}
        onWatch={(link, existing) => {
          setEditing(false)
          setTried(link)
          actions.onWatch(link, existing)
        }}
        {...(thread.kind === 'watching' ? { onCancel: () => setEditing(false) } : {})}
      />
    )
  }
  const small = { fontSize: 12, color: theme.text.muted }
  const { permalink } = thread
  return (
    <View style={{ gap: 6, opacity: thread.saving ? 0.7 : 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <ToneBadge tone={thread.tone} label={thread.saving ? TEXT.saving : thread.label} />
        {permalink ? (
          <Pressable
            accessibilityRole="link"
            onPress={() => void Linking.openURL(permalink)}
            style={{ flex: 1, minWidth: 0 }}
          >
            <Text numberOfLines={1} style={{ fontSize: 13, color: theme.accent.primary }}>
              {permalink}
            </Text>
          </Pressable>
        ) : null}
      </View>
      {thread.why ? (
        <Text style={{ fontSize: 13, color: theme.text.secondary }}>{thread.why}</Text>
      ) : null}
      <Text style={small}>{thread.lastRead}</Text>
      {thread.offers ? <Text style={small}>{TEXT.updatesLine(thread.offers)}</Text> : null}
      {thread.lastReadError ? (
        <Text
          selectable
          style={{
            fontFamily: nativeFontFamilies.mono,
            fontSize: 11,
            color: status.stuck.softFg,
          }}
        >
          {thread.lastReadError}
        </Text>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button
          size="sm"
          variant="secondary"
          disabled={thread.saving}
          onPress={() => setEditing(true)}
        >
          {TEXT.change}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={thread.saving}
          onPress={() => setConfirming(true)}
        >
          {TEXT.clear}
        </Button>
      </View>
      <ConfirmDialog
        isOpen={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={actions.onClear}
        title={TEXT.clearTitle}
        description={TEXT.clearBody}
        confirmLabel={TEXT.clearConfirm}
        cancelLabel={TEXT.cancel}
        destructive
      />
    </View>
  )
}

function ThreadLinkForm({
  initial,
  onWatch,
  onCancel,
}: {
  initial: string
  onWatch: (permalink: string, offerExistingReplies: boolean) => void
  onCancel?: () => void
}) {
  const [link, setLink] = useState(initial)
  const [existing, setExisting] = useState(false)
  const problem = slackThreadLinkProblem(link)
  return (
    <View style={{ gap: nativeSpace[2] }}>
      <Field
        label={TEXT.threadLink}
        hint={TEXT.threadLinkHint}
        error={link.trim() !== '' ? problem : undefined}
      >
        <Input
          value={link}
          onChangeText={setLink}
          placeholder={TEXT.threadPlaceholder}
          accessibilityLabel={TEXT.threadLink}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
      </Field>
      <Switch checked={existing} onCheckedChange={setExisting} label={TEXT.existingReplies} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button
          size="sm"
          variant="primary"
          disabled={problem !== undefined}
          onPress={() => onWatch(link, existing)}
        >
          {TEXT.watch}
        </Button>
        {onCancel ? (
          <Button size="sm" variant="secondary" onPress={onCancel}>
            {TEXT.cancel}
          </Button>
        ) : null}
      </View>
    </View>
  )
}

export type GroupSlackSettingsProps = {
  groupId: string
}

/** Native peer of web's `GroupSlackSettings`: the panel on the group's live data, in Settings → Group. */
export default function GroupSlackSettings({ groupId }: GroupSlackSettingsProps) {
  const slack = useGroupSlackSettings(groupId)
  const open = (going: Promise<string | undefined>) => {
    void going.then((page) => {
      if (page) void Linking.openURL(page)
    })
  }
  const { signIn } = slack
  return (
    <SlackReviewSettingsPanel
      state={slack}
      onClientIdChange={slack.setClientId}
      onSignIn={() => open(slack.startSignIn())}
      onSignInAgain={() => open(slack.signInAgain())}
      onOpenAgain={() => {
        if (signIn.step === 'waiting') void Linking.openURL(signIn.page)
      }}
      onBackOut={slack.backOut}
      onWatch={slack.watch}
      onClear={slack.clear}
    />
  )
}
