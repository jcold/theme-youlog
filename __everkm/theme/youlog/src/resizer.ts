/**
 * 侧边栏宽度调整器
 * 实现拖动调整侧边栏宽度并持久化保存
 */
export class SidebarResizer {
  private sidebar: HTMLElement | null = null
  private resizer: HTMLElement | null = null
  private resizerHandle: HTMLElement | null = null
  private minWidth: number = 200 // 最小宽度
  private maxWidth: number = 600 // 最大宽度
  private defaultWidth: number = 288 // 默认宽度 (w-72 = 16rem = 288px)
  private isDragging: boolean = false
  private startX: number = 0
  private startWidth: number = 0
  private storageKey: string = 'sidebar-width'

  /**
   * 初始化侧边栏调整器
   * @param sidebarId 侧边栏元素ID
   */
  constructor(private sidebarId: string) {}

  /**
   * 设置调整器
   */
  public setup(): void {
    this.sidebar = document.getElementById(this.sidebarId)
    if (!this.sidebar) return

    this.createResizer()
    this.loadSavedWidth()
    this.addEventListeners()

    // 添加CSS变量并设置Tailwind类
    this.setupSidebarWidthWithTailwind()
  }

  /**
   * 使用Tailwind的任意值设置侧边栏宽度
   */
  private setupSidebarWidthWithTailwind(): void {
    if (!this.sidebar) return

    // 添加Tailwind的任意值类
    this.sidebar.classList.add('lg:w-[var(--sidebar-width)]')
  }

  /**
   * 创建调整器元素
   */
  private createResizer(): void {
    if (!this.sidebar) return

    // 创建调整器容器元素 - 捕获鼠标事件的宽区域
    this.resizer = document.createElement('div')
    this.resizer.className =
      'absolute top-0 right-0 w-5 h-full cursor-ew-resize z-10 transition-opacity hidden lg:block'

    // 添加拖动手柄线条 - 视觉指示器，居中对齐于分割线
    this.resizerHandle = document.createElement('div')
    this.resizerHandle.className =
      'absolute top-0 right-0 w-1 h-full bg-primary-200 dark:bg-primary-700 opacity-0 transition-all duration-200'

    // 为iPad等触摸设备添加点击区域提示
    const touchHint = document.createElement('div')
    touchHint.className =
      'absolute top-1/2 right-0 -translate-y-1/2 w-5 h-16 rounded-l-sm opacity-0 transition-opacity duration-200 bg-primary-100 dark:bg-primary-800'

    // 将点击提示放在最底层
    this.resizer.appendChild(touchHint)
    // 将拖动手柄放在上层
    this.resizer.appendChild(this.resizerHandle)

    this.sidebar.appendChild(this.resizer)
  }

  /**
   * 添加事件监听器
   */
  private addEventListeners(): void {
    if (!this.resizer || !this.sidebar || !this.resizerHandle) return

    // 悬停时显示高亮效果
    this.resizer.addEventListener('mouseenter', () => {
      this.showHighlight()
    })

    // 离开时隐藏高亮效果（除非正在拖动）
    this.resizer.addEventListener('mouseleave', () => {
      if (this.isDragging) return
      this.hideHighlight()
    })

    // 鼠标按下事件 - 开始拖动
    this.resizer.addEventListener('mousedown', (e) => {
      this.startDrag(e.clientX)
      
      // 添加拖动时的全局样式
      document.body.classList.add('select-none')
      document.body.style.cursor = 'ew-resize'
    })

    // 鼠标移动事件 - 调整宽度
    document.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return
      this.updateWidth(e.clientX)
    })

    // 触摸事件支持 - 为iPad等设备
    this.resizer.addEventListener('touchstart', (e) => {
      this.startDrag(e.touches[0].clientX)
      e.preventDefault() // 阻止默认行为以防止滚动
    })

    // 触摸移动事件
    document.addEventListener('touchmove', (e) => {
      if (!this.isDragging) return
      this.updateWidth(e.touches[0].clientX)
      e.preventDefault() // 阻止默认行为以防止滚动
    })

    // 触摸结束事件
    document.addEventListener('touchend', () => {
      this.endDrag()
    })

    // 鼠标松开事件 - 结束拖动
    document.addEventListener('mouseup', () => {
      if (!this.isDragging) return
      
      // 移除拖动时的全局样式
      document.body.classList.remove('select-none')
      document.body.style.cursor = ''
      
      this.endDrag()
      
      // 如果鼠标不在调整器上，恢复默认样式
      if (this.resizer && !this.resizer.matches(':hover')) {
        this.hideHighlight()
      }
    })
  }

  /**
   * 显示高亮效果
   */
  private showHighlight(): void {
    if (!this.resizerHandle) return
    
    this.resizerHandle.classList.add(
      'opacity-100',
      'bg-brand-primary'
    )
    this.resizerHandle.classList.remove(
      'bg-border',
      'opacity-0'
    )
  }

  /**
   * 隐藏高亮效果
   */
  private hideHighlight(): void {
    if (!this.resizerHandle) return
    
    this.resizerHandle.classList.remove(
      'opacity-100',
      'bg-brand-primary'
    )
    this.resizerHandle.classList.add(
      'bg-border',
      'opacity-0'
    )
  }

  /**
   * 显示触摸提示区域
   */
  private showTouchHint(): void {
    if (!this.resizer) return
    
    const touchHint = this.resizer.querySelector('div:first-child')
    if (touchHint) {
      (touchHint as HTMLElement).classList.add('opacity-30')
    }
  }

  /**
   * 隐藏触摸提示区域
   */
  private hideTouchHint(): void {
    if (!this.resizer) return
    
    const touchHint = this.resizer.querySelector('div:first-child')
    if (touchHint) {
      (touchHint as HTMLElement).classList.remove('opacity-30')
    }
  }

  /**
   * 开始拖动
   */
  private startDrag(clientX: number): void {
    if (!this.sidebar || !this.resizer || !this.resizerHandle) return

    this.isDragging = true
    this.startX = clientX
    this.startWidth = this.sidebar.offsetWidth

    this.showHighlight()
    this.showTouchHint()
  }

  /**
   * 更新宽度
   */
  private updateWidth(clientX: number): void {
    if (!this.sidebar) return

    const width = this.startWidth + (clientX - this.startX)
    
    // 限制宽度范围
    const newWidth = Math.min(Math.max(width, this.minWidth), this.maxWidth)
    
    // 使用CSS变量更新宽度 - 设置到根元素
    document.documentElement.style.setProperty(
      '--sidebar-width',
      `${newWidth}px`,
    )
  }

  /**
   * 结束拖动
   */
  private endDrag(): void {
    if (!this.isDragging || !this.sidebar) return
    
    this.isDragging = false
    this.hideHighlight()
    this.hideTouchHint()
    
    // 保存当前宽度
    this.saveWidth(this.sidebar.offsetWidth)
  }

  /**
   * 保存宽度到本地存储
   */
  private saveWidth(width: number): void {
    localStorage.setItem(this.storageKey, width.toString())
  }

  /**
   * 加载保存的宽度
   */
  private loadSavedWidth(): void {
    const savedWidth = localStorage.getItem(this.storageKey)
    let validWidth = false
    if (savedWidth) {
      const width = parseInt(savedWidth, 10)
      if (!isNaN(width) && width >= this.minWidth && width <= this.maxWidth) {
        // 设置CSS变量到根元素
        document.documentElement.style.setProperty(
          '--sidebar-width',
          `${width}px`,
        )
        validWidth = true
      }
    }
    
    // 如果宽度无效，则重置宽度
    if (!validWidth) {
      this.resetWidth()
    }
  }

  /**
   * 重置宽度为默认值
   */
  public resetWidth(): void {
    if (!this.sidebar) return

    // 重置CSS变量为默认值
    document.documentElement.style.setProperty(
      '--sidebar-width',
      `${this.defaultWidth}px`,
    )
    localStorage.removeItem(this.storageKey)
  }
}

/**
 * 全局初始化函数，用于在HTML中直接调用
 */
export function initSidebarResizer(sidebarId: string): void {
  const resizer = new SidebarResizer(sidebarId)

  document.addEventListener('DOMContentLoaded', () => {
    resizer.setup()
  })
}
