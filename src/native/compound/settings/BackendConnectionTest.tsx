import { Text, View } from 'react-native'

import {
  BACKEND_TEST_LABEL,
  BACKEND_TESTING_LABEL,
  useBackendConnectionTest,
} from '../../../headless'
import { nativePalette } from '../../../tokens/native'
import { Button } from '../../primitives/Button'

export type BackendConnectionTestProps = {
  /** The URL to check; `null` while there is none, which disables the button. */
  url: string | null
  token: string | null
}

/**
 * "Test connection" in the backend connection settings: checks `/health` at
 * the URL being typed (else the saved one) and says whether it answered.
 */
export default function BackendConnectionTest({ url, token }: BackendConnectionTestProps) {
  const connection = useBackendConnectionTest()
  return (
    <View style={{ gap: 6 }}>
      {connection.line ? (
        <Text
          style={{
            fontSize: 12,
            color:
              connection.line.tone === 'ok' ? nativePalette.green[700] : nativePalette.red[700],
          }}
        >
          {connection.line.text}
        </Text>
      ) : null}
      <View style={{ flexDirection: 'row' }}>
        <Button
          size="sm"
          variant="ghost"
          disabled={connection.testing || !url}
          onPress={() => url && void connection.test(url, token)}
        >
          {connection.testing ? BACKEND_TESTING_LABEL : BACKEND_TEST_LABEL}
        </Button>
      </View>
    </View>
  )
}
