/**
 * AdaptivePlayer - 自适应多协议视频播放器
 * 
 * 功能:
 * 1. 支持HLS、DASH、HTTP-FLV多协议
 * 2. 自动适应设备选择最佳协议
 * 3. 自动切换码率
 * 4. iOS 9特别优化
 * 5. 错误恢复机制
 */

(function(window) {
    'use strict';

    /**
     * 自适应播放器类
     */
    var AdaptivePlayer = function(options) {
        // 默认配置
        this.options = {
            videoElementId: 'videoPlayer',
            loadingOverlayId: 'loadingOverlay',
            defaultProtocol: 'auto', // auto, hls, dash, flv
            defaultQuality: 'auto', // auto, high, medium, low
            maxRetries: 3,
            retryDelay: 2000,
            maxBufferLength: 60,
            debugMode: false,
            hlsConfig: {
                maxBufferLength: 30,
                maxBufferSize: 30 * 1000 * 1000, // 30MB buffer size
                enableWorker: false, // iOS 9 不支持 Web Workers
                liveSyncDurationCount: 3,
                liveMaxLatencyDurationCount: 10
            },
            dashConfig: {
                streaming: {
                    buffer: {
                        fastSwitchEnabled: true
                    },
                    abr: {
                        autoSwitchBitrate: true
                    }
                }
            },
            flvConfig: {
                isLive: true,
                hasAudio: true,
                hasVideo: true
            }
        };
        
        // 合并用户配置
        this.mergeOptions(options);
        
        // 播放器状态
        this.player = null;
        this.currentProtocol = 'auto';
        this.currentQuality = 'auto';
        this.retryCount = 0;
        this.isPlaying = false;
        this.currentChannel = null;
        this.isIOS9 = window.iOS9Detector && window.iOS9Detector.isIOS9;
        
        // 初始化播放器
        this.init();
    };

    /**
     * 播放器原型方法
     */
    AdaptivePlayer.prototype = {
        // 合并配置
        mergeOptions: function(options) {
            if (!options) return;
            
            for (var key in options) {
                if (options.hasOwnProperty(key)) {
                    if (typeof options[key] === 'object' && !Array.isArray(options[key]) && this.options[key]) {
                        for (var subKey in options[key]) {
                            if (options[key].hasOwnProperty(subKey)) {
                                this.options[key][subKey] = options[key][subKey];
                            }
                        }
                    } else {
                        this.options[key] = options[key];
                    }
                }
            }
            
            // iOS 9优化设置
            if (this.isIOS9) {
                this.options.maxBufferLength = 30;
                this.options.hlsConfig.maxBufferLength = 30;
                this.options.hlsConfig.maxBufferSize = 20 * 1000 * 1000; // 20MB
                this.options.hlsConfig.enableWorker = false;
            }
        },
        
        // 初始化播放器
        init: function() {
            // 获取播放器元素
            var videoElement = document.getElementById(this.options.videoElementId);
            if (!videoElement) {
                this.log('错误: 无法找到视频元素 #' + this.options.videoElementId);
                return;
            }
            
            // 初始化VideoJS播放器
            this.player = videojs(this.options.videoElementId, {
                controls: true,
                autoplay: false,
                preload: this.isIOS9 ? 'none' : 'auto',
                fluid: true,
                html5: {
                    vhs: this.options.hlsConfig,
                    nativeTextTracks: false
                }
            });
            
            // 注册事件
            this.registerEvents();
            
            // 如果是iOS 9，应用额外优化
            if (this.isIOS9 && window.iOS9Detector) {
                window.iOS9Detector.optimizePlayer(this.player);
                this.log('应用 iOS 9 优化设置');
            }
            
            // 设置默认协议和质量
            this.setProtocol(this.options.defaultProtocol);
            this.setQuality(this.options.defaultQuality);
            
            return this;
        },
        
        // 注册播放器事件
        registerEvents: function() {
            var self = this;
            
            // 播放器就绪
            this.player.ready(function() {
                self.log('播放器已初始化');
                
                // 控制加载状态显示
                self.player.on('loadstart', function() {
                    self.showLoader(true);
                });
                
                self.player.on('loadeddata', function() {
                    self.showLoader(false);
                });
                
                // 错误处理
                self.player.on('error', function(e) {
                    self.log('播放器错误:', self.player.error());
                    self.handlePlaybackError();
                });
                
                // 播放状态监控
                self.player.on('play', function() {
                    self.isPlaying = true;
                });
                
                self.player.on('pause', function() {
                    self.isPlaying = false;
                });
                
                // 质量级别变更
                if (self.player.qualityLevels) {
                    var qualityLevels = self.player.qualityLevels();
                    qualityLevels.on('addqualitylevel', function(event) {
                        self.log('添加质量级别:', event.qualityLevel.height + 'p');
                    });
                    
                    qualityLevels.on('change', function() {
                        self.log('当前质量级别:', qualityLevels[qualityLevels.selectedIndex] ? 
                            qualityLevels[qualityLevels.selectedIndex].height + 'p' : '自动');
                    });
                }
            });
        },
        
        // 设置播放协议
        setProtocol: function(protocol) {
            protocol = protocol || 'auto';
            
            if (protocol === this.currentProtocol) {
                return;
            }
            
            // 如果是iOS 9，强制使用HLS
            if (this.isIOS9 && protocol !== 'hls' && protocol !== 'auto') {
                this.log('iOS 9设备必须使用HLS协议，忽略协议切换请求');
                protocol = 'hls';
            }
            
            this.currentProtocol = protocol;
            this.log('设置协议:', protocol);
            
            // 如果有正在播放的频道，重新加载
            if (this.currentChannel) {
                this.playChannel(this.currentChannel);
            }
            
            return this;
        },
        
        // 设置播放质量
        setQuality: function(quality) {
            quality = quality || 'auto';
            
            if (quality === this.currentQuality) {
                return;
            }
            
            this.currentQuality = quality;
            this.log('设置质量:', quality);
            
            // 设置质量级别
            if (this.player && this.player.qualityLevels) {
                var qualityLevels = this.player.qualityLevels();
                
                // 根据质量设置启用/禁用级别
                for (var i = 0; i < qualityLevels.length; i++) {
                    var level = qualityLevels[i];
                    
                    // 启用对应质量级别
                    if (quality === 'auto') {
                        level.enabled = true;
                    } else if (quality === 'high' && level.height >= 720) {
                        level.enabled = true;
                    } else if (quality === 'medium' && level.height >= 480 && level.height < 720) {
                        level.enabled = true;
                    } else if (quality === 'low' && level.height < 480) {
                        level.enabled = true;
                    } else {
                        level.enabled = false;
                    }
                }
            }
            
            // 如果是iOS 9设备的特殊优化
            if (this.isIOS9 && this.player && this.player.tech_ && this.player.tech_.hls) {
                // 设置带宽限制
                if (quality === 'high') {
                    this.player.tech_.hls.bandwidth = 2000 * 1024; // 2Mbps
                } else if (quality === 'medium') {
                    this.player.tech_.hls.bandwidth = 1000 * 1024; // 1Mbps
                } else if (quality === 'low') {
                    this.player.tech_.hls.bandwidth = 500 * 1024; // 500Kbps
                }
            }
            
            return this;
        },
        
        // 播放频道
        playChannel: function(channel) {
            if (!channel || !channel.url) {
                this.log('错误: 无效的频道信息');
                return this;
            }
            
            this.currentChannel = channel;
            this.retryCount = 0;
            
            // 构建播放URL
            var url = this.getStreamUrl(channel);
            var sourceType = this.getSourceType();
            
            // 暂停当前播放
            if (this.player) {
                this.player.pause();
                this.showLoader(true);
                
                // 设置新的播放源
                this.player.src({
                    src: url,
                    type: sourceType
                });
                
                // 加载并播放
                this.player.load();
                
                // iOS 9需要等待用户交互才能播放
                if (!this.isIOS9) {
                    var self = this;
                    // 延迟播放，减少初始缓冲问题
                    setTimeout(function() {
                        self.player.play().catch(function(error) {
                            self.log('自动播放失败:', error);
                        });
                    }, 100);
                }
            }
            
            return this;
        },
        
        // 获取流URL
        getStreamUrl: function(channel) {
            var protocol = this.currentProtocol;
            
            // 自动选择最佳协议
            if (protocol === 'auto') {
                if (this.isIOS9) {
                    protocol = 'hls'; // iOS 9 最好使用HLS
                } else if (channel.streams) {
                    // 按照优先级选择: HLS > DASH > FLV
                    if (channel.streams.hls) {
                        protocol = 'hls';
                    } else if (channel.streams.dash) {
                        protocol = 'dash';
                    } else if (channel.streams.flv) {
                        protocol = 'flv';
                    } else {
                        protocol = 'hls'; // 默认HLS
                    }
                } else {
                    protocol = 'hls'; // 默认HLS
                }
            }
            
            // 从streams中获取URL
            if (channel.streams && channel.streams[protocol]) {
                return channel.streams[protocol];
            }
            
            // 回退到主URL
            return channel.url;
        },
        
        // 获取源类型
        getSourceType: function() {
            var protocol = this.currentProtocol;
            
            // 自动协议时，查看当前频道的协议
            if (protocol === 'auto' && this.currentChannel && this.currentChannel.streams) {
                if (this.currentChannel.streams.hls) {
                    protocol = 'hls';
                } else if (this.currentChannel.streams.dash) {
                    protocol = 'dash';
                } else if (this.currentChannel.streams.flv) {
                    protocol = 'flv';
                } else {
                    protocol = 'hls';
                }
            }
            
            // 返回MIME类型
            switch (protocol) {
                case 'hls':
                    return 'application/x-mpegURL';
                case 'dash':
                    return 'application/dash+xml';
                case 'flv':
                    return 'video/x-flv';
                default:
                    return 'application/x-mpegURL';
            }
        },
        
        // 显示/隐藏加载动画
        showLoader: function(show) {
            var loader = document.getElementById(this.options.loadingOverlayId);
            if (loader) {
                if (show) {
                    loader.style.display = 'flex';
                } else {
                    loader.style.display = 'none';
                }
            }
        },
        
        // 错误处理与重试
        handlePlaybackError: function() {
            var self = this;
            
            // 显示加载中
            this.showLoader(true);
            
            // 如果超过最大重试次数
            if (this.retryCount >= this.options.maxRetries) {
                this.log('达到最大重试次数，尝试切换协议');
                
                // 尝试切换协议
                if (this.currentProtocol === 'hls') {
                    this.setProtocol('dash');
                } else if (this.currentProtocol === 'dash') {
                    this.setProtocol('flv');
                } else {
                    this.setProtocol('hls');
                }
                
                // 重置重试计数
                this.retryCount = 0;
                
                // 如果是iOS 9，显示错误信息
                if (this.isIOS9) {
                    this.showErrorMessage('播放失败，请尝试其他频道');
                    this.showLoader(false);
                    return;
                }
            } else {
                // 增加重试计数
                this.retryCount++;
                
                // 重试延迟随次数增加
                var delay = this.options.retryDelay * this.retryCount;
                
                this.log('播放错误，将在 ' + (delay/1000) + ' 秒后重试 (尝试 ' + this.retryCount + '/' + this.options.maxRetries + ')');
                
                // 延迟重试
                setTimeout(function() {
                    if (self.currentChannel) {
                        self.playChannel(self.currentChannel);
                    }
                }, delay);
            }
        },
        
        // 显示错误消息
        showErrorMessage: function(message) {
            if (this.player) {
                var errorDisplay = this.player.getChild('errorDisplay');
                if (errorDisplay) {
                    errorDisplay.content(message);
                }
            }
        },
        
        // 日志输出
        log: function() {
            if (this.options.debugMode) {
                var args = Array.prototype.slice.call(arguments);
                args.unshift('[AdaptivePlayer]');
                console.log.apply(console, args);
            }
        }
    };
    
    // 导出到全局
    window.AdaptivePlayer = AdaptivePlayer;
    
})(window); 