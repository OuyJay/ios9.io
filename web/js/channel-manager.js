/**
 * ChannelManager - 频道管理模块
 * 
 * 功能:
 * 1. 从channels.json加载频道数据
 * 2. 管理频道分类和筛选
 * 3. 构建频道UI
 * 4. 处理频道选择
 */

(function(window) {
    'use strict';
    
    // 频道管理器类
    var ChannelManager = function(options) {
        // 默认配置
        this.options = {
            channelsUrl: '../config/channels.json',
            categoryTabsId: 'categoryTabs',
            channelListId: 'channelList',
            channelTitleId: 'channelTitle',
            onChannelSelect: null,
            debugMode: false
        };
        
        // 合并用户配置
        this.mergeOptions(options);
        
        // 状态
        this.channels = [];
        this.categories = [];
        this.settings = {};
        this.currentCategory = 'all';
        this.currentChannel = null;
        this.isIOS9 = window.iOS9Detector && window.iOS9Detector.isIOS9;
        
        // 初始化
        this.init();
    };
    
    // 原型方法
    ChannelManager.prototype = {
        // 合并配置
        mergeOptions: function(options) {
            if (!options) return;
            
            for (var key in options) {
                if (options.hasOwnProperty(key)) {
                    this.options[key] = options[key];
                }
            }
        },
        
        // 初始化
        init: function() {
            this.loadChannels();
            this.bindEvents();
            return this;
        },
        
        // 记录日志
        log: function() {
            if (this.options.debugMode) {
                console.log.apply(console, ['[ChannelManager]'].concat(Array.prototype.slice.call(arguments)));
            }
        },
        
        // 加载频道数据
        loadChannels: function() {
            var self = this;
            
            // 显示加载指示器
            var channelList = document.getElementById(this.options.channelListId);
            if (channelList) {
                channelList.innerHTML = '<div class="loading-channels"><div class="spinner"></div><p>加载频道列表...</p></div>';
            }
            
            // 从服务器获取频道数据
            fetch(this.options.channelsUrl)
                .then(function(response) {
                    if (!response.ok) {
                        throw new Error('频道数据加载失败: ' + response.status);
                    }
                    return response.json();
                })
                .then(function(data) {
                    self.log('频道数据加载成功', data);
                    
                    // 保存数据
                    self.channels = data.channels || [];
                    self.categories = data.categories || [];
                    self.settings = data.settings || {};
                    
                    // 对于iOS 9设备，筛选出支持HLS的频道
                    if (self.isIOS9) {
                        self.channels = self.channels.filter(function(channel) {
                            return channel.active !== false;
                        });
                    }
                    
                    // 构建UI
                    self.buildCategoryTabs();
                    self.buildChannelList();
                })
                .catch(function(error) {
                    self.log('加载频道数据错误', error);
                    
                    // 显示错误
                    var channelList = document.getElementById(self.options.channelListId);
                    if (channelList) {
                        channelList.innerHTML = '<div class="error-message"><p>加载频道列表失败</p><button class="retry-btn" id="retryLoadChannels">重试</button></div>';
                        
                        // 绑定重试按钮
                        var retryButton = document.getElementById('retryLoadChannels');
                        if (retryButton) {
                            retryButton.addEventListener('click', function() {
                                self.loadChannels();
                            });
                        }
                    }
                });
        },
        
        // 构建频道分类标签
        buildCategoryTabs: function() {
            var categoryTabs = document.getElementById(this.options.categoryTabsId);
            if (!categoryTabs) return;
            
            // 清除当前标签，但保留"全部"标签
            var allTabHTML = '<button class="category-tab active" data-category="all">全部</button>';
            categoryTabs.innerHTML = allTabHTML;
            
            // 添加分类标签
            for (var i = 0; i < this.categories.length; i++) {
                var category = this.categories[i];
                var tabButton = document.createElement('button');
                tabButton.className = 'category-tab';
                tabButton.setAttribute('data-category', category);
                tabButton.textContent = category;
                categoryTabs.appendChild(tabButton);
            }
        },
        
        // 构建频道列表
        buildChannelList: function(category) {
            var channelList = document.getElementById(this.options.channelListId);
            if (!channelList) return;
            
            // 清空现有列表
            channelList.innerHTML = '';
            
            // 过滤频道
            var filteredChannels = this.channels;
            if (category && category !== 'all') {
                filteredChannels = this.channels.filter(function(channel) {
                    return channel.category === category;
                });
            }
            
            // 如果没有频道
            if (filteredChannels.length === 0) {
                channelList.innerHTML = '<div class="no-channels"><p>没有找到频道</p></div>';
                return;
            }
            
            // 添加频道
            for (var i = 0; i < filteredChannels.length; i++) {
                var channel = filteredChannels[i];
                var channelElement = document.createElement('div');
                channelElement.className = 'channel-item';
                channelElement.setAttribute('data-channel-id', i);
                
                // 构建质量标签
                var qualityBadges = '';
                if (channel.quality && channel.quality.length) {
                    for (var j = 0; j < channel.quality.length; j++) {
                        qualityBadges += '<span class="quality-badge">' + channel.quality[j] + '</span>';
                    }
                }
                
                // 频道内容
                channelElement.innerHTML = 
                    '<div class="channel-info">' +
                        '<h3 class="channel-name">' + channel.name + '</h3>' +
                        '<div class="channel-meta">' +
                            '<span class="channel-category">' + channel.category + '</span>' +
                            qualityBadges +
                        '</div>' +
                    '</div>';
                
                // 添加到列表
                channelList.appendChild(channelElement);
            }
        },
        
        // 绑定事件
        bindEvents: function() {
            var self = this;
            
            // 分类标签点击
            var categoryTabs = document.getElementById(this.options.categoryTabsId);
            if (categoryTabs) {
                categoryTabs.addEventListener('click', function(e) {
                    if (e.target.classList.contains('category-tab')) {
                        // 更新活动状态
                        var tabs = categoryTabs.querySelectorAll('.category-tab');
                        for (var i = 0; i < tabs.length; i++) {
                            tabs[i].classList.remove('active');
                        }
                        e.target.classList.add('active');
                        
                        // 更新当前分类并重建列表
                        self.currentCategory = e.target.getAttribute('data-category');
                        self.buildChannelList(self.currentCategory);
                    }
                });
            }
            
            // 频道点击
            var channelList = document.getElementById(this.options.channelListId);
            if (channelList) {
                channelList.addEventListener('click', function(e) {
                    var channelItem = e.target.closest('.channel-item');
                    if (channelItem) {
                        // 更新活动状态
                        var items = channelList.querySelectorAll('.channel-item');
                        for (var i = 0; i < items.length; i++) {
                            items[i].classList.remove('active');
                        }
                        channelItem.classList.add('active');
                        
                        // 获取频道数据
                        var channelId = parseInt(channelItem.getAttribute('data-channel-id'), 10);
                        var channel = self.channels[channelId];
                        self.currentChannel = channel;
                        
                        // 更新标题
                        var channelTitle = document.getElementById(self.options.channelTitleId);
                        if (channelTitle) {
                            channelTitle.textContent = channel.name;
                        }
                        
                        // 调用选择回调
                        if (typeof self.options.onChannelSelect === 'function') {
                            self.options.onChannelSelect(channel);
                        }
                    }
                });
            }
        },
        
        // 获取频道列表
        getChannels: function() {
            return this.channels;
        },
        
        // 获取分类列表
        getCategories: function() {
            return this.categories;
        },
        
        // 获取系统设置
        getSettings: function() {
            return this.settings;
        },
        
        // 获取当前频道
        getCurrentChannel: function() {
            return this.currentChannel;
        }
    };
    
    // 导出到全局
    window.ChannelManager = ChannelManager;
})(window); 