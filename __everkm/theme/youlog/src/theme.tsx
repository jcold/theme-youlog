import {Component, createSignal, onCleanup, Show, createEffect} from 'solid-js'
import {Portal, render} from 'solid-js/web'
import {debounce} from 'throttle-debounce'

const DEFAULT_FONT_SIZE = 16
const DEFAULT_LINE_HEIGHT = 1.7

/**
 * 切换暗黑模式
 */
function toggleDarkMode(): void {
  setIsDark(!isDark())
}

// 创建一个响应式信号来追踪暗黑模式状态
const [isDark, setIsDark] = createSignal(
  localStorage.getItem('color-theme') === 'dark' ||
    (!localStorage.getItem('color-theme') &&
      window.matchMedia('(prefers-color-scheme: dark)').matches)
)

// 监听暗黑模式变化并更新DOM和localStorage
createEffect(() => {
  if (isDark()) {
    document.documentElement.classList.add('dark')
    localStorage.setItem('color-theme', 'dark')
  } else {
    document.documentElement.classList.remove('dark')
    localStorage.setItem('color-theme', 'light')
  }
})

/**
 * 管理阅读样式的应用状态
 * @param {boolean} shouldApply - 是否应用样式
 */
function manageReadabilityStyle(shouldApply: boolean): void {
  const articleMain = document.getElementById('article-main')
  if (!articleMain) return

  if (shouldApply) {
    if (!articleMain.classList.contains('custom-readability')) {
      articleMain.classList.add('custom-readability')
    }
    localStorage.setItem('reader-style-applied', 'true')
  } else {
    articleMain.classList.remove('custom-readability')
    localStorage.setItem('reader-style-applied', 'false')
  }
}

interface ThemeSettingsProps {
  onClose: () => void
}

/**
 * 初始化阅读器设置
 */
function resumeReaderSettings(): void {
  const root = document.documentElement
  const fontFamily = localStorage.getItem('reader-font-family') || 'system-ui'
  const fontSize =
    Number(localStorage.getItem('reader-font-size')) || DEFAULT_FONT_SIZE
  const lineHeight =
    Number(localStorage.getItem('reader-line-height')) || DEFAULT_LINE_HEIGHT

  // 应用设置
  root.style.setProperty('--reader-font-family', fontFamily)
  root.style.setProperty('--reader-font-size', `${fontSize}px`)
  root.style.setProperty('--reader-line-height', lineHeight.toString())

  // 检查并应用阅读样式
  const wasApplied = localStorage.getItem('reader-style-applied') === 'true'
  if (wasApplied) {
    manageReadabilityStyle(true)
  }
}

const SunIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    class="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
    />
  </svg>
)

const MoonIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    class="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
    />
  </svg>
)

/**
 * 主题设置组件
 */
const ThemeSettings: Component<ThemeSettingsProps> = (props) => {
  const fontOptions = [
    {
      value:
        '"PingFang SC", "SF Pro SC", "Microsoft YaHei", "Droid Sans", "Roboto", "Ubuntu", "Helvetica Neue", "Helvetica", "Arial", system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
      label: '系统默认',
    },
    {
      value:
        '"Helvetica Neue", "Segoe UI", "Roboto", "SF Pro Text", "Ubuntu", "Noto Sans", -apple-system, BlinkMacSystemFont, "Arial", sans-serif',
      label: '英文无衬线',
    },
    {
      value:
        '"Georgia", "Source Serif Pro", "Noto Serif", "Droid Serif", "Times New Roman", "Apple Garamond", "Baskerville", serif',
      label: '英文衬线',
    },
    {
      value:
        '"Source Han Sans CN", "Noto Sans CJK SC", "Source Han Sans SC", "思源黑体", "Noto Sans SC", "HiraginoSans-W3", "Microsoft YaHei", "Droid Sans Fallback", sans-serif',
      label: '思源黑体',
    },
    {
      value:
        '"Source Han Serif CN", "Noto Serif CJK SC", "Source Han Serif SC", "思源宋体", "Noto Serif SC", "HiraginoSerif", "SimSun", "MS Mincho", serif',
      label: '思源宋体',
    },
    {
      value:
        '"KaiTi", "STKaiti", "楷体", "楷体_GB2312", "DFKai-SB", "TW-Kai", serif',
      label: '楷体',
    },
    {
      value:
        '"LiSu", "STLiti", "隶书", "隶书_GB2312", "DFLiSong-Lt", "Apple LiSung", serif',
      label: '隶书',
    },
    {
      value:
        '"XingKai SC", "STXingkai", "行楷", "华文行楷", "DFHanziPen", "HanziPen SC", "Hannotate SC", serif',
      label: '行楷',
    },
    {
      value:
        '"SimSun", "STSong", "宋体", "宋体_GB2312", "AR PL UMing CN", "TW-Sung", "WenQuanYi Bitmap Song", serif',
      label: '宋体',
    },
  ]

  const [fontFamily, setFontFamily] = createSignal(
    localStorage.getItem('reader-font-family') || fontOptions[0].value,
  )
  const [fontSize, setFontSize] = createSignal(
    Number(localStorage.getItem('reader-font-size')) || DEFAULT_FONT_SIZE,
  )
  const [lineHeight, setLineHeight] = createSignal(
    Number(localStorage.getItem('reader-line-height')) || DEFAULT_LINE_HEIGHT,
  )

  // 临时值，用于实时预览
  const [tempFontSize, setTempFontSize] = createSignal(fontSize())
  const [tempLineHeight, setTempLineHeight] = createSignal(lineHeight())

  const applySettings = (key: string, value: string | number) => {
    const root = document.documentElement
    root.style.setProperty(
      `--reader-${key}`,
      typeof value === 'number'
        ? `${value}${key === 'font-size' ? 'px' : ''}`
        : value,
    )
    localStorage.setItem(`reader-${key}`, value.toString())

    // 应用阅读样式
    manageReadabilityStyle(true)
  }

  const resetSettings = () => {
    // 移除阅读样式
    manageReadabilityStyle(false)

    // 重置状态但不清除CSS变量
    setFontFamily(fontOptions[0].value)
    setFontSize(DEFAULT_FONT_SIZE)
    setLineHeight(DEFAULT_LINE_HEIGHT)

    // 清除storage
    localStorage.removeItem('reader-font-family')
    localStorage.removeItem('reader-font-size')
    localStorage.removeItem('reader-line-height')
  }

  // 防抖处理函数
  const debouncedFontSize = debounce(200, (value: number) => {
    setFontSize(value)
    applySettings('font-size', value)
  })

  const debouncedLineHeight = debounce(200, (value: number) => {
    setLineHeight(value)
    applySettings('line-height', value)
  })

  // 添加 ESC 键监听
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      props.onClose()
    }
  }

  // 组件挂载时添加事件监听
  document.addEventListener('keydown', handleKeyDown)

  // 组件卸载时移除事件监听
  onCleanup(() => {
    document.removeEventListener('keydown', handleKeyDown)
  })

  return (
    <Portal>
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
        onClick={props.onClose}
      >
        <div
          class="fixed bottom-0 max-h-[80dvh] w-full max-w-md transform overflow-y-auto rounded-t-xl
                 bg-white shadow-xl md:relative md:bottom-auto
                 md:rounded-xl dark:bg-gray-800"
          onClick={(e) => e.stopPropagation()}
        >
          <div class="p-6">
            <h3 class="mb-4 text-lg font-medium text-gray-900 dark:text-gray-100">
              阅读设置
            </h3>

            <div class="space-y-4">
              {/* 字体选择 */}
              <div>
                <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  字体选择
                </label>
                <select
                  value={fontFamily()}
                  onChange={(e) => {
                    setFontFamily(e.currentTarget.value)
                    applySettings('font-family', e.currentTarget.value)
                  }}
                  class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                >
                  {fontOptions.map((option) => (
                    <option value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              {/* 字号设置 */}
              <div>
                <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  字号大小: {tempFontSize()}px
                </label>
                <input
                  type="range"
                  min="12"
                  max="24"
                  step="1"
                  value={tempFontSize()}
                  onInput={(e) => {
                    const value = Number(e.currentTarget.value)
                    setTempFontSize(value)
                    debouncedFontSize(value)
                  }}
                  class="w-full"
                />
              </div>

              {/* 行高设置 */}
              <div>
                <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  行间距: {tempLineHeight()}
                </label>
                <input
                  type="range"
                  min="1.2"
                  max="2.5"
                  step="0.05"
                  value={tempLineHeight()}
                  onInput={(e) => {
                    const value = Number(e.currentTarget.value)
                    setTempLineHeight(value)
                    debouncedLineHeight(value)
                  }}
                  class="w-full"
                />
              </div>

              {/* 重置按钮 */}
              <button
                onClick={resetSettings}
                class="mt-4 w-full rounded-md bg-gray-100 px-4 py-2 text-gray-800 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              >
                恢复默认设置
              </button>

              {/* 暗黑模式切换 */}
              <div>
                <button
                  onClick={toggleDarkMode}
                  class="flex w-full items-center justify-center gap-2 rounded-md bg-gradient-to-r from-blue-500 to-purple-500 px-4 py-2.5 text-white transition-all hover:from-blue-600 hover:to-purple-600 dark:from-purple-500 dark:to-pink-500 dark:hover:from-purple-600 dark:hover:to-pink-600"
                >
                  <Show when={isDark()} fallback={<SunIcon />}>
                    <MoonIcon />
                  </Show>
                  <span>
                    {isDark() ? '切换到亮色模式' : '切换到暗色模式'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  )
}

let settingsRoot: HTMLDivElement | null = null
let settingsComponent: any = null

// 暴露给全局的主题设置函数
const themeSetting = () => {
  if (!settingsRoot) {
    settingsRoot = document.createElement('div')
    document.body.appendChild(settingsRoot)
  }

  const cleanup = () => {
    if (settingsRoot) {
      settingsComponent?.()
      document.body.removeChild(settingsRoot)
      settingsRoot = null
      settingsComponent = null
    }
  }

  settingsComponent = render(
    () => <ThemeSettings onClose={cleanup} />,
    settingsRoot!,
  )
}

function initTheme() {
  ;(window as any).openThemeSetting = themeSetting
  ;(window as any).toggleDarkMode = toggleDarkMode

  document.addEventListener('DOMContentLoaded', () => {
    resumeReaderSettings()
  })
}

initTheme()
