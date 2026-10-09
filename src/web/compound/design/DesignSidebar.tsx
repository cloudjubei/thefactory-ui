import { useState } from 'react'
import {
  DESIGN_APP_KIND_LABELS,
  DESIGN_TEXT,
  designDeleteSummary,
  type UseDesign,
} from '../../../headless'
import type { DesignAppKind, DesignAppTree } from '../../../headless/api'
import { Button } from '../../primitives/Button'
import { Input } from '../../primitives/Input'
import { NativeSelect } from '../../primitives/NativeSelect'
import { IconDelete, IconEdit, IconPlus } from '../../icons'
import { InlineConfirm, InlineRename, KindBadge } from './DesignInline'

export type DesignSidebarProps = {
  design: UseDesign
  selectedScreenId: string | undefined
  onSelectScreen: (screenId: string) => void
  /** Runs a change, showing its refusal; resolves `true` when it went through. */
  run: (change: () => Promise<unknown>) => Promise<boolean>
}

type Editing =
  | { kind: 'rename-app' | 'delete-app' | 'add-screen'; appId: string }
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

function AddApp({ design, run }: Pick<DesignSidebarProps, 'design' | 'run'>) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [kind, setKind] = useState<DesignAppKind>('product')
  if (!open) {
    return (
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
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
        if (await run(() => design.createApp(name.trim(), kind))) {
          setName('')
          setOpen(false)
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
  app,
  design,
  run,
  onDone,
  onAdded,
}: Pick<DesignSidebarProps, 'design' | 'run'> & {
  app: DesignAppTree
  onDone: () => void
  onAdded: (screenId: string) => void
}) {
  const [name, setName] = useState('')
  return (
    <form
      className="flex items-center gap-1 py-1 pl-4"
      onSubmit={async (e) => {
        e.preventDefault()
        if (!name.trim()) return
        let made: string | undefined
        const ok = await run(async () => {
          made = (await design.createScreen(app.id, name.trim())).id
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
        placeholder="Screen name, e.g. Login"
        aria-label={`New screen in ${app.name}`}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && onDone()}
        className="min-w-0 flex-1"
      />
      <Button type="submit" size="sm" variant="primary" disabled={!name.trim()}>
        Add
      </Button>
    </form>
  )
}

/** The Design tab's left side: each app with its kind and its screens, and what can be done to them. */
export default function DesignSidebar({
  design,
  selectedScreenId,
  onSelectScreen,
  run,
}: DesignSidebarProps) {
  const [editing, setEditing] = useState<Editing | undefined>(undefined)
  const done = () => setEditing(undefined)
  return (
    <nav className="flex flex-col gap-3" aria-label="Apps and screens">
      {design.tree.apps.map((app) => (
        <section key={app.id} className="flex flex-col gap-0.5">
          <div className="group flex min-w-0 items-center gap-1.5 px-1">
            {editing?.kind === 'rename-app' && editing.appId === app.id ? (
              <InlineRename
                value={app.name}
                ariaLabel={`Rename ${app.name}`}
                onCancel={done}
                onSave={async (name) => {
                  if (await run(() => design.updateApp(app.id, { name }))) done()
                }}
              />
            ) : (
              <>
                <span className="min-w-0 truncate text-[13px] font-semibold text-(--text-primary)">
                  {app.name}
                </span>
                <KindBadge label={DESIGN_APP_KIND_LABELS[app.kind]} />
                <RowActions
                  name={app.name}
                  onRename={() => setEditing({ kind: 'rename-app', appId: app.id })}
                  onDelete={() => setEditing({ kind: 'delete-app', appId: app.id })}
                />
              </>
            )}
          </div>
          {editing?.kind === 'delete-app' && editing.appId === app.id ? (
            <InlineConfirm
              message={designDeleteSummary({ kind: 'app', app })}
              onCancel={done}
              onConfirm={async () => {
                if (await run(() => design.deleteApp(app.id))) done()
              }}
            />
          ) : null}
          <ul className="flex flex-col">
            {app.screens.map((screen) => (
              <li key={screen.id} className="flex flex-col">
                {editing?.kind === 'rename-screen' && editing.screenId === screen.id ? (
                  <div className="py-0.5 pl-3">
                    <InlineRename
                      value={screen.name}
                      ariaLabel={`Rename ${screen.name}`}
                      onCancel={done}
                      onSave={async (name) => {
                        if (await run(() => design.renameScreen(screen.id, name))) done()
                      }}
                    />
                  </div>
                ) : (
                  <div
                    className={[
                      'group flex min-w-0 items-center gap-1 rounded-md py-1 pr-1 pl-3 text-[13px]',
                      screen.id === selectedScreenId
                        ? 'bg-(--surface-hover) text-(--text-primary)'
                        : 'text-(--text-secondary) hover:bg-(--surface-hover)',
                    ].join(' ')}
                  >
                    <button
                      type="button"
                      className="min-w-0 flex-1 truncate text-left"
                      aria-current={screen.id === selectedScreenId ? 'page' : undefined}
                      onClick={() => onSelectScreen(screen.id)}
                    >
                      {screen.name}
                      <span className="ml-1.5 text-[11px] text-(--text-muted)">
                        {screen.items.length}
                      </span>
                    </button>
                    <RowActions
                      name={screen.name}
                      onRename={() => setEditing({ kind: 'rename-screen', screenId: screen.id })}
                      onDelete={() => setEditing({ kind: 'delete-screen', screenId: screen.id })}
                    />
                  </div>
                )}
                {editing?.kind === 'delete-screen' && editing.screenId === screen.id ? (
                  <div className="pl-3">
                    <InlineConfirm
                      message={designDeleteSummary({ kind: 'screen', screen })}
                      onCancel={done}
                      onConfirm={async () => {
                        if (await run(() => design.deleteScreen(screen.id))) done()
                      }}
                    />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
          {editing?.kind === 'add-screen' && editing.appId === app.id ? (
            <AddScreen app={app} design={design} run={run} onDone={done} onAdded={onSelectScreen} />
          ) : (
            <button
              type="button"
              className="flex items-center gap-1 self-start rounded px-3 py-0.5 text-[12px] text-(--text-muted) hover:text-(--text-primary)"
              onClick={() => setEditing({ kind: 'add-screen', appId: app.id })}
            >
              <IconPlus className="h-3 w-3" />
              {DESIGN_TEXT.addScreen}
            </button>
          )}
        </section>
      ))}
      <AddApp design={design} run={run} />
    </nav>
  )
}
