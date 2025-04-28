import {createEffect, createSignal, onCleanup} from 'solid-js'
import {
  StateChanger,
  TLoaderFn,
  createStateChanger,
  LoaderEvents,
} from './InfiniteLoaderTypes'
import t from './i18n'
import {Switch, Match} from 'solid-js'
import observeVisibility from '../../modules/directives/useObserveVisibility'
import {Emitter} from 'mitt'
import {debounce} from 'throttle-debounce'

// 注册指令, 否则被 tree-shaking 干掉
// ref: <https://github.com/solidjs/solid/discussions/1876>
true && observeVisibility

export interface InfiniteLoaderProps {
  loader: TLoaderFn
  offScreenLoad?: boolean
  active?: boolean
  emitter?: Emitter<LoaderEvents>
}

/**
 * 处理加载逻辑
 */
function useLoader(stateChanger: StateChanger, loader: TLoaderFn) {
  const [loadingState, setLoadingState] = createSignal<'loading' | 'error'>(
    'loading',
  )

  const doLoad = async () => {
    try {
      setLoadingState('loading')
      await loader(stateChanger)
    } catch (error) {
      console.error('Loading error:', error)
      setLoadingState('error')
    }
  }

  return {loadingState, doLoad}
}

/**
 * 加载状态展示组件
 */
function LoadingState(props: {
  hasMore: boolean
  loadingState: () => 'loading' | 'error'
  onRetry: () => void
}) {
  return (
    <div>
      <Switch
        fallback={
          <div class="py-2 text-center text-gray-500">{t('loading')}</div>
        }
      >
        <Match when={!props.hasMore}>
          <div class="py-2 text-center text-text-tertiary">{t('no_more')}</div>
        </Match>
        <Match when={props.loadingState() === 'error'}>
          <div class="py-2 text-center text-error">
            {t('loading_error')}
            <button
              class="ml-2 text-link underline hover:text-link-hover"
              onClick={props.onRetry}
            >
              {t('retry')}
            </button>
          </div>
        </Match>
      </Switch>
    </div>
  )
}

/**
 * InfiniteLoader 组件
 * @param {Object} props - 组件属性
 * @param {Function} props.loader - 自定义加载函数，完成后标记是否有更多结果
 * @param {boolean} props.offScreenLoad - 是否允许离屏加载
 * @param {Emitter<LoaderEvents>} props.emitter - 事件发射器
 */
export default function InfiniteLoader(props: InfiniteLoaderProps) {
  const [stateChanger, changedId] = createStateChanger()
  const [inView, setInView] = createSignal(false)
  const {loadingState, doLoad} = useLoader(stateChanger, props.loader)
  const [active, setActive] = createSignal(props?.active ?? true)

  createEffect(() => {
    console.log('inView', inView())
  })

  // 监听激活状态
  if (props.emitter) {
    const handler = (active?: boolean) => {
      setActive(active ?? true)
    }
    props.emitter.on('active', handler)
    onCleanup(() => {
      props.emitter?.off('active', handler)
    })
  }

  // 使用 debounce 封装的加载函数
  const debouncedLoad = debounce(500, () => {
    if (stateChanger.hasMore()) {
      doLoad()
    }
  })

  // 组件卸载时取消防抖调用
  onCleanup(() => {
    // @ts-ignore - debounce 有 cancel 方法但类型中可能没有定义
    debouncedLoad.cancel && debouncedLoad.cancel()
  })

  // 如果设置了离屏加载，直接加载数据
  createEffect(() => {
    // 如果未激活, 直接返回
    if (!active()) {
      return
    }

    // loaderState 变化时, 判断重新加载
    changedId()

    // 如果未进入视口, 直接返回
    if (!inView()) {
      return
    }

    // 如果还有更多数据, 则使用 debounce 加载数据

    debouncedLoad()
  })
  createEffect(() => {
    console.log('active', active())
  })
  createEffect(() => {
    console.log('inView', inView())
  })
  createEffect(() => {
    console.log('changedId', changedId())
  })

  return (
    <div use:observeVisibility={(isVisible) => setInView(isVisible)}>
      <LoadingState
        hasMore={stateChanger.hasMore()}
        loadingState={loadingState}
        onRetry={doLoad}
      />
    </div>
  )
}
