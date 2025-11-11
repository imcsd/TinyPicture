const sharp = require('sharp')

/**
 * 格式化日期为 EXIF 格式
 * @param {Date} date - 日期对象
 * @returns {string} EXIF 格式的日期字符串 (YYYY:MM:DD HH:mm:ss)
 */
function formatExifDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')

  return `${year}:${month}:${day} ${hours}:${minutes}:${seconds}`
}

/**
 * 检查图片是否有 EXIF 拍摄时间
 * @param {string} imagePath - 图片路径
 * @returns {Promise<boolean>} 是否有拍摄时间
 */
async function hasExifDate(imagePath) {
  try {
    const metadata = await sharp(imagePath).metadata()

    // 检查是否有 EXIF 数据和拍摄时间
    if (metadata.exif) {
      const exifBuffer = metadata.exif
      const exifString = exifBuffer.toString()

      // 检查常见的拍摄时间字段
      return exifString.includes('DateTimeOriginal') ||
             exifString.includes('DateTime') ||
             exifString.includes('DateTimeDigitized')
    }

    return false
  } catch (error) {
    console.error(`Error checking EXIF for ${imagePath}:`, error)
    return false
  }
}

/**
 * 为图片添加 EXIF 拍摄时间
 * @param {Object} sharpInstance - Sharp 实例
 * @param {Date} date - 要设置的日期
 * @returns {Object} 配置了 EXIF 的 Sharp 实例
 */
function addExifDate(sharpInstance, date) {
  const exifDate = formatExifDate(date)

  // 注意：Sharp 的 withMetadata 可以保留原有 EXIF，但添加新字段比较复杂
  // 这里使用简化方案，在压缩时保留原有 EXIF
  return sharpInstance.withMetadata({
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
}

/**
 * 批量检查文件的 EXIF 信息
 * @param {Array} files - 文件信息数组
 * @returns {Promise<Object>} 统计信息
 */
async function analyzeExifInfo(files) {
  let hasExifCount = 0
  let missingExifCount = 0
  const missingExifFiles = []

  // 只检查前 50 个文件作为采样（避免太慢）
  const sampleSize = Math.min(50, files.length)
  const sampleFiles = files.slice(0, sampleSize)

  for (const file of sampleFiles) {
    const hasDate = await hasExifDate(file.fullPath)
    if (hasDate) {
      hasExifCount++
    } else {
      missingExifCount++
      missingExifFiles.push(file.relativePath)
    }
  }

  // 根据采样比例推算总数
  const ratio = files.length / sampleSize
  const estimatedMissing = Math.round(missingExifCount * ratio)
  const estimatedHas = Math.round(hasExifCount * ratio)

  return {
    total: files.length,
    hasExif: estimatedHas,
    missingExif: estimatedMissing,
    sampleSize,
    missingExifFiles: missingExifFiles.slice(0, 10) // 只返回前 10 个示例
  }
}

module.exports = {
  formatExifDate,
  hasExifDate,
  addExifDate,
  analyzeExifInfo
}
