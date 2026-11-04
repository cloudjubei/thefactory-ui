import { useState } from 'react'
import {
  MCP_SERVER_ACTIONS,
  MCP_SERVER_AUTH_HINTS,
  MCP_SERVER_AUTH_LABELS,
  MCP_SERVER_AUTH_ORDER,
  MCP_SERVER_EMPTY_DRAFT,
  MCP_SERVER_FIELD_LABELS,
  MCP_SERVER_NAME_HINT,
  MCP_SERVER_REMOVE_CONFIRM,
  MCP_SERVER_URL_PLACEHOLDER,
  MCP_SERVERS_DEFAULT_LAYOUT,
  MCP_SERVERS_HEADING,
  MCP_SERVERS_LOADING,
  MCP_SERVERS_NONE_YET,
  mcpServerDraftProblem,
  mcpServerInputOf,
  type McpServerAuthType,
  type McpServerDraft,
  type McpServerInput,
  type McpServerRow,
  type McpServersLayout,
  type McpServerView,
} from '../../../headless'
import { IconChevronDown } from '../../icons/IconChevronDown'
import { IconChevronRight } from '../../icons/IconChevronRight'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import Field from '../../primitives/Field'
import { Input } from '../../primitives/Input'
import { ConfirmDialog, Modal } from '../../primitives/Modal'
import SegmentedControl from '../../primitives/SegmentedControl'
import Surface from '../../primitives/Surface'
import McpServerDetails, { McpServerStatusChip, type McpServerActions } from './McpServerDetails'

export interface McpServerSettingsPanelProps {
  /** What to show of each server; nothing is listed until they are read. */
  views: McpServerView[] | undefined
  /** The servers kept here, which a new one must not repeat. */
  ownRows: readonly McpServerRow[]
  /** Who gets the tools. */
  intro: string
  /** Why the last read or change failed. */
  error: string | null
  busy: boolean
  /** Add a server; resolves its row when it was kept. */
  onAdd: (input: McpServerInput) => Promise<McpServerRow | undefined>
  /** Remove a server; resolves `true` when it is gone. */
  onRemove: (serverId: string) => Promise<boolean>
  onSetToken: (serverId: string, token: string) => Promise<boolean>
  onSignIn: (serverId: string) => void | Promise<void>
  onOpenPage: (url: string) => void
  onTest: (serverId: string) => void | Promise<void>
  /** How the servers are laid out. */
  layout?: McpServersLayout
  /** A server to show opened first. */
  initialOpenId?: string
  /** Start on the add form, with this in it. */
  initialDraft?: McpServerDraft
  /** Start on the confirm to remove this server. */
  initialRemovingId?: string
}

function ServerSummary({ view, address }: { view: McpServerView; address: string }) {
  return (
    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
      <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
        <span className="max-w-full min-w-0 truncate text-sm font-medium">{view.name}</span>
        {view.sourceLabel ? (
          <span className="shrink-0 rounded-full border border-(--border-default) px-1.5 text-[10px] text-(--text-secondary)">
            {view.sourceLabel}
          </span>
        ) : null}
      </span>
      <span className="truncate text-[12px] text-(--text-secondary)">
        {view.toolsSummary ? `${address} · ${view.toolsSummary}` : address}
      </span>
    </span>
  )
}

function AddServerForm({
  draft,
  problem,
  error,
  onChange,
}: {
  draft: McpServerDraft
  problem: string | undefined
  error: string | null
  onChange: (next: McpServerDraft) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      {error ? <Alert>{error}</Alert> : null}
      <Field label={MCP_SERVER_FIELD_LABELS.name} hint={MCP_SERVER_NAME_HINT}>
        <Input
          value={draft.name}
          onChange={(e) => onChange({ ...draft, name: e.target.value })}
          placeholder="Zenor"
        />
      </Field>
      <Field label={MCP_SERVER_FIELD_LABELS.url} error={draft.url.trim() ? problem : undefined}>
        <Input
          value={draft.url}
          onChange={(e) => onChange({ ...draft, url: e.target.value })}
          placeholder={MCP_SERVER_URL_PLACEHOLDER}
          spellCheck={false}
        />
      </Field>
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">{MCP_SERVER_FIELD_LABELS.authType}</span>
        <SegmentedControl
          ariaLabel={MCP_SERVER_FIELD_LABELS.authType}
          value={draft.authType}
          onChange={(authType) => onChange({ ...draft, authType: authType as McpServerAuthType })}
          options={MCP_SERVER_AUTH_ORDER.map((authType) => ({
            value: authType,
            label: MCP_SERVER_AUTH_LABELS[authType],
          }))}
        />
        <span className="text-xs opacity-60">{MCP_SERVER_AUTH_HINTS[draft.authType]}</span>
      </div>
    </div>
  )
}

/**
 * A project's or a group's MCP servers: add one by its URL, sign in or set its
 * token, see how it stands and the tools it offers, test it, remove it. A project
 * also lists what it gets from its group, read-only. `McpServerSettings` reads and
 * changes them. Native peer: `native/compound/settings/McpServerSettings`.
 */
export default function McpServerSettingsPanel({
  views,
  ownRows,
  intro,
  error,
  busy,
  onAdd,
  onRemove,
  onSetToken,
  onSignIn,
  onOpenPage,
  onTest,
  layout = MCP_SERVERS_DEFAULT_LAYOUT,
  initialOpenId,
  initialDraft,
  initialRemovingId,
}: McpServerSettingsPanelProps) {
  const [draft, setDraft] = useState<McpServerDraft | undefined>(initialDraft)
  const [openId, setOpenId] = useState<string | undefined>(initialOpenId)
  const [removingId, setRemovingId] = useState<string | undefined>(initialRemovingId)
  const problem = draft ? mcpServerDraftProblem(draft, ownRows) : undefined
  const opened = views?.find((view) => view.id === openId)
  const removing = views?.find((view) => view.id === removingId)

  const actions: McpServerActions = {
    busy,
    onSignIn,
    onOpenPage,
    onSetToken,
    onTest,
    onRemove: setRemovingId,
  }

  const saveDraft = async () => {
    if (!draft || problem) return
    const added = await onAdd(mcpServerInputOf(draft))
    if (!added) return
    setDraft(undefined)
    setOpenId(added.id)
  }

  return (
    <section className="flex max-w-2xl flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="text-base font-semibold">{MCP_SERVERS_HEADING}</h3>
          <p className="text-sm text-(--text-secondary)">{intro}</p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="shrink-0"
          onClick={() => setDraft(MCP_SERVER_EMPTY_DRAFT)}
        >
          {MCP_SERVER_ACTIONS.add}
        </Button>
      </div>

      {error && !draft && !(layout === 'rows' && opened) ? <Alert>{error}</Alert> : null}

      {!views ? (
        <p className="text-sm text-(--text-secondary)">{MCP_SERVERS_LOADING}</p>
      ) : views.length === 0 ? (
        <p className="text-sm text-(--text-secondary)">{MCP_SERVERS_NONE_YET}</p>
      ) : layout === 'cards' ? (
        <div className="flex flex-col gap-2">
          {views.map((view) => (
            <Surface key={view.id} className="flex flex-col gap-3 p-3">
              <div className="flex items-start gap-2">
                <ServerSummary view={view} address={view.url} />
                <McpServerStatusChip view={view} />
              </div>
              <McpServerDetails view={view} {...actions} />
            </Surface>
          ))}
        </div>
      ) : (
        <ul className="divide-y divide-(--border-subtle) rounded-md border border-(--border-subtle)">
          {views.map((view) => {
            const unfolded = layout === 'folds' && view.id === openId
            return (
              <li key={view.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(unfolded ? undefined : view.id)}
                  {...(layout === 'folds' ? { 'aria-expanded': unfolded } : {})}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-(--surface-raised)"
                >
                  <ServerSummary view={view} address={unfolded ? view.url : view.host} />
                  <McpServerStatusChip view={view} />
                  {layout === 'folds' ? (
                    <IconChevronDown
                      className={`h-4 w-4 shrink-0 text-(--text-muted) ${unfolded ? 'rotate-180' : ''}`}
                    />
                  ) : (
                    <IconChevronRight className="h-4 w-4 shrink-0 text-(--text-muted)" />
                  )}
                </button>
                {unfolded ? (
                  <div className="border-t border-(--border-subtle) p-3">
                    <McpServerDetails view={view} {...actions} />
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}

      {layout === 'rows' && opened ? (
        <Modal
          isOpen
          onClose={() => setOpenId(undefined)}
          title={opened.name}
          headerActions={<McpServerStatusChip view={opened} />}
          size="lg"
        >
          <div className="flex flex-col gap-3">
            {error ? <Alert>{error}</Alert> : null}
            <McpServerDetails view={opened} showUrl {...actions} />
          </div>
        </Modal>
      ) : null}

      {draft ? (
        <Modal
          isOpen
          onClose={() => setDraft(undefined)}
          title={MCP_SERVER_ACTIONS.add}
          footer={
            <div className="flex w-full items-center justify-end gap-2">
              <Button variant="ghost" onClick={() => setDraft(undefined)}>
                {MCP_SERVER_ACTIONS.cancel}
              </Button>
              <Button
                onClick={() => void saveDraft()}
                loading={busy}
                disabled={problem !== undefined || busy}
              >
                {MCP_SERVER_ACTIONS.add}
              </Button>
            </div>
          }
        >
          <AddServerForm draft={draft} problem={problem} error={error} onChange={setDraft} />
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
            if (await onRemove(removing.id)) setOpenId(undefined)
            setRemovingId(undefined)
          }}
        />
      ) : null}
    </section>
  )
}
