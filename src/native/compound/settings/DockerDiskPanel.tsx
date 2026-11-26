import { useEffect, useState } from 'react'
import { Text, View } from 'react-native'

import type { DockerDiskControls } from '../../../headless/hooks/useDockerDisk'
import { dockerDiskFacts, resizeLabel } from '../../../headless/utils/dockerDisk'
import { DOCKER_DISK_TEXT } from '../../../headless/utils/dockerDiskConstants'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import { ConfirmDialog } from '../../primitives/Modal'
import { Slider } from '../../primitives/Slider'

export type DockerDiskPanelProps = Omit<DockerDiskControls, 'refresh'>

/** Native peer of web's `DockerDiskPanel`: the same facts, states and wording. */
export default function DockerDiskPanel({
  disk,
  loading,
  clearing,
  error,
  clear,
  resize,
}: DockerDiskPanelProps) {
  const { theme, status } = useNativeTheme()
  const currentGb = disk?.resize?.currentGb
  const [sizeGb, setSizeGb] = useState(currentGb ?? 0)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    if (currentGb !== undefined) setSizeGb(currentGb)
  }, [currentGb])

  const facts = disk ? dockerDiskFacts(disk) : null
  const small = { fontSize: 12, color: theme.text.secondary }
  const figures = { ...small, fontVariant: ['tabular-nums' as const] }

  return (
    <View style={{ gap: nativeSpace[6] }}>
      <View style={{ gap: 2 }}>
        <Text style={{ fontSize: 18, fontWeight: '600', color: theme.text.primary }}>
          {DOCKER_DISK_TEXT.title}
        </Text>
        <Text style={small}>{DOCKER_DISK_TEXT.intro}</Text>
      </View>

      {loading && !disk ? (
        <Text style={{ fontSize: 14, color: theme.text.secondary }}>
          {DOCKER_DISK_TEXT.loading}
        </Text>
      ) : null}

      {error ? <Alert variant="error">{error}</Alert> : null}
      {disk?.resizeError ? <Alert variant="error">{disk.resizeError}</Alert> : null}
      {disk?.resizing ? <Alert variant="info">{DOCKER_DISK_TEXT.resizing}</Alert> : null}

      {disk && facts ? (
        <>
          <View style={{ gap: nativeSpace[2] }}>
            <View
              accessibilityRole="progressbar"
              accessibilityLabel={DOCKER_DISK_TEXT.usageLabel}
              accessibilityValue={{ min: 0, max: 100, now: facts.usedPercent }}
              style={{
                height: 8,
                borderRadius: nativeRadii.round,
                overflow: 'hidden',
                backgroundColor: theme.surface.muted,
              }}
            >
              <View
                style={{
                  width: `${facts.usedPercent}%`,
                  height: '100%',
                  backgroundColor: facts.nearlyFull ? status.stuck.bg : theme.accent.primary,
                }}
              />
            </View>
            <Text style={figures}>{facts.usageLine}</Text>
            {facts.nearlyFull ? (
              <Text style={{ fontSize: 12, color: status.stuck.softFg }}>
                {DOCKER_DISK_TEXT.nearlyFull}
              </Text>
            ) : null}
          </View>

          <View style={{ gap: nativeSpace[3], alignItems: 'flex-start' }}>
            <Button size="sm" onPress={() => void clear()} disabled={!facts.canClear || clearing}>
              {clearing ? DOCKER_DISK_TEXT.clearing : facts.clearLabel}
            </Button>
            <Text style={small}>{DOCKER_DISK_TEXT.clearNote}</Text>
          </View>

          {disk.resize && facts.sizeLine ? (
            <View style={{ gap: nativeSpace[3] }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  gap: nativeSpace[4],
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '500', color: theme.text.primary }}>
                  {DOCKER_DISK_TEXT.sizeLabel}
                </Text>
                <Text style={figures}>{facts.sizeLine}</Text>
              </View>
              {disk.resize.maxGb > disk.resize.currentGb ? (
                <View style={{ gap: nativeSpace[3] }}>
                  <Slider
                    min={disk.resize.currentGb}
                    max={disk.resize.maxGb}
                    step={1}
                    value={sizeGb}
                    disabled={!facts.canResize}
                    onChange={setSizeGb}
                  />
                  <View style={{ alignItems: 'flex-start' }}>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={!facts.canResize || sizeGb <= disk.resize.currentGb}
                      onPress={() => setConfirming(true)}
                    >
                      {resizeLabel(sizeGb)}
                    </Button>
                  </View>
                </View>
              ) : (
                <Text style={small}>{DOCKER_DISK_TEXT.noRoom}</Text>
              )}
            </View>
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
    </View>
  )
}
