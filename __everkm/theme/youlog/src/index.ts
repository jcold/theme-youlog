import './main.css'
import './theme.tsx'
import './markdown.css'
import './navigation/navigation.tsx'
import {initSidebarNavTree} from './sidebar_nav_tree/sidebarNavTree'
import {initToc} from './toc/toc'
import './pageAjax'
import {initDrawer} from './drawer'
import {initSidebarResizer} from './resizer'
import {initLazyImg} from './lazyImage'
import {initAppHeader} from './appHeader'
import initKeywordHighlighter from './modules/keywordHighlighter'
import './yousha'

// 调用初始化TOC函数
initToc()

// 调用初始化侧边栏导航树函数
initSidebarNavTree()

// 调用初始化抽屉函数
initDrawer('sidebar-nav')

// 初始化侧边栏宽度调整器
initSidebarResizer('sidebar-nav')

// 初始化懒加载图片
initLazyImg()

// 初始化应用头部
initAppHeader()

// 初始化关键词高亮
initKeywordHighlighter('#article-main')
