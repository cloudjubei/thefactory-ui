import { useState } from 'react'
import {
  DESIGN_TEXT,
  designHistory,
  designShownOfVersion,
  formatDateShort,
  type DesignShown,
} from '../../../headless'
import type { DesignIndex } from '../../../headless/api'
import { Button } from '../../primitives/Button'
import DesignFileThumb from './DesignFileThumb'
import DesignPill from './DesignPill'

export type DesignHistoryProps = {
  index: DesignIndex
  appId: string
  srcOf: (shown: DesignShown) => string | undefined
  onOpen: (shown: DesignShown) => void
  /** Bring a version back as a new proposal. */
  onRestore: (versionId: string) => Promise<unknown>
}

/**
 * Every version each screen of an app has had, state by state, newest first —
 * the current ones marked. An earlier one comes back as a new proposal; nothing
 * current is overwritten.
 */
export default function DesignHistory({
  index,
  appId,
  srcOf,
  onOpen,
  onRestore,
}: DesignHistoryProps) {
  const [busy, setBusy] = useState<string | undefined>(undefined)
  const screens = designHistory(index, appId)
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] text-(--text-secondary)">{DESIGN_TEXT.historyIntro}</p>
      {screens.length === 0 ? (
        <p className="rounded-md border border-dashed border-(--border-default) px-3 py-8 text-center text-[13px] text-(--text-muted)">
          {DESIGN_TEXT.historyEmpty}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 @2xl:grid-cols-2 @5xl:grid-cols-3">
          {screens.map(({ screen, states }) => (
            <section
              key={screen.id}
              className="flex flex-col gap-3 rounded-lg border border-(--border-subtle) p-3"
              style={{ background: 'var(--surface-raised)' }}
            >
              <h4 className="text-[14px] font-semibold text-(--text-primary)">{screen.name}</h4>
              {states.map(({ state, versions }) => (
                <div key={state.id} className="flex flex-col gap-2">
                  <span className="text-[12px] font-medium text-(--text-secondary)">
                    {state.name}
                  </span>
                  {versions.map(({ version, current, from }) => {
                    const shown = designShownOfVersion(index, version)
                    return (
                      <div key={version.id} className="flex items-start gap-2.5">
                        <button type="button" onClick={() => onOpen(shown)}>
                          <DesignFileThumb shown={shown} src={srcOf(shown)} width={92} />
                        </button>
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <span className="flex items-center gap-1.5">
                            <span className="font-mono text-[12px] font-semibold">
                              v{version.number}
                            </span>
                            <span className="text-[11.5px] text-(--text-secondary)">
                              {version.variant}
                            </span>
                            <DesignPill tone={current ? 'done' : 'empty'}>
                              {current ? DESIGN_TEXT.current : DESIGN_TEXT.earlier}
                            </DesignPill>
                          </span>
                          <span className="truncate text-[12px] text-(--text-primary)">{from}</span>
                          <span className="text-[11px] text-(--text-muted)">
                            {formatDateShort(new Date(version.createdAt))}
                          </span>
                          {!current ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="self-start"
                              loading={busy === version.id}
                              onClick={async () => {
                                setBusy(version.id)
                                try {
                                  await onRestore(version.id)
                                } finally {
                                  setBusy(undefined)
                                }
                              }}
                            >
                              {DESIGN_TEXT.restore}
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
