#!/bin/bash

# 多协议流媒体转码脚本
# 用于将直播源转换为HLS、DASH和HTTP-FLV格式
# 专门优化了iOS 9设备的兼容性

# 设置变量
INPUT_URL=$1  # 输入的直播源URL
STREAM_NAME=$2  # 流名称，如果为空则自动生成
OUTPUT_DIR="/tmp"  # 输出目录
LOG_DIR="logs"  # 日志目录

# 如果目录不存在则创建
mkdir -p "$OUTPUT_DIR/hls"
mkdir -p "$OUTPUT_DIR/dash"
mkdir -p "$LOG_DIR"

# 如果没有提供流名称，则根据URL生成一个名称
if [ -z "$STREAM_NAME" ]; then
    STREAM_NAME=$(echo "$INPUT_URL" | md5sum | cut -d' ' -f1)
fi

# 配置日志文件
LOG_FILE="$LOG_DIR/$STREAM_NAME.log"

# 输出流地址
HLS_OUTPUT="$OUTPUT_DIR/hls/$STREAM_NAME"
DASH_OUTPUT="$OUTPUT_DIR/dash/$STREAM_NAME"
RTMP_OUTPUT="rtmp://localhost/live/$STREAM_NAME"

# 记录开始信息
echo "[$(date)] 开始处理流: $INPUT_URL -> $STREAM_NAME" | tee -a "$LOG_FILE"

# iOS 9 优化参数
# - 使用 baseline profile 确保最大兼容性
# - 音频使用 AAC 编码
# - 避免使用太高的比特率，防止缓冲问题
# - 使用较小的分段时长，减少初始加载时间

# 执行FFmpeg转码
ffmpeg -i "$INPUT_URL" \
    -loglevel warning \
    -hide_banner \
    \
    `# 高质量流` \
    -vf "scale=1280:720" \
    -c:v libx264 -preset veryfast -profile:v baseline -level 3.0 \
    -b:v 2000k -maxrate 2500k -bufsize 4000k \
    -g 60 -keyint_min 60 -sc_threshold 0 \
    -c:a aac -b:a 128k -ar 44100 -ac 2 \
    -f flv "${RTMP_OUTPUT}_high" \
    \
    `# 中质量流` \
    -vf "scale=854:480" \
    -c:v libx264 -preset veryfast -profile:v baseline -level 3.0 \
    -b:v 1000k -maxrate 1200k -bufsize 2000k \
    -g 60 -keyint_min 60 -sc_threshold 0 \
    -c:a aac -b:a 96k -ar 44100 -ac 2 \
    -f flv "${RTMP_OUTPUT}_mid" \
    \
    `# 低质量流 (针对移动设备和低带宽)` \
    -vf "scale=640:360" \
    -c:v libx264 -preset veryfast -profile:v baseline -level 3.0 \
    -b:v 500k -maxrate 600k -bufsize 1000k \
    -g 60 -keyint_min 60 -sc_threshold 0 \
    -c:a aac -b:a 64k -ar 44100 -ac 2 \
    -f flv "${RTMP_OUTPUT}_low" \
    \
    `# 记录任何错误` \
    2>> "$LOG_FILE" &

echo "[$(date)] 转码进程已启动，PID: $!" | tee -a "$LOG_FILE"
echo "HLS 流将可通过: http://localhost:8080/hls/${STREAM_NAME}.m3u8 访问"
echo "DASH 流将可通过: http://localhost:8080/dash/${STREAM_NAME}.mpd 访问"
echo "FLV 流将可通过: http://localhost:8080/flv/${STREAM_NAME} 访问" 