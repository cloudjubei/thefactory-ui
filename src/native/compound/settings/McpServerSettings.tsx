import { useEffect, useState } from 'react'
import { AppState, Linking, Pressable, ScrollView, Text, View } from 'react-native'

import {
  MCP_SERVER_ACTIONS,
  MCP_SERVER_ASKS_TAG,
  MCP_SERVER_AUTH_HINTS,
  MCP_SERVER_AUTH_LABELS,
  MCP_SERVER_AUTH_ORDER,
  MCP_SERVER_EMPTY_DRAFT,
  MCP_SERVER_FIELD_LABELS,
  MCP_SERVER_NAME_HINT,
  MCP_SERVER_ONLY_READS_HINT,
  MCP_SERVER_ONLY_READS_LABEL,
  MCP_SERVER_REMOVE_CONFIRM,
  MCP_SERVER_SIGN_IN_PENDING,
  MCP_SERVER_TOKEN_HINT,
  MCP_SERVER_TOKEN_SAVED_HINT,
  MCP_SERVER_TOOLS_HEADING,
  MCP_SERVER_TOOLS_HINT,
  MCP_SERVER_URL_PLACEHOLDER,
  MCP_SERVERS_DEFAULT_LAYOUT,
  MCP_SERVERS_HEADING,
  MCP_SERVERS_LOADING,
  MCP_SERVERS_NONE_YET,
  mcpServerDraftProblem,
  mcpServerInputOf,
  useMcpServers,
  type McpServerAuthType,
  type McpServerDraft,
  type McpServerOwner,
  type McpServersLayout,
  type McpServerStatusTone,
  type McpServerView,
  type McpToolView,
} from '../../../headless'
import { nativeFontFamilies, nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconChevronDown, IconChevronRight } from '../../icons'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import Field from '../../primitives/Field'
import { Input } from '../../primitives/Input'
import { ConfirmDialog, Modal } from '../../primitives/Modal'
import { SecretInput } from '../../primitives/SecretInput'
import SegmentedControl from '../../primitives/SegmentedControl'
import { Switch } from '../../primitives/Switch'

export interface McpServerSettingsProps {
  /** The project or the group whose servers these are. */
  owner: McpServerOwner
  /** How the servers are laid out. */
  layout?: McpServersLayout
}

const STATUS_KEY = {
  done: 'done',
  onhold: 'on_hold',
  stuck: 'stuck',
  empty: 'empty',
} as const satisfies Record<McpServerStatusTone, string>

function StatusPill({ text, tone }: { text: string; tone: keyof typeof STATUS_KEY | 'review' }) {
  const { status } = useNativeTheme()
  const colors = status[tone === 'review' ? 'review' : STATUS_KEY[tone]]
  return (
    <Text
      style={{
        fontSize: 11,
        overflow: 'hidden',
        color: colors.softFg,
        backgroundColor: colors.softBg,
        borderWidth: 1,
        borderColor: colors.softBorder,
        borderRadius: nativeRadii.round,
        paddingHorizontal: 8,
        paddingVertical: 2,
      }}
    >
      {text}
    </Text>
  )
}

function TokenField({
  saved,
  busy,
  onSave,
}: {
  saved: boolean
  busy: boolean
  onSave: (token: string) => Promise<boolean>
}) {
  const [token, setToken] = useState('')
  const save = async () => {
    if (await onSave(token)) setToken('')
  }
  return (
    <View style={{ gap: nativeSpace[2] }}>
      <Field
        label={MCP_SERVER_FIELD_LABELS.token}
        hint={saved ? MCP_SERVER_TOKEN_SAVED_HINT : MCP_SERVER_TOKEN_HINT}
      >
        <SecretInput
          value={token}
          onChangeText={setToken}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </Field>
      <View style={{ alignItems: 'flex-start' }}>
        <Button
          variant="secondary"
          size="sm"
          onPress={() => void save()}
          disabled={busy || !token.trim()}
        >
          {MCP_SERVER_ACTIONS.saveToken}
        </Button>
      </View>
    </View>
  )
}

function ToolRow({ tool, first }: { tool: McpToolView; first: boolean }) {
  const { theme } = useNativeTheme()
  return (
    <View
      style={{
        gap: 2,
        paddingHorizontal: nativeSpace[3],
        paddingVertical: nativeSpace[2],
        ...(first ? {} : { borderTopWidth: 1, borderTopColor: theme.border.subtle }),
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: nativeSpace[2],
        }}
      >
        <Text
          style={{
            flexShrink: 1,
            fontSize: 12,
            fontFamily: nativeFontFamilies.mono,
            color: theme.text.primary,
          }}
        >
          {tool.name}
        </Text>
        {tool.asks ? <StatusPill text={MCP_SERVER_ASKS_TAG} tone="review" /> : null}
      </View>
      {tool.description ? (
        <Text style={{ fontSize: 12, color: theme.text.secondary }}>{tool.description}</Text>
      ) : null}
    </View>
  )
}

type DetailsActions = {
  busy: boolean
  onSignIn: (serverId: string) => void
  onSetToken: (serverId: string, token: string) => Promise<boolean>
  onTest: (serverId: string) => void
  onSetOnlyReads: (serverId: string, onlyReads: boolean) => void
  onRemove: (serverId: string) => void
}

/** Everything about one server. Its tool names and descriptions are an outside server's: text only. */
function ServerDetails({
  view,
  showUrl = false,
  busy,
  onSignIn,
  onSetToken,
  onTest,
  onSetOnlyReads,
  onRemove,
}: { view: McpServerView; showUrl?: boolean } & DetailsActions) {
  const { theme } = useNativeTheme()
  const muted = { fontSize: 12, color: theme.text.secondary }
  const access = view.access
  const pendingUrl = access?.kind === 'sign-in' ? access.pendingUrl : undefined
  return (
    <View style={{ gap: nativeSpace[3] }}>
      {showUrl ? (
        <Text selectable style={{ ...muted, fontFamily: nativeFontFamilies.mono }}>
          {view.url}
        </Text>
      ) : null}
      {view.reason ? <Text style={muted}>{view.reason}</Text> : null}
      {view.note ? (
        <Text style={{ fontSize: 13, color: theme.text.secondary }}>{view.note}</Text>
      ) : null}

      {access?.kind === 'sign-in' ? (
        <View style={{ alignItems: 'flex-start', gap: nativeSpace[1] }}>
          <Button
            variant={access.label === MCP_SERVER_ACTIONS.signIn ? 'primary' : 'secondary'}
            size="sm"
            onPress={() => onSignIn(view.id)}
            disabled={busy}
          >
            {access.label}
          </Button>
          {pendingUrl ? (
            <Text style={muted}>
              {MCP_SERVER_SIGN_IN_PENDING}{' '}
              <Text
                accessibilityRole="link"
                style={{ color: theme.accent.primary }}
                onPress={() => void Linking.openURL(pendingUrl)}
              >
                {MCP_SERVER_ACTIONS.openPage}
              </Text>
            </Text>
          ) : null}
        </View>
      ) : null}
      {access?.kind === 'token' ? (
        <TokenField
          saved={access.saved}
          busy={busy}
          onSave={(token) => onSetToken(view.id, token)}
        />
      ) : null}

      <View style={{ gap: nativeSpace[1] }}>
        <Switch
          checked={view.onlyReads}
          onCheckedChange={(on) => onSetOnlyReads(view.id, on)}
          label={MCP_SERVER_ONLY_READS_LABEL}
          disabled={busy || view.readOnly}
        />
        <Text style={muted}>{MCP_SERVER_ONLY_READS_HINT}</Text>
      </View>

      {view.toolsSummary || view.tools.length > 0 ? (
        <View style={{ gap: nativeSpace[1] }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: nativeSpace[2],
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '500', color: theme.text.primary }}>
              {MCP_SERVER_TOOLS_HEADING}
            </Text>
            {view.toolsSummary ? <Text style={muted}>{view.toolsSummary}</Text> : null}
          </View>
          {view.tools.length > 0 ? (
            <>
              <ScrollView
                nestedScrollEnabled
                style={{
                  maxHeight: 256,
                  borderWidth: 1,
                  borderColor: theme.border.subtle,
                  borderRadius: nativeRadii[2],
                }}
              >
                {view.tools.map((tool, i) => (
                  <ToolRow key={tool.name} tool={tool} first={i === 0} />
                ))}
              </ScrollView>
              <Text style={muted}>{MCP_SERVER_TOOLS_HINT}</Text>
            </>
          ) : null}
          {view.omittedNote ? <Text style={muted}>{view.omittedNote}</Text> : null}
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
        <Button variant="outline" size="sm" onPress={() => onTest(view.id)} loading={view.testing}>
          {MCP_SERVER_ACTIONS.test}
        </Button>
        <View style={{ flex: 1 }} />
        {view.readOnly ? null : (
          <Button variant="danger" size="sm" onPress={() => onRemove(view.id)} disabled={busy}>
            {MCP_SERVER_ACTIONS.remove}
          </Button>
        )}
      </View>
      {view.testSummary ? <Text style={muted}>{view.testSummary}</Text> : null}
    </View>
  )
}

function ServerSummary({ view, address }: { view: McpServerView; address: string }) {
  const { theme } = useNativeTheme()
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <Text
          numberOfLines={1}
          style={{ flexShrink: 1, fontSize: 13, fontWeight: '500', color: theme.text.primary }}
        >
          {view.name}
        </Text>
        {view.sourceLabel ? (
          <Text
            style={{
              fontSize: 10,
              color: theme.text.secondary,
              borderWidth: 1,
              borderColor: theme.border.default,
              borderRadius: nativeRadii.round,
              paddingHorizontal: 6,
            }}
          >
            {view.sourceLabel}
          </Text>
        ) : null}
      </View>
      <Text numberOfLines={1} style={{ fontSize: 12, color: theme.text.secondary }}>
        {view.toolsSummary ? `${address} · ${view.toolsSummary}` : address}
      </Text>
    </View>
  )
}

/**
 * Native peer of [web's `McpServerSettings`](../../../web/compound/settings/McpServerSettings.tsx):
 * add a server by its URL, sign in or set its token, see how it stands and the
 * tools it offers, test it, remove it. A sign-in opens the system browser and the
 * backend reports it over the socket; there is no word of one that failed, so
 * coming back to the app reads the servers again.
 */
export default function McpServerSettings({
  owner,
  layout = MCP_SERVERS_DEFAULT_LAYOUT,
}: McpServerSettingsProps) {
  const { theme } = useNativeTheme()
  const servers = useMcpServers(owner)
  const { views, ownRows, error, busy, refresh } = servers
  const [draft, setDraft] = useState<McpServerDraft | undefined>(undefined)
  const [openId, setOpenId] = useState<string | undefined>(undefined)
  const [removingId, setRemovingId] = useState<string | undefined>(undefined)
  const problem = draft ? mcpServerDraftProblem(draft, ownRows) : undefined
  const opened = views?.find((view) => view.id === openId)
  const removing = views?.find((view) => view.id === removingId)

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh()
    })
    return () => subscription.remove()
  }, [refresh])

  const signIn = async (serverId: string) => {
    const page = await servers.signIn(serverId)
    if (page) await Linking.openURL(page)
  }
  const saveDraft = async () => {
    if (!draft || problem) return
    const added = await servers.add(mcpServerInputOf(draft))
    if (!added) return
    setDraft(undefined)
    setOpenId(added.id)
  }

  const actions: DetailsActions = {
    busy,
    onSignIn: (serverId) => void signIn(serverId),
    onSetToken: servers.setToken,
    onTest: (serverId) => void servers.test(serverId),
    onSetOnlyReads: (serverId, onlyReads) => void servers.setOnlyReads(serverId, onlyReads),
    onRemove: setRemovingId,
  }

  const muted = { fontSize: 13, color: theme.text.secondary }
  const line = { borderTopWidth: 1, borderTopColor: theme.border.subtle }
  const box = {
    borderWidth: 1,
    borderColor: theme.border.subtle,
    borderRadius: nativeRadii[2],
  }

  return (
    <View style={{ gap: nativeSpace[3] }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: nativeSpace[3] }}>
        <View style={{ flex: 1, gap: nativeSpace[1] }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text.primary }}>
            {MCP_SERVERS_HEADING}
          </Text>
          <Text style={muted}>{servers.intro}</Text>
        </View>
        <Button variant="secondary" size="sm" onPress={() => setDraft(MCP_SERVER_EMPTY_DRAFT)}>
          {MCP_SERVER_ACTIONS.add}
        </Button>
      </View>

      {error && !draft && !(layout === 'rows' && opened) ? <Alert>{error}</Alert> : null}

      {!views ? (
        <Text style={muted}>{MCP_SERVERS_LOADING}</Text>
      ) : views.length === 0 ? (
        <Text style={muted}>{MCP_SERVERS_NONE_YET}</Text>
      ) : layout === 'cards' ? (
        <View style={{ gap: nativeSpace[2] }}>
          {views.map((view) => (
            <View
              key={view.id}
              style={{
                ...box,
                gap: nativeSpace[3],
                padding: nativeSpace[3],
                backgroundColor: theme.surface.raised,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
                <ServerSummary view={view} address={view.url} />
                <StatusPill text={view.statusLabel} tone={view.statusTone} />
              </View>
              <ServerDetails view={view} {...actions} />
            </View>
          ))}
        </View>
      ) : (
        <View style={box}>
          {views.map((view, i) => {
            const unfolded = layout === 'folds' && view.id === openId
            return (
              <View key={view.id} style={i > 0 ? line : undefined}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setOpenId(unfolded ? undefined : view.id)}
                  style={{
                    minHeight: 44,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: nativeSpace[2],
                    paddingHorizontal: nativeSpace[3],
                    paddingVertical: nativeSpace[2],
                  }}
                >
                  <ServerSummary view={view} address={unfolded ? view.url : view.host} />
                  <StatusPill text={view.statusLabel} tone={view.statusTone} />
                  {layout === 'folds' ? (
                    <IconChevronDown size={16} color={theme.text.muted} />
                  ) : (
                    <IconChevronRight size={16} color={theme.text.muted} />
                  )}
                </Pressable>
                {unfolded ? (
                  <View style={{ ...line, padding: nativeSpace[3] }}>
                    <ServerDetails view={view} {...actions} />
                  </View>
                ) : null}
              </View>
            )
          })}
        </View>
      )}

      {layout === 'rows' && opened ? (
        <Modal
          isOpen
          onClose={() => setOpenId(undefined)}
          title={opened.name}
          headerActions={<StatusPill text={opened.statusLabel} tone={opened.statusTone} />}
          size="lg"
        >
          <ScrollView
            style={{ flexShrink: 1 }}
            contentContainerStyle={{ gap: nativeSpace[3] }}
            keyboardShouldPersistTaps="handled"
          >
            {error ? <Alert>{error}</Alert> : null}
            <ServerDetails view={opened} showUrl {...actions} />
          </ScrollView>
        </Modal>
      ) : null}

      {draft ? (
        <Modal
          isOpen
          onClose={() => setDraft(undefined)}
          title={MCP_SERVER_ACTIONS.add}
          footer={
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'flex-end',
                gap: nativeSpace[2],
              }}
            >
              <Button variant="ghost" onPress={() => setDraft(undefined)}>
                {MCP_SERVER_ACTIONS.cancel}
              </Button>
              <Button
                onPress={() => void saveDraft()}
                loading={busy}
                disabled={problem !== undefined || busy}
              >
                {MCP_SERVER_ACTIONS.add}
              </Button>
            </View>
          }
        >
          <View style={{ gap: nativeSpace[3] }}>
            {error ? <Alert>{error}</Alert> : null}
            <Field label={MCP_SERVER_FIELD_LABELS.name} hint={MCP_SERVER_NAME_HINT}>
              <Input
                value={draft.name}
                onChangeText={(name) => setDraft({ ...draft, name })}
                placeholder="Zenor"
              />
            </Field>
            <Field
              label={MCP_SERVER_FIELD_LABELS.url}
              error={draft.url.trim() ? problem : undefined}
            >
              <Input
                value={draft.url}
                onChangeText={(url) => setDraft({ ...draft, url })}
                placeholder={MCP_SERVER_URL_PLACEHOLDER}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
            </Field>
            <Field
              label={MCP_SERVER_FIELD_LABELS.authType}
              hint={MCP_SERVER_AUTH_HINTS[draft.authType]}
            >
              <SegmentedControl
                ariaLabel={MCP_SERVER_FIELD_LABELS.authType}
                value={draft.authType}
                onChange={(authType) =>
                  setDraft({ ...draft, authType: authType as McpServerAuthType })
                }
                options={MCP_SERVER_AUTH_ORDER.map((authType) => ({
                  value: authType,
                  label: MCP_SERVER_AUTH_LABELS[authType],
                }))}
              />
            </Field>
          </View>
        </Modal>
      ) : null}

      {removing ? (
        <ConfirmDialog
          isOpen
          onClose={() => setRemovingId(undefined)}
          title={`${MCP_SERVER_ACTIONS.remove} ${removing.name}`}
          description={MCP_SERVER_REMOVE_CONFIRM(removing.name)}
          confirmLabel={MCP_SERVER_ACTIONS.remove}
          destructive
          onConfirm={async () => {
            if (await servers.remove(removing.id)) setOpenId(undefined)
            setRemovingId(undefined)
          }}
        />
      ) : null}
    </View>
  )
}
