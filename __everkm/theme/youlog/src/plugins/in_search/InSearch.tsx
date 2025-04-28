import {createSignal, createEffect, onCleanup, createMemo, Show} from 'solid-js'
import {Portal} from 'solid-js/web'
import {HotKeysManager} from '../../modules/keymap/HotKeysManager'
import t from './i18n'
import FloatSearch, {IApiConfig} from './FloatSearch'

interface InSearchProps {
  appId: string
  apiKey: string
  index: string
  site?: string
  onlyButton?: string
}

export default function InSearch(props: InSearchProps) {
  const [searchVisible, setSearchVisible] = createSignal(false)
  let hotKeysManagerRef: HotKeysManager | null = null

  const handleToggleSearch = () => {
    setSearchVisible(!searchVisible())
    console.log('toggle search', searchVisible())
  }

  const handleClose = () => {
    setSearchVisible(false)
  }

  const apiConfig = createMemo<IApiConfig>(() => ({
    appId: props.appId,
    apiKey: props.apiKey,
    index: props.index,
  }))

  // 注册快捷键
  createEffect(() => {
    if (!hotKeysManagerRef) {
      hotKeysManagerRef = new HotKeysManager()
    }

    const bindings = {
      'Meta-k': () => {
        if (searchVisible()) {
          return false
        }

        setSearchVisible(true)
        return true
      },
    }

    hotKeysManagerRef.newSession(bindings)

    onCleanup(() => {
      if (hotKeysManagerRef) {
        hotKeysManagerRef.destroy()
      }
    })
  })

  // 平台相关按键显示
  const cmdKey = createMemo(() => {
    const isMacPlatform =
      typeof navigator !== 'undefined' &&
      navigator.platform?.toLowerCase().includes('mac')
    return isMacPlatform ? '⌘' : '^'
  })

  // 是否仅显示按钮
  const justOnlyButton = createMemo(() => {
    return props.onlyButton === 'true'
  })

  return (
    <div class="inline-flex items-center">
      <div
        onClick={handleToggleSearch}
        class={`inline-flex cursor-pointer items-center gap-1 rounded-2xl md:bg-gray-50 py-1 dark:md:bg-gray-800 ${
          !justOnlyButton()
            ? 'md:border border-gray-300 px-2 dark:border-gray-700'
            : 'text-[1.1rem]'
        }`}
      >
        <span class="text-xl md:text-base icon-[f7--search] text-gray-600 dark:text-gray-400"></span>

        {!justOnlyButton() && (
          <>
            <div class="hidden md:block space-x-[1px] text-[0.8em] text-gray-500 dark:text-gray-400">
              <span>{cmdKey()}</span>
              <span>K</span>
            </div>
          </>
        )}
      </div>

      <Portal>
        <FloatSearch
          visible={searchVisible()}
          apiConfig={apiConfig()}
          onClose={handleClose}
          site={props.site}
        />
      </Portal>
    </div>
  )
}

// 样式在全局CSS中定义
// .keycode {
//   @apply inline-flex h-8 w-8 items-center justify-center rounded border p-1 text-xs;
// }
