#!/bin/bash

# iOS9流媒体部署脚本
# 此脚本用于部署iOS9流媒体系统到服务器

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # 无颜色

# 显示标题
echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}     iOS9流媒体系统部署工具 v1.0        ${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

# 检查运行环境
check_requirements() {
    echo -e "${YELLOW}正在检查系统要求...${NC}"
    
    # 检查是否有sudo权限
    if ! command -v sudo &> /dev/null; then
        echo -e "${RED}错误: 请确保您有sudo权限${NC}"
        exit 1
    fi
    
    # 检查是否安装了nginx
    if ! command -v nginx &> /dev/null; then
        echo -e "${RED}错误: 请先安装Nginx${NC}"
        echo -e "您可以通过以下命令安装:"
        echo -e "  - MacOS: brew install nginx"
        echo -e "  - Ubuntu/Debian: sudo apt-get install nginx"
        exit 1
    fi
    
    # 检查是否安装了ffmpeg
    if ! command -v ffmpeg &> /dev/null; then
        echo -e "${RED}错误: 请先安装FFmpeg${NC}"
        echo -e "您可以通过以下命令安装:"
        echo -e "  - MacOS: brew install ffmpeg"
        echo -e "  - Ubuntu/Debian: sudo apt-get install ffmpeg"
        exit 1
    fi
    
    echo -e "${GREEN}系统要求检查通过!${NC}"
}

# 获取部署配置
get_config() {
    echo -e "${YELLOW}请提供部署配置信息:${NC}"
    
    # 获取nginx配置目录
    read -p "Nginx配置目录 [/etc/nginx]: " NGINX_CONF_DIR
    NGINX_CONF_DIR=${NGINX_CONF_DIR:-/etc/nginx}
    
    # 获取部署目录
    read -p "项目部署目录 [/var/www/ios9-stream]: " DEPLOY_DIR
    DEPLOY_DIR=${DEPLOY_DIR:-/var/www/ios9-stream}
    
    # 获取端口
    read -p "HTTP端口 [8080]: " HTTP_PORT
    HTTP_PORT=${HTTP_PORT:-8080}
    
    # 获取RTMP端口
    read -p "RTMP端口 [1935]: " RTMP_PORT
    RTMP_PORT=${RTMP_PORT:-1935}
    
    # 确认配置
    echo ""
    echo -e "${BLUE}部署配置:${NC}"
    echo -e "  - Nginx配置目录: ${NGINX_CONF_DIR}"
    echo -e "  - 项目部署目录: ${DEPLOY_DIR}"
    echo -e "  - HTTP端口: ${HTTP_PORT}"
    echo -e "  - RTMP端口: ${RTMP_PORT}"
    echo ""
    
    read -p "确认以上配置? (y/n) " CONFIRM
    if [[ $CONFIRM != "y" && $CONFIRM != "Y" ]]; then
        echo -e "${RED}部署已取消${NC}"
        exit 1
    fi
}

# 部署系统
deploy_system() {
    echo -e "${YELLOW}开始部署系统...${NC}"
    
    # 创建部署目录
    if [ ! -d "$DEPLOY_DIR" ]; then
        echo -e "创建部署目录: $DEPLOY_DIR"
        sudo mkdir -p $DEPLOY_DIR
    fi
    
    # 复制文件到部署目录
    echo -e "正在复制文件到部署目录..."
    sudo cp -r web $DEPLOY_DIR/
    sudo cp -r admin $DEPLOY_DIR/
    sudo cp -r config $DEPLOY_DIR/
    sudo cp -r server $DEPLOY_DIR/
    
    # 设置权限
    echo -e "设置文件权限..."
    sudo chown -R www-data:www-data $DEPLOY_DIR
    sudo chmod -R 755 $DEPLOY_DIR
    sudo chmod +x $DEPLOY_DIR/server/start.sh
    sudo chmod +x $DEPLOY_DIR/server/transcode.sh
    
    # 修改nginx配置
    echo -e "修改Nginx配置..."
    NGINX_CONF_FILE="$NGINX_CONF_DIR/nginx.conf"
    BACKUP_FILE="$NGINX_CONF_DIR/nginx.conf.bak"
    
    # 备份原配置
    sudo cp $NGINX_CONF_FILE $BACKUP_FILE
    
    # 创建新配置
    # 替换变量
    sed "s|/path/to/ios9-stream|$DEPLOY_DIR|g" server/nginx.conf | \
    sed "s|listen 8080|listen $HTTP_PORT|g" | \
    sed "s|listen 1935|listen $RTMP_PORT|g" | \
    sudo tee $NGINX_CONF_FILE > /dev/null
    
    echo -e "${GREEN}Nginx配置已更新，原配置已备份为 ${BACKUP_FILE}${NC}"
    
    # 创建HLS和DASH目录
    sudo mkdir -p /tmp/hls
    sudo mkdir -p /tmp/dash
    sudo chmod 777 /tmp/hls
    sudo chmod 777 /tmp/dash
    
    # 重启Nginx
    echo -e "重启Nginx服务..."
    sudo nginx -t
    if [ $? -eq 0 ]; then
        sudo service nginx restart || sudo systemctl restart nginx
        echo -e "${GREEN}Nginx服务已重启${NC}"
    else
        echo -e "${RED}Nginx配置测试失败，请检查配置${NC}"
        exit 1
    fi
    
    # 启动转码服务
    echo -e "启动转码和流媒体服务..."
    cd $DEPLOY_DIR
    sudo ./server/start.sh start
    
    echo -e "${GREEN}系统部署完成!${NC}"
}

# 显示完成信息
show_completion() {
    echo ""
    echo -e "${BLUE}=========================================${NC}"
    echo -e "${GREEN}iOS9流媒体系统已成功部署!${NC}"
    echo -e "${BLUE}=========================================${NC}"
    echo ""
    echo -e "${YELLOW}您可以通过以下方式访问:${NC}"
    echo -e "  - 前台界面: http://您的服务器IP:$HTTP_PORT"
    echo -e "  - 管理后台: http://您的服务器IP:$HTTP_PORT/admin"
    echo ""
    echo -e "${YELLOW}流媒体地址:${NC}"
    echo -e "  - HLS: http://您的服务器IP:$HTTP_PORT/hls/[频道名].m3u8"
    echo -e "  - DASH: http://您的服务器IP:$HTTP_PORT/dash/[频道名].mpd"
    echo -e "  - HTTP-FLV: http://您的服务器IP:$HTTP_PORT/flv/[频道名]"
    echo -e "  - RTMP: rtmp://您的服务器IP:$RTMP_PORT/live/[频道名]"
    echo ""
    echo -e "${YELLOW}管理命令:${NC}"
    echo -e "  - 启动服务: sudo $DEPLOY_DIR/server/start.sh start"
    echo -e "  - 停止服务: sudo $DEPLOY_DIR/server/start.sh stop"
    echo -e "  - 重启服务: sudo $DEPLOY_DIR/server/start.sh restart"
    echo -e "  - 查看状态: sudo $DEPLOY_DIR/server/start.sh status"
    echo ""
}

# 主函数
main() {
    check_requirements
    get_config
    deploy_system
    show_completion
}

# 执行主函数
main 