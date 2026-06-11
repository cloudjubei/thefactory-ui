import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import type { ModelInfo } from '../../headless/api'
import { cliDotColor, cliLabel, shortCliModelLabel } from '../../headless/utils/cliRunner'
import type { UsageModalModelPrice } from './UsageModal'

export type ModelChipConfig = {
  id: string
  name?: string
  provider?: string
  model?: string
}

export type ModelChipMode = 'agentRun' | 'chat' | 'activity'

export type ModelChipProps = {
  provider?: string
  model?: string
  className?: string
  editable?: boolean
  mode?: ModelChipMode
  activeConfig: ModelChipConfig | null
  recents: ModelChipConfig[]
  configs: ModelChipConfig[]
  onPick: (id: string) => void
  onOpenSettings: () => void
  getPrice: (provider: string, model: string) => Promise<UsageModalModelPrice | undefined>
  /** When defined, surfaces the API/CLI toggle in the picker. `true` ⇒ chat is CLI-backed. */
  useCli?: boolean
  /** Flip the chat between API-backed (`false`) and CLI-backed (`true`). */
  onToggleUseCli?: (next: boolean) => void
  /** CLI tools the host has enabled; rendered as the CLI sub-selector. */
  enabledClis?: string[]
  /** The currently-selected CLI tool when `useCli` is true. */
  activeCli?: string | null
  /** Select which enabled CLI backs the chat. */
  onPickCli?: (cli: string) => void
  /** Models reported by the active CLI; rendered as the CLI model dropdown. */
  cliModels?: ModelInfo[]
  /** Select which CLI model backs the chat. */
  onPickCliModel?: (modelId: string) => void
}

function providerLabel(p?: string) {
  if (!p) return ''
  const key = String(p).toLowerCase()
  const map: Record<string, string> = {
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    gemini: 'Gemini',
    google: 'Google',
    xai: 'xAI',
    groq: 'Groq',
    together: 'Together',
    azure: 'Azure',
    ollama: 'Ollama',
    local: 'Local',
    custom: 'Custom',
  }
  return map[key] || p
}

function providerDotClasses(p?: string) {
  const key = String(p || '').toLowerCase()
  switch (key) {
    case 'openai':
      return 'bg-blue-500'
    case 'anthropic':
      return 'bg-orange-500'
    case 'gemini':
    case 'google':
      return 'bg-green-500'
    case 'xai':
      return 'bg-black'
    case 'groq':
      return 'bg-pink-500'
    case 'together':
      return 'bg-emerald-500'
    case 'azure':
      return 'bg-sky-600'
    case 'ollama':
    case 'local':
      return 'bg-neutral-500'
    case 'custom':
      return 'bg-purple-500'
    default:
      return 'bg-pink-500'
  }
}


function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function formatUSD(n?: number) {
  if (n == null || Number.isNaN(n)) return '?'
  const fixed = n.toFixed(4)
  const trimmed = fixed.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1')
  return `$${trimmed}`
}

function computePosition(
  anchor: HTMLElement,
  panel: HTMLElement | null,
  gap = 8,
): { top: number; left: number; minWidth: number; side: 'top' | 'bottom' } {
  const ar = anchor.getBoundingClientRect()
  const scrollX = window.scrollX || window.pageXOffset
  const scrollY = window.scrollY || window.pageYOffset
  const viewportW = window.innerWidth
  const viewportH = window.innerHeight

  const panelW = panel ? panel.offsetWidth : Math.max(180, ar.width)
  const panelH = panel ? panel.offsetHeight : 180

  const spaceBelow = viewportH - ar.bottom
  const side: 'top' | 'bottom' = spaceBelow < panelH + gap ? 'top' : 'bottom'

  let top: number
  if (side === 'bottom') {
    top = ar.bottom + scrollY + gap
  } else {
    top = ar.top + scrollY - panelH - gap
  }

  const padding = 12

  let left: number
  if (ar.left + panelW > viewportW - padding) {
    left = ar.right - panelW + scrollX
  } else {
    left = ar.left + scrollX
  }

  const maxLeft = scrollX + viewportW - panelW - padding
  const minLeft = scrollX + padding
  left = clamp(left, minLeft, maxLeft)

  const minTop = scrollY + padding
  const maxTop = scrollY + viewportH - panelH - padding
  top = clamp(top, minTop, maxTop)

  return { top, left, minWidth: ar.width, side }
}

function useOutsideClick(refs: React.RefObject<HTMLElement | null>[], onOutside: () => void) {
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const t = e.target as Node
      const inside = refs.some((r) => r.current && r.current.contains(t))
      if (!inside) onOutside()
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [refs, onOutside])
}

type PriceRecord = {
  inputPerMTokensUSD: number
  outputPerMTokensUSD: number
  cacheReadInputPerMTokensUSD?: number
}

function Picker({
  anchorEl,
  onClose,
  selectedConfigId,
  onPickConfigId,
  recents,
  onOpenSettings,
  getPrice,
  useCli,
  onToggleUseCli,
  enabledClis,
  activeCli,
  onPickCli,
  cliModels,
  selectedCliModelId,
  onPickCliModel,
}: {
  anchorEl: HTMLElement
  onClose: () => void
  selectedConfigId?: string
  onPickConfigId: (configId: string) => void
  recents: ModelChipConfig[]
  onOpenSettings: () => void
  getPrice: (provider: string, model: string) => Promise<UsageModalModelPrice | undefined>
  useCli?: boolean
  onToggleUseCli?: (next: boolean) => void
  enabledClis?: string[]
  activeCli?: string | null
  onPickCli?: (cli: string) => void
  cliModels?: ModelInfo[]
  selectedCliModelId?: string
  onPickCliModel?: (modelId: string) => void
}) {
  const panelRef = useRef<HTMLDivElement | null>(null)
  const [coords, setCoords] = useState<{
    top: number
    left: number
    minWidth: number
    side: 'top' | 'bottom'
  } | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [pricesByKey, setPricesByKey] = useState<Record<string, PriceRecord | null | undefined>>({})

  useLayoutEffect(() => {
    const update = () => setCoords(computePosition(anchorEl, panelRef.current))
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)

    // Re-measure once the panel has actually mounted (its width is known)
    // so the viewport-clamp in `computePosition` runs against the real
    // panel size instead of the default fallback. Also observe future
    // size changes (price strings load async + grow the menu).
    let ro: ResizeObserver | null = null
    const rafId = requestAnimationFrame(() => {
      update()
      if (panelRef.current && typeof ResizeObserver !== 'undefined') {
        ro = new ResizeObserver(() => update())
        ro.observe(panelRef.current)
      }
    })

    return () => {
      cancelAnimationFrame(rafId)
      ro?.disconnect()
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [anchorEl])

  useOutsideClick([panelRef], onClose)

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      const next: Record<string, PriceRecord | null> = {}
      const items = recents
        .map((cfg) => ({ provider: cfg.provider, model: cfg.model }))
        .filter((x) => x.provider && x.model) as { provider: string; model: string }[]

      const uniqKeys = Array.from(new Set(items.map((x) => `${x.provider}::${x.model}`)))

      await Promise.all(
        uniqKeys.map(async (key) => {
          const [provider, model] = key.split('::')
          try {
            const rec = await getPrice(provider, model)
            next[key] = rec
              ? {
                  inputPerMTokensUSD: rec.inputPerMTokensUSD,
                  outputPerMTokensUSD: rec.outputPerMTokensUSD,
                  cacheReadInputPerMTokensUSD: rec.cacheReadInputPerMTokensUSD,
                }
              : null
          } catch {
            next[key] = null
          }
        }),
      )

      if (cancelled) return
      setPricesByKey(next)
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [recents, getPrice])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!panelRef.current) return
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (useCli) return
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault()
        setActiveIndex((i) => (i + 1) % Math.max(1, recents.length + 1))
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault()
        setActiveIndex(
          (i) => (i - 1 + Math.max(1, recents.length + 1)) % Math.max(1, recents.length + 1),
        )
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (activeIndex < recents.length) {
          const cfg = recents[activeIndex]
          if (cfg) {
            onPickConfigId(cfg.id)
          }
          onClose()
        } else {
          onOpenSettings()
          onClose()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [activeIndex, onClose, recents, onPickConfigId, onOpenSettings, useCli])

  if (!coords) return null

  return createPortal(
    <div
      ref={panelRef}
      className={`standard-picker standard-picker--${coords.side}`}
      role="menu"
      aria-label="Select LLM Configuration"
      style={{
        top: coords.top,
        left: coords.left,
        minWidth: Math.max(180, coords.minWidth + 8),
        position: 'absolute',
      }}
      onClick={(e) => {
        e.stopPropagation()
      }}
      onMouseDown={(e) => {
        e.stopPropagation()
        e.preventDefault()
      }}
    >
      {onToggleUseCli && (
        <div className="flex items-center gap-1 px-2 pt-1 pb-2" role="group" aria-label="Backend">
          <button
            type="button"
            role="radio"
            aria-checked={!useCli}
            className={[
              'flex-1 rounded-md px-2 py-1 text-[11px] font-medium',
              !useCli
                ? 'bg-[color-mix(in_srgb,var(--accent-primary)_16%,transparent)] text-[var(--text-primary)]'
                : 'text-[var(--text-secondary)] hover:bg-[color-mix(in_srgb,var(--accent-primary)_8%,transparent)]',
            ].join(' ')}
            onClick={(e) => {
              e.stopPropagation()
              if (useCli) onToggleUseCli(false)
            }}
          >
            API
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={!!useCli}
            className={[
              'flex-1 rounded-md px-2 py-1 text-[11px] font-medium',
              useCli
                ? 'bg-[color-mix(in_srgb,var(--accent-primary)_16%,transparent)] text-[var(--text-primary)]'
                : 'text-[var(--text-secondary)] hover:bg-[color-mix(in_srgb,var(--accent-primary)_8%,transparent)]',
            ].join(' ')}
            onClick={(e) => {
              e.stopPropagation()
              if (!useCli) onToggleUseCli(true)
            }}
          >
            CLI
          </button>
        </div>
      )}
      {useCli && (
        <div className="flex flex-col">
          {(enabledClis ?? []).map((cli) => {
            const isActive = cli === activeCli
            return (
              <button
                key={cli}
                type="button"
                role="menuitemradio"
                aria-checked={isActive}
                className="standard-picker__item"
                onClick={(e) => {
                  e.stopPropagation()
                  onPickCli?.(cli)
                }}
              >
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full mr-2"
                  style={{ backgroundColor: cliDotColor(cli) }}
                  aria-hidden
                />
                <span className="standard-picker__label truncate text-[12px] font-medium">
                  {cliLabel(cli)}
                </span>
              </button>
            )
          })}
          {(enabledClis ?? []).length === 0 && (
            <div className="px-3 py-2 text-[11px] text-[var(--text-secondary)]">
              No CLI agents enabled.
            </div>
          )}
          <div className="px-2 pt-2 pb-1">
            <label className="mb-1 block text-[10px] uppercase tracking-wide text-[var(--text-secondary)]">
              Model
            </label>
            <select
              className="w-full rounded-md border border-[var(--border-default)] bg-[var(--surface-overlay)] px-2 py-1 text-[12px] text-[var(--text-primary)]"
              value={selectedCliModelId ?? ''}
              disabled={!cliModels || cliModels.length === 0}
              onChange={(e) => {
                e.stopPropagation()
                if (e.target.value) onPickCliModel?.(e.target.value)
              }}
              onClick={(e) => e.stopPropagation()}
              // The panel's onMouseDown calls preventDefault() (keeps focus for
              // the button items); that also blocks a native <select> from
              // opening. Stop the event before it reaches the panel handler.
              onMouseDown={(e) => e.stopPropagation()}
            >
              <option value="" disabled>
                {cliModels && cliModels.length > 0 ? 'Select a model…' : 'No models reported'}
              </option>
              {(cliModels ?? []).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <button
            role="menuitem"
            className="standard-picker__item"
            onClick={(e) => {
              e.stopPropagation()
              onOpenSettings()
              onClose()
            }}
          >
            <span className="standard-picker__label">Manage CLI agents…</span>
          </button>
        </div>
      )}
      {!useCli &&
        recents.map((cfg, i) => {
          const isActive = cfg.id === selectedConfigId
          const dot = providerDotClasses(cfg.provider)
          const priceKey = cfg.provider && cfg.model ? `${cfg.provider}::${cfg.model}` : undefined
          const p = priceKey ? pricesByKey[priceKey] : undefined
          const inStr = p ? formatUSD(p.inputPerMTokensUSD) : '?'
          const outStr = p ? formatUSD(p.outputPerMTokensUSD) : '?'
          const cacheStr =
            p && p.cacheReadInputPerMTokensUSD != null
              ? formatUSD(p.cacheReadInputPerMTokensUSD)
              : '?'

          return (
            <button
              key={cfg.id}
              role="menuitemradio"
              aria-checked={isActive}
              className="standard-picker__item"
              onClick={(e) => {
                e.stopPropagation()
                onPickConfigId(cfg.id)
                onClose()
              }}
              onMouseEnter={() => setActiveIndex(i)}
            >
              <span
                className={['inline-block w-1.5 h-1.5 rounded-full mr-2', dot].join(' ')}
                aria-hidden
              />
              <span className="standard-picker__label flex min-w-0 flex-col leading-tight">
                <span className="truncate text-[12px] font-medium">{cfg.name || 'Untitled'}</span>
                <span className="truncate text-[11px] text-[var(--text-secondary)]">
                  {cfg.model || '—'}
                </span>
                <span className="truncate text-[10px] text-[var(--text-secondary)]">
                  In {inStr} · Out {outStr} · Cache {cacheStr}
                </span>
              </span>
            </button>
          )
        })}
      {!useCli && (
        <button
          role="menuitem"
          className="standard-picker__item"
          onClick={(e) => {
            e.stopPropagation()
            onOpenSettings()
            onClose()
          }}
          onMouseEnter={() => setActiveIndex(recents.length)}
        >
          <span className="standard-picker__label">Manage LLM Configurations…</span>
        </button>
      )}
    </div>,
    document.body,
  )
}

export function ModelChip({
  provider,
  model,
  className,
  editable = false,
  mode = 'agentRun',
  activeConfig,
  recents,
  configs,
  onPick,
  onOpenSettings,
  getPrice,
  useCli,
  onToggleUseCli,
  enabledClis,
  activeCli,
  onPickCli,
  cliModels,
  onPickCliModel,
}: ModelChipProps) {
  const containerRef = useRef<HTMLSpanElement>(null)
  const [open, setOpen] = useState(false)

  const cliEnabled = onToggleUseCli != null

  let prov = providerLabel(provider)
  let displayModel = model

  if ((!prov || !displayModel) && activeConfig) {
    prov = providerLabel(activeConfig.provider)
    displayModel = activeConfig.model
  }

  if (useCli) {
    prov = cliLabel(activeCli)
    const activeModel = cliModels?.find((m) => m.id === model)
    displayModel = shortCliModelLabel(activeModel?.label ?? model ?? '')
  }

  const parts = useMemo(
    () => [prov || undefined, displayModel || undefined].filter(Boolean),
    [prov, displayModel],
  )
  const label = parts.join(' · ')
  const title = label || (editable ? 'Select model' : 'Unknown model')

  if (editable && !cliEnabled && !useCli && (!configs || configs.length === 0)) {
    return (
      <button
        type="button"
        className={`btn-secondary no-drag ${className || ''}`}
        onClick={() => onOpenSettings()}
        title="No LLMs configured. Open Settings to add one."
        aria-label="Configure LLMs"
      >
        Configure LLM…
      </button>
    )
  }

  const chipEl = (
    <span
      ref={containerRef}
      className={[
        'inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs',
        ' text-neutral-800  dark:text-neutral-200',
        mode === 'chat'
          ? 'bg-teal-500/20 border-teal-600 dark:border-teal-700  dark:bg-teal-800/60 '
          : 'bg-neutral-100 border-neutral-200 dark:border-neutral-700  dark:bg-neutral-800/60 ',
        editable ? 'cursor-pointer hover:bg-neutral-100/80 dark:hover:bg-neutral-800' : '',
        'no-drag',
        className || '',
      ].join(' ')}
      title={title}
      aria-label={title}
      role={editable ? 'button' : 'note'}
      onClick={(e) => {
        if (!editable) return
        e.stopPropagation()
        setOpen((o) => !o)
      }}
      onMouseDown={(e) => {
        if (!editable) return
        e.stopPropagation()
      }}
    >
      <span className="flex flex-col items-center gap-0.5 shrink-0">
        {cliEnabled && (
          <span
            className={[
              'rounded-sm px-1 text-[9px] font-semibold uppercase tracking-wide',
              useCli
                ? 'bg-violet-500/20 text-violet-700 dark:text-violet-300'
                : 'bg-neutral-500/15 text-neutral-600 dark:text-neutral-300',
            ].join(' ')}
          >
            {useCli ? 'CLI' : 'API'}
          </span>
        )}
        <span
          aria-hidden
          className={[
            'inline-block w-1.5 h-1.5 rounded-full',
            useCli ? '' : providerDotClasses(activeConfig?.provider),
          ].join(' ')}
          style={useCli ? { backgroundColor: cliDotColor(activeCli) } : undefined}
        />
      </span>
      <span className="flex flex-col leading-tight max-w-[60px] items-center pr-1 pl-1 overflow-hidden text-ellipsis">
        <span className="truncate text-[10px] uppercase tracking-wide text-neutral-700 dark:text-neutral-300">
          {prov || (editable ? 'Select' : '—')}
        </span>
        {(displayModel || editable) && (
          <span className="truncate text-xs font-medium">
            {displayModel || (editable ? 'model…' : '')}
          </span>
        )}
      </span>
    </span>
  )

  return (
    <>
      {chipEl}
      {editable && open && containerRef.current && (
        <Picker
          anchorEl={containerRef.current}
          onClose={() => setOpen(false)}
          selectedConfigId={activeConfig?.id}
          onPickConfigId={onPick}
          recents={recents}
          onOpenSettings={onOpenSettings}
          getPrice={getPrice}
          useCli={useCli}
          onToggleUseCli={onToggleUseCli}
          enabledClis={enabledClis}
          activeCli={activeCli}
          onPickCli={onPickCli}
          cliModels={cliModels}
          selectedCliModelId={model}
          onPickCliModel={onPickCliModel}
        />
      )}
    </>
  )
}

export default ModelChip
