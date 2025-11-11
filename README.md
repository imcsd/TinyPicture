# TinyPicture - 图片压缩工具

一个基于 Electron + Sharp 的高性能图片批量压缩工具，支持保持目录结构、分辨率调整、EXIF 信息处理等功能。

## 功能特性

### 核心功能
- ✅ 批量压缩图片（JPEG/PNG/WebP）
- ✅ 保持原有目录结构
- ✅ 可调节压缩质量（0-100）
- ✅ 分辨率限制选项
- ✅ 压缩前预估功能
- ✅ 保持文件修改时间
- ✅ EXIF 信息智能处理

### 高级特性
- 🎯 智能采样预估压缩效果
- 📊 实时进度显示
- 🔧 自动补全缺失的 EXIF 拍摄时间
- 💾 压缩前后大小对比
- ⚡ 高性能处理（基于 Sharp/libvips）

## 技术栈

- **Electron** - 跨平台桌面应用框架
- **Vue 3** - 前端框架
- **UnoCSS** - 原子化 CSS 引擎
- **Vite** - 前端构建工具
- **Sharp** - 高性能图片处理库（基于 libvips）
- **Node.js** - 后端逻辑

## 项目结构

```
TinyPicture/
├── src/
│   ├── main/                    # Electron 主进程
│   │   ├── index.js            # 主进程入口
│   │   ├── preload.js          # 预加载脚本（IPC 通信）
│   │   ├── compressor.js       # 图片压缩核心逻辑
│   │   └── exifHandler.js      # EXIF 信息处理
│   ├── renderer/                # 渲染进程（Vue3 UI）
│   │   ├── App.vue             # 主界面组件
│   │   └── main.js             # Vue 入口文件
│   └── utils/
│       ├── fileWalker.js       # 文件遍历工具
│       └── estimator.js        # 压缩预估工具
├── index.html                   # HTML 入口
├── vite.config.js              # Vite 配置
├── uno.config.js               # UnoCSS 配置
├── package.json
├── README.md
└── .gitignore
```

## 功能详细设计

### 1. 界面布局

```
┌─────────────────────────────────────────────┐
│  TinyPicture - 图片压缩工具                  │
├─────────────────────────────────────────────┤
│                                             │
│  📁 原图路径: [选择文件夹] [浏览]            │
│  📁 输出路径: [选择文件夹] [浏览]            │
│                                             │
│  ⚙️ 压缩设置                                 │
│  ├─ 图片质量: [====●====] 80                │
│  │   (0-100, 推荐 75-85)                    │
│  │                                          │
│  ├─ 分辨率限制:                              │
│  │   ○ 保持原始分辨率                        │
│  │   ● 限制最大边长                          │
│  │      [下拉选择: Full HD 1920px ▼]        │
│  │      选项: 4K(3840)/2K(2560)/            │
│  │            Full HD(1920)/HD(1280)/自定义 │
│  │                                          │
│  ├─ 输出格式:                                │
│  │   ● 保持原格式                            │
│  │   ○ 转换为 WebP (更小体积)               │
│  │                                          │
│  └─ 高级选项 [展开/收起]                     │
│      ├─ ☑️ 保留原有 EXIF 信息                │
│      ├─ ☐ 自动补全缺失的拍摄时间             │
│      │   ℹ️ 将使用文件修改时间填充            │
│      └─ ☑️ 保持原文件修改时间                │
│                                             │
│  📊 压缩预览                                 │
│  ┌───────────────────────────────────────┐  │
│  │ [开始预估] 按钮                        │  │
│  │                                       │  │
│  │ 压缩前: 2.3 GB (156 张)              │  │
│  │ 预计后: ~450 MB (节省 80%)           │  │
│  │ 基于 8 张样本测试                     │  │
│  │                                       │  │
│  │ ⚠️ 检测到 58 张图片缺少拍摄时间        │  │
│  │    [启用自动补全] [忽略]              │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  [开始压缩]  [取消]                          │
│                                             │
│  进度: [████████░░░░] 65% (102/156)         │
│  当前: processing IMG_1234.jpg              │
│  已节省: 1.2 GB                             │
│                                             │
└─────────────────────────────────────────────┘
```

### 2. 分辨率设置

#### 预设选项
- **保持原始分辨率**（默认）- 不改变图片尺寸
- **限制最大边长** - 等比例缩放
  - 4K: 3840px
  - 2K: 2560px
  - Full HD: 1920px
  - HD: 1280px
  - 自定义: 用户输入任意值

#### 缩放策略
- 等比例缩放（保持宽高比）
- 只在图片超过设定值时才缩放
- 小于设定值的图片不放大

#### 示例
```
原图: 4000x3000 → 设置 1920px → 输出: 1920x1440
原图: 1280x720  → 设置 1920px → 输出: 1280x720 (不放大)
```

### 3. 压缩预估功能

#### 工作流程
1. **扫描目录** - 递归获取所有图片文件
2. **随机采样** - 选择 5-10 张图片（或总数的 10%）
3. **试压缩** - 使用当前设置压缩采样图片
4. **计算压缩率** - (原始大小 - 压缩后大小) / 原始大小
5. **推算总体积** - 根据平均压缩率估算整个文件夹

#### 预估算法
```javascript
async function estimateCompression(inputPath, settings) {
  // 1. 扫描所有图片
  const allImages = await scanDirectory(inputPath);
  const totalSize = sumFileSize(allImages);

  // 2. 随机采样（最多10张，或10%）
  const sampleCount = Math.min(10, Math.ceil(allImages.length * 0.1));
  const samples = randomSample(allImages, sampleCount);

  // 3. 试压缩采样图片到临时目录
  let totalOriginal = 0;
  let totalCompressed = 0;

  for (const img of samples) {
    const originalSize = img.size;
    const compressedSize = await testCompress(img, settings);

    totalOriginal += originalSize;
    totalCompressed += compressedSize;
  }

  // 4. 计算压缩率
  const compressionRatio = totalCompressed / totalOriginal;

  // 5. 推算总体积
  const estimatedSize = totalSize * compressionRatio;
  const savedSize = totalSize - estimatedSize;
  const savedPercent = ((savedSize / totalSize) * 100).toFixed(0);

  return {
    fileCount: allImages.length,
    originalSize: totalSize,
    estimatedSize,
    savedSize,
    savedPercent,
    sampleCount
  };
}
```

#### 显示信息
```
压缩前预览：
├─ 总文件数：156 张
├─ 总大小：2.3 GB
├─ 平均单张：15.2 MB
└─ 采样测试：已测试 8 张

预计压缩后：
├─ 预计大小：~450 MB（节省 80%）
├─ 平均单张：~2.9 MB
└─ 基于当前设置：质量 80 + 最大 1920px
```

### 4. EXIF 信息处理

#### 功能说明
许多图片（特别是截图、扫描件、网络下载的图片）缺少 EXIF 拍摄时间信息，导致照片管理软件无法正确排序。

#### 解决方案
**智能检测 + 可选补全**

1. **扫描阶段** - 检测缺少 EXIF 拍摄时间的图片数量
2. **提示用户** - 如果检测到缺失，显示提示
3. **自动补全** - 使用文件修改时间作为拍摄时间写入 EXIF

#### 实现逻辑
```javascript
// 1. 读取源文件信息
const stats = fs.statSync(sourcePath);
const mtime = stats.mtime; // 文件修改时间

// 2. 读取 EXIF 信息
const metadata = await sharp(sourcePath).metadata();
const hasExifDate = metadata.exif && metadata.exif.DateTimeOriginal;

// 3. 如果缺失且用户启用了补全
if (!hasExifDate && settings.autoFillExifDate) {
  // 使用 Sharp 写入 EXIF 拍摄时间
  await sharp(sourcePath)
    .withMetadata({
      exif: {
        IFD0: {
          DateTime: formatExifDate(mtime)
        },
        IFD1: {
          DateTimeOriginal: formatExifDate(mtime),
          DateTimeDigitized: formatExifDate(mtime)
        }
      }
    })
    .jpeg({ quality: settings.quality })
    .toFile(outputPath);
}
```

#### UI 交互流程
```
步骤 1: 用户点击"开始预估"

步骤 2: 扫描完成后显示
┌─────────────────────────────────────┐
│ 📊 文件分析结果                      │
│ ├─ 总文件数：156 张                  │
│ ├─ 有 EXIF 信息：98 张               │
│ └─ 缺少拍摄时间：58 张               │
│                                     │
│ ⚠️ 发现 58 张图片缺少拍摄时间         │
│    这可能影响照片管理软件的排序       │
│    [启用自动补全] [忽略]             │
└─────────────────────────────────────┘

步骤 3: 用户选择
- 点击"启用自动补全" → 自动勾选高级选项中的对应选项
- 点击"忽略" → 关闭提示，继续压缩
```

### 5. 文件时间戳处理

#### 保持修改时间
压缩后的文件将保持与源文件相同的修改时间，确保：
- 照片管理软件按原始时间排序
- 备份工具正确识别文件状态
- 文件属性保持一致

#### 实现方式
```javascript
// 1. 读取源文件时间戳
const stats = fs.statSync(sourcePath);
const atime = stats.atime;  // 访问时间
const mtime = stats.mtime;  // 修改时间

// 2. 压缩图片
await sharp(sourcePath)
  .jpeg({ quality: 80 })
  .toFile(outputPath);

// 3. 恢复时间戳
fs.utimesSync(outputPath, atime, mtime);
```

### 6. 压缩策略

#### 推荐配置
- **JPEG 质量**: 80-85（肉眼几乎无差别，体积减少 50-70%）
- **PNG**: 有损压缩 + 调色板优化
- **WebP**: 质量 85（比 JPEG 小 30-50%，质量更好）

#### 格式处理
```javascript
// JPEG 压缩
await sharp(input)
  .jpeg({
    quality: 80,
    mozjpeg: true  // 使用 mozjpeg 编码器
  })
  .toFile(output);

// PNG 压缩
await sharp(input)
  .png({
    quality: 80,
    compressionLevel: 9,
    palette: true  // 使用调色板
  })
  .toFile(output);

// 转换为 WebP
await sharp(input)
  .webp({
    quality: 85,
    effort: 6  // 压缩努力程度 (0-6)
  })
  .toFile(output);
```

### 7. 核心处理流程

```
用户操作流程：
1. 选择输入/输出路径
2. 调整压缩设置（质量、分辨率、格式）
3. 点击"开始预估"
   ├─ 扫描目录
   ├─ 采样测试
   ├─ 显示预估结果
   └─ 检测 EXIF 缺失（如有）
4. 点击"开始压缩"
   ├─ 遍历所有图片
   ├─ 逐个压缩处理
   │   ├─ 读取原图
   │   ├─ 应用压缩设置
   │   ├─ 调整分辨率（如需要）
   │   ├─ 处理 EXIF（如需要）
   │   ├─ 保存到输出路径
   │   └─ 恢复文件时间戳
   ├─ 更新进度条
   └─ 显示统计信息
5. 完成
   └─ 显示总结（文件数、压缩率、节省空间）
```

## 安装依赖

```bash
npm install
```

## 开发运行

```bash
# 开发模式（自动启动 Vite 和 Electron）
npm run dev

# 或者手动分别启动
# 终端 1：启动 Vite 开发服务器
npm run dev:vite

# 终端 2：启动 Electron（等 Vite 启动后）
npx electron .
```

## 构建打包

```bash
# 构建 Windows 安装包（需要管理员权限）
npm run build:win

# 构建完成后，安装包在 dist 目录中
```

## 支持的图片格式

- ✅ JPEG / JPG
- ✅ PNG
- ✅ WebP
- ✅ TIFF
- ✅ GIF（静态）
- ✅ AVIF

## 性能优势

- **Sharp** 基于 libvips，比其他 JS 图片库快 **10-20 倍**
- 支持流式处理，内存占用低
- 多线程处理（可选 worker_threads）

## 注意事项

1. **备份重要文件** - 压缩前建议备份原始图片
2. **质量设置** - 质量低于 70 可能出现明显失真
3. **WebP 兼容性** - 部分老旧软件可能不支持 WebP 格式
4. **EXIF 信息** - 转换格式可能丢失部分 EXIF 数据
5. **大文件处理** - 超大图片（>50MB）处理时间较长

## 未来扩展功能

- [ ] 多线程并行处理
- [ ] 图片预览对比（压缩前后）
- [ ] 拖拽文件夹支持
- [ ] 批量重命名
- [ ] 水印添加
- [ ] 更多 EXIF 修复工具
- [ ] 命令行版本

## 许可证

MIT

## 作者

TinyPicture Team
