/**
 * 侧边栏抽屉组件逻辑
 */
import { EVENT_PAGE_LOADED } from './pageAjax'

export class Drawer {
  private id: string
  private isOpen: boolean = false
  private sidebar: HTMLElement | null = null
  private overlay: HTMLElement | null = null
  private toggleButtons: NodeListOf<HTMLElement> | [] = []
  private closeButton: HTMLElement | null = null

  /**
   * 初始化抽屉组件
   */
  constructor(id: string) {
    this.id = id
  }

  public setup(): void {
    this.initElements()
    this.addEventListeners()
  }

  /**
   * 初始化DOM元素引用
   */
  private initElements(): void {
    // 侧边栏元素
    this.sidebar = document.getElementById(this.id)

    // 遮罩层元素 - 创建一个新的遮罩层元素，用于移动端显示
    this.overlay = document.createElement('div')
    this.overlay.className =
      'fixed inset-0 bg-gray-500 bg-opacity-75 z-40 lg:hidden transition-opacity hidden'
    document.body.appendChild(this.overlay)

    // 查找切换按钮
    this.toggleButtons = document.querySelectorAll(
      `[data-drawer-toggle="${this.id}"]`,
    )

    // 查找关闭按钮
    this.closeButton = document.querySelector(
      `[data-drawer-close="${this.id}"]`,
    )
  }

  /**
   * 添加事件监听器
   */
  private addEventListeners(): void {
    // 为切换按钮添加点击事件
    this.toggleButtons.forEach((button) => {
      button.addEventListener('click', () => this.toggle())
    })

    // 为关闭按钮添加点击事件
    if (this.closeButton) {
      this.closeButton.addEventListener('click', () => this.close())
    }

    // 为遮罩层添加点击事件
    if (this.overlay) {
      this.overlay.addEventListener('click', () => this.close())
    }

    // 响应窗口大小变化
    window.addEventListener('resize', () => {
      this.isOpen = false
    })

    // 监听页面加载完成事件，在移动端时关闭抽屉
    document.addEventListener(EVENT_PAGE_LOADED, () => {
      if (window.innerWidth < 1024 && this.isOpen) {
        this.close()
      }
    })
  }

  /**
   * 切换抽屉状态
   */
  public toggle(): void {
    if (this.isOpen) {
      this.close()
    } else {
      this.open()
    }
  }

  /**
   * 打开抽屉
   */
  public open(): void {
    if (this.sidebar) {
      this.showSidebar()

      // 在小屏幕上显示遮罩
      if (window.innerWidth < 1024) {
        this.showOverlay()
      }

      this.isOpen = true
    }
  }

  /**
   * 关闭抽屉
   */
  public close(): void {
    if (this.sidebar && window.innerWidth < 1024) {
      this.hideSidebar()
      this.hideOverlay()
      this.isOpen = false
    }
  }

  /**
   * 显示侧边栏
   */
  private showSidebar(): void {
    if (this.sidebar) {
      this.sidebar.classList.remove('-translate-x-full')
      this.sidebar.classList.add('translate-x-0')
    }
  }

  /**
   * 隐藏侧边栏
   */
  private hideSidebar(): void {
    if (this.sidebar) {
      this.sidebar.classList.remove('translate-x-0')
      this.sidebar.classList.add('-translate-x-full')
    }
  }

  /**
   * 显示遮罩
   */
  private showOverlay(): void {
    if (this.overlay) {
      this.overlay.classList.remove('hidden')
    }
  }

  /**
   * 隐藏遮罩
   */
  private hideOverlay(): void {
    if (this.overlay) {
      this.overlay.classList.add('hidden')
    }
  }
}

// 初始化并导出抽屉实例

// 导出全局初始化函数，用于在HTML中直接调用
export function initDrawer(id: string): void {
  const drawer = new Drawer(id)

  document.addEventListener('DOMContentLoaded', () => {
    drawer.setup()
  })
}
