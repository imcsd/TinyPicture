import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    vue(),
    UnoCSS()
  ],
  base: './', // 使用相对路径，确保打包后能正确加载资源
  build: {
    outDir: 'dist-electron/renderer',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: undefined // 避免代码分割导致的加载问题
      }
    }
  },
  server: {
    port: 5173
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
})
