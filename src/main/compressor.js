const sharp = require('sharp')
const fs = require('fs')
const path = require('path')
const { walkDirectory, getTotalSize, ensureDirectoryExists } = require('../utils/fileWalker')
const { hasExifDate, formatExifDate, analyzeExifInfo } = require('./exifHandler')

/**
 * 扫描目录，获取所有图片文件信息
 * @param {string} dirPath - 目录路径
 * @returns {Promise<Object>} 扫描结果
 */
async function scanDirectory(dirPath) {
  const files = walkDirectory(dirPath)
  const totalSize = getTotalSize(files)

  // 分析 EXIF 信息
  const exifInfo = await analyzeExifInfo(files)

  return {
    files,
    fileCount: files.length,
    totalSize,
    exifInfo
  }
}

/**
 * 压缩单张图片
 * @param {Object} file - 文件信息
 * @param {string} outputPath - 输出路径
 * @param {Object} settings - 压缩设置
 * @returns {Promise<Object>} 压缩结果
 */
async function compressImage(file, outputPath, settings) {
  const {
    quality = 80,
    maxSize = null, // 最大边长限制
    format = 'original', // 'original' | 'webp'
    keepExif = true,
    autoFillExifDate = false,
    keepTimestamp = true
  } = settings

  try {
    let sharpInstance = sharp(file.fullPath)

    // 获取图片元数据
    const metadata = await sharpInstance.metadata()

    // 分辨率调整
    if (maxSize && (metadata.width > maxSize || metadata.height > maxSize)) {
      sharpInstance = sharpInstance.resize(maxSize, maxSize, {
        fit: 'inside',
        withoutEnlargement: true
      })
    }

    // 处理 EXIF
    if (keepExif) {
      if (autoFillExifDate) {
        const hasDate = await hasExifDate(file.fullPath)
        if (!hasDate) {
          // 使用文件修改时间作为拍摄时间
          const exifDate = formatExifDate(file.mtime)
          sharpInstance = sharpInstance.withMetadata({
            exif: {
              IFD0: {
                DateTime: exifDate
              },
              IFD1: {
                DateTimeOriginal: exifDate,
                DateTimeDigitized: exifDate
              }
            }
          })
        } else {
          sharpInstance = sharpInstance.withMetadata()
        }
      } else {
        sharpInstance = sharpInstance.withMetadata()
      }
    }

    // 确定输出格式和文件名
    let outputFilePath = outputPath
    let outputFormat = format === 'original' ? file.ext.slice(1) : format

    if (format === 'webp' && file.ext !== '.webp') {
      outputFilePath = outputPath.replace(file.ext, '.webp')
    }

    // 根据格式应用压缩
    switch (outputFormat) {
      case 'jpg':
      case 'jpeg':
        sharpInstance = sharpInstance.jpeg({
          quality,
          mozjpeg: true
        })
        break
      case 'png':
        sharpInstance = sharpInstance.png({
          quality,
          compressionLevel: 9,
          palette: true
        })
        break
      case 'webp':
        sharpInstance = sharpInstance.webp({
          quality,
          effort: 6
        })
        break
      default:
        // 保持原格式
        break
    }

    // 确保输出目录存在
    ensureDirectoryExists(path.dirname(outputFilePath))

    // 保存压缩后的图片
    await sharpInstance.toFile(outputFilePath)

    // 获取压缩后的文件大小
    const outputStats = fs.statSync(outputFilePath)
    const compressedSize = outputStats.size

    // 恢复文件时间戳
    if (keepTimestamp) {
      fs.utimesSync(outputFilePath, file.atime, file.mtime)
    }

    return {
      success: true,
      originalSize: file.size,
      compressedSize,
      savedSize: file.size - compressedSize,
      compressionRatio: ((file.size - compressedSize) / file.size * 100).toFixed(2)
    }
  } catch (error) {
    console.error(`Error compressing ${file.fullPath}:`, error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * 批量压缩图片
 * @param {string} inputPath - 输入路径
 * @param {string} outputPath - 输出路径
 * @param {Object} settings - 压缩设置
 * @param {Function} onProgress - 进度回调
 * @returns {Promise<Object>} 压缩结果统计
 */
async function compressImages(inputPath, outputPath, settings, onProgress) {
  const scanResult = await scanDirectory(inputPath)
  const { files } = scanResult

  let processedCount = 0
  let successCount = 0
  let failedCount = 0
  let totalOriginalSize = 0
  let totalCompressedSize = 0

  for (const file of files) {
    // 计算输出路径（保持目录结构）
    const outputFilePath = path.join(outputPath, file.relativePath)

    // 压缩图片
    const result = await compressImage(file, outputFilePath, settings)

    processedCount++

    if (result.success) {
      successCount++
      totalOriginalSize += result.originalSize
      totalCompressedSize += result.compressedSize
    } else {
      failedCount++
    }

    // 发送进度更新
    if (onProgress) {
      onProgress({
        current: processedCount,
        total: files.length,
        percent: ((processedCount / files.length) * 100).toFixed(2),
        currentFile: file.name,
        success: result.success,
        savedSize: totalOriginalSize - totalCompressedSize
      })
    }
  }

  const totalSaved = totalOriginalSize - totalCompressedSize
  const compressionRatio = totalOriginalSize > 0
    ? ((totalSaved / totalOriginalSize) * 100).toFixed(2)
    : 0

  return {
    total: files.length,
    success: successCount,
    failed: failedCount,
    originalSize: totalOriginalSize,
    compressedSize: totalCompressedSize,
    savedSize: totalSaved,
    compressionRatio
  }
}

module.exports = {
  scanDirectory,
  compressImage,
  compressImages
}
