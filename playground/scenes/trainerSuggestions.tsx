import {
  RecommendProgressFixtures,
  RECOMMEND_PREVIEW,
  RECOMMEND_PROJECT_ID,
} from './recommendProgressFixtures'
import { ChatActionsProvider } from '../../src/headless/contexts/ChatActionsContext'
import type { Scene } from '../showcase/types'
import { renderToolPreview } from '../../src/web/compound/chat/toolPreviews/renderToolPreview'
import { OnFixtures } from './onFixtures'
import { TRAINER_RESULT, TRAINER_ROUTES } from './trainerSuggestionFixtures'
export const TRAINER_SUGGESTION_SCENES: Scene[] = [
  {
    id: 'trainer-suggestions',
    title: 'Launch recommended experiments',
    component: 'recommendTrainingExperiments preview',
    group: 'Chat',
    description: 'Launch stored training suggestions and follow their activity status.',
    states: [
      {
        id: 'catalog-partials',
        title: 'Live catalog categories',
        render: () => (
          <RecommendProgressFixtures>
            <ChatActionsProvider
              value={{
                projectId: RECOMMEND_PROJECT_ID,
                openReview: () => {},
                reviewTargetOf: () => undefined,
                draftMessage: () => {},
              }}
            >
              {renderToolPreview(RECOMMEND_PREVIEW)}
            </ChatActionsProvider>
          </RecommendProgressFixtures>
        ),
      },
      {
        id: 'preview',
        title: 'Per-suggestion Launch',
        render: () => (
          <OnFixtures routes={TRAINER_ROUTES}>
            <div className="max-w-lg">
              {renderToolPreview({
                toolCall: {
                  toolCallId: 'recommend-training',
                  name: 'recommendTrainingExperiments',
                  arguments: { project: 'cartpole', launch: false },
                },
                result: TRAINER_RESULT,
                resultType: 'success',
              })}
            </div>
          </OnFixtures>
        ),
      },
      ...[2, 1, 0].map((launched) => ({
        id: `auto-launched-${launched}`,
        title: `Auto-launch: ${launched} started`,
        render: () => (
          <OnFixtures routes={TRAINER_ROUTES}>
            {renderToolPreview({
              toolCall: {
                toolCallId: 'auto-recommend',
                name: 'recommendTrainingExperiments',
                arguments: {},
              },
              result: {
                ...TRAINER_RESULT,
                mode: 'launch',
                launched,
                ...(launched < 2 ? { launchErrors: ['Queue full'] } : {}),
              },
              resultType: 'success',
            })}
          </OnFixtures>
        ),
      })),
    ],
  },
]
