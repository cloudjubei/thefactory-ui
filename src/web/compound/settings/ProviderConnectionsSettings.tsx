import { useState } from 'react'
import { useProviderConnections } from '../../../headless'
import type { GetProviderConnectionResponse } from '../../../headless/api'
import { Alert, Button, ConfirmDialog, Modal } from '../..'
import { IconDelete, IconEdit, IconPlus } from '../../icons'
import ProviderConnectionsForm from './ProviderConnectionsForm'
import ImportTicketsModal from './ImportTicketsModal'

type ModalRoute =
  | { kind: 'create' }
  | { kind: 'edit'; connection: GetProviderConnectionResponse }
  | { kind: 'delete'; connection: GetProviderConnectionResponse }
  | { kind: 'import'; connection: GetProviderConnectionResponse }

/**
 * Manage ticket-provider connections (GitHub Issues / Jira) and import items
 * assigned to you into a project as Stories. Mirrors `GitCredentialsSettings`.
 */
export default function ProviderConnectionsSettings() {
  const { isLoaded, loadError, connections, createConnection, updateConnection, deleteConnection } =
    useProviderConnections()
  const [modal, setModal] = useState<ModalRoute | null>(null)

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-semibold">Ticket Connections</h2>
        <Button
          onClick={() => setModal({ kind: 'create' })}
          title="Add connection"
          aria-label="Add connection"
        >
          <IconPlus className="h-5 w-5" />
        </Button>
      </div>

      {loadError && <Alert>{loadError.message}</Alert>}

      <div className="border rounded-md divide-y border-(--border-subtle) divide-(--border-subtle)">
        {!isLoaded ? (
          <div className="p-4 text-sm text-(--text-secondary)">Loading…</div>
        ) : connections.length === 0 ? (
          <div className="p-4 text-sm text-(--text-secondary)">
            No connections yet. Click the + button to connect Jira or GitHub Issues.
          </div>
        ) : (
          connections.map((c) => (
            <div key={c.id} className="p-3 flex flex-row items-center gap-2 justify-between">
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">{c.name}</div>
                <div className="text-sm text-(--text-secondary) truncate">
                  {c.provider}
                  {c.username ? ` · ${c.username}` : ''}
                  {c.baseUrl ? ` · ${c.baseUrl}` : ''}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  onClick={() => setModal({ kind: 'import', connection: c })}
                  variant="secondary"
                  size="sm"
                >
                  Import tickets
                </Button>
                <Button
                  onClick={() => setModal({ kind: 'edit', connection: c })}
                  variant="outline"
                  size="icon"
                  title="Edit"
                  aria-label="Edit"
                >
                  <IconEdit className="w-4 h-4" />
                </Button>
                <Button
                  onClick={() => setModal({ kind: 'delete', connection: c })}
                  variant="danger"
                  size="icon"
                  title="Delete"
                  aria-label="Delete"
                >
                  <IconDelete className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="text-[12px] text-(--text-secondary) mt-2">
        Connect a provider, then “Import tickets” turns an item assigned to you into a Story in a
        project — ready to build.
      </div>

      {modal?.kind === 'create' && (
        <Modal isOpen onClose={() => setModal(null)} title="New ticket connection">
          <ProviderConnectionsForm
            mode={{ kind: 'create', onSubmit: createConnection }}
            onCancel={() => setModal(null)}
          />
        </Modal>
      )}
      {modal?.kind === 'edit' && (
        <Modal isOpen onClose={() => setModal(null)} title={`Edit: ${modal.connection.name}`}>
          <ProviderConnectionsForm
            mode={{
              kind: 'edit',
              connection: modal.connection,
              onSubmit: (patch) => updateConnection(modal.connection.id, patch),
            }}
            onCancel={() => setModal(null)}
          />
        </Modal>
      )}
      {modal?.kind === 'import' && (
        <Modal
          isOpen
          onClose={() => setModal(null)}
          title={`Import tickets · ${modal.connection.name}`}
        >
          <ImportTicketsModal connection={modal.connection} onClose={() => setModal(null)} />
        </Modal>
      )}
      {modal?.kind === 'delete' && (
        <ConfirmDialog
          isOpen
          onClose={() => setModal(null)}
          title="Delete ticket connection"
          description={`This removes "${modal.connection.name}". Imported stories keep their links but can no longer be refreshed from the provider.`}
          confirmLabel="Delete"
          destructive
          onConfirm={() => deleteConnection(modal.connection.id)}
        />
      )}
    </div>
  )
}
