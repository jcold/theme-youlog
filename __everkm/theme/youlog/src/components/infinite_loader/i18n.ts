import {useTranslate} from 'i18n'

export const translations = {
  loading: {
    zh: '加载中...',
    en: 'Loading...',
  },
  no_more: {
    zh: '没有更多了',
    en: 'No more content',
  },
  loading_error: {
    zh: '加载失败',
    en: 'Loading failed',
  },
  retry: {
    zh: '重试',
    en: 'Retry',
  },
}

export default useTranslate(translations)
