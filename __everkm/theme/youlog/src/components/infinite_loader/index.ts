import InfiniteLoader from './InfiniteLoader'
import {
  createStateChanger,
  LoadState,
  type StateChanger,
  type TLoaderFn,
} from './InfiniteLoaderTypes'

// 导出组件和值
export {InfiniteLoader, createStateChanger, LoadState}
// 导出类型
export type {StateChanger, TLoaderFn}

// 导出默认组件
export default InfiniteLoader
