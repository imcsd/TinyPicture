const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const { scanDirectory, compressImages } = require('./compressor')
const { estimateCompression } = require('../utils/estimator')

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    autoHideMenuBar: true,
    title: 'TinyPicture - 图片压缩工具'
  })

  // 开发环境加载 Vite 服务器，生产环境加载打包后的文件
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    // 生产环境：加载打包后的文件
    // 打包后文件在 resources/app.asar 或 resources/app 目录中
    const indexPath = path.join(__dirname, '../../dist-electron/renderer/index.html')
    mainWindow.loadFile(indexPath)
  }
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// IPC 处理器

// 选择文件夹
ipcMain.handle('select-folder', async (event, title = '选择文件夹') => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title
  })

  if (result.canceled) {
    return null
  }

  return result.filePaths[0]
})

// 扫描目录
ipcMain.handle('scan-directory', async (event, dirPath) => {
  try {
    const result = await scanDirectory(dirPath)
    return { success: true, data: result }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// 预估压缩
ipcMain.handle('estimate-compression', async (event, { inputPath, settings }) => {
  try {
    const result = await estimateCompression(inputPath, settings)
    return { success: true, data: result }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// 开始压缩
ipcMain.handle('start-compression', async (event, { inputPath, outputPath, settings }) => {
  try {
    // 使用回调函数发送进度更新
    const onProgress = (progress) => {
      mainWindow.webContents.send('compression-progress', progress)
    }

    const result = await compressImages(inputPath, outputPath, settings, onProgress)
    return { success: true, data: result }
  } catch (error) {
    return { success: false, error: error.message }
  }
})
