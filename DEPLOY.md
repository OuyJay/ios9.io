# iOS9流媒体系统部署指南

本文档提供了部署iOS9流媒体系统的详细步骤和最佳实践。

## 部署方式

系统提供两种部署方式：

1. **自动部署**：使用提供的部署脚本快速部署
2. **手动部署**：逐步手动配置系统

## 前提条件

无论选择哪种部署方式，您都需要确保以下软件已安装：

- **Nginx** 带有RTMP模块
- **FFmpeg** 用于视频转码
- 具有**sudo**权限的用户账号

## 自动部署（推荐）

自动部署脚本会引导您完成整个部署过程：

1. 打开终端并导航到项目目录：
   ```bash
   cd /path/to/ios9-stream
   ```

2. 给部署脚本添加执行权限：
   ```bash
   chmod +x deploy.sh
   ```

3. 运行部署脚本：
   ```bash
   ./deploy.sh
   ```

4. 按照交互式提示提供必要的信息：
   - Nginx配置目录（默认: /etc/nginx）
   - 项目部署目录（默认: /var/www/ios9-stream）
   - HTTP端口（默认: 8080）
   - RTMP端口（默认: 1935）

5. 确认配置并等待部署完成。

## 手动部署

如果您需要更精确的控制，可以按照以下步骤手动部署：

### 1. 准备部署目录

```bash
# 创建部署目录
sudo mkdir -p /var/www/ios9-stream

# 复制文件到部署目录
sudo cp -r web admin config server /var/www/ios9-stream/

# 设置权限
sudo chown -R www-data:www-data /var/www/ios9-stream
sudo chmod -R 755 /var/www/ios9-stream
sudo chmod +x /var/www/ios9-stream/server/start.sh
sudo chmod +x /var/www/ios9-stream/server/transcode.sh
```

### 2. 配置Nginx

1. 编辑Nginx配置文件：
   ```bash
   sudo nano /etc/nginx/nginx.conf
   ```

2. 使用提供的nginx.conf文件作为模板，需要替换以下内容：
   - 将 `/path/to/ios9-stream` 替换为您的实际部署路径
   - 根据需要修改端口号（默认HTTP: 8080, RTMP: 1935）

3. 确保HLS和DASH目录存在且具有正确权限：
   ```bash
   sudo mkdir -p /tmp/hls /tmp/dash
   sudo chmod 777 /tmp/hls /tmp/dash
   ```

4. 测试Nginx配置：
   ```bash
   sudo nginx -t
   ```

5. 如果配置无误，重启Nginx：
   ```bash
   sudo systemctl restart nginx
   ```

### 3. 启动服务

```bash
cd /var/www/ios9-stream
sudo ./server/start.sh start
```

## 系统验证

部署完成后，您可以通过以下方式验证系统：

1. 访问前台界面：`http://您的服务器IP:8080`
2. 访问管理后台：`http://您的服务器IP:8080/admin`
3. 检查服务状态：`sudo /var/www/ios9-stream/server/start.sh status`

## 常见问题排解

### 无法访问网站

- 检查Nginx服务是否运行：`sudo systemctl status nginx`
- 确认防火墙允许HTTP和RTMP端口：
  ```bash
  sudo ufw allow 8080/tcp
  sudo ufw allow 1935/tcp
  ```

### 直播流不工作

- 检查转码服务是否运行：`ps aux | grep ffmpeg`
- 验证HLS/DASH目录权限：`ls -la /tmp/hls /tmp/dash`
- 查看Nginx错误日志：`sudo tail -f /var/log/nginx/error.log`

### iOS 9设备特殊问题

- 确保使用的是HLS流（m3u8）
- 检查转码参数是否使用了H.264 Baseline Profile
- 监控内存使用情况，iOS 9设备内存有限

## 管理命令

- 启动服务：`sudo /var/www/ios9-stream/server/start.sh start`
- 停止服务：`sudo /var/www/ios9-stream/server/start.sh stop`
- 重启服务：`sudo /var/www/ios9-stream/server/start.sh restart`
- 查看状态：`sudo /var/www/ios9-stream/server/start.sh status`

## 安全建议

- 配置HTTPS以保护你的内容
- 添加访问控制以限制未授权访问
- 定期更新Nginx和FFmpeg以修补安全漏洞

## 性能优化

- 使用CDN分发HLS和DASH片段
- 优化FFmpeg转码参数以适应不同带宽
- 为直播流配置缓存
- 针对iOS 9设备的低内存特性，避免过多的质量层次

## 定制化

要定制系统，您可以修改以下文件：

- `config/channels.json`：添加或修改频道
- `server/nginx.conf`：调整服务器配置
- `server/transcode.sh`：修改转码参数 