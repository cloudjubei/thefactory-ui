import { useEffect } from 'react'
import { useMcpServers, type McpServerOwner } from '../../../headless'
import McpServerSettingsPanel from './McpServerSettingsPanel'
import { subscribeWindowFocus } from './subscribeWindowFocus'

export interface McpServerSettingsProps {
  /** The project or the group whose servers these are. */
  owner: McpServerOwner
}

/** A desktop window's `window.open` goes to the system browser through its main process. */
function openInBrowser(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer')
}

/**
 * A project's or a group's MCP servers in its Settings, read and changed through
 * the backend: what `McpServerSettingsPanel` shows. A sign-in finishes in the
 * browser, and the backend says so over the socket; there is no word of one that
 * failed, so coming back to the app reads the servers again. Native peer:
 * `native/compound/settings/McpServerSettings`.
 */
export default function McpServerSettings({ owner }: McpServerSettingsProps) {
  const servers = useMcpServers(owner)
  const { refresh, signIn } = servers

  useEffect(() => subscribeWindowFocus(() => void refresh()), [refresh])

  return (
    <McpServerSettingsPanel
      views={servers.views}
      ownRows={servers.ownRows}
      intro={servers.intro}
      error={servers.error}
      busy={servers.busy}
      onAdd={servers.add}
      onRemove={servers.remove}
      onSetToken={servers.setToken}
      onSignIn={async (serverId) => {
        const page = await signIn(serverId)
        if (page) openInBrowser(page)
      }}
      onOpenPage={openInBrowser}
      onTest={servers.test}
    />
  )
}
