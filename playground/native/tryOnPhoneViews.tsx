import type { ReactNode } from 'react'
import { ScrollView, Text, View } from 'react-native'
import {
  processCleanupHeadline,
  processTryBuildDisplay,
  type UseProcessCleanup,
} from 'thefactory-ui/headless'
import RunCarriedOutChanges from '../../src/native/compound/process/RunCarriedOutChanges'
import { ProcessCleanupBody } from '../../src/native/compound/process/signoff/ProcessCleanupCard'
import { ProcessTryBuildPanel } from '../../src/native/compound/process/signoff/ProcessTryBuildCard'
import { PROCESS_CLEANUP_COPY } from '../../src/headless/utils/processCleanupViewConstants'
import { useNativeTheme } from '../../src/native/hooks/useNativeTheme'
import {
  CARRIED_OUT_RUN,
  DEVICE_CLEANUP,
  TRY_BUILD_API_BASE,
  TRY_BUILD_STATES,
  type TryBuildState,
} from '../scenes/tryOnPhoneFixtures'
import type { NativeView } from './views'

const noop = () => {}

function Phone({ children }: { children: ReactNode }) {
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
      <View style={{ width: 390, maxWidth: '100%', padding: 12 }}>{children}</View>
    </ScrollView>
  )
}

function TryIt({ state }: { state: string }) {
  const known = (state in TRY_BUILD_STATES ? state : 'ready-qr') as TryBuildState
  const display = processTryBuildDisplay(TRY_BUILD_STATES[known], TRY_BUILD_API_BASE)
  if (!display) return null
  return (
    <Phone>
      <ProcessTryBuildPanel display={display} onDownload={noop} />
    </Phone>
  )
}

function CarriedOut() {
  return (
    <ScrollView style={{ flex: 1 }}>
      <View style={{ width: 390, maxWidth: '100%' }}>
        <RunCarriedOutChanges run={CARRIED_OUT_RUN} />
      </View>
    </ScrollView>
  )
}

function DeviceCleanup({ cleanup }: { cleanup: UseProcessCleanup }) {
  const { theme } = useNativeTheme()
  return (
    <Phone>
      <View style={{ gap: 12 }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: theme.text.primary }}>
          {PROCESS_CLEANUP_COPY.title}
        </Text>
        <Text style={{ fontSize: 13, color: theme.text.secondary }}>
          {processCleanupHeadline(cleanup.list!)}
        </Text>
        <ProcessCleanupBody cleanup={cleanup} />
      </View>
    </Phone>
  )
}

/** The try-it block (`&state=building|ready-qr|ready-download|failed|unavailable`), carried-out edits and a device cleanup row. */
export const TRY_ON_PHONE_VIEWS: NativeView[] = [
  {
    id: 'try-on-phone',
    title: 'Sign-off: try it on your phone',
    render: (address) => <TryIt state={address.get('state') ?? 'ready-qr'} />,
  },
  { id: 'run-carried-out', title: 'Sign-off: already carried out', render: () => <CarriedOut /> },
  {
    id: 'cleanup-device',
    title: 'Cleanup with a device',
    render: (address) => (
      <DeviceCleanup
        cleanup={address.get('state') === 'after' ? DEVICE_CLEANUP.after : DEVICE_CLEANUP.before}
      />
    ),
  },
]
