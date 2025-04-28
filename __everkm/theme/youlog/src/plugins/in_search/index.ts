import {customElement, noShadowDOM} from 'solid-element'
import InSearch from './InSearch'

// 注册 InSearch 组件为自定义元素 'x-in-search'
customElement(
  'x-in-search',
  {
    appId: '',
    apiKey: '',
    index: '',
    site: '',
    onlyButton: 'false',
  },
  (props) => {
    noShadowDOM()
    return InSearch(props)
  },
)
