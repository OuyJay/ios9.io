/**
 * 多协议流媒体直播应用
 * 
 * 整合功能:
 * 1. iOS9设备检测与优化
 * 2. 自适应多协议播放器
 * 3. 频道管理
 * 4. 设置管理
 * 5. UI交互
 */

(function() {
    'use strict';
    
    // 应用程序状态
    var App = {
        player: null,
        channelManager: null,
        isIOS9: window.iOS9Detector && window.iOS9Detector.isIOS9,
        initialized: false,
        debugMode: false,
        elements: {},
        settings: {
            bufferSize: 30,
            defaultProtocol: 'auto',
            defaultQuality: 'auto',
            preferredCDN: 'auto'
        }
    };
    
    // 初始化应用
    App.init = function() {
        if (this.initialized) return;
        
        // 记录日志
        this.log('初始化应用');
        
        // 获取页面元素
        this.initElements();
        
        // 初始化播放器
        this.initPlayer();
        
        // 初始化频道管理器
        this.initChannelManager();
        
        // 绑定事件
        this.bindEvents();
        
        // 初始化设置
        this.initSettings();
        
        // 更新设备信息
        if (window.iOS9Detector) {
            window.iOS9Detector.updateDeviceInfoDisplay();
        }
        
        this.initialized = true;
        this.log('应用初始化完成');
    };
    
    // 获取页面元素
    App.initElements = function() {
        // 播放器元素
        this.elements.videoPlayer = document.getElementById('videoPlayer');
        this.elements.loadingOverlay = document.getElementById('loadingOverlay');
        this.elements.channelTitle = document.getElementById('channelTitle');
        
        // 控制元素
        this.elements.qualitySelector = document.getElementById('qualitySelector');
        this.elements.protocolSelector = document.getElementById('protocolSelector');
        this.elements.refreshBtn = document.getElementById('refreshBtn');
        this.elements.settingsBtn = document.getElementById('settingsBtn');
        
        // 设置面板元素
        this.elements.settingsPanel = document.getElementById('settingsPanel');
        this.elements.closeSettingsBtn = document.getElementById('closeSettingsBtn');
        this.elements.saveSettingsBtn = document.getElementById('saveSettingsBtn');
        this.elements.resetSettingsBtn = document.getElementById('resetSettingsBtn');
        this.elements.bufferSizeSlider = document.getElementById('bufferSizeSlider');
        this.elements.bufferSizeValue = document.getElementById('bufferSizeValue');
        this.elements.defaultProtocolSelect = document.getElementById('defaultProtocolSelect');
        this.elements.defaultQualitySelect = document.getElementById('defaultQualitySelect');
        this.elements.cdnSelect = document.getElementById('cdnSelect');
        this.elements.deviceInfo = document.getElementById('deviceInfo');
        
        // iOS 9通知元素
        this.elements.ios9Notice = document.getElementById('ios9Notice');
        this.elements.closeNoticeBtn = document.getElementById('closeNoticeBtn');
    };
    
    // 初始化播放器
    App.initPlayer = function() {
        var playerOptions = {
            videoElementId: 'videoPlayer',
            loadingOverlayId: 'loadingOverlay',
            defaultProtocol: this.settings.defaultProtocol,
            defaultQuality: this.settings.defaultQuality,
            debugMode: this.debugMode
        };
        
        // 如果是iOS 9，设置特殊配置
        if (this.isIOS9) {
            playerOptions.maxBufferLength = 30;
            playerOptions.hlsConfig = {
                maxBufferLength: 30,
                maxBufferSize: 20 * 1000 * 1000, // 20MB
                enableWorker: false,
                liveSyncDurationCount: 3
            };
        }
        
        // 创建播放器实例
        this.player = new AdaptivePlayer(playerOptions);
    };
    
    // 初始化频道管理器
    App.initChannelManager = function() {
        var self = this;
        
        // 创建频道管理器实例
        this.channelManager = new ChannelManager({
            onChannelSelect: function(channel) {
                self.onChannelSelect(channel);
            },
            debugMode: this.debugMode
        });
    };
    
    // 初始化设置
    App.initSettings = function() {
        var self = this;
        
        // 尝试从本地存储加载设置
        try {
            var savedSettings = localStorage.getItem('streamSettings');
            if (savedSettings) {
                var parsedSettings = JSON.parse(savedSettings);
                this.settings = Object.assign({}, this.settings, parsedSettings);
                this.log('已加载保存的设置', this.settings);
            }
        } catch (e) {
            this.log('无法加载设置', e);
        }
        
        // 应用设置到UI
        this.applySettingsToUI();
        
        // 应用设置到播放器
        if (this.player) {
            this.player.setProtocol(this.settings.defaultProtocol);
            this.player.setQuality(this.settings.defaultQuality);
            
            if (this.player.options) {
                this.player.options.maxBufferLength = this.settings.bufferSize;
                if (this.player.options.hlsConfig) {
                    this.player.options.hlsConfig.maxBufferLength = this.settings.bufferSize;
                }
            }
        }
    };
    
    // 将设置应用到UI
    App.applySettingsToUI = function() {
        // 缓冲区大小滑块
        if (this.elements.bufferSizeSlider) {
            this.elements.bufferSizeSlider.value = this.settings.bufferSize;
        }
        if (this.elements.bufferSizeValue) {
            this.elements.bufferSizeValue.textContent = this.settings.bufferSize;
        }
        
        // 默认协议选择
        if (this.elements.defaultProtocolSelect) {
            this.elements.defaultProtocolSelect.value = this.settings.defaultProtocol;
        }
        
        // 默认质量选择
        if (this.elements.defaultQualitySelect) {
            this.elements.defaultQualitySelect.value = this.settings.defaultQuality;
        }
        
        // CDN选择
        if (this.elements.cdnSelect) {
            this.elements.cdnSelect.value = this.settings.preferredCDN;
        }
    };
    
    // 保存设置
    App.saveSettings = function() {
        // 从UI读取设置
        if (this.elements.bufferSizeSlider) {
            this.settings.bufferSize = parseInt(this.elements.bufferSizeSlider.value, 10);
        }
        
        if (this.elements.defaultProtocolSelect) {
            this.settings.defaultProtocol = this.elements.defaultProtocolSelect.value;
        }
        
        if (this.elements.defaultQualitySelect) {
            this.settings.defaultQuality = this.elements.defaultQualitySelect.value;
        }
        
        if (this.elements.cdnSelect) {
            this.settings.preferredCDN = this.elements.cdnSelect.value;
        }
        
        // 应用到播放器
        if (this.player) {
            this.player.setProtocol(this.settings.defaultProtocol);
            this.player.setQuality(this.settings.defaultQuality);
            
            if (this.player.options) {
                this.player.options.maxBufferLength = this.settings.bufferSize;
                if (this.player.options.hlsConfig) {
                    this.player.options.hlsConfig.maxBufferLength = this.settings.bufferSize;
                }
            }
        }
        
        // 保存到本地存储
        try {
            localStorage.setItem('streamSettings', JSON.stringify(this.settings));
            this.log('设置已保存', this.settings);
        } catch (e) {
            this.log('无法保存设置', e);
        }
    };
    
    // 重置设置
    App.resetSettings = function() {
        // 重置为默认值
        this.settings = {
            bufferSize: this.isIOS9 ? 30 : 60,
            defaultProtocol: 'auto',
            defaultQuality: 'auto',
            preferredCDN: 'auto'
        };
        
        // 更新UI
        this.applySettingsToUI();
        
        // 应用到播放器
        if (this.player) {
            this.player.setProtocol(this.settings.defaultProtocol);
            this.player.setQuality(this.settings.defaultQuality);
            
            if (this.player.options) {
                this.player.options.maxBufferLength = this.settings.bufferSize;
                if (this.player.options.hlsConfig) {
                    this.player.options.hlsConfig.maxBufferLength = this.settings.bufferSize;
                }
            }
        }
        
        // 清除本地存储
        try {
            localStorage.removeItem('streamSettings');
            this.log('设置已重置');
        } catch (e) {
            this.log('无法重置设置', e);
        }
    };
    
    // 频道选择处理
    App.onChannelSelect = function(channel) {
        this.log('选择频道', channel.name);
        
        // 使用播放器播放频道
        if (this.player) {
            this.player.playChannel(channel);
        }
    };
    
    // 绑定UI事件
    App.bindEvents = function() {
        var self = this;
        
        // 质量选择
        if (this.elements.qualitySelector) {
            this.elements.qualitySelector.addEventListener('click', function(e) {
                if (e.target.classList.contains('quality-btn')) {
                    // 更新按钮状态
                    var btns = self.elements.qualitySelector.querySelectorAll('.quality-btn');
                    for (var i = 0; i < btns.length; i++) {
                        btns[i].classList.remove('active');
                    }
                    e.target.classList.add('active');
                    
                    // 设置播放质量
                    var quality = e.target.getAttribute('data-quality');
                    if (self.player) {
                        self.player.setQuality(quality);
                    }
                }
            });
        }
        
        // 协议选择
        if (this.elements.protocolSelector) {
            this.elements.protocolSelector.addEventListener('click', function(e) {
                if (e.target.classList.contains('protocol-btn')) {
                    // 更新按钮状态
                    var btns = self.elements.protocolSelector.querySelectorAll('.protocol-btn');
                    for (var i = 0; i < btns.length; i++) {
                        btns[i].classList.remove('active');
                    }
                    e.target.classList.add('active');
                    
                    // 设置播放协议
                    var protocol = e.target.getAttribute('data-protocol');
                    if (self.player) {
                        self.player.setProtocol(protocol);
                    }
                }
            });
        }
        
        // 刷新按钮
        if (this.elements.refreshBtn) {
            this.elements.refreshBtn.addEventListener('click', function() {
                // 刷新当前频道
                var currentChannel = self.channelManager.getCurrentChannel();
                if (currentChannel && self.player) {
                    self.player.playChannel(currentChannel);
                } else {
                    // 刷新频道列表
                    self.channelManager.loadChannels();
                }
            });
        }
        
        // 设置按钮
        if (this.elements.settingsBtn) {
            this.elements.settingsBtn.addEventListener('click', function() {
                if (self.elements.settingsPanel) {
                    self.elements.settingsPanel.classList.add('active');
                }
            });
        }
        
        // 关闭设置按钮
        if (this.elements.closeSettingsBtn) {
            this.elements.closeSettingsBtn.addEventListener('click', function() {
                if (self.elements.settingsPanel) {
                    self.elements.settingsPanel.classList.remove('active');
                }
            });
        }
        
        // 保存设置按钮
        if (this.elements.saveSettingsBtn) {
            this.elements.saveSettingsBtn.addEventListener('click', function() {
                self.saveSettings();
                if (self.elements.settingsPanel) {
                    self.elements.settingsPanel.classList.remove('active');
                }
            });
        }
        
        // 重置设置按钮
        if (this.elements.resetSettingsBtn) {
            this.elements.resetSettingsBtn.addEventListener('click', function() {
                self.resetSettings();
            });
        }
        
        // 缓冲区大小滑块
        if (this.elements.bufferSizeSlider) {
            this.elements.bufferSizeSlider.addEventListener('input', function() {
                if (self.elements.bufferSizeValue) {
                    self.elements.bufferSizeValue.textContent = this.value;
                }
            });
        }
        
        // iOS 9通知关闭按钮
        if (this.elements.closeNoticeBtn) {
            this.elements.closeNoticeBtn.addEventListener('click', function() {
                if (self.elements.ios9Notice) {
                    self.elements.ios9Notice.classList.remove('active');
                    
                    // 保存状态
                    try {
                        localStorage.setItem('ios9NoticeShown', 'true');
                    } catch (e) {
                        self.log('无法保存通知状态', e);
                    }
                }
            });
        }
    };
    
    // 输出日志
    App.log = function() {
        if (!this.debugMode) return;
        
        var args = Array.prototype.slice.call(arguments);
        args.unshift('[App]');
        console.log.apply(console, args);
    };
    
    // DOMContentLoaded事件触发时初始化应用
    document.addEventListener('DOMContentLoaded', function() {
        App.init();
    });
    
    // 导出到全局，用于调试
    window.StreamApp = App;
})();
