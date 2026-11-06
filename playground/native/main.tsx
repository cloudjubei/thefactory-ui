import { createRoot } from 'react-dom/client'
import { Pressable, Text, View } from 'react-native'
import { OverlayProvider } from '../../src/native/primitives/Overlay'
import { NATIVE_VIEWS } from './views'

const address = new URLSearchParams(window.location.search)
const shown = NATIVE_VIEWS.find((view) => view.id === address.get('view'))

function Index() {
  return (
    <View style={{ gap: 8, padding: 16 }}>
      {NATIVE_VIEWS.map((view) => (
        <Pressable key={view.id} onPress={() => window.location.assign(`?view=${view.id}`)}>
          <Text>{view.title}</Text>
        </Pressable>
      ))}
    </View>
  )
}

const root = document.getElementById('root')
if (!root) throw new Error('#root missing')
createRoot(root).render(
  <OverlayProvider>
    <View style={{ flex: 1 }}>{shown ? shown.render(address) : <Index />}</View>
  </OverlayProvider>,
)
