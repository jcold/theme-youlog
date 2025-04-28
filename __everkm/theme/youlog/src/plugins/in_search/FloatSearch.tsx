import {
  createSignal,
  createEffect,
  onCleanup,
  createMemo,
  For,
  Accessor,
} from 'solid-js'
import {SearchResponse} from '@algolia/client-search'
import {liteClient} from 'algoliasearch/lite'
import {debounce} from 'throttle-debounce'
import {HotKeysManager} from '../../modules/keymap/HotKeysManager'
import {
  createLoaderEmitter,
  StateChanger,
} from '../../components/infinite_loader/InfiniteLoaderTypes'
import InfiniteLoader from '../../components/infinite_loader/InfiniteLoader'
import AlgoliaIcon from './AlgoliaIcon'
import t from './i18n'
import './FloatSearch.css'
import autoFocus from '../../modules/directives/useAutoFocus'
import scrollIntoView from 'scroll-into-view-if-needed'

true && autoFocus

// 定义在当前文件中，不再从其他文件导入
/**
 * Algolia API配置接口
 */
export interface IApiConfig {
  appId: string
  apiKey: string
  index: string
}

/**
 * 组件属性
 */
export interface FloatSearchProps {
  visible: boolean
  apiConfig: IApiConfig
  site?: string
  onClose: () => void
}

/**
 * 搜索结果片段
 */
interface SnippetResult {
  value: string
  matchLevel: string
}

/**
 * 基础字段定义
 */
interface IHitField {
  title: string
  content: string
  link: string
}

/**
 * Algolia 搜索结果
 */
interface AlgoliaHit<T extends IHitField> {
  objectID: string
  _snippetResult?: Record<string, SnippetResult>
  title: string
  content?: string
  link: string
  // [key: string]: any
}

/**
 * 内部使用的搜索结果项
 */
interface IHitItem {
  id: string
  title: string
  summary: string
  link: string
  highlights: string[]
}

// 搜索结果项组件
const SearchResultItem = (props: {
  item: IHitItem
  isSelected: boolean
  onClick?: (e: MouseEvent) => void
}) => (
  <a
    id={`hit-${props.item.id}`}
    href={props.item.link}
    rel="noopener noreferrer"
    class={`hover:bg-state-hover dark:hover:bg-state-hover block cursor-pointer space-y-1 px-4 py-3 no-underline ${
      props.isSelected ? '!bg-state-active dark:!bg-state-active' : ''
    }`}
    onClick={props.onClick}
  >
    <h2
      class="text-link dark:text-link inline font-medium underline-offset-2 hover:underline"
      innerHTML={props.item.title}
    ></h2>
    <p
      class="text-text-secondary dark:text-text-secondary text-sm"
      innerHTML={props.item.summary}
    ></p>
  </a>
)

// 键盘快捷键提示组件
const KeyboardShortcuts = () => (
  <div class="text-text-tertiary dark:text-text-tertiary hidden gap-3 text-sm md:flex">
    <div>
      <span class="keycode">↵</span>
      <span class="ml-1.5">{t('to_select')}</span>
    </div>
    <div>
      <span class="keycode">↓</span>
      <span class="keycode ml-1">↑</span>
      <span class="ml-1.5">{t('to_navigate')}</span>
    </div>
    <div>
      <span class="keycode">Esc</span>
      <span class="ml-1.5">{t('to_close')}</span>
    </div>
  </div>
)

// 使用搜索逻辑的Hook
function useSearch(
  wd: () => string,
  apiConfig: () => any,
  infiniteId: () => number,
  site?: string,
) {
  const [hitItems, setHitItems] = createSignal<IHitItem[]>([])
  const [loadFinish, setLoadFinish] = createSignal(false)
  const [isSearching, setIsSearching] = createSignal(false)

  /**
   * 提取高亮关键词
   */
  const extractHighlightWords = (
    snippetResult: Record<string, SnippetResult> | undefined,
  ): Set<string> => {
    const words = new Set<string>()

    if (!snippetResult) return words

    Object.keys(snippetResult).forEach((k) => {
      const item = snippetResult[k]
      if (item.matchLevel !== 'none') {
        // 创建临时DOM并提取高亮内容
        const tempDiv = document.createElement('div')
        tempDiv.innerHTML = item.value

        const highlightElements = tempDiv.querySelectorAll('em.hit-keyword')
        highlightElements.forEach((el) => {
          const text = el.textContent
          if (text) {
            words.add(text)
          }
        })
      }
    })

    return words
  }

  /**
   * 添加高亮参数到链接
   */
  const addHighlightsToLink = (link: string, highlights: string[]): string => {
    if (!highlights.length) return link

    try {
      const u = new URL(link)
      if (highlights.length > 0) {
        const v = JSON.stringify(highlights)
        u.searchParams.append('__hlts', v)
      }
      return u.toString()
    } catch (err) {
      console.error('Failed to add highlights to link:', err)
      return link
    }
  }

  /**
   * 映射Algolia结果到内部格式
   */
  const mapHitItem = (input: AlgoliaHit<IHitField>): IHitItem => {
    // 基本项目信息
    let ret: IHitItem = {
      id: input.objectID,
      title: input._snippetResult?.title?.value || input.title,
      summary: input._snippetResult?.content?.value || '',
      link: input.link,
      highlights: [],
    }

    // 提取高亮关键词
    const words = extractHighlightWords(input._snippetResult)
    ret.highlights = [...words]

    // 添加高亮参数到链接
    ret.link = addHighlightsToLink(ret.link, ret.highlights)

    return ret
  }

  /**
   * 执行搜索并获取结果
   */
  const PAGE_SIZE = 10
  const loadSearch = async (fireId: number, offset = 0): Promise<number> => {
    try {
      setIsSearching(true)
      const config = apiConfig()
      const searchClient = liteClient(config.appId, config.apiKey)
      console.log(
        'loadSearch wd',
        wd(),
        'fireId',
        fireId,
        'infiniteId',
        infiniteId(),
        'site',
        site,
      )

      const resp = await searchClient.search([
        {
          indexName: config.index,
          params: {
            query: wd(),
            attributesToRetrieve: ['title', 'link'],
            attributesToHighlight: [],
            filters: site ? `site:${site}` : '',
            offset,
            length: PAGE_SIZE,
            distinct: true,
            highlightPreTag: '<em class="hit-keyword">',
            highlightPostTag: '</em>',
            attributesToSnippet: ['title:200;', 'content:30;'],
          },
        },
      ])

      // 检查搜索状态是否变更
      if (fireId !== infiniteId()) {
        console.log('searching fire condition changed, skip...')
        return -1
      }

      const body = resp.results[0] as SearchResponse<IHitField>

      // 检查关键词是否变更
      if (body.query !== wd()) {
        console.log('search keyword changed, skip...')
        return -1
      }

      const items = body.hits
      if (!items.length) {
        return 0
      }

      const mappedItems = items.map((v) =>
        mapHitItem(v as AlgoliaHit<IHitField>),
      )
      setHitItems((prev) => [...prev, ...mappedItems])

      // 返回是否还有更多结果
      return mappedItems.length < PAGE_SIZE ? 0 : 1
    } catch (error) {
      console.error('Search error:', error)
      return 0
    } finally {
      setIsSearching(false)
    }
  }

  /**
   * 加载更多结果
   */
  const loadMore = async (state: StateChanger) => {
    console.log('loadMore')
    const offset = hitItems()?.length || 0
    const remainCount = await loadSearch(infiniteId(), offset)

    // 无效响应，忽略
    if (remainCount === -1) {
      state.error(t('search_error'))
      setLoadFinish(true)
      return
    }

    if (remainCount === 0) {
      console.log('load complete')
      state.complete()
      setLoadFinish(true)
    } else {
      state.loaded()
      setLoadFinish(false)
    }
  }

  /**
   * 清空搜索
   */
  const clearSearch = () => {
    setHitItems([])
    setLoadFinish(false)
  }

  // 判断是否无结果
  const noResults = createMemo(() => {
    return loadFinish() && wd().length && hitItems().length === 0
  })

  return {
    hitItems,
    setHitItems,
    loadFinish,
    setLoadFinish,
    loadSearch,
    loadMore,
    clearSearch,
    noResults,
    isSearching,
  }
}

// 热键管理Hook
function useHotKeys(
  visible: Accessor<boolean>,
  wd: Accessor<string>,
  handleEnter: () => void,
  handleClose: () => void,
  handleClearSearch: () => void,
  upOrDownItem: (isUp: boolean) => void,
  searchInputRef: Accessor<HTMLInputElement | undefined>,
) {
  let hotKeysManagerRef: HotKeysManager | null = null

  // 初始化热键管理器
  const setupHotKeys = () => {
    if (!hotKeysManagerRef) {
      hotKeysManagerRef = new HotKeysManager()
    }

    const keyBindings = {
      Enter: (e: KeyboardEvent) => {
        searchInputRef()?.focus()
        handleEnter()
        e.preventDefault()
        return true
      },
      Escape: (e: KeyboardEvent) => {
        if (wd().length > 0) {
          handleClearSearch()
        } else {
          handleClose()
        }
        e.preventDefault()
        return true
      },
      ArrowUp: (e: KeyboardEvent) => {
        searchInputRef()?.focus()
        upOrDownItem(true)
        e.preventDefault()
        e.stopPropagation()
        return true
      },
      ArrowDown: (e: KeyboardEvent) => {
        searchInputRef()?.focus()
        upOrDownItem(false)
        e.preventDefault()
        e.stopPropagation()
        return true
      },
      'Mod-k': (e: KeyboardEvent) => {
        searchInputRef()?.focus()
        e.preventDefault()
        return true
      },
    }

    // 创建新的热键会话
    hotKeysManagerRef.newSession(keyBindings, {captureInput: true})

    // 禁止body滚动
    document.body.classList.add('in-search-opened')
  }

  const cleanupHotKeys = () => {
    if (hotKeysManagerRef) {
      hotKeysManagerRef.destroy()
      hotKeysManagerRef = null
    }
    document.body.classList.remove('in-search-opened')
  }

  // 监听可见性变化
  createEffect(() => {
    if (visible()) {
      setupHotKeys()

      // 自动聚焦搜索框
      requestAnimationFrame(() => {
        searchInputRef()?.focus()
      })
    } else {
      cleanupHotKeys()
    }
  })

  // 组件卸载时清理
  onCleanup(() => {
    cleanupHotKeys()
  })
}

// 主组件
export default function FloatSearch(props: FloatSearchProps) {
  const [wd, setWd] = createSignal('')
  const [selectedPage, setSelectedPage] = createSignal('')
  const [infiniteId, setInfiniteId] = createSignal(+new Date())
  const [searchInputRef, setSearchInputRef] = createSignal<HTMLInputElement>()
  const loaderEmitter = createLoaderEmitter()

  // 创建响应式的可见性状态
  const visible = createMemo(() => props.visible)

  // 创建响应式的可见性类
  const visibilityClass = createMemo(() => (visible() ? 'block' : 'hidden'))

  // 使用自定义Hook获取搜索逻辑
  const {
    hitItems,
    setHitItems,
    loadFinish,
    setLoadFinish,
    loadSearch,
    loadMore,
    clearSearch,
    noResults,
    isSearching,
  } = useSearch(wd, () => props.apiConfig, infiniteId, props.site)

  /**
   * 处理Enter按键
   */
  const handleEnter = () => {
    if (selectedPage()) {
      // 找到选中的链接元素并模拟点击
      const selectedElement = document.querySelector(
        `#hit-${hitItems().find((item) => item.link === selectedPage())?.id}`,
      ) as HTMLElement
      if (selectedElement) {
        // 触发点击事件
        selectedElement.click()
        // 关闭搜索框
        props.onClose()
      }
    }
  }

  const handleItemClick = (item: IHitItem, e: MouseEvent) => {
    // 设置 SelectPage
    setSelectedPage(item.link)
    props.onClose()
  }

  /**
   * 上下选择结果项
   */
  const upOrDownItem = (isUp: boolean) => {
    const items = hitItems()
    const idx = items.findIndex((v) => v.link === selectedPage())
    let newIdx = 0

    if (isUp) {
      newIdx = idx - 1
      if (newIdx < 0) {
        newIdx = 0
      }
    } else {
      newIdx = idx + 1
      const len = items.length
      if (newIdx >= len) {
        newIdx = len - 1
      }
    }

    // console.log('isUp', isUp, 'newIdx', newIdx)

    if (!isUp && idx === newIdx) {
      // 如果向下移动，且没有选中项，则滚动到下一个兄弟元素, 通常是加载更多按钮
      const el = document.querySelector(`#hit-${items[items.length - 1].id}`)
      const nextElement = el?.nextElementSibling as HTMLElement
      // console.log('nextElement', nextElement)
      if (nextElement) {
        nextElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth',
        })
      }
      return
    }

    const target = items[newIdx]
    if (target) {
      setSelectedPage(target.link)
      const el = document.querySelector(`#hit-${target.id}`)
      if (el) {
        scrollIntoView(el, {
          scrollMode: 'if-needed',
          block: 'start',
          inline: 'nearest',
          boundary: (parent: Element) => {
            const container = document.querySelector('.overflow-y-auto')
            return parent === container
          },
          behavior: (actions) => {
            actions.forEach(({el, top, left}) => {
              // 添加 100px 的顶部间距
              el.scrollTo({
                top: Math.max(0, top - 100),
                left,
                behavior: 'smooth',
              })
            })
          },
        })
      }
    }
  }

  /**
   * 关闭搜索框
   */
  const handleClose = () => {
    if (props.visible) {
      props.onClose()
    }
  }

  /**
   * 清空搜索
   */
  const handleClearSearch = () => {
    setWd('')
    searchInputRef()?.focus()
    setHitItems([])
    setSelectedPage('')
    setLoadFinish(false)
  }

  // 使用热键Hook
  useHotKeys(
    visible,
    wd,
    handleEnter,
    handleClose,
    handleClearSearch,
    upOrDownItem,
    searchInputRef,
  )

  /**
   * 防抖处理搜索
   */
  const debouncedSearch = debounce(
    500,
    () => {
      if (!wd().length) {
        return false
      }

      setLoadFinish(false)
      setHitItems([])

      // 直接调用搜索，不使用setTimeout
      loadSearch(infiniteId(), 0).then((remainCount) => {
        console.log(
          'loadSearch loaded newId',
          infiniteId(),
          'remainCount',
          remainCount,
        )
        if (remainCount >= 0) {
          setLoadFinish(remainCount === 0)
        }

        requestAnimationFrame(() => {
          setTimeout(() => {
            loaderEmitter.emit('active', true)
          }, 200)
        })
      })
    },
    {atBegin: false}, // 正确的debounce选项
  )

  // 组件卸载时取消防抖调用
  onCleanup(() => {
    // @ts-ignore - debounce 有 cancel 方法但类型中可能没有定义
    debouncedSearch.cancel && debouncedSearch.cancel()
  })

  // 创建一个不受防抖影响的函数来处理输入变化
  const handleInputChange = (e: InputEvent) => {
    const value = (e.target as HTMLInputElement).value.trim()
    setWd(value)

    if (!value.length) {
      handleClearSearch()
      return
    }

    debouncedSearch()
  }

  /**
   * 关键词变更时的处理
   */
  createEffect(() => {
    if (!wd().length) {
      setHitItems([])
      setSelectedPage('')
    }
  })

  /**
   * 数据变更时自动选择第一项
   */
  createEffect(() => {
    const items = hitItems()
    if (!items.length) {
      setSelectedPage('')
      return
    }

    const links = items.map((v) => v.link)
    if (selectedPage() && links.includes(selectedPage())) {
      return
    }

    setSelectedPage(items[0].link)
  })

  return (
    <div
      data-role="float-search"
      class={`fixed inset-0 z-[100] bg-black/20 backdrop-blur-md dark:bg-black/40 ${visibilityClass()}`}
      onClick={(e) => {
        // 只有当点击的是背景层时才关闭
        if (e.target === e.currentTarget) {
          console.log('close float search')
          handleClose()
        }
      }}
    >
      <div
        class="bg-surface dark:bg-surface dark:border-border max-w-screen-lg shadow-lg md:mx-4 md:my-8 md:rounded-lg md:border lg:mx-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 搜索框 */}
        <div
          class={`relative flex h-12 items-center ${
            noResults() || hitItems().length
              ? 'dark:border-border border-b'
              : ''
          }`}
        >
          <span class="icon-[material-symbols--search-rounded] dark:text-text-secondary ml-4 mr-2 flex-shrink-0 flex-grow-0 text-xl"></span>
          <input
            type="text"
            ref={setSearchInputRef}
            value={wd()}
            onInput={handleInputChange}
            class="bg-surface dark:bg-surface dark:text-text-primary min-w-12 flex-1 px-1 text-xl outline-0"
          />
          {hitItems().length > 0 && (
            <div
              class="hover:bg-state-hover dark:hover:bg-state-hover dark:text-text-secondary inline-flex flex-shrink-0 flex-grow-0 items-center rounded-lg p-2 text-lg opacity-60"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleClearSearch()
              }}
            >
              <span class="icon-[material-symbols--close]"></span>
            </div>
          )}
          <div
            class="dark:border-border hover:bg-state-hover dark:hover:bg-state-hover dark:text-text-primary ml-2 flex h-full flex-shrink-0 flex-grow-0 cursor-pointer select-none items-center whitespace-nowrap border-l px-4"
            onClick={handleClose}
          >
            {t('cancel')}
          </div>

          {/* 加载状态指示器 */}
          {isSearching() && <div class="loading-bar"></div>}
        </div>

        {/* 空结果列表 */}
        {noResults() && (
          <div class="dark:text-text-secondary flex flex-col items-center gap-4 py-8 text-center">
            <span class="icon-[oui--cross-in-circle-empty] text-text-tertiary dark:text-text-tertiary text-[2.5em]"></span>
            <div class="">{t('no_results', {wd: wd()})}</div>
          </div>
        )}

        {/* 结果列表 */}
        {(hitItems().length > 0 || (wd().length > 0 && !loadFinish())) && (
          <div class="flex max-h-[calc(100dvh-3rem)] flex-col md:max-h-[calc(100dvh-7rem)]">
            <div class="dark:divide-border flex-1 divide-y overflow-y-auto">
              {/* 结果项 */}
              <For each={hitItems()}>
                {(item) => (
                  <SearchResultItem
                    item={item}
                    isSelected={item.link === selectedPage()}
                    onClick={(e) => handleItemClick(item, e)}
                  />
                )}
              </For>

              {/* 加载更多 */}
              {hitItems().length > 0 && (
                <InfiniteLoader
                  offScreenLoad={true}
                  loader={loadMore}
                  emitter={loaderEmitter}
                  // infiniteId={infiniteId()}
                  // class="py-2 text-center text-sm text-text-tertiary"
                />
              )}
            </div>

            {/* 底部说明 */}
            <div class="dark:border-border bg-surface-muted dark:bg-background-dark flex items-center justify-between border-t px-4 py-2 md:rounded-b-lg">
              <div class="md:hidden"></div>
              <KeyboardShortcuts />
              <div class="">
                <a
                  href="https://www.algolia.com/?utm_source=everkm"
                  target="_blank"
                >
                  <AlgoliaIcon />
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
