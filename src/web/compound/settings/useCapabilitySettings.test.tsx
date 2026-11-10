import { act } from 'react'
import type { Root } from 'react-dom/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AGENT_TOOL_SETS_KEY,
  AGENT_TOOL_SETS_RECORD_TYPE,
} from '../../../headless/utils/capabilitySettingsConstants'
import type { CapabilitySettingsOwner } from '../../../headless/utils/capabilitySettingsTypes'
import {
  useCapabilitySettings,
  type UseCapabilitySettings,
} from '../../../headless/hooks/useCapabilitySettings'

/**
 * Mounts the headless hook. The test lives under web because headless code
 * cannot import react-dom. Vitest runs in node, and the hook renders nothing,
 * so a container that answers the calls createRoot makes is enough. React DOM
 * also reads the global `window` (for `window.event`) while scheduling a render.
 */
const DOM_CONSTRUCTORS = [
  'Node',
  'Element',
  'HTMLElement',
  'Document',
  'Text',
  'Comment',
  'DocumentFragment',
  'SVGElement',
  'HTMLInputElement',
  'HTMLTextAreaElement',
  'HTMLButtonElement',
  'HTMLIFrameElement',
  'Event',
  'Window',
] as const

type PageWindow = {
  event: undefined
  document: object
  getSelection: () => null
  addEventListener: () => void
  removeEventListener: () => void
} & Record<(typeof DOM_CONSTRUCTORS)[number], unknown>

const domConstructors: Record<string, () => void> = {}
for (const name of DOM_CONSTRUCTORS) domConstructors[name] = function DomConstructor() {}

/**
 * react-dom captures `HTMLElement` (and whether a DOM exists) the moment it is
 * first imported. That has to happen after these globals exist, so the import
 * below is dynamic and this runs first.
 */
function eventProbe() {
  return {
    setAttribute() {},
    removeAttribute() {},
    style: {},
  }
}

function installHostDom() {
  const globals = globalThis as Record<string, unknown>
  const windowRecord = (globals.window ?? {
    document: {
      createElement: eventProbe,
      documentElement: null,
      body: null,
    },
    addEventListener() {},
    removeEventListener() {},
  }) as Record<string, unknown>
  for (const name of DOM_CONSTRUCTORS) {
    globals[name] = domConstructors[name]
    windowRecord[name] = domConstructors[name]
  }
  const documentRecord = (windowRecord.document ?? {}) as Record<string, unknown>
  documentRecord.createElement = eventProbe
  windowRecord.document = documentRecord
  globals.window = windowRecord
  globals.document = documentRecord
}

installHostDom()

function installDomConstructors(view: PageWindow) {
  for (const name of DOM_CONSTRUCTORS) view[name] = domConstructors[name]
}

async function loadCreateRoot(): Promise<(container: unknown) => Root> {
  installHostDom()
  const client = await import('react-dom/client')
  return client.createRoot as (container: unknown) => Root
}

function createContainer() {
  const page = {
    nodeType: 9,
    nodeName: '#document',
    documentElement: null as unknown,
    body: null as unknown,
    activeElement: null as unknown,
    defaultView: null as PageWindow | null,
    contains: () => false,
    addEventListener() {},
    removeEventListener() {},
    createElement(tag: string) {
      return createElementNode(tag, page)
    },
    createTextNode(text: string) {
      return { nodeType: 3, nodeName: '#text', textContent: text, data: text }
    },
  }
  const view = {
    event: undefined,
    document: page,
    getSelection: () => null,
    addEventListener() {},
    removeEventListener() {},
  } as PageWindow
  installDomConstructors(view)
  page.defaultView = view
  const rootNode = createElementNode('div', page)
  page.documentElement = rootNode
  page.body = rootNode
  const globals = globalThis as unknown as {
    window?: PageWindow
    document?: typeof page
  }
  globals.window = view
  globals.document = page
  return rootNode
}

function createElementNode(tag: string, page: { createElement: (tag: string) => unknown }) {
  return {
    nodeType: 1,
    nodeName: tag.toUpperCase(),
    tagName: tag.toUpperCase(),
    namespaceURI: 'http://www.w3.org/1999/xhtml',
    ownerDocument: page,
    style: {},
    childNodes: [] as unknown[],
    parentNode: null as unknown,
    firstChild: null as unknown,
    textContent: '',
    contains: () => false,
    setAttribute() {},
    removeAttribute() {},
    addEventListener() {},
    removeEventListener() {},
    appendChild(child: { parentNode: unknown }) {
      this.childNodes.push(child)
      this.firstChild = this.childNodes[0]
      child.parentNode = this
      return child
    },
    removeChild(child: unknown) {
      this.childNodes = this.childNodes.filter((item) => item !== child)
      this.firstChild = this.childNodes[0] ?? null
      return child
    },
    insertBefore(child: { parentNode: unknown }) {
      return this.appendChild(child)
    },
  }
}

const harness = vi.hoisted(() => ({
  projects: [] as Array<{ id: string; mainGroupId?: string; metadata?: Record<string, unknown> }>,
  groups: [] as Array<{
    id: string
    type: 'MAIN' | 'SCOPE'
    title: string
    capabilities?: unknown
  }>,
  updateProject: vi.fn(),
  updateProjectsGroup: vi.fn(),
  queryProjectData: vi.fn(),
  putProjectDataRecord: vi.fn(),
}))

vi.mock('../../../headless/contexts/ProjectsContext', () => ({
  useProjects: () => ({
    projects: harness.projects,
    isLoaded: true,
    loadError: null,
    activeProjectId: undefined,
    activeProject: undefined,
    setActiveProjectId: () => {},
    refresh: async () => {},
  }),
}))

vi.mock('../../../headless/contexts/ProjectsGroupsContext', () => ({
  useProjectsGroups: () => ({
    groups: harness.groups,
    isLoaded: true,
    loadError: null,
  }),
}))

vi.mock('../../../headless/api', () => ({
  extractErrorMessage: (err: unknown, fallback: string) =>
    err instanceof Error && err.message.trim() ? err.message : fallback,
  updateProject: (...args: unknown[]) => harness.updateProject(...args),
  updateProjectsGroup: (...args: unknown[]) => harness.updateProjectsGroup(...args),
}))

vi.mock('../../../headless/api/projectData', () => ({
  queryProjectData: (...args: unknown[]) => harness.queryProjectData(...args),
  putProjectDataRecord: (...args: unknown[]) => harness.putProjectDataRecord(...args),
}))

type Gate = { resolve: (value?: unknown) => void; reject: (err: unknown) => void }

function openGate() {
  const pending: Gate[] = []
  const start = () =>
    new Promise((resolve, reject) => {
      pending.push({ resolve, reject })
    })
  return { pending, start }
}

const latest: { current: UseCapabilitySettings | null } = { current: null }

function Host({ owner }: { owner: CapabilitySettingsOwner }) {
  latest.current = useCapabilitySettings(owner)
  return null
}

function panel(): UseCapabilitySettings {
  const current = latest.current
  if (!current?.view) {
    throw new Error(`not ready (${String(current?.loading)}, ${String(current?.error)})`)
  }
  return current
}

function flag(id: string) {
  const found = panel()
    .view?.sections.flatMap((section) => section.rows)
    .find((item) => item.id === id)
  if (!found) throw new Error(`missing row ${id}`)
  return found
}

const group = (id: string, capabilities?: Record<string, boolean>) => ({
  id,
  type: 'MAIN' as const,
  title: id,
  ...(capabilities ? { capabilities } : {}),
})

const project = (id: string, metadata: Record<string, unknown>) => ({ id, metadata })

describe('useCapabilitySettings', () => {
  let root: Root | undefined

  beforeEach(async () => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    harness.projects = []
    harness.groups = []
    harness.updateProject.mockReset()
    harness.updateProjectsGroup.mockReset()
    harness.queryProjectData.mockReset()
    harness.putProjectDataRecord.mockReset()
    harness.updateProject.mockResolvedValue({})
    harness.updateProjectsGroup.mockResolvedValue({})
    harness.queryProjectData.mockResolvedValue([])
    harness.putProjectDataRecord.mockResolvedValue({})
    latest.current = null
    const createRoot = await loadCreateRoot()
    root = createRoot(createContainer() as never)
  })

  async function show(owner: CapabilitySettingsOwner) {
    await act(async () => {
      root?.render(<Host owner={owner} />)
    })
    for (let attempt = 0; attempt < 6 && latest.current?.loading; attempt += 1) {
      await act(async () => {
        await Promise.resolve()
      })
    }
  }

  it('keeps a flag until the list echoes it, then follows the list again', async () => {
    harness.groups = [group('east', { autoMerge: true })]
    await show({ kind: 'group', groupId: 'east' })
    expect(flag('flag-autoMerge').on).toBe(true)
    expect(flag('flag-connectorWriteBack').on).toBe(false)

    const save = openGate()
    harness.updateProjectsGroup.mockImplementation(save.start)
    await act(async () => {
      panel().toggle(flag('flag-connectorWriteBack'), true)
    })
    expect(flag('flag-connectorWriteBack').on).toBe(true)
    expect(flag('flag-autoMerge').on).toBe(true)

    save.pending[0]?.resolve({})
    await act(async () => {
      await Promise.resolve()
    })
    // The list has not caught up, so the switch stays where the person put it.
    expect(flag('flag-connectorWriteBack').on).toBe(true)
    expect(panel().busy).toBe(false)

    harness.groups = [group('east', { autoMerge: true, connectorWriteBack: true })]
    await show({ kind: 'group', groupId: 'east' })
    expect(flag('flag-connectorWriteBack').on).toBe(true)

    harness.groups = [group('east', { autoMerge: true })]
    await show({ kind: 'group', groupId: 'east' })
    expect(flag('flag-connectorWriteBack').on).toBe(false)
    expect(flag('flag-autoMerge').on).toBe(true)
  })

  it('rolls a failed save back while the owner stays, and shows the error', async () => {
    harness.groups = [group('east', { autoMerge: true })]
    await show({ kind: 'group', groupId: 'east' })
    const save = openGate()
    harness.updateProjectsGroup.mockImplementation(save.start)
    await act(async () => {
      panel().toggle(flag('flag-autoMerge'), false)
    })
    expect(flag('flag-autoMerge').on).toBe(false)

    save.pending[0]?.reject(new Error('nope'))
    await act(async () => {
      await Promise.resolve()
    })
    expect(flag('flag-autoMerge').on).toBe(true)
    expect(panel().error).toBe('nope')
    expect(panel().busy).toBe(false)
  })

  it('drops held flags on a group change, and the next toggle saves only that group', async () => {
    harness.groups = [group('east', { autoMerge: true }), group('west')]
    await show({ kind: 'group', groupId: 'east' })
    const save = openGate()
    harness.updateProjectsGroup.mockImplementation(save.start)
    await act(async () => {
      panel().toggle(flag('flag-connectorWriteBack'), true)
    })
    expect(flag('flag-connectorWriteBack').on).toBe(true)
    expect(panel().busy).toBe(true)

    await show({ kind: 'group', groupId: 'west' })
    expect(flag('flag-connectorWriteBack').on).toBe(false)
    expect(flag('flag-autoMerge').on).toBe(false)
    expect(panel().busy).toBe(false)
    expect(panel().error).toBeNull()

    await act(async () => {
      panel().toggle(flag('flag-autoFollowUp'), true)
    })
    expect(harness.updateProjectsGroup).toHaveBeenNthCalledWith(1, {
      path: { id: 'east' },
      body: { capabilities: { connectorWriteBack: true, autoMerge: true } },
      throwOnError: true,
    })
    expect(harness.updateProjectsGroup).toHaveBeenLastCalledWith({
      path: { id: 'west' },
      body: { capabilities: { autoFollowUp: true } },
      throwOnError: true,
    })

    save.pending[0]?.reject(new Error('east failed'))
    await act(async () => {
      await Promise.resolve()
    })
    expect(panel().error).toBeNull()
    expect(flag('flag-autoFollowUp').on).toBe(true)
    expect(flag('flag-autoMerge').on).toBe(false)
    expect(flag('flag-connectorWriteBack').on).toBe(false)
    expect(panel().busy).toBe(true)
  })

  it('drops held flags when the project changes, and saves only that project', async () => {
    harness.projects = [
      project('alpha', { icon: 'box', capabilities: { autoMerge: true } }),
      project('beta', { icon: 'beta' }),
    ]
    await show({ kind: 'project', projectId: 'alpha' })
    const save = openGate()
    harness.updateProject.mockImplementation(save.start)
    await act(async () => {
      panel().toggle(flag('flag-connectorWriteBack'), true)
    })
    expect(flag('flag-connectorWriteBack').on).toBe(true)

    await show({ kind: 'project', projectId: 'beta' })
    expect(flag('flag-connectorWriteBack').on).toBe(false)
    expect(flag('flag-autoMerge').on).toBe(false)
    expect(panel().busy).toBe(false)
    expect(panel().error).toBeNull()

    await act(async () => {
      panel().toggle(flag('flag-autoFollowUp'), true)
    })
    expect(harness.updateProject).toHaveBeenNthCalledWith(1, {
      path: { id: 'alpha' },
      body: {
        metadata: {
          icon: 'box',
          capabilities: { connectorWriteBack: true, autoMerge: true },
        },
      },
      throwOnError: true,
    })
    expect(harness.updateProject).toHaveBeenLastCalledWith({
      path: { id: 'beta' },
      body: { metadata: { icon: 'beta', capabilities: { autoFollowUp: true } } },
      throwOnError: true,
    })

    save.pending[0]?.reject(new Error('alpha failed'))
    await act(async () => {
      await Promise.resolve()
    })
    expect(panel().error).toBeNull()
    expect(flag('flag-autoFollowUp').on).toBe(true)
    expect(flag('flag-autoMerge').on).toBe(false)
    expect(flag('flag-connectorWriteBack').on).toBe(false)
  })

  it('ignores a device-automation save that finishes for the previous project', async () => {
    const tools: Record<string, unknown> = {
      alpha: { toolSets: [], deviceAutomation: true },
      beta: { toolSets: ['trainer'] },
    }
    harness.queryProjectData.mockImplementation(async (projectId: string) => {
      const content = tools[projectId]
      return content === undefined ? [] : [{ content }]
    })
    harness.projects = [project('alpha', { icon: 'box' }), project('beta', { icon: 'beta' })]
    await show({ kind: 'project', projectId: 'alpha' })
    expect(flag('device-automation').on).toBe(true)

    const save = openGate()
    harness.putProjectDataRecord.mockImplementation(save.start)
    await act(async () => {
      panel().toggle(flag('device-automation'), false)
    })
    expect(flag('device-automation').on).toBe(false)

    await show({ kind: 'project', projectId: 'beta' })
    expect(flag('device-automation').on).toBe(false)
    expect(flag('tool-set-trainer').on).toBe(true)
    expect(panel().error).toBeNull()

    save.pending[0]?.reject(new Error('alpha device failed'))
    await act(async () => {
      await Promise.resolve()
    })
    expect(panel().error).toBeNull()
    expect(flag('device-automation').on).toBe(false)
    expect(flag('tool-set-trainer').on).toBe(true)

    await act(async () => {
      panel().toggle(flag('device-automation'), true)
    })
    expect(harness.putProjectDataRecord).toHaveBeenLastCalledWith('beta', {
      type: AGENT_TOOL_SETS_RECORD_TYPE,
      key: AGENT_TOOL_SETS_KEY,
      content: { toolSets: ['trainer'], deviceAutomation: true },
    })
    expect(harness.putProjectDataRecord).toHaveBeenNthCalledWith(1, 'alpha', {
      type: AGENT_TOOL_SETS_RECORD_TYPE,
      key: AGENT_TOOL_SETS_KEY,
      content: { toolSets: [], deviceAutomation: false },
    })
  })

  it('ignores a same-owner save that finishes after leave, return, and a new toggle', async () => {
    harness.groups = [group('east', { autoMerge: true }), group('west')]
    await show({ kind: 'group', groupId: 'east' })
    const save = openGate()
    harness.updateProjectsGroup.mockImplementation(save.start)
    await act(async () => {
      panel().toggle(flag('flag-connectorWriteBack'), true)
    })
    expect(flag('flag-connectorWriteBack').on).toBe(true)
    expect(panel().busy).toBe(true)

    await show({ kind: 'group', groupId: 'west' })
    await show({ kind: 'group', groupId: 'east' })
    expect(flag('flag-connectorWriteBack').on).toBe(false)
    expect(panel().busy).toBe(false)

    await act(async () => {
      panel().toggle(flag('flag-autoFollowUp'), true)
    })
    expect(flag('flag-autoFollowUp').on).toBe(true)
    expect(panel().busy).toBe(true)

    save.pending[0]?.reject(new Error('first east save failed'))
    await act(async () => {
      await Promise.resolve()
    })
    expect(panel().error).toBeNull()
    expect(flag('flag-autoFollowUp').on).toBe(true)
    expect(flag('flag-connectorWriteBack').on).toBe(false)
    expect(panel().busy).toBe(true)

    save.pending[1]?.resolve({})
    await act(async () => {
      await Promise.resolve()
    })
    expect(panel().busy).toBe(false)
    expect(flag('flag-autoFollowUp').on).toBe(true)
  })

  it('clears tool rows on the render that switches project, before the fetch runs', async () => {
    const tools: Record<string, unknown> = {
      alpha: { toolSets: ['trainer'], deviceAutomation: true },
      beta: { toolSets: [], deviceAutomation: false },
    }
    const fetch = openGate()
    harness.queryProjectData.mockImplementation(
      (projectId: string) =>
        fetch.start().then(() => {
          const content = tools[projectId]
          return content === undefined ? [] : [{ content }]
        }) as Promise<Array<{ content: unknown }>>,
    )
    harness.projects = [project('alpha', { icon: 'box' }), project('beta', { icon: 'beta' })]

    await act(async () => {
      root?.render(<Host owner={{ kind: 'project', projectId: 'alpha' }} />)
    })
    fetch.pending[0]?.resolve()
    await act(async () => {
      await Promise.resolve()
    })
    expect(flag('device-automation').on).toBe(true)
    expect(flag('tool-set-trainer').on).toBe(true)

    await act(async () => {
      root?.render(<Host owner={{ kind: 'project', projectId: 'beta' }} />)
    })
    expect(latest.current?.loading).toBe(true)
    expect(latest.current?.view).toBeUndefined()
    expect(latest.current?.busy).toBe(false)
    expect(latest.current?.error).toBeNull()

    fetch.pending[1]?.resolve()
    await act(async () => {
      await Promise.resolve()
    })
    expect(flag('device-automation').on).toBe(false)
    expect(flag('tool-set-trainer').on).toBe(false)
  })
})
