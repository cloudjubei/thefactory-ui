import type { ReactNode } from 'react'
import { SCENE_GROUPS, SCENES, sceneHref, type SceneRoute } from './registry'
import type { Scene, SceneState } from './types'

const LINK = 'text-(--accent-primary) underline-offset-2 hover:underline'

/** The page a playground URL asks for: the index, a scene's every state, or one state alone. */
export default function Showcase({ route }: { route: SceneRoute }) {
  switch (route.kind) {
    case 'index':
      return <ShowcaseIndex />
    case 'scene':
      return <ScenePage scene={route.scene} />
    case 'state':
      return <StateView scene={route.scene} state={route.state} />
    case 'missing':
      return (
        <Missing sceneId={route.sceneId} {...(route.stateId ? { stateId: route.stateId } : {})} />
      )
  }
}

/** Every scene and every state, as links. */
function ShowcaseIndex() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">thefactory-ui showcase</h1>
        <p className="text-sm text-(--text-secondary)">
          Every component state at its own fixed URL, rendered from fixed sample data —{' '}
          <code className="font-mono text-[12.5px]">
            /?scene=&lt;id&gt;&amp;state=&lt;state&gt;
          </code>{' '}
          shows exactly that state, the same on every load, ready to screenshot.
        </p>
      </header>
      {SCENE_GROUPS.map((group) => (
        <section key={group} className="flex flex-col gap-3" aria-label={group}>
          <h2 className="text-sm font-semibold tracking-wide text-(--text-secondary) uppercase">
            {group}
          </h2>
          <ul className="flex flex-col gap-2">
            {SCENES.filter((s) => s.group === group).map((scene) => (
              <SceneEntry key={scene.id} scene={scene} />
            ))}
          </ul>
        </section>
      ))}
    </main>
  )
}

function SceneEntry({ scene }: { scene: Scene }) {
  return (
    <li className="flex flex-col gap-1.5 rounded-lg border border-(--border-subtle) bg-(--surface-raised) px-4 py-3">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <a className={`text-[15px] font-semibold ${LINK}`} href={sceneHref(scene.id)}>
          {scene.title}
        </a>
        <code className="font-mono text-[12px] text-(--text-muted)">{scene.component}</code>
      </div>
      <p className="text-[13px] text-(--text-secondary)">{scene.description}</p>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[13px]">
        {scene.states.map((state) => (
          <a key={state.id} className={LINK} href={sceneHref(scene.id, state.id)}>
            {state.title}
          </a>
        ))}
      </div>
    </li>
  )
}

/** One scene, every state stacked under its own heading and link. */
function ScenePage({ scene }: { scene: Scene }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-1">
        <a className={`text-[13px] ${LINK}`} href="?">
          ← All scenes
        </a>
        <h1 className="text-xl font-semibold">{scene.title}</h1>
        <p className="text-sm text-(--text-secondary)">{scene.description}</p>
      </header>
      {scene.states.map((state) => (
        <section key={state.id} className="flex flex-col gap-2" data-state={state.id}>
          <div className="flex flex-wrap items-baseline gap-x-2">
            <h2 className="text-sm font-semibold">{state.title}</h2>
            <a className={`font-mono text-[12px] ${LINK}`} href={sceneHref(scene.id, state.id)}>
              {sceneHref(scene.id, state.id)}
            </a>
          </div>
          {state.description ? (
            <p className="text-[13px] text-(--text-secondary)">{state.description}</p>
          ) : null}
          {state.overlay ? (
            <p className="text-[13px] text-(--text-muted)">
              Covers the whole page — open it at its own URL.
            </p>
          ) : (
            <div className="rounded-lg border border-(--border-subtle) p-4">{state.render()}</div>
          )}
        </section>
      ))}
    </main>
  )
}

/** One state on its own, with nothing of the showcase around it. */
function StateView({ scene, state }: { scene: Scene; state: SceneState }) {
  return (
    <main
      className="min-h-screen p-6"
      data-scene={scene.id}
      data-state={state.id}
      aria-label={`${scene.title} — ${state.title}`}
    >
      <div className="mx-auto max-w-3xl">{state.render()}</div>
    </main>
  )
}

function Missing({ sceneId, stateId }: { sceneId: string; stateId?: string }): ReactNode {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-2 p-6">
      <h1 className="text-xl font-semibold">No such scene</h1>
      <p className="text-sm text-(--text-secondary)">
        {stateId !== undefined
          ? `Scene "${sceneId}" has no state "${stateId}".`
          : `There is no scene "${sceneId}".`}
      </p>
      <a className={`text-sm ${LINK}`} href="?">
        ← All scenes
      </a>
    </main>
  )
}
