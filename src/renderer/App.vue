<template>
  <div class="min-h-screen bg-gray-100 p-4">
    <div class="max-w-3xl mx-auto">
      <!-- 标题 -->
      <div class="text-center mb-4">
        <h1 class="text-2xl font-bold text-gray-800 mb-1">TinyPicture</h1>
        <p class="text-sm text-gray-600">图片压缩工具</p>
      </div>

      <!-- 主卡片 -->
      <div class="card space-y-4">
        <!-- 路径选择 -->
        <section>
          <div class="space-y-2">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">原图路径</label>
              <div class="flex gap-2">
                <input
                  v-model="inputPath"
                  type="text"
                  class="input-field text-sm"
                  placeholder="选择原图文件夹"
                  readonly
                />
                <button @click="selectInputFolder" class="btn text-sm whitespace-nowrap px-3 py-1.5">浏览</button>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">输出路径</label>
              <div class="flex gap-2">
                <input
                  v-model="outputPath"
                  type="text"
                  class="input-field text-sm"
                  placeholder="选择输出文件夹"
                  readonly
                />
                <button @click="selectOutputFolder" class="btn text-sm whitespace-nowrap px-3 py-1.5">浏览</button>
              </div>
            </div>
          </div>
        </section>

        <!-- 压缩设置 -->
        <section>
          <h2 class="text-base font-semibold mb-2 flex items-center gap-2">
            <span>⚙️</span>
            压缩设置
          </h2>

          <div class="grid grid-cols-2 gap-4">
            <!-- 左侧：基础设置 -->
            <div class="space-y-3">
              <!-- 图片质量 -->
              <div>
                <div class="flex justify-between items-center mb-1">
                  <label class="text-sm font-medium text-gray-700">图片质量</label>
                  <span class="text-sm font-semibold text-blue-600">{{ settings.quality }}</span>
                </div>
                <input
                  v-model.number="settings.quality"
                  type="range"
                  min="0"
                  max="100"
                  class="w-full h-2"
                />
                <p class="text-xs text-gray-500 mt-0.5">推荐 75-85</p>
              </div>

              <!-- 分辨率限制 -->
              <div>
                <label class="text-sm font-medium text-gray-700 mb-1 block">分辨率限制</label>
                <div class="space-y-1.5">
                  <label class="flex items-center gap-1.5 cursor-pointer">
                    <input
                      v-model="settings.resizeMode"
                      type="radio"
                      value="none"
                      class="cursor-pointer"
                    />
                    <span class="text-sm">保持原始</span>
                  </label>
                  <label class="flex items-center gap-1.5 cursor-pointer">
                    <input
                      v-model="settings.resizeMode"
                      type="radio"
                      value="limit"
                      class="cursor-pointer"
                    />
                    <span class="text-sm">限制最大边长</span>
                  </label>
                  <select v-if="settings.resizeMode === 'limit'" v-model.number="settings.maxSize" class="input-field text-sm py-1 w-full">
                    <option :value="3840">4K (3840px)</option>
                    <option :value="2560">2K (2560px)</option>
                    <option :value="1920">Full HD (1920px)</option>
                    <option :value="1280">HD (1280px)</option>
                    <option value="custom">自定义</option>
                  </select>
                  <input
                    v-if="settings.resizeMode === 'limit' && settings.maxSize === 'custom'"
                    v-model.number="settings.customMaxSize"
                    type="number"
                    class="input-field text-sm py-1 w-full"
                    placeholder="输入自定义尺寸"
                    min="100"
                  />
                </div>
              </div>

              <!-- 输出格式 -->
              <div>
                <label class="text-sm font-medium text-gray-700 mb-1 block">输出格式</label>
                <div class="space-y-1.5">
                  <label class="flex items-center gap-1.5 cursor-pointer">
                    <input
                      v-model="settings.format"
                      type="radio"
                      value="original"
                      class="cursor-pointer"
                    />
                    <span class="text-sm">保持原格式</span>
                  </label>
                  <label class="flex items-center gap-1.5 cursor-pointer">
                    <input
                      v-model="settings.format"
                      type="radio"
                      value="webp"
                      class="cursor-pointer"
                    />
                    <span class="text-sm">转换为 WebP</span>
                  </label>
                </div>
              </div>
            </div>

            <!-- 右侧：高级选项 -->
            <div class="border-l pl-4">
              <h3 class="text-sm font-medium text-gray-700 mb-2">高级选项</h3>
              <div class="space-y-2">
                <label class="flex items-center gap-1.5 cursor-pointer">
                  <input
                    v-model="settings.keepExif"
                    type="checkbox"
                    class="cursor-pointer"
                  />
                  <span class="text-sm">保留原有 EXIF 信息</span>
                </label>
                <label class="flex items-center gap-1.5 cursor-pointer">
                  <input
                    v-model="settings.autoFillExifDate"
                    type="checkbox"
                    class="cursor-pointer"
                    :disabled="!settings.keepExif"
                  />
                  <span class="text-sm" :class="{ 'text-gray-400': !settings.keepExif }">自动补全缺失的拍摄时间</span>
                </label>
                <p class="text-xs text-gray-500 ml-5">将使用文件修改时间填充</p>
                <label class="flex items-center gap-1.5 cursor-pointer">
                  <input
                    v-model="settings.keepTimestamp"
                    type="checkbox"
                    class="cursor-pointer"
                  />
                  <span class="text-sm">保持原文件修改时间</span>
                </label>
              </div>
            </div>
          </div>
        </section>

        <!-- 压缩预览 -->
        <section>
          <h2 class="text-base font-semibold mb-2 flex items-center gap-2">
            <span>📊</span>
            压缩预览
          </h2>

          <div class="bg-gray-50 rounded-lg p-3 space-y-2">
            <button
              @click="startEstimate"
              :disabled="!inputPath || estimating"
              class="btn w-full text-sm py-1.5"
            >
              {{ estimating ? '正在分析...' : '开始预估' }}
            </button>

            <div v-if="estimateResult" class="space-y-1 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-600">总文件数：</span>
                <span class="font-semibold">{{ estimateResult.fileCount }} 张</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">压缩前：</span>
                <span class="font-semibold">{{ estimateResult.originalSizeFormatted }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">预计后：</span>
                <span class="font-semibold text-green-600">
                  ~{{ estimateResult.estimatedSizeFormatted }} ({{ estimateResult.savedPercent }}%)
                </span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">基于样本：</span>
                <span class="text-gray-500">{{ estimateResult.sampleCount }} 张</span>
              </div>

              <!-- EXIF 缺失提示 -->
              <div
                v-if="estimateResult.exifInfo && estimateResult.exifInfo.missingExif > 0"
                class="bg-yellow-50 border border-yellow-200 rounded p-2 mt-2"
              >
                <p class="text-sm font-medium text-yellow-800 mb-1">
                  ⚠️ {{ estimateResult.exifInfo.missingExif }} 张图片缺少拍摄时间
                </p>
                <div class="flex gap-2">
                  <button
                    @click="enableAutoFillExif"
                    class="text-xs px-2 py-0.5 bg-yellow-600 text-white rounded hover:bg-yellow-700"
                  >
                    启用补全
                  </button>
                  <button
                    @click="dismissExifWarning"
                    class="text-xs px-2 py-0.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                  >
                    忽略
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- 操作按钮 -->
        <section>
          <div class="flex gap-2">
            <button
              @click="startCompression"
              :disabled="!inputPath || !outputPath || compressing"
              class="btn flex-1 text-sm py-2"
            >
              {{ compressing ? '压缩中...' : '开始压缩' }}
            </button>
            <button
              @click="cancelCompression"
              :disabled="!compressing"
              class="btn-secondary text-sm py-2 px-4"
            >
              取消
            </button>
          </div>
        </section>

        <!-- 进度条 -->
        <section v-if="progress.total > 0">
          <div class="space-y-1.5">
            <div class="flex justify-between text-sm">
              <span class="text-gray-600">
                进度: {{ progress.current }} / {{ progress.total }}
              </span>
              <span class="font-semibold text-blue-600">{{ progress.percent }}%</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                class="bg-blue-500 h-full transition-all duration-300"
                :style="{ width: progress.percent + '%' }"
              ></div>
            </div>
            <p class="text-sm text-gray-500">{{ progress.currentFile }}</p>
            <p class="text-sm text-green-600">已节省: {{ formatSize(progress.savedSize) }}</p>
          </div>
        </section>

        <!-- 完成提示 -->
        <section v-if="compressionResult">
          <div class="bg-green-50 border border-green-200 rounded-lg p-3">
            <h3 class="text-sm font-semibold text-green-800 mb-1.5">✅ 压缩完成！</h3>
            <div class="text-sm space-y-0.5 text-green-700">
              <p>成功: {{ compressionResult.success }} 张 <span v-if="compressionResult.failed > 0">/ 失败: {{ compressionResult.failed }} 张</span></p>
              <p>原始: {{ formatSize(compressionResult.originalSize) }} → 压缩后: {{ formatSize(compressionResult.compressedSize) }}</p>
              <p class="font-semibold">
                节省: {{ formatSize(compressionResult.savedSize) }} ({{ compressionResult.compressionRatio }}%)
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

// 状态
const inputPath = ref('')
const outputPath = ref('')
const showAdvanced = ref(false)
const estimating = ref(false)
const compressing = ref(false)
const estimateResult = ref(null)
const compressionResult = ref(null)

// 设置
const settings = ref({
  quality: 80,
  resizeMode: 'none', // 'none' | 'limit'
  maxSize: 1920,
  customMaxSize: 1920,
  format: 'original', // 'original' | 'webp'
  keepExif: true,
  autoFillExifDate: false,
  keepTimestamp: true
})

// 进度
const progress = ref({
  current: 0,
  total: 0,
  percent: 0,
  currentFile: '',
  savedSize: 0
})

// 计算实际的最大尺寸
const actualMaxSize = computed(() => {
  if (settings.value.resizeMode !== 'limit') return null
  return settings.value.maxSize === 'custom'
    ? settings.value.customMaxSize
    : settings.value.maxSize
})

// 选择输入文件夹
async function selectInputFolder() {
  const path = await window.electronAPI.selectFolder('选择原图文件夹')
  if (path) {
    inputPath.value = path
    estimateResult.value = null
    compressionResult.value = null
  }
}

// 选择输出文件夹
async function selectOutputFolder() {
  const path = await window.electronAPI.selectFolder('选择输出文件夹')
  if (path) {
    outputPath.value = path
  }
}

// 开始预估
async function startEstimate() {
  if (!inputPath.value) return

  estimating.value = true
  estimateResult.value = null

  try {
    const settingsToSend = {
      quality: settings.value.quality,
      maxSize: actualMaxSize.value,
      format: settings.value.format,
      keepExif: settings.value.keepExif,
      autoFillExifDate: settings.value.autoFillExifDate,
      keepTimestamp: settings.value.keepTimestamp
    }

    const result = await window.electronAPI.estimateCompression(
      inputPath.value,
      settingsToSend
    )

    if (result.success) {
      estimateResult.value = result.data
    } else {
      alert('预估失败: ' + result.error)
    }
  } catch (error) {
    alert('预估出错: ' + error.message)
  } finally {
    estimating.value = false
  }
}

// 启用自动补全 EXIF
function enableAutoFillExif() {
  settings.value.autoFillExifDate = true
  showAdvanced.value = true
  if (estimateResult.value && estimateResult.value.exifInfo) {
    estimateResult.value.exifInfo.missingExif = 0
  }
}

// 忽略 EXIF 警告
function dismissExifWarning() {
  if (estimateResult.value && estimateResult.value.exifInfo) {
    estimateResult.value.exifInfo.missingExif = 0
  }
}

// 开始压缩
async function startCompression() {
  if (!inputPath.value || !outputPath.value) return

  compressing.value = true
  compressionResult.value = null
  progress.value = {
    current: 0,
    total: 0,
    percent: 0,
    currentFile: '',
    savedSize: 0
  }

  // 监听进度更新
  window.electronAPI.onCompressionProgress((progressData) => {
    progress.value = progressData
  })

  try {
    const settingsToSend = {
      quality: settings.value.quality,
      maxSize: actualMaxSize.value,
      format: settings.value.format,
      keepExif: settings.value.keepExif,
      autoFillExifDate: settings.value.autoFillExifDate,
      keepTimestamp: settings.value.keepTimestamp
    }

    const result = await window.electronAPI.startCompression(
      inputPath.value,
      outputPath.value,
      settingsToSend
    )

    if (result.success) {
      compressionResult.value = result.data
    } else {
      alert('压缩失败: ' + result.error)
    }
  } catch (error) {
    alert('压缩出错: ' + error.message)
  } finally {
    compressing.value = false
    window.electronAPI.removeProgressListener()
  }
}

// 取消压缩
function cancelCompression() {
  // TODO: 实现取消功能
  alert('取消功能待实现')
}

// 格式化文件大小
function formatSize(bytes) {
  if (!bytes || bytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
</script>
