import { useEffect } from 'react'
import { useMcpServers, type McpServerOwner } from '../../../headless'
import McpServerSettingsPanel from './McpServerSettingsPanel'
import { subscribeWindowFocus } from './subscribeWindowFocus'

export interface McpServerSettingsProps {
  /** The project or the group whose servers these are. */
  owner: McpServerOwner
}

/**
 * A project's or a group's MCP servers in its Settings, read and changed through
 * the backend: what `McpServerSettingsPanel` shows. A sign-in shows inside the
 * app and the servers are read again once it finished; coming back to the app
 * reads them again too. Native peer:
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
      onSignIn={signIn}
      onTest={servers.test}
      onSetOnlyReads={servers.setOnlyReads}
    />
  )
}
