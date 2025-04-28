import type { Accessor } from "solid-js"

// SolidJS指令类型定义
type DirectiveFunction = (element: HTMLElement, accessor: () => Accessor<() => void>) => void | (() => void)

const clickOutside: DirectiveFunction = (el, accessor) => {
  const callback = accessor()

  const handleClick = (e: MouseEvent) => {
    if (el && !el.contains(e.target as Node)) {
      callback()
    }
  }

  document.addEventListener('click', handleClick)
  
  return () => document.removeEventListener('click', handleClick)
}

export default clickOutside

// 使用示例
// <div use:clickOutside={handleClickOutside}>
//   当点击该元素外部区域时，会触发回调函数。
// </div>
