import { useState } from 'react'
import {
  DESIGN_APP_KIND_LABELS,
  DESIGN_TEXT,
  designAppNav,
  designDeleteSummary,
  type DesignActions,
  type DesignNavScreen,
} from '../../../headless'
import type { DesignAppKind, DesignIndex, DesignScreenKind } from '../../../headless/api'
import { Button } from '../../primitives/Button'
import { Input } from '../../primitives/Input'
import { NativeSelect } from '../../primitives/NativeSelect'
import { IconDelete, IconEdit, IconPlus } from '../../icons'
import { InlineConfirm, InlineRename, KindBadge } from './DesignInline'

export type DesignSidebarProps = {
  index: DesignIndex
  appId: string | undefined
  selectedScreenId: string | undefined
  onSelectApp: (appId: string) => void
  onSelectScreen: (screenId: string) => void
  actions: Pick<
    DesignActions,
    'createApp' | 'updateApp' | 'deleteApp' | 'createScreen' | 'updateScreen' | 'deleteScreen'
  >
  /** Runs a change, showing its refusal; resolves `true` when it went through. */
  run: (change: () => Promise<unknown>) => Promise<boolean>
}

type Editing =
  | { kind: 'rename-app' | 'delete-app'; appId: string }
  | { kind: 'add'; screenKind: DesignScreenKind }
  | { kind: 'rename-screen' | 'delete-screen'; screenId: string }

function RowActions({
  onRename,
  onDelete,
  name,
}: {
  onRename: () => void
  onDelete: () => void
  name: string
}) {
  return (
    <span className="ml-auto flex shrink-0 gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100">
      <button
        type="button"
        className="rounded p-1 hover:bg-(--surface-hover)"
        aria-label={`${DESIGN_TEXT.rename} ${name}`}
        title={DESIGN_TEXT.rename}
        onClick={onRename}
      >
        <IconEdit className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        className="rounded p-1 hover:bg-(--surface-hover)"
        aria-label={`${DESIGN_TEXT.delete} ${name}`}
        title={DESIGN_TEXT.delete}
        onClick={onDelete}
      >
        <IconDelete className="h-3.5 w-3.5" />
      </button>
    </span>
  )
}

/** Add an app: its name and what it is to the project. */
export function NewAppFields({
  name,
  kind,
  onName,
  onKind,
  autoFocus,
}: {
  name: string
  kind: DesignAppKind
  onName: (v: string) => void
  onKind: (v: DesignAppKind) => void
  autoFocus?: boolean
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Input
        size="sm"
        placeholder="App name, e.g. Android"
        aria-label="App name"
        value={name}
        autoFocus={autoFocus}
        onChange={(e) => onName(e.target.value)}
        className="min-w-0 flex-1"
      />
      <NativeSelect
        size="sm"
        aria-label="App kind"
        value={kind}
        onChange={(e) => onKind(e.target.value as DesignAppKind)}
      >
        {(Object.keys(DESIGN_APP_KIND_LABELS) as DesignAppKind[]).map((k) => (
          <option key={k} value={k}>
            {DESIGN_APP_KIND_LABELS[k]}
          </option>
        ))}
      </NativeSelect>
    </div>
  )
}

function AddApp({
  actions,
  run,
  onAdded,
}: Pick<DesignSidebarProps, 'actions' | 'run'> & { onAdded: (appId: string) => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [kind, setKind] = useState<DesignAppKind>('product')
  if (!open) {
    return (
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)} className="self-start">
        <IconPlus className="h-3.5 w-3.5" />
        {DESIGN_TEXT.addApp}
      </Button>
    )
  }
  return (
    <form
      className="flex flex-col gap-2 rounded-md border border-(--border-subtle) p-2"
      onSubmit={async (e) => {
        e.preventDefault()
        if (!name.trim()) return
        let made: string | undefined
        if (await run(async () => (made = (await actions.createApp(name.trim(), kind)).id))) {
          setName('')
          setOpen(false)
          if (made) onAdded(made)
        }
      }}
    >
      <NewAppFields name={name} kind={kind} onName={setName} onKind={setKind} autoFocus />
      <div className="flex gap-2">
        <Button type="submit" size="sm" variant="primary" disabled={!name.trim()}>
          {DESIGN_TEXT.addApp}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

function AddScreen({
  appId,
  screenKind,
  actions,
  run,
  onDone,
  onAdded,
}: Pick<DesignSidebarProps, 'actions' | 'run'> & {
  appId: string
  screenKind: DesignScreenKind
  onDone: () => void
  onAdded: (screenId: string) => void
}) {
  const [name, setName] = useState('')
  const [group, setGroup] = useState('')
  const component = screenKind === 'component'
  return (
    <form
      className="flex flex-col gap-1 py-1 pl-3"
      onSubmit={async (e) => {
        e.preventDefault()
        if (!name.trim()) return
        let made: string | undefined
        const ok = await run(async () => {
          made = (
            await actions.createScreen({
              appId,
              name: name.trim(),
              kind: screenKind,
              ...(component && group.trim() ? { group: group.trim() } : {}),
            })
          ).id
        })
        if (ok && made) {
          onAdded(made)
          onDone()
        }
      }}
    >
      <Input
        size="sm"
        autoFocus
        placeholder={component ? 'Component name, e.g. Status pill' : 'Screen name, e.g. Login'}
        aria-label={component ? 'New component' : 'New screen'}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && onDone()}
      />
      {component ? (
        <Input
          size="sm"
          placeholder="Group, e.g. Chips and tones"
          aria-label="Component group"
          value={group}
          onChange={(e) => setGroup(e.target.value)}
        />
      ) : null}
      <div className="flex gap-1">
        <Button type="submit" size="sm" variant="primary" disabled={!name.trim()}>
          Add
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

/**
 * The Design tab's left side: the app shown — switch, rename, delete — its
 * screens with how many of their cells wait on a decision, and its components
 * by group.
 */
export default function DesignSidebar({
  index,
  appId,
  selectedScreenId,
  onSelectApp,
  onSelectScreen,
  actions,
  run,
}: DesignSidebarProps) {
  const [editing, setEditing] = useState<Editing | undefined>(undefined)
  const done = () => setEditing(undefined)
  const nav = appId ? designAppNav(index, appId) : undefined

  const screenRow = (s: DesignNavScreen) => {
    const screen = index.screens.find((x) => x.id === s.id)!
    if (editing?.kind === 'rename-screen' && editing.screenId === s.id) {
      return (
        <div key={s.id} className="py-0.5 pl-3">
          <InlineRename
            value={s.name}
            ariaLabel={`Rename ${s.name}`}
            onCancel={done}
            onSave={async (name) => {
              if (await run(() => actions.updateScreen(s.id, { name }))) done()
            }}
          />
        </div>
      )
    }
    return (
      <li key={s.id} className="flex flex-col">
        <div
          className={[
            'group flex min-w-0 items-center gap-1 rounded-md py-1 pr-1 pl-3 text-[13px]',
            s.id === selectedScreenId
              ? 'bg-(--surface-hover) text-(--text-primary)'
              : 'text-(--text-secondary) hover:bg-(--surface-hover)',
          ].join(' ')}
        >
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
            aria-current={s.id === selectedScreenId ? 'page' : undefined}
            onClick={() => onSelectScreen(s.id)}
          >
            <span className="truncate">{s.name}</span>
            {s.waiting > 0 ? (
              <span
                className="rounded-full px-1.5 text-[10.5px] font-semibold"
                style={{
                  background: 'var(--status-review-soft-bg)',
                  color: 'var(--status-review-soft-fg)',
                }}
                title={`${s.waiting} waiting for you`}
              >
                {s.waiting}
              </span>
            ) : null}
          </button>
          <RowActions
            name={s.name}
            onRename={() => setEditing({ kind: 'rename-screen', screenId: s.id })}
            onDelete={() => setEditing({ kind: 'delete-screen', screenId: s.id })}
          />
        </div>
        {editing?.kind === 'delete-screen' && editing.screenId === s.id ? (
          <div className="pl-3">
            <InlineConfirm
              message={designDeleteSummary(index, { kind: 'screen', screen })}
              onCancel={done}
              onConfirm={async () => {
                if (await run(() => actions.deleteScreen(s.id))) done()
              }}
            />
          </div>
        ) : null}
      </li>
    )
  }

  const addButton = (screenKind: DesignScreenKind) =>
    nav && editing?.kind === 'add' && editing.screenKind === screenKind ? (
      <AddScreen
        appId={nav.app.id}
        screenKind={screenKind}
        actions={actions}
        run={run}
        onDone={done}
        onAdded={onSelectScreen}
      />
    ) : (
      <button
        type="button"
        className="flex items-center gap-1 self-start rounded px-3 py-0.5 text-[12px] text-(--text-muted) hover:text-(--text-primary)"
        onClick={() => setEditing({ kind: 'add', screenKind })}
      >
        <IconPlus className="h-3 w-3" />
        {screenKind === 'component' ? DESIGN_TEXT.addComponent : DESIGN_TEXT.addScreen}
      </button>
    )

  return (
    <nav className="flex flex-col gap-4" aria-label="Apps, screens and components">
      {index.apps.length > 1 ? (
        <NativeSelect
          size="sm"
          aria-label="App"
          value={appId ?? ''}
          onChange={(e) => onSelectApp(e.target.value)}
        >
          {index.apps.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </NativeSelect>
      ) : null}
      {nav ? (
        <>
          <div className="group flex min-w-0 items-center gap-1.5 px-1">
            {editing?.kind === 'rename-app' ? (
              <InlineRename
                value={nav.app.name}
                ariaLabel={`Rename ${nav.app.name}`}
                onCancel={done}
                onSave={async (name) => {
                  if (await run(() => actions.updateApp(nav.app.id, { name }))) done()
                }}
              />
            ) : (
              <>
                <span className="min-w-0 truncate text-[14px] font-semibold text-(--text-primary)">
                  {nav.app.name}
                </span>
                <KindBadge label={DESIGN_APP_KIND_LABELS[nav.app.kind]} />
                <RowActions
                  name={nav.app.name}
                  onRename={() => setEditing({ kind: 'rename-app', appId: nav.app.id })}
                  onDelete={() => setEditing({ kind: 'delete-app', appId: nav.app.id })}
                />
              </>
            )}
          </div>
          {editing?.kind === 'delete-app' ? (
            <InlineConfirm
              message={designDeleteSummary(index, { kind: 'app', app: nav.app })}
              onCancel={done}
              onConfirm={async () => {
                if (await run(() => actions.deleteApp(nav.app.id))) done()
              }}
            />
          ) : null}
          <section className="flex flex-col gap-0.5">
            <h4 className="px-1 text-[11px] font-semibold tracking-wide text-(--text-muted) uppercase">
              {DESIGN_TEXT.screens}
            </h4>
            <ul className="flex flex-col">{nav.screens.map(screenRow)}</ul>
            {addButton('screen')}
          </section>
          <section className="flex flex-col gap-0.5">
            <h4 className="px-1 text-[11px] font-semibold tracking-wide text-(--text-muted) uppercase">
              {DESIGN_TEXT.components}
            </h4>
            {nav.componentGroups.map((g) => (
              <div key={g.group} className="flex flex-col">
                <span className="px-3 pt-1 text-[11.5px] text-(--text-muted)">{g.group}</span>
                <ul className="flex flex-col">{g.components.map(screenRow)}</ul>
              </div>
            ))}
            {addButton('component')}
          </section>
        </>
      ) : null}
      <AddApp actions={actions} run={run} onAdded={onSelectApp} />
    </nav>
  )
}
