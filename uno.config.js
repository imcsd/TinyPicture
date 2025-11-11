import { defineConfig, presetUno, presetIcons } from 'unocss'

export default defineConfig({
  presets: [
    presetUno(),
    presetIcons({
      scale: 1.2,
      warn: true
    })
  ],
  shortcuts: {
    'btn': 'px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600 cursor-pointer transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed',
    'btn-secondary': 'px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 cursor-pointer transition-colors',
    'input-field': 'px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 w-full',
    'card': 'bg-white rounded-lg shadow-md p-4',
    'section-title': 'text-lg font-semibold mb-3 flex items-center gap-2'
  },
  theme: {
    colors: {
      primary: '#3b82f6',
      secondary: '#6b7280'
    }
  }
})
