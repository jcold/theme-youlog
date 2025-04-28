const {addDynamicIconSelectors} = require('@iconify/tailwind')

module.exports = {
  content: [
    './templates/**/*.{html,js,jsx,ts,tsx}',
    './src/**/*.{html,js,jsx,ts,tsx}',
  ],
  plugins: [addDynamicIconSelectors()],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // 品牌色 - 主色调
        brand: {
          primary: {
            DEFAULT: 'var(--brand-primary)',
            light: 'var(--brand-primary-light)',
            dark: 'var(--brand-primary-dark)',
            subtle: 'var(--brand-primary-subtle)',
          },
          secondary: {
            DEFAULT: 'var(--brand-secondary)',
            light: 'var(--brand-secondary-light)',
            dark: 'var(--brand-secondary-dark)',
          },
        },

        // 功能色
        accent: 'var(--accent)',
        success: 'var(--success)',
        warning: 'var(--warning)',
        error: 'var(--error)',
        info: 'var(--info)',

        // 中性色
        background: {
          DEFAULT: 'var(--background)',
          elevated: 'var(--background-elevated)',
          dark: 'var(--background-dark)',
        },
        surface: {
          DEFAULT: 'var(--surface)',
          muted: 'var(--surface-muted)',
        },
        border: {
          DEFAULT: 'var(--border)',
          strong: 'var(--border-strong)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
          onPrimary: 'var(--text-on-primary)',
          onAccent: 'var(--text-on-accent)',
          onDark: 'var(--text-on-dark)',
        },

        // 状态色
        state: {
          hover: 'var(--state-hover)',
          active: 'var(--state-active)',
          disabled: {
            bg: 'var(--state-disabled-bg)',
            text: 'var(--state-disabled-text)',
          },
        },

        // 链接颜色
        link: {
          DEFAULT: 'var(--link)',
          hover: 'var(--link-hover)',
          visited: 'var(--link-visited)',
        },
      },
    },
  },
}
