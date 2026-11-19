import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import { PROCESS_OUTSIDE_WAIT_COPY as COPY } from '../../../headless/utils/processOutsideWaitConstants'
import type { ProcessOutsideWaitView } from '../../../headless/utils/processOutsideWaitTypes'
import { nativeRadii } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { Button } from '../../primitives/Button'

export type RunOutsideWaitCardProps = {
  view: ProcessOutsideWaitView
  /** Open the run's own Stop confirm. */
  onCancel?: () => void
  /** Carry on with what came; resolves `false` when refused. */
  onCarryOn?: () => Promise<boolean>
  /** Start with the whole reply showing — for a fixed showcase state. */
  expanded?: boolean
}

/**
 * Native peer of web's `RunOutsideWaitCard`: what a run waits for outside it,
 * with the run's own Stop; once it came, who replied, what they wrote and the
 * answer that carries on — shown going at once, a repeat press doing nothing.
 */
export default function RunOutsideWaitCard({
  view,
  onCancel,
  onCarryOn,
  expanded = false,
}: RunOutsideWaitCardProps) {
  const { theme } = useNativeTheme()
  const [open, setOpen] = useState(expanded)
  const [going, setGoing] = useState(false)
  const carryOn = () => {
    if (going || !onCarryOn) return
    setGoing(true)
    void onCarryOn().then((ok) => {
      if (!ok) setGoing(false)
    })
  }
  return (
    <View accessibilityLabel={view.title} style={{ gap: 8 }}>
      <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text.primary }}>
        {view.title}
      </Text>
      {view.kind === 'waiting' ? (
        <Text style={{ fontSize: 13, color: theme.text.secondary }}>{COPY.waitingHint}</Text>
      ) : (
        <View style={{ gap: 4 }}>
          <Text
            style={{
              fontSize: 13,
              color: theme.text.primary,
              borderWidth: 1,
              borderColor: theme.border.subtle,
              borderRadius: nativeRadii[2],
              backgroundColor: theme.surface.muted,
              padding: 8,
            }}
          >
            {open ? view.detail : view.preview}
          </Text>
          {view.cut ? (
            <Pressable accessibilityRole="button" onPress={() => setOpen((o) => !o)}>
              <Text
                style={{
                  fontSize: 12,
                  color: theme.text.secondary,
                  textDecorationLine: 'underline',
                }}
              >
                {open ? COPY.showLess : COPY.showAll}
              </Text>
            </Pressable>
          ) : null}
        </View>
      )}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {view.kind === 'arrived' && onCarryOn ? (
          <Button size="sm" variant="primary" loading={going} disabled={going} onPress={carryOn}>
            {view.carryOnLabel}
          </Button>
        ) : null}
        {onCancel ? (
          <Button size="sm" variant="ghost" disabled={going} onPress={onCancel}>
            {COPY.cancel}
          </Button>
        ) : null}
      </View>
    </View>
  )
}
