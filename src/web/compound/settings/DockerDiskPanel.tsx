import { useEffect, useState } from 'react'
import type { DockerDiskControls } from '../../../headless/hooks/useDockerDisk'
import { dockerDiskFacts, resizeLabel } from '../../../headless/utils/dockerDisk'
import { DOCKER_DISK_TEXT } from '../../../headless/utils/dockerDiskConstants'
import { Alert, Button, ConfirmDialog, Surface } from '../..'

export type DockerDiskPanelProps = Omit<DockerDiskControls, 'refresh'>

export default function DockerDiskPanel({
  disk,
  loading,
  clearing,
  error,
  clear,
  resize,
}: DockerDiskPanelProps) {
  const currentGb = disk?.resize?.currentGb
  const [sizeGb, setSizeGb] = useState(currentGb ?? 0)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    if (currentGb !== undefined) setSizeGb(currentGb)
  }, [currentGb])

  const facts = disk ? dockerDiskFacts(disk) : null

  return (
    <Surface className="flex flex-col gap-4 p-4">
      <h2 className="text-xl font-semibold">{DOCKER_DISK_TEXT.title}</h2>
      <p className="text-[12px] text-(--text-secondary)">{DOCKER_DISK_TEXT.intro}</p>

      {loading && !disk ? (
        <div className="text-sm text-(--text-secondary)">{DOCKER_DISK_TEXT.loading}</div>
      ) : null}

      {error ? <Alert variant="error">{error}</Alert> : null}
      {disk?.resizeError ? <Alert variant="error">{disk.resizeError}</Alert> : null}
      {disk?.resizing ? <Alert variant="info">{DOCKER_DISK_TEXT.resizing}</Alert> : null}

      {disk && facts ? (
        <>
          <div className="flex flex-col gap-1">
            <div
              className="h-2 overflow-hidden rounded-full bg-(--surface-muted)"
              role="progressbar"
              aria-valuenow={facts.usedPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={DOCKER_DISK_TEXT.usageLabel}
            >
              <span
                className={`block h-full transition-[width] duration-150 ease-linear ${
                  facts.nearlyFull ? 'bg-(--status-error)' : 'bg-(--accent-primary)'
                }`}
                style={{ width: `${facts.usedPercent}%` }}
              />
            </div>
            <span className="text-xs tabular-nums text-(--text-secondary)">{facts.usageLine}</span>
            {facts.nearlyFull ? (
              <span className="text-xs text-(--text-error)">{DOCKER_DISK_TEXT.nearlyFull}</span>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm" onClick={() => void clear()} disabled={!facts.canClear || clearing}>
              {clearing ? DOCKER_DISK_TEXT.clearing : facts.clearLabel}
            </Button>
            <span className="min-w-0 flex-1 text-xs text-(--text-secondary)">
              {DOCKER_DISK_TEXT.clearNote}
            </span>
          </div>

          {disk.resize && facts.sizeLine ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-3">
                <label htmlFor="docker-disk-size" className="text-sm font-medium">
                  {DOCKER_DISK_TEXT.sizeLabel}
                </label>
                <span className="text-xs tabular-nums text-(--text-secondary)">
                  {facts.sizeLine}
                </span>
              </div>
              {disk.resize.maxGb > disk.resize.currentGb ? (
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    id="docker-disk-size"
                    type="range"
                    className="min-w-40 flex-1"
                    min={disk.resize.currentGb}
                    max={disk.resize.maxGb}
                    step={1}
                    value={sizeGb}
                    disabled={!facts.canResize}
                    onChange={(event) => setSizeGb(Number(event.target.value))}
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={!facts.canResize || sizeGb <= disk.resize.currentGb}
                    onClick={() => setConfirming(true)}
                  >
                    {resizeLabel(sizeGb)}
                  </Button>
                </div>
              ) : (
                <span className="text-xs text-(--text-secondary)">{DOCKER_DISK_TEXT.noRoom}</span>
              )}
            </div>
          ) : null}
        </>
      ) : null}

      <ConfirmDialog
        isOpen={confirming}
        onClose={() => setConfirming(false)}
        title={DOCKER_DISK_TEXT.confirmTitle}
        description={DOCKER_DISK_TEXT.confirmBody}
        confirmLabel={DOCKER_DISK_TEXT.confirmAction}
        cancelLabel={DOCKER_DISK_TEXT.cancel}
        destructive
        onConfirm={() => {
          setConfirming(false)
          void resize(sizeGb)
        }}
      />
    </Surface>
  )
}
