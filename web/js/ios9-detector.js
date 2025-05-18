/**
 * iOS9Detector - 用于检测iOS 9设备并提供优化
 * 
 * 功能:
 * 1. 检测iOS版本
 * 2. 检测浏览器类型
 * 3. 优化播放器设置
 * 4. 提供设备信息
 */

(function(window) {
    'use strict';

    // iOS9Detector类
    var iOS9Detector = function() {
        this.isIOS = false;
        this.iOSVersion = 0;
        this.isSafari = false;
        this.isChrome = false;
        this.isFirefox = false;
        this.isWebkit = false;
        this.isMobile = false;
        this.isIOS9 = false;
        this.supportsHLS = false;
        this.supportsDASH = false;
        this.supportsFLV = false;
        
        // 初始化
        this.init();
    };

    // 原型方法
    iOS9Detector.prototype = {
        // 初始化并检测环境
        init: function() {
            this.detectDevice();
            this.detectBrowser();
            this.detectFeatures();
            
            // 如果是iOS 9设备，添加特殊类到body
            if (this.isIOS9) {
                document.body.classList.add('ios9-device');
                this.showIOS9Notice();
            }
            
            return this;
        },
        
        // 检测设备
        detectDevice: function() {
            var ua = navigator.userAgent;
            
            // 检测是否为移动设备
            this.isMobile = /iPhone|iPad|iPod|Android|BlackBerry|IEMobile|Opera Mini/i.test(ua);
            
            // 检测是否为iOS设备
            this.isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
            
            // 获取iOS版本
            if (this.isIOS) {
                // 尝试正常提取
                var match = ua.match(/ OS (\d+)_(\d+)_?(\d+)?/);
                if (match) {
                    this.iOSVersion = parseInt(match[1], 10);
                    this.iOSMinorVersion = parseInt(match[2], 10);
                    this.iOSPatchVersion = parseInt(match[3] || 0, 10);
                } else {
                    // 备用匹配
                    match = ua.match(/ OS (\d+)_(\d+)/);
                    if (match) {
                        this.iOSVersion = parseInt(match[1], 10);
                        this.iOSMinorVersion = parseInt(match[2], 10);
                        this.iOSPatchVersion = 0;
                    }
                }
                
                // 检测是否为iOS 9
                this.isIOS9 = this.iOSVersion === 9;
            }
        },
        
        // 检测浏览器
        detectBrowser: function() {
            var ua = navigator.userAgent;
            
            // 检测是否为Safari
            this.isSafari = /Safari/.test(ua) && !/Chrome/.test(ua);
            
            // 检测是否为Chrome
            this.isChrome = /Chrome/.test(ua);
            
            // 检测是否为Firefox
            this.isFirefox = /Firefox/.test(ua);
            
            // 检测是否为Webkit
            this.isWebkit = /WebKit/.test(ua);
        },
        
        // 检测浏览器支持的功能
        detectFeatures: function() {
            // 检测HLS支持
            var video = document.createElement('video');
            this.supportsHLS = video.canPlayType('application/vnd.apple.mpegURL') !== '';
            
            // DASH支持检测 (大多数iOS 9不支持)
            this.supportsDASH = false;
            
            // FLV支持检测 (iOS 9不支持)
            this.supportsFLV = false;
            
            // iOS 9 Safari原生支持HLS
            if (this.isIOS9 && this.isSafari) {
                this.supportsHLS = true;
            }
        },
        
        // 返回当前设备的视频优化设置
        getOptimalSettings: function() {
            var settings = {
                preferredProtocol: 'hls',
                maxBufferLength: 30,
                autoQualityMode: true,
                preferredQuality: 'auto',
                startWithAudio: false,
                useNativeControls: false,
                preloadMode: 'metadata'
            };
            
            // iOS 9特殊优化
            if (this.isIOS9) {
                settings.preferredProtocol = 'hls'; // iOS 9原生支持HLS
                settings.maxBufferLength = 30; // 较小的缓冲区减少内存使用
                settings.autoQualityMode = false; // 禁用自动质量切换以减少CPU使用
                settings.preferredQuality = 'medium'; // 默认使用中等质量
                settings.startWithAudio = false; // 避免预加载音频
                settings.useNativeControls = true; // 对于iOS 9使用原生控件更可靠
                settings.preloadMode = 'none'; // 不预加载内容，等待用户交互
            }
            
            return settings;
        },
        
        // 获取设备完整信息
        getDeviceInfo: function() {
            return {
                platform: this.isIOS ? 'iOS' : (navigator.platform || 'Unknown'),
                version: this.isIOS ? this.iOSVersion + '.' + this.iOSMinorVersion + '.' + this.iOSPatchVersion : 'N/A',
                browser: this.isSafari ? 'Safari' : (this.isChrome ? 'Chrome' : (this.isFirefox ? 'Firefox' : 'Unknown')),
                isMobile: this.isMobile,
                supportsHLS: this.supportsHLS,
                supportsDASH: this.supportsDASH,
                supportsFLV: this.supportsFLV,
                userAgent: navigator.userAgent,
                isIOS9Compatible: this.isIOS9,
                screenWidth: window.innerWidth,
                screenHeight: window.innerHeight,
                pixelRatio: window.devicePixelRatio || 1
            };
        },
        
        // 显示iOS 9通知
        showIOS9Notice: function() {
            var notice = document.getElementById('ios9Notice');
            if (notice) {
                setTimeout(function() {
                    notice.classList.add('active');
                }, 1000);
                
                // 绑定关闭按钮事件
                var closeBtn = document.getElementById('closeNoticeBtn');
                if (closeBtn) {
                    closeBtn.addEventListener('click', function() {
                        notice.classList.remove('active');
                        
                        // 存储已显示通知的状态
                        try {
                            localStorage.setItem('ios9NoticeShown', 'true');
                        } catch (e) {
                            console.log('无法存储通知状态');
                        }
                    });
                }
                
                // 检查是否已经显示过通知
                try {
                    var shown = localStorage.getItem('ios9NoticeShown');
                    if (shown === 'true') {
                        notice.classList.remove('active');
                    }
                } catch (e) {
                    console.log('无法读取通知状态');
                }
            }
        },
        
        // 优化播放器设置
        optimizePlayer: function(player) {
            if (!player) return;
            
            // 获取最佳设置
            var settings = this.getOptimalSettings();
            
            // iOS 9优化
            if (this.isIOS9) {
                // 使用较小的缓冲区以减少内存使用
                if (player.options_ && player.options_.html5) {
                    player.options_.html5.nativeControlsForTouch = settings.useNativeControls;
                    if (player.options_.html5.hls) {
                        player.options_.html5.hls.overrideNative = !settings.useNativeControls;
                        player.options_.html5.hls.maxBufferLength = settings.maxBufferLength;
                    }
                }
                
                // 禁用一些高级功能，可能导致iOS 9崩溃
                if (player.controlBar) {
                    var simpleControls = [
                        'playToggle',
                        'volumePanel',
                        'currentTimeDisplay',
                        'timeDivider',
                        'durationDisplay',
                        'progressControl',
                        'fullscreenToggle'
                    ];
                    
                    // 移除一些可能导致问题的控件
                    for (var i = 0; i < player.controlBar.children().length; i++) {
                        var child = player.controlBar.children()[i];
                        if (child && simpleControls.indexOf(child.name_) === -1) {
                            player.controlBar.removeChild(child);
                        }
                    }
                }
                
                // 禁用自动质量调整
                if (player.tech_ && player.tech_.hls) {
                    player.tech_.hls.bandwidth = 1024 * 1024; // 1Mbps
                    player.tech_.hls.bandwidth = settings.preferredQuality === 'high' ? 2048 * 1024 : 
                                              (settings.preferredQuality === 'low' ? 512 * 1024 : 1024 * 1024);
                }
                
                // 添加特殊iOS 9类到播放器
                player.addClass('vjs-ios9-optimized');
            }
            
            return player;
        },
        
        // 更新设备信息显示
        updateDeviceInfoDisplay: function() {
            var infoEl = document.getElementById('deviceInfo');
            if (!infoEl) return;
            
            var info = this.getDeviceInfo();
            var html = '';
            
            html += '<p><strong>设备:</strong> ' + info.platform + ' ' + info.version + '</p>';
            html += '<p><strong>浏览器:</strong> ' + info.browser + '</p>';
            html += '<p><strong>协议支持:</strong> ';
            html += 'HLS: ' + (info.supportsHLS ? '✓' : '✗') + ', ';
            html += 'DASH: ' + (info.supportsDASH ? '✓' : '✗') + ', ';
            html += 'FLV: ' + (info.supportsFLV ? '✓' : '✗') + '</p>';
            html += '<p><strong>屏幕:</strong> ' + info.screenWidth + 'x' + info.screenHeight + ' (' + info.pixelRatio + 'x)</p>';
            
            if (info.isIOS9Compatible) {
                html += '<p class="device-note">您的设备已启用 iOS 9 优化模式</p>';
            }
            
            infoEl.innerHTML = html;
        }
    };
    
    // 导出到全局
    window.iOS9Detector = new iOS9Detector();
    
})(window); 