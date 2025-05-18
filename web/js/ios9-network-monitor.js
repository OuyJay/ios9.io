/**
 * iOS9网络监控模块
 * 
 * 功能:
 * 1. 检测网络连接状态变化
 * 2. 监控弱网环境
 * 3. 为iOS 9优化网络处理
 */

(function(window) {
    'use strict';
    
    var NetworkMonitor = {
        isIOS9: false,
        isOnline: true,
        networkType: 'unknown',
        connectionSpeed: 'unknown',
        listeners: [],
        checkInterval: null,
        lastCheckTime: 0
    };
    
    // 初始化
    NetworkMonitor.init = function() {
        // 检测是否为iOS 9
        this.isIOS9 = window.iOS9Detector && window.iOS9Detector.isIOS9;
        
        // 绑定网络事件
        this.bindEvents();
        
        // 开始定期检查
        this.startMonitoring();
        
        // 进行初始检测
        this.checkConnection();
        
        return this;
    };
    
    // 绑定事件
    NetworkMonitor.bindEvents = function() {
        var self = this;
        
        // 标准网络事件
        window.addEventListener('online', function() {
            self.isOnline = true;
            self.notifyListeners('online');
        });
        
        window.addEventListener('offline', function() {
            self.isOnline = false;
            self.notifyListeners('offline');
        });
        
        // iOS 9特殊处理 - 页面可见性变化事件
        // iOS 9在APP切换后台再回来时，需要重新检测网络
        document.addEventListener('visibilitychange', function() {
            if (!document.hidden && self.isIOS9) {
                setTimeout(function() {
                    self.checkConnection();
                }, 1000);
            }
        });
    };
    
    // 开始监控
    NetworkMonitor.startMonitoring = function() {
        var self = this;
        
        // 停止现有监控
        this.stopMonitoring();
        
        // 设置间隔检查 - iOS 9设备更频繁地检查
        var interval = this.isIOS9 ? 10000 : 30000; // 10秒或30秒
        this.checkInterval = setInterval(function() {
            self.checkConnection();
        }, interval);
    };
    
    // 停止监控
    NetworkMonitor.stopMonitoring = function() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    };
    
    // 检测连接
    NetworkMonitor.checkConnection = function() {
        var self = this;
        var now = Date.now();
        
        // 限制检查频率，防止短时间内多次检查
        if (now - this.lastCheckTime < 5000) {
            return;
        }
        
        this.lastCheckTime = now;
        
        // 检测网络是否在线
        this.isOnline = navigator.onLine;
        
        // 如果不在线，直接返回
        if (!this.isOnline) {
            this.networkType = 'offline';
            this.connectionSpeed = 'offline';
            this.notifyListeners('connectionChange');
            return;
        }
        
        // 使用简单图片加载来测试网络速度
        // 对于iOS 9这种老设备，使用小图片以减少带宽占用
        var startTime = Date.now();
        var testImage = new Image();
        
        testImage.onload = function() {
            var endTime = Date.now();
            var duration = endTime - startTime;
            
            // 根据加载时间判断网络速度
            if (duration < 100) {
                self.connectionSpeed = 'fast';
            } else if (duration < 500) {
                self.connectionSpeed = 'medium';
            } else {
                self.connectionSpeed = 'slow';
            }
            
            self.networkType = 'online';
            self.notifyListeners('connectionChange');
        };
        
        testImage.onerror = function() {
            // 图片加载失败，可能是网络问题
            self.connectionSpeed = 'unstable';
            self.networkType = 'limited';
            self.notifyListeners('connectionChange');
        };
        
        // 使用时间戳防止缓存
        testImage.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7?' + now;
    };
    
    // 添加监听器
    NetworkMonitor.addListener = function(callback) {
        if (typeof callback === 'function' && this.listeners.indexOf(callback) === -1) {
            this.listeners.push(callback);
        }
        return this;
    };
    
    // 移除监听器
    NetworkMonitor.removeListener = function(callback) {
        var index = this.listeners.indexOf(callback);
        if (index !== -1) {
            this.listeners.splice(index, 1);
        }
        return this;
    };
    
    // 通知所有监听器
    NetworkMonitor.notifyListeners = function(eventType) {
        var eventData = {
            type: eventType,
            isOnline: this.isOnline,
            networkType: this.networkType,
            connectionSpeed: this.connectionSpeed,
            timestamp: Date.now()
        };
        
        for (var i = 0; i < this.listeners.length; i++) {
            try {
                this.listeners[i](eventData);
            } catch (e) {
                console.error('NetworkMonitor: 监听器错误', e);
            }
        }
    };
    
    // 获取网络状态
    NetworkMonitor.getStatus = function() {
        return {
            isOnline: this.isOnline,
            networkType: this.networkType,
            connectionSpeed: this.connectionSpeed
        };
    };
    
    // 根据当前网络推荐最优画质
    NetworkMonitor.getRecommendedQuality = function() {
        if (!this.isOnline) {
            return 'offline';
        }
        
        switch (this.connectionSpeed) {
            case 'fast':
                return 'high';
            case 'medium':
                return 'medium';
            case 'slow':
            case 'unstable':
                return 'low';
            default:
                return this.isIOS9 ? 'medium' : 'auto';
        }
    };
    
    // 暴露到全局
    window.NetworkMonitor = NetworkMonitor;
    
    // 自动初始化
    document.addEventListener('DOMContentLoaded', function() {
        NetworkMonitor.init();
    });
    
})(window); 