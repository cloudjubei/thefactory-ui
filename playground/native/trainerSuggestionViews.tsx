import {
  RecommendProgressFixtures,
  RECOMMEND_PREVIEW,
  RECOMMEND_PROJECT_ID,
} from '../scenes/recommendProgressFixtures'
import { View } from 'react-native'
import type { NativeView } from './views'
import { TRAINER_RESULT, TRAINER_ROUTES } from '../scenes/trainerSuggestionFixtures'
import { OnFixtures } from '../scenes/onFixtures'
import { renderToolPreviewNative } from '../../src/native/compound/chat/toolPreviews/renderToolPreviewNative'

/** Comparison scene: imports only preview entry points that exist on the feature's base. */
export const TRAINER_SUGGESTION_VIEWS: NativeView[] = [
  {
    id: 'catalog-partials',
    title: 'Live catalog categories',
    render: () => (
      <RecommendProgressFixtures>
        <View style={{ padding: 16, maxWidth: 390 }}>
          {renderToolPreviewNative({ ...RECOMMEND_PREVIEW, projectId: RECOMMEND_PROJECT_ID })}
        </View>
      </RecommendProgressFixtures>
    ),
  },
  {
    id: 'trainer-suggestions',
    title: 'Launch recommended experiments',
    render: (address) => (
      <OnFixtures routes={TRAINER_ROUTES}>
        <View style={{ padding: 16, gap: 12, maxWidth: 390 }}>
          {renderToolPreviewNative({
            toolCall: {
              toolCallId: 'recommend-training',
              name: 'recommendTrainingExperiments',
              arguments: address.has('launched') ? {} : { project: 'cartpole', launch: false },
            },
            result: address.has('launched')
              ? {
                  ...TRAINER_RESULT,
                  mode: 'launch',
                  launched: Number(address.get('launched')),
                  ...(Number(address.get('launched')) < 2 ? { launchErrors: ['Queue full'] } : {}),
                }
              : TRAINER_RESULT,
            resultType: 'success',
          })}
        </View>
      </OnFixtures>
    ),
  },
]
