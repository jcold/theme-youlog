// SolidJS指令类型定义
type DirectiveFunction = (element: HTMLElement) => void

const autoFocus: DirectiveFunction = (el) => {
  requestAnimationFrame(() => {
    setTimeout(() => {
      el?.focus()
    }, 100)
  })
}

export default autoFocus

// 使用示例
// <div use:autoFocus>
//   当点击该元素外部区域时，会触发回调函数。
// </div>
