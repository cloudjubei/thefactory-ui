import { useMemo, useState } from 'react'
import { useWebSearchKeys, useWebSearchBrowserSetting } from '../../../headless'
import { Alert, SecretInput, Switch } from '../..'

// Three fixed providers we surface (same set as `overseer-local`'s
// WebSearchSettings). Other provider names backed by the backend are still
// editable via the API; they just don't appear in this UI.
const PROVIDERS = [
  { key: 'exa', label: 'Exa API Key', placeholder: 'exa_...' },
  { key: 'serpapi', label: 'SerpAPI Key', placeholder: 'your_serpapi_key' },
  { key: 'tavily', label: 'Tavily API Key', placeholder: 'tvly-...' },
] as const

export default function WebSearchSettings() {
  const { isLoaded, loadError, keys, upsertKey, deleteKey } = useWebSearchKeys()
  const {
    isLoaded: browserLoaded,
    headed,
    saveError: browserError,
    setHeaded,
  } = useWebSearchBrowserSetting()

  const byProvider = useMemo(() => {
    const m: Record<string, string> = {}
    for (const k of keys) m[k.provider] = k.apiKey
    return m
  }, [keys])

  // Sparse local drafts so typing doesn't fire one upsert per keystroke.
  // Only providers the user has typed into appear here; everything else
  // falls through to `byProvider` so newly-loaded keys appear immediately.
  // The previous eager-init `useEffect` set every draft to `''` on first
  // render — once `byProvider` loaded, the `!== undefined` guard kept the
  // drafts stuck at empty.
  const [drafts, setDrafts] = useState<Record<string, string>>({})

  const valueFor = (provider: string) =>
    Object.prototype.hasOwnProperty.call(drafts, provider)
      ? drafts[provider]
      : (byProvider[provider] ?? '')

  const onChange = (provider: string, value: string) =>
    setDrafts((prev) => ({ ...prev, [provider]: value }))

  const onBlur = async (provider: string) => {
    if (!Object.prototype.hasOwnProperty.call(drafts, provider)) return
    const value = drafts[provider].trim()
    const existing = byProvider[provider] ?? ''
    if (value === existing) return
    if (value.length === 0) {
      if (existing.length > 0) await deleteKey(provider)
      return
    }
    await upsertKey({ provider, apiKey: value })
  }

  return (
    <div className="max-w-3xl">
      <h2 className="text-xl font-semibold mb-3">Web Search API Keys</h2>

      {loadError && <Alert>{loadError.message}</Alert>}

      <div className="space-y-4">
        {!isLoaded ? (
          <p className="text-sm text-(--text-secondary)">Loading…</p>
        ) : (
          PROVIDERS.map((p) => (
            <div key={p.key}>
              <label htmlFor={`websearch-${p.key}`} className="block text-sm font-medium mb-1">
                {p.label}
              </label>
              <SecretInput
                id={`websearch-${p.key}`}
                value={valueFor(p.key)}
                onChange={(e) => onChange(p.key, e.target.value)}
                onBlur={() => void onBlur(p.key)}
                wrapperClassName="max-w-md"
                placeholder={p.placeholder}
                autoComplete="off"
                spellCheck={false}
                revealConfirmDescription={`The ${p.label} will be visible until you leave this page.`}
              />
            </div>
          ))
        )}
        <p className="text-[12px] text-(--text-secondary) mt-1">
          Keys are stored encrypted on the backend.
        </p>
      </div>

      <div className="mt-8 border-t border-(--border-subtle) pt-5">
        <h2 className="text-xl font-semibold mb-3">Browser</h2>
        <Switch
          checked={headed}
          disabled={!browserLoaded}
          onCheckedChange={(v) => void setHeaded(v)}
          label="Use a headed (visible) Chrome for web search"
        />
        <p className="text-[12px] text-(--text-secondary) mt-2 max-w-md">
          Runs the browser-backed search and page reads in a visible real Chrome instead of
          headless. This clears more bot-walled shops (better material coverage), but a visible
          window can briefly steal focus. Takes effect on the next search.
        </p>
        {browserError && (
          <Alert className="mt-2">Couldn’t save that setting: {browserError.message}</Alert>
        )}
      </div>
    </div>
  )
}
