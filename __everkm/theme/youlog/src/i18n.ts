// 简单的 i18n 实现
// const translations = {
//   'infinite_load:loading': {
//     zh: '加载中...',
//     en: 'Loading...',
//   },
//   'infinite_load:no_more': {
//     zh: '没有更多内容',
//     en: 'No more content',
//   },
// }

// export default useTranslate(translations)

// 获取当前语言，默认为中文
function getCurrentLang() {
  // 可以从 HTML 的 lang 属性或浏览器语言获取
  // 这里简单实现，实际使用可能需要更复杂的逻辑
  const htmlLang = document.documentElement.lang || ''
  if (htmlLang.startsWith('en')) {
    return 'en'
  }
  return 'zh'
}

// 为扩展性提供的工具函数
export function useTranslate(
  customTranslations: Record<string, Record<string, string>>,
) {
  return (key: string, params?: Record<string, string | boolean | number>) => {
    const keyTranslations = customTranslations[key] || {}
    const lang = getCurrentLang()
    let translated = keyTranslations[lang] || key
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        translated = translated.replace(`{${k}}`, v.toString())
      })
    }
    return translated
  }
}
