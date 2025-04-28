import mitt, { Emitter } from 'mitt'
import {createSignal, Accessor} from 'solid-js'

export enum LoadState {
  Init,
  Loaded,
  Completed,
  Error,
}

export interface StateChanger {
  hasMore: () => boolean
  loaded: () => void
  complete: () => void
  reset: () => void
  error: (message: string) => void
}

export type TLoaderFn = (state: StateChanger) => Promise<void>

export function createStateChanger(): [StateChanger, Accessor<number>] {
  const [error, setError] = createSignal<string | null>(null)
  const [state, setState] = createSignal<LoadState>(LoadState.Init)
  // 当状态变化时，触发 changedId 的变化
  const [changedId, setChangedId] = createSignal<number>(0)

  const stateChanger: StateChanger = {
    hasMore: () => state() !== LoadState.Completed,
    loaded: () => {
      setState(LoadState.Loaded)

      requestAnimationFrame(() => {
        setTimeout(() => {
          console.log('DOM 已更新！')
          setChangedId((prev) => prev + 1)
        }, 300)
      })
    },
    complete: () => {
      setState(LoadState.Completed)
    },
    reset: () => {
      setState(LoadState.Init)
      setChangedId((prev) => prev + 1)
    },
    error: (message: string) => {
      setError(message)
    },
  }

  return [stateChanger, changedId]
}

// 定义TOC事件类型
export type LoaderEvents = {
  active?: boolean // 激活
}

export function createLoaderEmitter(): Emitter<LoaderEvents> {
  return mitt<LoaderEvents>()
}
