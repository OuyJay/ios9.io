/**
 * iOS9流媒体 - 管理后台脚本
 */

(function() {
    'use strict';
    
    // 状态变量
    var Admin = {
        channelsData: null,
        addChannelModal: null,
        initialized: false
    };
    
    // 初始化
    Admin.init = function() {
        if (this.initialized) return;
        
        // 获取模态框实例
        this.addChannelModal = new bootstrap.Modal(document.getElementById('addChannelModal'));
        
        // 绑定事件
        this.bindEvents();
        
        // 加载频道数据
        this.loadChannels();
        
        // 加载系统状态
        this.loadSystemStatus();
        
        // 加载日志
        this.loadLogs();
        
        this.initialized = true;
        console.log('管理后台初始化完成');
    };
    
    // 绑定事件
    Admin.bindEvents = function() {
        var self = this;
        
        // 添加频道按钮
        var addChannelBtn = document.getElementById('addChannelBtn');
        if (addChannelBtn) {
            addChannelBtn.addEventListener('click', function() {
                // 重置表单
                document.getElementById('addChannelForm').reset();
                self.addChannelModal.show();
            });
        }
        
        // 保存频道按钮
        var saveChannelBtn = document.getElementById('saveChannelBtn');
        if (saveChannelBtn) {
            saveChannelBtn.addEventListener('click', function() {
                self.saveChannel();
            });
        }
        
        // 刷新日志按钮
        var refreshLogBtn = document.getElementById('refreshLogBtn');
        if (refreshLogBtn) {
            refreshLogBtn.addEventListener('click', function() {
                self.loadLogs();
            });
        }
        
        // 清除日志按钮
        var clearLogBtn = document.getElementById('clearLogBtn');
        if (clearLogBtn) {
            clearLogBtn.addEventListener('click', function() {
                self.clearLogs();
            });
        }
        
        // 频道表格体，用于委托事件
        var channelTableBody = document.getElementById('channelTableBody');
        if (channelTableBody) {
            channelTableBody.addEventListener('click', function(e) {
                // 编辑按钮
                if (e.target.classList.contains('edit-channel-btn')) {
                    var channelId = e.target.getAttribute('data-channel-id');
                    self.editChannel(channelId);
                }
                
                // 删除按钮
                if (e.target.classList.contains('delete-channel-btn')) {
                    var channelId = e.target.getAttribute('data-channel-id');
                    if (confirm('确定要删除这个频道吗？')) {
                        self.deleteChannel(channelId);
                    }
                }
                
                // 启用/禁用切换
                if (e.target.classList.contains('toggle-status-btn')) {
                    var channelId = e.target.getAttribute('data-channel-id');
                    var isActive = e.target.getAttribute('data-active') === 'true';
                    self.toggleChannelStatus(channelId, !isActive);
                }
            });
        }
    };
    
    // 加载频道数据
    Admin.loadChannels = function() {
        var self = this;
        
        // 显示加载状态
        var channelTableBody = document.getElementById('channelTableBody');
        if (channelTableBody) {
            channelTableBody.innerHTML = '<tr><td colspan="6" class="text-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">加载中...</span></div></td></tr>';
        }
        
        // 从服务器获取频道数据
        fetch('../config/channels.json')
            .then(function(response) {
                if (!response.ok) {
                    throw new Error('加载频道数据失败：' + response.status);
                }
                return response.json();
            })
            .then(function(data) {
                console.log('频道数据加载成功', data);
                self.channelsData = data;
                self.renderChannels(data.channels);
                self.updateActiveChannelCount(data.channels);
            })
            .catch(function(error) {
                console.error('加载频道数据错误', error);
                if (channelTableBody) {
                    channelTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">加载频道数据失败，请刷新页面重试。</td></tr>';
                }
            });
    };
    
    // 渲染频道列表
    Admin.renderChannels = function(channels) {
        var channelTableBody = document.getElementById('channelTableBody');
        if (!channelTableBody) return;
        
        // 清空表格
        channelTableBody.innerHTML = '';
        
        // 如果没有频道
        if (!channels || channels.length === 0) {
            channelTableBody.innerHTML = '<tr><td colspan="6" class="text-center">没有找到频道，请点击添加频道按钮添加。</td></tr>';
            return;
        }
        
        // 添加每个频道
        for (var i = 0; i < channels.length; i++) {
            var channel = channels[i];
            var tr = document.createElement('tr');
            
            // 频道名称
            var tdName = document.createElement('td');
            tdName.textContent = channel.name;
            tr.appendChild(tdName);
            
            // 分类
            var tdCategory = document.createElement('td');
            tdCategory.textContent = channel.category;
            tr.appendChild(tdCategory);
            
            // 播放地址
            var tdUrl = document.createElement('td');
            tdUrl.className = 'url-cell';
            tdUrl.title = channel.url;
            tdUrl.textContent = channel.url;
            tr.appendChild(tdUrl);
            
            // 画质
            var tdQuality = document.createElement('td');
            if (channel.quality && channel.quality.length) {
                for (var j = 0; j < channel.quality.length; j++) {
                    var quality = channel.quality[j];
                    var qualityClass = 'quality-medium';
                    if (quality === '高清') qualityClass = 'quality-high';
                    if (quality === '流畅') qualityClass = 'quality-low';
                    
                    var badge = document.createElement('span');
                    badge.className = 'quality-badge ' + qualityClass;
                    badge.textContent = quality;
                    tdQuality.appendChild(badge);
                }
            } else {
                tdQuality.textContent = '-';
            }
            tr.appendChild(tdQuality);
            
            // 状态
            var tdStatus = document.createElement('td');
            var statusBadge = document.createElement('span');
            statusBadge.className = 'badge ' + (channel.active !== false ? 'bg-success' : 'bg-secondary');
            statusBadge.textContent = channel.active !== false ? '启用' : '禁用';
            tdStatus.appendChild(statusBadge);
            tr.appendChild(tdStatus);
            
            // 操作
            var tdActions = document.createElement('td');
            tdActions.className = 'action-buttons';
            
            // 编辑按钮
            var editBtn = document.createElement('button');
            editBtn.className = 'btn btn-sm btn-outline-primary edit-channel-btn me-1';
            editBtn.setAttribute('data-channel-id', i);
            editBtn.textContent = '编辑';
            tdActions.appendChild(editBtn);
            
            // 状态切换按钮
            var toggleBtn = document.createElement('button');
            toggleBtn.className = 'btn btn-sm ' + (channel.active !== false ? 'btn-outline-secondary' : 'btn-outline-success') + ' toggle-status-btn me-1';
            toggleBtn.setAttribute('data-channel-id', i);
            toggleBtn.setAttribute('data-active', channel.active !== false ? 'true' : 'false');
            toggleBtn.textContent = channel.active !== false ? '禁用' : '启用';
            tdActions.appendChild(toggleBtn);
            
            // 删除按钮
            var deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-sm btn-outline-danger delete-channel-btn';
            deleteBtn.setAttribute('data-channel-id', i);
            deleteBtn.textContent = '删除';
            tdActions.appendChild(deleteBtn);
            
            tr.appendChild(tdActions);
            
            // 添加到表格
            channelTableBody.appendChild(tr);
        }
    };
    
    // 保存频道
    Admin.saveChannel = function() {
        var channelName = document.getElementById('channelName').value;
        var channelCategory = document.getElementById('channelCategory').value;
        var channelUrl = document.getElementById('channelUrl').value;
        var qualityLow = document.getElementById('qualityLow').checked;
        var qualityMedium = document.getElementById('qualityMedium').checked;
        var qualityHigh = document.getElementById('qualityHigh').checked;
        var channelActive = document.getElementById('channelActive').checked;
        
        // 基本验证
        if (!channelName || !channelCategory || !channelUrl) {
            alert('请填写所有必填字段');
            return;
        }
        
        // 构建质量数组
        var qualities = [];
        if (qualityLow) qualities.push('流畅');
        if (qualityMedium) qualities.push('标清');
        if (qualityHigh) qualities.push('高清');
        
        // 新频道对象
        var newChannel = {
            name: channelName,
            url: channelUrl,
            category: channelCategory,
            quality: qualities,
            active: channelActive
        };
        
        // 检查是否已有相同名称的频道
        var isDuplicate = false;
        for (var i = 0; i < this.channelsData.channels.length; i++) {
            if (this.channelsData.channels[i].name === channelName) {
                isDuplicate = true;
                break;
            }
        }
        
        if (isDuplicate) {
            if (!confirm('已存在同名频道，是否覆盖？')) {
                return;
            }
            
            // 覆盖现有频道
            for (var i = 0; i < this.channelsData.channels.length; i++) {
                if (this.channelsData.channels[i].name === channelName) {
                    this.channelsData.channels[i] = newChannel;
                    break;
                }
            }
        } else {
            // 添加新频道
            this.channelsData.channels.push(newChannel);
        }
        
        // 保存到服务器
        this.saveChannelsData();
        
        // 关闭模态框
        this.addChannelModal.hide();
        
        // 显示消息
        alert('频道保存成功！');
    };
    
    // 编辑频道
    Admin.editChannel = function(channelId) {
        var channel = this.channelsData.channels[channelId];
        if (!channel) return;
        
        // 填充表单
        document.getElementById('channelName').value = channel.name;
        document.getElementById('channelCategory').value = channel.category;
        document.getElementById('channelUrl').value = channel.url;
        document.getElementById('qualityLow').checked = channel.quality ? channel.quality.includes('流畅') : false;
        document.getElementById('qualityMedium').checked = channel.quality ? channel.quality.includes('标清') : false;
        document.getElementById('qualityHigh').checked = channel.quality ? channel.quality.includes('高清') : false;
        document.getElementById('channelActive').checked = channel.active !== false;
        
        // 显示模态框
        this.addChannelModal.show();
    };
    
    // 删除频道
    Admin.deleteChannel = function(channelId) {
        // 从数组中删除
        this.channelsData.channels.splice(channelId, 1);
        
        // 保存到服务器
        this.saveChannelsData();
        
        // 刷新显示
        this.renderChannels(this.channelsData.channels);
        this.updateActiveChannelCount(this.channelsData.channels);
    };
    
    // 切换频道状态
    Admin.toggleChannelStatus = function(channelId, active) {
        var channel = this.channelsData.channels[channelId];
        if (!channel) return;
        
        // 切换状态
        channel.active = active;
        
        // 保存到服务器
        this.saveChannelsData();
        
        // 刷新显示
        this.renderChannels(this.channelsData.channels);
        this.updateActiveChannelCount(this.channelsData.channels);
    };
    
    // 保存频道数据到服务器
    Admin.saveChannelsData = function() {
        // 在实际应用中，这里应该发送请求到服务器保存数据
        // 为了演示，我们暂时只更新本地显示
        console.log('保存频道数据', this.channelsData);
        
        // 这里只是模拟保存成功
        // 实际应用中应该有更完善的错误处理和反馈
        this.renderChannels(this.channelsData.channels);
        this.updateActiveChannelCount(this.channelsData.channels);
        
        // 添加保存成功的日志条目
        this.addLogEntry('频道数据保存成功', 'info');
    };
    
    // 加载系统状态
    Admin.loadSystemStatus = function() {
        // 在实际应用中，这里应该从服务器获取系统状态数据
        // 为了演示，我们使用模拟数据
        
        // 更新状态显示
        document.getElementById('nginxStatus').textContent = '运行中';
        document.getElementById('transcodeStatus').textContent = '运行中';
        document.getElementById('cpuUsage').textContent = Math.floor(Math.random() * 30) + 10 + '%';
        document.getElementById('memoryUsage').textContent = Math.floor(Math.random() * 40) + 20 + '%';
        
        // 定时刷新
        var self = this;
        setTimeout(function() {
            self.loadSystemStatus();
        }, 5000);
    };
    
    // 更新活跃频道计数
    Admin.updateActiveChannelCount = function(channels) {
        var count = 0;
        if (channels && channels.length) {
            for (var i = 0; i < channels.length; i++) {
                if (channels[i].active !== false) {
                    count++;
                }
            }
        }
        
        var activeChannelsEl = document.getElementById('activeChannels');
        if (activeChannelsEl) {
            activeChannelsEl.textContent = count;
        }
    };
    
    // 加载日志
    Admin.loadLogs = function() {
        // 在实际应用中，这里应该从服务器获取日志数据
        // 为了演示，我们使用模拟数据
        
        var logContainer = document.getElementById('logContainer');
        if (!logContainer) return;
        
        // 清空日志容器
        logContainer.innerHTML = '';
        
        // 添加一些模拟日志
        this.addLogEntry('系统启动', 'info');
        this.addLogEntry('Nginx服务启动成功', 'info');
        this.addLogEntry('转码服务启动成功', 'info');
        this.addLogEntry('加载了10个频道', 'info');
        
        if (Math.random() > 0.7) {
            this.addLogEntry('频道CCTV-5加载失败，尝试重连', 'warning');
        }
        
        if (Math.random() > 0.9) {
            this.addLogEntry('转码进程异常退出，已自动重启', 'error');
        }
    };
    
    // 添加日志条目
    Admin.addLogEntry = function(message, level) {
        var logContainer = document.getElementById('logContainer');
        if (!logContainer) return;
        
        var now = new Date();
        var timeStr = now.toLocaleTimeString();
        
        var entry = document.createElement('div');
        entry.className = 'log-entry log-' + (level || 'info');
        entry.textContent = '[' + timeStr + '] ' + message;
        
        // 添加到容器顶部
        if (logContainer.firstChild) {
            logContainer.insertBefore(entry, logContainer.firstChild);
        } else {
            logContainer.appendChild(entry);
        }
    };
    
    // 清除日志
    Admin.clearLogs = function() {
        var logContainer = document.getElementById('logContainer');
        if (logContainer) {
            logContainer.innerHTML = '';
            this.addLogEntry('日志已清除', 'info');
        }
    };
    
    // 页面加载完成时初始化
    document.addEventListener('DOMContentLoaded', function() {
        Admin.init();
    });
    
    // 暴露到全局用于调试
    window.StreamAdmin = Admin;
})(); 