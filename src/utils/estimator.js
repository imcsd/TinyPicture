const path = require('path')
const os = require('os')
const fs = require('fs')
const { walkDirectory, getTotalSize, formatFileSize } = require('./fileWalker')
const { compressImage } = require('../main/compressor')
const { analyzeExifInfo } = require('../main/exifHandler')

/**
 * 随机采样文件
 * @param {Array} files - 文件数组
 * @param {number} count - 采样数量
 * @returns {Array} 采样结果
 */
function randomSample(files, count) {
  const shuffled = [...files].sort(() => 0.5 - Math.random())
  return shuffled.slice(0, count)
}

/**
 * 预估压缩效果
 * @param {string} inputPath - 输入路径
 * @param {Object} settings - 压缩设置
 * @returns {Promise<Object>} 预估结果
 */
async function estimateCompression(inputPath, settings) {
  // 1. 扫描所有图片
  const files = walkDirectory(inputPath)
  const totalSize = getTotalSize(files)

  if (files.length === 0) {
    throw new Error('未找到任何图片文件')
  }

  // 2. 确定采样数量（最多 10 张，或总数的 10%）
  const sampleCount = Math.min(10, Math.max(1, Math.ceil(files.length * 0.1)))
  const samples = randomSample(files, sampleCount)

  // 3. 创建临时目录用于测试压缩
  const tempDir = path.join(os.tmpdir(), 'tinypicture-estimate')
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true })
  }

  // 4. 试压缩采样图片
  let totalOriginal = 0
  let totalCompressed = 0
  const sampleResults = []

  for (const file of samples) {
    const tempOutputPath = path.join(tempDir, `test_${path.basename(file.fullPath)}`)

    try {
      const result = await compressImage(file, tempOutputPath, settings)

      if (result.success) {
        totalOriginal += result.originalSize
        totalCompressed += result.compressedSize

        sampleResults.push({
          name: file.name,
          originalSize: result.originalSize,
          compressedSize: result.compressedSize,
          savedPercent: result.compressionRatio
        })
      }

      // 删除临时文件
      if (fs.existsSync(tempOutputPath)) {
        fs.unlinkSync(tempOutputPath)
      }
    } catch (error) {
      console.error(`Error estimating ${file.name}:`, error)
    }
  }

  // 5. 清理临时目录
  try {
    fs.rmdirSync(tempDir, { recursive: true })
  } catch (error) {
    // 忽略清理错误
  }

  // 6. 计算压缩率
  const compressionRatio = totalOriginal > 0 ? totalCompressed / totalOriginal : 1

  // 7. 推算总体积
  const estimatedSize = Math.round(totalSize * compressionRatio)
  const savedSize = totalSize - estimatedSize
  const savedPercent = totalSize > 0 ? ((savedSize / totalSize) * 100).toFixed(0) : 0

  // 8. 分析 EXIF 信息
  const exifInfo = await analyzeExifInfo(files)

  return {
    fileCount: files.length,
    originalSize: totalSize,
    originalSizeFormatted: formatFileSize(totalSize),
    estimatedSize,
    estimatedSizeFormatted: formatFileSize(estimatedSize),
    savedSize,
    savedSizeFormatted: formatFileSize(savedSize),
    savedPercent,
    sampleCount,
    sampleResults,
    averageOriginalSize: Math.round(totalSize / files.length),
    averageEstimatedSize: Math.round(estimatedSize / files.length),
    exifInfo
  }
}

module.exports = {
  estimateCompression,
  randomSample
}
