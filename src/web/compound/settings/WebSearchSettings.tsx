import { useMemo, useState } from 'react'
import { useWebSearchKeys, useWebSearchBrowserSetting } from '../../../headless'
import { Alert, Button, SecretInput, Switch } from '../..'

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

  // Keys never come back from the backend — only whether one is stored. A
  // field therefore starts blank; typing a key and leaving the field saves it,
  // and Remove deletes the stored one.
  const stored = useMemo(
    () => new Set(keys.filter((k) => k.hasApiKey).map((k) => k.provider)),
    [keys],
  )

  // Sparse local drafts so typing doesn't fire one upsert per keystroke.
  const [drafts, setDrafts] = useState<Record<string, string>>({})

  const onChange = (provider: string, value: string) =>
    setDrafts((prev) => ({ ...prev, [provider]: value }))

  const onBlur = async (provider: string) => {
    const value = (drafts[provider] ?? '').trim()
    if (!value) return
    await upsertKey({ provider, apiKey: value })
    setDrafts((prev) => ({ ...prev, [provider]: '' }))
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
              <div className="flex items-center gap-2">
                <SecretInput
                  id={`websearch-${p.key}`}
                  value={drafts[p.key] ?? ''}
                  onChange={(e) => onChange(p.key, e.target.value)}
                  onBlur={() => void onBlur(p.key)}
                  wrapperClassName="max-w-md flex-1"
                  placeholder={
                    stored.has(p.key) ? 'Stored — type a new key to replace it' : p.placeholder
                  }
                  autoComplete="off"
                  spellCheck={false}
                  revealConfirmDescription={`The ${p.label} will be visible until you leave this page.`}
                />
                {stored.has(p.key) ? (
                  <Button variant="outline" size="sm" onClick={() => void deleteKey(p.key)}>
                    Remove
                  </Button>
                ) : null}
              </div>
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
