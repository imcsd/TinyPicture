const fs = require('fs')
const path = require('path')

// 支持的图片格式
const SUPPORTED_FORMATS = ['.jpg', '.jpeg', '.png', '.webp', '.tiff', '.tif', '.gif', '.avif']

/**
 * 递归遍历目录，获取所有图片文件
 * @param {string} dirPath - 目录路径
 * @param {string} basePath - 基础路径（用于计算相对路径）
 * @returns {Array} 图片文件信息数组
 */
function walkDirectory(dirPath, basePath = dirPath) {
  const results = []

  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name)

      if (entry.isDirectory()) {
        // 递归遍历子目录
        const subResults = walkDirectory(fullPath, basePath)
        results.push(...subResults)
      } else if (entry.isFile()) {
        // 检查是否为支持的图片格式
        const ext = path.extname(entry.name).toLowerCase()
        if (SUPPORTED_FORMATS.includes(ext)) {
          const stats = fs.statSync(fullPath)
          const relativePath = path.relative(basePath, fullPath)

          results.push({
            fullPath,
            relativePath,
            name: entry.name,
            size: stats.size,
            mtime: stats.mtime,
            atime: stats.atime,
            birthtime: stats.birthtime,
            ext
          })
        }
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error)
    throw error
  }

  return results
}

/**
 * 格式化文件大小
 * @param {number} bytes - 字节数
 * @returns {string} 格式化后的大小
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * 计算总文件大小
 * @param {Array} files - 文件信息数组
 * @returns {number} 总大小（字节）
 */
function getTotalSize(files) {
  return files.reduce((total, file) => total + file.size, 0)
}

/**
 * 确保目录存在，不存在则创建
 * @param {string} dirPath - 目录路径
 */
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

module.exports = {
  walkDirectory,
  formatFileSize,
  getTotalSize,
  ensureDirectoryExists,
  SUPPORTED_FORMATS
}
