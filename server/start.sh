#!/bin/bash

# 多协议流媒体服务器启动脚本
# 用于启动Nginx和FFmpeg服务

BASE_DIR=$(dirname "$(readlink -f "$0")")
NGINX_CONF="$BASE_DIR/nginx.conf"
CHANNELS_FILE="$BASE_DIR/../config/channels.json"
LOG_DIR="$BASE_DIR/logs"
PID_FILE="$BASE_DIR/stream_server.pid"

# 确保目录存在
mkdir -p "$LOG_DIR"
mkdir -p /tmp/hls
mkdir -p /tmp/dash

# 检查依赖
check_dependencies() {
    echo "检查依赖项..."
    
    # 检查 FFmpeg
    if ! command -v ffmpeg &> /dev/null; then
        echo "未找到 FFmpeg，请先安装"
        echo "  macOS: brew install ffmpeg"
        echo "  Ubuntu/Debian: sudo apt-get install ffmpeg"
        exit 1
    fi
    
    # 检查 Nginx with RTMP 模块
    if ! command -v nginx &> /dev/null; then
        echo "未找到 Nginx，请先安装带RTMP模块的Nginx"
        echo "  macOS: brew tap denji/nginx && brew install nginx-full --with-rtmp-module"
        echo "  Ubuntu/Debian: sudo apt-get install nginx libnginx-mod-rtmp"
        exit 1
    fi
    
    echo "所有依赖已满足"
}

# 启动Nginx
start_nginx() {
    echo "启动 Nginx 服务器..."
    nginx -c "$NGINX_CONF"
    if [ $? -ne 0 ]; then
        echo "启动 Nginx 失败，请检查配置文件"
        exit 1
    fi
    echo "Nginx 已成功启动"
}

# 启动转码进程
start_transcoding() {
    echo "启动转码进程..."
    
    # 检查channels.json文件是否存在
    if [ ! -f "$CHANNELS_FILE" ]; then
        echo "频道配置文件不存在: $CHANNELS_FILE"
        exit 1
    fi
    
    # 处理每个频道
    CHANNELS=$(cat "$CHANNELS_FILE" | grep -o '"url"[[:space:]]*:[[:space:]]*"[^"]*"' | cut -d'"' -f4)
    
    for URL in $CHANNELS; do
        # 生成流名称
        STREAM_NAME=$(echo "$URL" | md5sum | cut -d' ' -f1)
        
        echo "处理频道: $URL -> $STREAM_NAME"
        
        # 启动转码进程
        "$BASE_DIR/transcode.sh" "$URL" "$STREAM_NAME" &
        
        # 记录进程ID
        echo "$!" >> "$PID_FILE"
    done
    
    echo "所有转码进程已启动"
}

# 停止所有服务
stop_services() {
    echo "停止所有服务..."
    
    # 停止Nginx
    nginx -s stop
    
    # 停止转码进程
    if [ -f "$PID_FILE" ]; then
        while read PID; do
            if kill -0 "$PID" 2>/dev/null; then
                echo "停止进程: $PID"
                kill "$PID"
            fi
        done < "$PID_FILE"
        rm "$PID_FILE"
    fi
    
    # 杀死所有ffmpeg进程
    pkill ffmpeg
    
    echo "所有服务已停止"
}

# 清理临时文件
cleanup() {
    echo "清理临时文件..."
    rm -rf /tmp/hls/*
    rm -rf /tmp/dash/*
    echo "临时文件已清理"
}

# 显示帮助
show_help() {
    echo "使用方法: $0 {start|stop|restart|status}"
    echo ""
    echo "命令:"
    echo "  start   启动流媒体服务器"
    echo "  stop    停止流媒体服务器"
    echo "  restart 重启流媒体服务器"
    echo "  status  显示服务器状态"
    echo ""
}

# 显示状态
show_status() {
    echo "服务器状态:"
    
    # 检查Nginx状态
    if pgrep -x "nginx" > /dev/null; then
        echo "✅ Nginx 运行中"
    else
        echo "❌ Nginx 未运行"
    fi
    
    # 检查转码进程状态
    FFMPEG_COUNT=$(pgrep -c "ffmpeg")
    if [ "$FFMPEG_COUNT" -gt 0 ]; then
        echo "✅ FFmpeg 转码进程运行中 ($FFMPEG_COUNT 个进程)"
    else
        echo "❌ 没有转码进程运行"
    fi
    
    # 显示可用流
    echo ""
    echo "可用的HLS流:"
    find /tmp/hls -name "*.m3u8" -type f | while read -r file; do
        basename "$file"
    done
}

# 主函数
main() {
    case "$1" in
        start)
            check_dependencies
            start_nginx
            start_transcoding
            echo "服务已启动，管理界面: http://localhost:8080/admin/"
            echo "播放器界面: http://localhost:8080/"
            ;;
        stop)
            stop_services
            cleanup
            echo "服务已停止"
            ;;
        restart)
            stop_services
            cleanup
            sleep 2
            check_dependencies
            start_nginx
            start_transcoding
            echo "服务已重启"
            ;;
        status)
            show_status
            ;;
        *)
            show_help
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@" 