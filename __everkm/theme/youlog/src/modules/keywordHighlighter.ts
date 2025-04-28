import Mark from 'mark.js'
import {EVENT_PAGE_LOADED} from 'pageAjax'
import scrollIntoView from 'scroll-into-view-if-needed'

// 从当前URL中获取高亮关键字
function extractKeywordsFromUrl() {
  const u = new URL(window.location.href)
  const param = u.searchParams.get('__hlts') || ''
  if (!param) {
    return null
  }

  const words = JSON.parse(param)
  if (!Array.isArray(words)) {
    return
  }
  return words
}

function markKeywords(
  words: string[],
  container: HTMLElement | Document = document.body,
) {
  const mark = new Mark(container)
  mark.mark(words, {
    className: '!bg-[yellow]',
    // 忽略高亮，则无法定位，所以去除
    // exclude: ['pre code'],
  })
}

function setupKeywordHighlighter(container?: HTMLElement) {
  const words = extractKeywordsFromUrl()
  if (!words) {
    return
  }

  markKeywords(words, container)

  const target = document.querySelectorAll('mark[data-markjs]')
  if (target.length === 0) {
    return
  }
  let focusEl = target[0] as HTMLElement

  // 向上搜索，确定是否代码块，若是则将目标修改为该代码块，
  // 因为代码高亮会修改dom, 造成节点无效
  let currentEl = focusEl
  while (
    currentEl.parentElement &&
    currentEl.parentElement.tagName.toLowerCase() !== 'pre'
  ) {
    currentEl = currentEl.parentElement
    if (currentEl.tagName.toLowerCase() === 'code') {
      focusEl = currentEl
      break
    }
  }

  console.log('scrollIntoView ', focusEl)
  setTimeout(() => {
    scrollIntoView(focusEl, {
      scrollMode: 'if-needed',
      block: 'start',
      inline: 'nearest',
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

    console.log('second mark highlight', 'complete')
    markKeywords(words, focusEl)
  }, 300)
}

function initKeywordHighlighter(container_selector: string) {
  document.addEventListener('DOMContentLoaded', () => {
    const container =
      document.querySelector(container_selector) || document.body
    setupKeywordHighlighter(container as HTMLElement)
  })

  document.addEventListener(EVENT_PAGE_LOADED, (e) => {
    const container =
      document.querySelector(container_selector) || document.body
    setupKeywordHighlighter(container as HTMLElement)
  })
}

export default initKeywordHighlighter
