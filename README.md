# 多协议流媒体直播系统 (iOS 9兼容版)

一个完整的流媒体直播系统，专为iOS 9设备优化，支持多种流媒体协议。

## 功能特点

- **多协议支持**: HLS, DASH, HTTP-FLV协议自动切换
- **多质量码率**: 高清/标清/流畅多质量自适应切换
- **iOS 9优化**: 特别为iOS 9设备优化的播放体验
- **自适应播放**: 根据设备和网络自动选择最佳协议和质量
- **频道管理**: 支持频道分类和筛选
- **CDN加速**: 可配置多CDN切换
- **美观界面**: 苹果风格设计，响应式布局

## 系统组件

- **前端部分**:
  - 基于Video.js的自适应播放器
  - iOS 9设备检测与优化
  - 频道管理和UI交互

- **服务器部分**:
  - Nginx + RTMP模块
  - FFmpeg转码服务
  - 多协议流媒体分发

## 安装指南

### 前置依赖

1. Nginx (带RTMP模块)
2. FFmpeg

### 安装步骤

#### 安装依赖 (macOS)

```bash
# 安装Nginx及RTMP模块
brew tap denji/nginx
brew install nginx-full --with-rtmp-module

# 安装FFmpeg
brew install ffmpeg
```

#### 安装依赖 (Ubuntu/Debian)

```bash
# 安装Nginx及RTMP模块
sudo apt-get update
sudo apt-get install nginx libnginx-mod-rtmp

# 安装FFmpeg
sudo apt-get install ffmpeg
```

#### 配置系统

1. 克隆项目:

```bash
git clone https://github.com/你的用户名/ios9-stream.git
cd ios9-stream
```

2. 配置Nginx:

```bash
# 更新nginx.conf中的路径
sudo cp server/nginx.conf /etc/nginx/nginx.conf
# 根据你的实际路径修改nginx.conf中的路径配置
```

3. 配置频道:

```bash
# 编辑频道配置文件
nano config/channels.json
# 根据需要添加或修改频道
```

## 启动系统

使用启动脚本运行整个系统:

```bash
cd ios9-stream
chmod +x server/start.sh
./server/start.sh start
```

可用命令:
- `start`: 启动服务
- `stop`: 停止服务
- `restart`: 重启服务
- `status`: 查看服务状态

## 访问系统

- 打开浏览器访问: `http://localhost:8080`
- 管理界面: `http://localhost:8080/admin`

## 视频流URL

- HLS: `http://localhost:8080/hls/[STREAM_NAME].m3u8`
- DASH: `http://localhost:8080/dash/[STREAM_NAME].mpd`
- HTTP-FLV: `http://localhost:8080/flv/[STREAM_NAME]`
- RTMP: `rtmp://localhost/live/[STREAM_NAME]`

## 文件目录结构

```
ios9-stream/
├── admin/              # 管理界面
├── config/
│   └── channels.json   # 频道配置
├── server/
│   ├── nginx.conf      # Nginx配置
│   ├── start.sh        # 启动脚本
│   └── transcode.sh    # 转码脚本
└── web/                # 前端界面
    ├── css/
    ├── js/
    ├── images/
    └── index.html
```

## iOS 9优化说明

本系统针对iOS 9设备进行了以下优化:

1. **协议优化**: 优先使用HLS协议(iOS 9原生支持)
2. **内存优化**: 减小缓冲区大小(30秒)，减少内存占用
3. **编码优化**: 使用H.264 baseline profile确保兼容性
4. **控制优化**: 简化播放器控件，提高响应速度
5. **UI优化**: 减少复杂渲染效果，提高页面加载速度
6. **错误处理**: 增强的错误恢复机制

## 贡献代码

欢迎提交PR或Issue来完善这个项目。

## 许可证

MIT 