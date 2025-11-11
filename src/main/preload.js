const { contextBridge, ipcRenderer } = require('electron')

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 选择文件夹
  selectFolder: (title) => ipcRenderer.invoke('select-folder', title),

  // 扫描目录
  scanDirectory: (dirPath) => ipcRenderer.invoke('scan-directory', dirPath),

  // 预估压缩
  estimateCompression: (inputPath, settings) =>
    ipcRenderer.invoke('estimate-compression', { inputPath, settings }),

  // 开始压缩
  startCompression: (inputPath, outputPath, settings) =>
    ipcRenderer.invoke('start-compression', { inputPath, outputPath, settings }),

  // 监听压缩进度
  onCompressionProgress: (callback) => {
    ipcRenderer.on('compression-progress', (event, progress) => callback(progress))
  },

  // 移除进度监听器
  removeProgressListener: () => {
    ipcRenderer.removeAllListeners('compression-progress')
  }
})
