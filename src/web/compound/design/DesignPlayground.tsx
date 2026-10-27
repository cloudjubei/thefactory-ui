import { useEffect, useMemo, useRef, useState } from 'react'
import { DESIGN_PLAYGROUND_SHOW_MESSAGE } from 'thefactory-tools/constants'
import {
  designPlaygroundAddress,
  designPlaygroundValues,
  parseDesignPlaygroundAddress,
  parseDesignPlaygroundManifest,
} from 'thefactory-tools/utils'
import {
  DESIGN_TEXT,
  designPlaygroundFrameNext,
  designPlaygroundPresetName,
  designPlaygroundSaveLabel,
  designPlaygroundSavedAt,
  designPlaygroundSaveTargets,
  designPlaygroundSceneGroups,
  designPlaygroundView,
  extractErrorMessage,
  useDurationTimer,
  type DesignPlaygroundBar,
  type DesignPlaygroundDevice,
  type DesignPlaygroundFrame,
  type DesignPlaygroundStatus,
} from '../../../headless'
import type {
  DesignEntryTarget,
  DesignIndex,
  DesignPlaygroundControl,
  DesignPlaygroundScene,
  DesignPlaygroundTheme,
  DesignProposal,
} from '../../../headless/api'
import { IconCheck, IconWarningTriangle } from '../../icons'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import Field from '../../primitives/Field'
import { Input } from '../../primitives/Input'
import { Modal } from '../../primitives/Modal'
import { NativeSelect } from '../../primitives/NativeSelect'
import SegmentedControl from '../../primitives/SegmentedControl'
import Spinner from '../../primitives/Spinner'
import { Switch } from '../../primitives/Switch'
import { cn } from '../../utils/cn'

/** Where the Playground is: a scene's address, the theme and the device it is shown in. */
export type DesignPlaygroundAt = {
  address?: string
  theme: DesignPlaygroundTheme
  device: DesignPlaygroundDevice
}

/** A save that went through: the proposal it made and where it is filed. */
export type DesignPlaygroundSaved = { proposalId: string; where: string }

export type DesignPlaygroundProps = {
  index: DesignIndex
  appId: string
  status: DesignPlaygroundStatus | undefined
  /** The frame's first page — `address` in `theme`; `undefined` until it can be framed. */
  frameSrc: (address: string | undefined, theme: DesignPlaygroundTheme) => string | undefined
  /** The scenes, when known without the frame listing them. */
  scenes?: DesignPlaygroundScene[]
  /** Where it opens. */
  initial?: Partial<DesignPlaygroundAt>
  /** Told every move, to keep the page's address. */
  onChange?: (at: DesignPlaygroundAt) => void
  onRetry: () => void
  /** Save the address as a state; resolves the proposal, or rejects with why it was refused. */
  onSave: (input: { target: DesignEntryTarget; address: string }) => Promise<DesignProposal>
  onOpenProposal: (proposalId: string) => void
  /** Open with the save dialog showing. */
  initialSaveOpen?: boolean
  /** Open with the save dialog saving, or refused with why. */
  initialSaveState?: DesignPlaygroundSaveState
  /** Open with a save just made. */
  initialSaved?: DesignPlaygroundSaved
  /** Open with why the rebuild failed shown. */
  initialShowWhy?: boolean
  /** A fixed clock — and when the frame last moved to a newer build — in place of the live ones. */
  clock?: { now: number; refreshedAt?: number }
}

/** Where the save dialog is: saving, or refused with why. */
export type DesignPlaygroundSaveState = 'saving' | { error: string }

const PILL = 'rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors'
const BAR =
  'flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 rounded-lg px-3 py-1.5 text-[12.5px]'

function clockTime(at: number): string {
  return new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function PlaygroundBar({
  bar,
  onRetry,
  initialShowWhy,
}: {
  bar: DesignPlaygroundBar
  onRetry: () => void
  initialShowWhy: boolean
}) {
  const [why, setWhy] = useState(initialShowWhy)
  if (bar.kind === 'rebuilding') {
    return (
      <div
        role="status"
        className={BAR}
        style={{
          background: 'var(--status-running-soft-bg)',
          color: 'var(--status-running-soft-fg)',
        }}
      >
        <Spinner size={14} />
        <span className="min-w-0">{bar.label}</span>
      </div>
    )
  }
  if (bar.kind === 'updated') {
    return (
      <div
        role="status"
        className={cn(BAR, 'transition-opacity duration-1000', bar.fading && 'opacity-0')}
        style={{ background: 'var(--status-done-soft-bg)', color: 'var(--status-done-soft-fg)' }}
      >
        <IconCheck className="h-3.5 w-3.5 shrink-0" />
        <span className="min-w-0">{bar.label}</span>
        <span className="opacity-80">· {clockTime(bar.at)}</span>
      </div>
    )
  }
  return (
    <div
      role="alert"
      className="flex min-w-0 flex-col gap-2 rounded-lg px-3 py-2 text-[12.5px]"
      style={{
        background: 'var(--status-working-soft-bg)',
        color: 'var(--status-working-soft-fg)',
      }}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="flex min-w-0 flex-1 items-center gap-2 font-medium">
          <IconWarningTriangle className="h-3.5 w-3.5 shrink-0" />
          <span className="min-w-0">{bar.label}</span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <Button size="sm" variant="ghost" aria-expanded={why} onClick={() => setWhy(!why)}>
            {why ? DESIGN_TEXT.playgroundHideWhy : DESIGN_TEXT.playgroundShowWhy}
          </Button>
          <Button size="sm" variant="secondary" onClick={onRetry}>
            {DESIGN_TEXT.playgroundRetry}
          </Button>
        </span>
      </div>
      {why ? (
        <pre className="max-h-48 overflow-auto rounded-md bg-(--surface-raised) p-2 font-mono text-[12px] whitespace-pre-wrap text-(--text-primary)">
          {bar.error}
        </pre>
      ) : null}
    </div>
  )
}
const PILL_ON = 'border-(--accent-primary) bg-(--accent-primary)/10 text-(--accent-primary)'
const PILL_OFF =
  'border-(--border-subtle) bg-(--surface-raised) text-(--text-secondary) hover:text-(--text-primary)'

function ControlInput({
  control,
  value,
  onChange,
}: {
  control: DesignPlaygroundControl
  value: string
  onChange: (value: string) => void
}) {
  if (control.kind === 'toggle') {
    return (
      <Switch
        checked={value === 'true'}
        onCheckedChange={(on) => onChange(String(on))}
        label={control.label}
      />
    )
  }
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[12px] font-medium text-(--text-secondary)">{control.label}</span>
      <div role="radiogroup" aria-label={control.label} className="flex flex-wrap gap-1.5">
        {control.options.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={value === o.id}
            onClick={() => onChange(o.id)}
            className={cn(PILL, value === o.id ? PILL_ON : PILL_OFF)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * A project's design playground: its scenes listed, the one picked live in a
 * frame — light or dark, desktop or phone — set by the controls the scene
 * declares, and saved as a state of the design, which is captured in every
 * variant and proposed. Draws only what it is given and what the frame posts,
 * so it shows the same in the app and in the showcase.
 */
export default function DesignPlayground({
  index,
  appId,
  status,
  frameSrc,
  scenes: givenScenes,
  initial,
  onChange,
  onRetry,
  onSave,
  onOpenProposal,
  initialSaveOpen = false,
  initialSaveState,
  initialSaved,
  initialShowWhy = false,
  clock,
}: DesignPlaygroundProps) {
  const opening = useMemo(
    () => (initial?.address ? parseDesignPlaygroundAddress(initial.address) : undefined),
    [initial?.address],
  )
  const [posted, setPosted] = useState<DesignPlaygroundScene[] | undefined>(undefined)
  const [ready, setReady] = useState(false)
  const [sceneId, setSceneId] = useState(opening?.sceneId)
  const [values, setValues] = useState<Record<string, string>>(opening?.values ?? {})
  const [theme, setTheme] = useState<DesignPlaygroundTheme>(initial?.theme ?? 'light')
  const [device, setDevice] = useState<DesignPlaygroundDevice>(initial?.device ?? 'desktop')
  const [saveOpen, setSaveOpen] = useState(initialSaveOpen || initialSaveState !== undefined)
  const [saved, setSaved] = useState(initialSaved)
  const [ticking, setTicking] = useState(false)
  const liveNow = useDurationTimer(ticking)
  const frame = useRef<HTMLIFrameElement>(null)

  const scenes = givenScenes ?? posted
  const scene = scenes?.find((s) => s.id === sceneId) ?? scenes?.[0]
  const shownValues = scene
    ? designPlaygroundValues(scene, designPlaygroundAddress(scene, values))
    : {}
  const address = scene ? designPlaygroundAddress(scene, shownValues) : undefined
  const build = status?.status === 'ready' ? status.build : undefined
  const firstSrc = build ? frameSrc(address, theme) : undefined
  const [src, setSrc] = useState<string | undefined>(undefined)
  const [opened, setOpened] = useState<DesignPlaygroundFrame>({})
  const view = designPlaygroundView(
    status,
    clock?.refreshedAt !== undefined ? { ...opened, refreshedAt: clock.refreshedAt } : opened,
    clock?.now ?? liveNow,
  )
  const viewTicking = !clock && 'ticking' in view && view.ticking

  useEffect(() => setTicking(viewTicking), [viewTicking])

  // The frame opens once per build, at the address it is on; every later move is posted to it.
  useEffect(() => {
    if (!build || !firstSrc || opened.build === build) return
    setOpened(designPlaygroundFrameNext(opened, build, Date.now()))
    setReady(false)
    setSrc(firstSrc)
  }, [build, firstSrc, opened])

  useEffect(() => {
    if (!src) return
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow) return
      const manifest = parseDesignPlaygroundManifest(event.data)
      if (!manifest) return
      setPosted(manifest.scenes)
      setReady(true)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [src])

  useEffect(() => {
    if (!ready || !address) return
    frame.current?.contentWindow?.postMessage(
      { type: DESIGN_PLAYGROUND_SHOW_MESSAGE, address, theme },
      '*',
    )
  }, [ready, address, theme])

  useEffect(() => {
    onChange?.({ ...(address ? { address } : {}), theme, device })
  }, [address, theme, device, onChange])

  const pickScene = (next: DesignPlaygroundScene) => {
    setSceneId(next.id)
    setValues({})
    setSaved(undefined)
  }
  const setValue = (id: string, value: string) => {
    setValues({ ...shownValues, [id]: value })
    setSaved(undefined)
  }

  if (view.kind === 'building') {
    return (
      <div
        role="status"
        className="flex items-center gap-2 py-10 text-[13px] text-(--text-secondary)"
      >
        <Spinner size={16} /> {view.label}
      </div>
    )
  }
  if (view.kind === 'failed') {
    return (
      <Alert>
        <div className="flex flex-col gap-2">
          <span className="font-semibold">{DESIGN_TEXT.playgroundFailed}</span>
          <pre className="max-h-48 overflow-auto font-mono text-[12px] whitespace-pre-wrap">
            {view.error}
          </pre>
          <Button size="sm" variant="secondary" className="self-start" onClick={onRetry}>
            {DESIGN_TEXT.playgroundRetry}
          </Button>
        </div>
      </Alert>
    )
  }
  if (view.kind === 'none') return null

  const groups = designPlaygroundSceneGroups(scenes ?? [])
  const existing = address ? designPlaygroundSavedAt(index, appId, address) : undefined

  return (
    <div className="flex flex-col gap-4 @3xl:grid @3xl:grid-cols-[minmax(0,1fr)_15rem] @3xl:items-start @6xl:grid-cols-[12rem_minmax(0,1fr)_15rem]">
      <nav
        aria-label={DESIGN_TEXT.playgroundPick}
        className="flex flex-col gap-3 @3xl:col-span-2 @6xl:col-span-1"
      >
        <div className="@6xl:hidden">
          <NativeSelect
            size="sm"
            aria-label={DESIGN_TEXT.playgroundPick}
            value={scene?.id ?? ''}
            onChange={(e) => {
              const next = scenes?.find((s) => s.id === e.target.value)
              if (next) pickScene(next)
            }}
          >
            {groups.map((g) => (
              <optgroup key={g.group} label={g.group}>
                {g.scenes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </NativeSelect>
        </div>
        <div className="hidden flex-col gap-3 @6xl:flex">
          {groups.map((g) => (
            <div key={g.group} className="flex flex-col gap-0.5">
              <span className="px-2 text-[11px] font-semibold tracking-wide text-(--text-muted) uppercase">
                {g.group}
              </span>
              {g.scenes.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  aria-current={s.id === scene?.id ? 'true' : undefined}
                  onClick={() => pickScene(s)}
                  className={cn(
                    'rounded-md px-2 py-1.5 text-left text-[13px]',
                    s.id === scene?.id
                      ? 'bg-(--accent-primary)/10 font-semibold text-(--text-primary)'
                      : 'text-(--text-secondary) hover:bg-(--surface-muted) hover:text-(--text-primary)',
                  )}
                >
                  {s.name}
                </button>
              ))}
            </div>
          ))}
        </div>
      </nav>

      <section className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex min-w-[min(100%,18rem)] flex-1 flex-col gap-1">
            <h3 className="text-[15px] font-semibold text-(--text-primary)">
              {scene?.name ?? DESIGN_TEXT.playgroundPick}
            </h3>
            <p className="max-w-2xl text-[12.5px] text-(--text-secondary)">
              {DESIGN_TEXT.playgroundIntro}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Button size="sm" disabled={!address} onClick={() => setSaveOpen(true)}>
              {DESIGN_TEXT.saveAsState}
            </Button>
            {view.saveHint ? (
              <span className="text-[12px] text-(--text-muted)">{view.saveHint}</span>
            ) : null}
          </div>
        </div>
        {view.bar ? (
          <PlaygroundBar
            key={view.bar.kind}
            bar={view.bar}
            onRetry={onRetry}
            initialShowWhy={initialShowWhy}
          />
        ) : null}
        {saved ? (
          <div className="flex flex-col gap-1 rounded-lg border border-(--border-subtle) bg-(--surface-raised) px-3 py-2 text-[12.5px]">
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-(--text-primary)">
                {DESIGN_TEXT.savedTo(saved.where)}
              </span>
              <button
                type="button"
                className="text-(--accent-primary) hover:underline"
                onClick={() => onOpenProposal(saved.proposalId)}
              >
                {DESIGN_TEXT.openThere} →
              </button>
            </span>
            <span className="text-(--text-secondary)">{DESIGN_TEXT.savedNote}</span>
          </div>
        ) : null}
        <div
          className={cn(
            'flex justify-center overflow-hidden rounded-xl border border-(--border-subtle) p-4',
            theme === 'dark' ? 'bg-[#0b0f14]' : 'bg-(--surface-muted)',
          )}
        >
          {src ? (
            <iframe
              key={opened.build}
              ref={frame}
              src={src}
              title={scene?.name ?? DESIGN_TEXT.playgroundPick}
              className="h-[480px] max-w-full rounded-lg border-0 bg-transparent"
              style={{ width: device === 'phone' ? 390 : '100%', colorScheme: theme }}
            />
          ) : (
            <div className="flex h-[480px] items-center gap-2 text-[13px] text-(--text-secondary)">
              <Spinner size={16} /> {DESIGN_TEXT.playgroundListing}
            </div>
          )}
        </div>
        {scenes && scenes.length === 0 ? (
          <p className="text-[12.5px] text-(--text-secondary)">{DESIGN_TEXT.playgroundNoScenes}</p>
        ) : null}
        {address ? (
          <div className="flex min-w-0 items-baseline gap-2 text-[12px]">
            <span className="shrink-0 font-semibold text-(--text-secondary)">
              {DESIGN_TEXT.address}
            </span>
            <code className="min-w-0 font-mono break-all text-(--text-muted)">{address}</code>
          </div>
        ) : null}
      </section>

      <aside aria-label={DESIGN_TEXT.controls} className="flex flex-col gap-4">
        <h4 className="text-[12px] font-semibold tracking-wide text-(--text-muted) uppercase">
          {DESIGN_TEXT.controls}
        </h4>
        {scene?.presets.length ? (
          <div className="flex flex-col gap-1.5">
            <span className="text-[12px] font-medium text-(--text-secondary)">
              {DESIGN_TEXT.presets}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {scene.presets.map((p) => {
                const on = Object.entries(p.values).every(([k, v]) => shownValues[k] === v)
                return (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      setValues({ ...shownValues, ...p.values })
                      setSaved(undefined)
                    }}
                    className={cn(PILL, on ? PILL_ON : PILL_OFF)}
                  >
                    {p.name}
                  </button>
                )
              })}
            </div>
          </div>
        ) : null}
        {scene?.controls.map((c) => (
          <ControlInput
            key={c.id}
            control={c}
            value={shownValues[c.id] ?? ''}
            onChange={(v) => setValue(c.id, v)}
          />
        ))}
        <div className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium text-(--text-secondary)">
            {DESIGN_TEXT.theme}
          </span>
          <SegmentedControl
            size="sm"
            ariaLabel={DESIGN_TEXT.theme}
            value={theme}
            onChange={(v) => setTheme(v as DesignPlaygroundTheme)}
            options={[
              { value: 'light', label: DESIGN_TEXT.light },
              { value: 'dark', label: DESIGN_TEXT.dark },
            ]}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium text-(--text-secondary)">
            {DESIGN_TEXT.device}
          </span>
          <SegmentedControl
            size="sm"
            ariaLabel={DESIGN_TEXT.device}
            value={device}
            onChange={(v) => setDevice(v as DesignPlaygroundDevice)}
            options={[
              { value: 'desktop', label: DESIGN_TEXT.desktop },
              { value: 'phone', label: DESIGN_TEXT.phone },
            ]}
          />
        </div>
        <p className="text-[12px] text-(--text-muted)">{DESIGN_TEXT.controlsNote}</p>
      </aside>

      {scene && address ? (
        <SaveDialog
          key={`${address}:${saveOpen}`}
          isOpen={saveOpen}
          onClose={() => setSaveOpen(false)}
          index={index}
          appId={appId}
          scene={scene}
          existing={existing}
          suggestedName={designPlaygroundPresetName(scene, shownValues) ?? ''}
          status={status}
          initialState={initialSaveState}
          onSave={async (target, where) => {
            const made = await onSave({ target, address })
            setSaveOpen(false)
            setSaved({ proposalId: made.id, where })
          }}
        />
      ) : null}
    </div>
  )
}

function SaveDialog({
  isOpen,
  onClose,
  index,
  appId,
  scene,
  existing,
  suggestedName,
  status,
  initialState,
  onSave,
}: {
  isOpen: boolean
  onClose: () => void
  index: DesignIndex
  appId: string
  scene: DesignPlaygroundScene
  existing: ReturnType<typeof designPlaygroundSavedAt>
  suggestedName: string
  status: DesignPlaygroundStatus | undefined
  initialState: DesignPlaygroundSaveState | undefined
  onSave: (target: DesignEntryTarget, where: string) => Promise<void>
}) {
  const targets = designPlaygroundSaveTargets(index, appId, scene)
  const [name, setName] = useState(suggestedName)
  const [whereKey, setWhereKey] = useState(targets[0]!.key)
  const [saving, setSaving] = useState(initialState === 'saving')
  const [waited, setWaited] = useState(false)
  const [error, setError] = useState(
    typeof initialState === 'object' ? initialState.error : undefined,
  )

  const where = targets.find((t) => t.key === whereKey) ?? targets[0]!
  const existingWhere = existing
    ? `${existing.screen.kind === 'component' ? DESIGN_TEXT.components : DESIGN_TEXT.screens} › ${existing.screen.name}`
    : undefined
  const canSave = !saving && (existing !== undefined || name.trim() !== '')
  const save = async () => {
    setSaving(true)
    setWaited(status?.status === 'ready' && status.rebuilding === true)
    setError(undefined)
    try {
      if (existing) {
        await onSave({ screenId: existing.screen.id, stateId: existing.state.id }, existingWhere!)
      } else {
        await onSave({ ...where.target, stateName: name.trim() }, where.label)
      }
    } catch (err) {
      setError(extractErrorMessage(err, DESIGN_TEXT.saveFailed))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={DESIGN_TEXT.saveAsState}
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={saving}>
            {DESIGN_TEXT.cancel}
          </Button>
          <Button size="sm" onClick={() => void save()} disabled={!canSave} loading={saving}>
            {DESIGN_TEXT.save}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        {existing ? (
          <p className="rounded-md bg-(--surface-muted) px-3 py-2 text-[12.5px] text-(--text-secondary)">
            {DESIGN_TEXT.saveExisting(existing.state.name)}
          </p>
        ) : null}
        <Field label={DESIGN_TEXT.saveName}>
          <Input
            value={existing ? existing.state.name : name}
            onChange={(e) => setName(e.target.value)}
            disabled={existing !== undefined || saving}
          />
        </Field>
        <Field label={DESIGN_TEXT.saveWhere}>
          {existing ? (
            <Input value={existingWhere} disabled />
          ) : (
            <NativeSelect
              value={whereKey}
              onChange={(e) => setWhereKey(e.target.value)}
              disabled={saving}
            >
              {targets.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </NativeSelect>
          )}
        </Field>
        {error && !saving ? (
          <Alert>
            <div className="flex min-w-0 flex-col gap-1">
              <span className="font-semibold">{DESIGN_TEXT.saveFailed}</span>
              <pre className="max-h-40 overflow-auto font-mono text-[12px] whitespace-pre-wrap">
                {error}
              </pre>
            </div>
          </Alert>
        ) : null}
        <p className="text-[12.5px] text-(--text-secondary)" role={saving ? 'status' : undefined}>
          {saving ? (
            <span className="flex items-center gap-2">
              <Spinner size={14} /> {designPlaygroundSaveLabel(status, waited)}
            </span>
          ) : (
            DESIGN_TEXT.saveVariantsNote
          )}
        </p>
      </div>
    </Modal>
  )
}
