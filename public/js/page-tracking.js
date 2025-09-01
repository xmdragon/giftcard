class PageTrackingManager {
    constructor() {
        this.sessionId = this.generateSessionId();
        this.currentPage = null;
        this.pageEnterTime = null;
        this.userType = 'guest'; // Default to guest
        this.isTracking = false;
        
        this.pageNameMap = {
            'welcomePage': '欢迎页',
            'loginPage': '登录页',
            'waitingPage': '等待审核页',
            'verificationPage': '验证码页',
            'waitingVerificationPage': '等待验证页',
            'giftCardPage': '礼品卡页',
            'checkinPage': '签到页',
            'historyPage': '历史记录页'
        };
        
        this.init();
    }
    
    generateSessionId() {
        const stored = localStorage.getItem('pageTrackingSessionId');
        if (stored) return stored;
        
        const sessionId = 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('pageTrackingSessionId', sessionId);
        return sessionId;
    }
    
    init() {
        this.isTracking = true;
        
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseTracking();
            } else {
                this.resumeTracking();
            }
        });
        
        window.addEventListener('beforeunload', () => {
            this.stopPageTracking();
        });
        
        window.addEventListener('unload', () => {
            this.stopPageTracking();
        });
        
        setInterval(() => {
            if (this.currentPage && this.isTracking) {
                this.updateCurrentPageDuration();
            }
        }, 30000); // Update every 30 seconds
    }
    
    startPageTracking(pageId) {
        this.stopPageTracking();
        
        const pageName = this.pageNameMap[pageId] || pageId;
        this.currentPage = pageId;
        this.pageEnterTime = Date.now();
        
        this.sendTrackingData({
            action: 'enter',
            pageName: pageName,
            enterTime: new Date().toISOString()
        });
        
    }
    
    stopPageTracking() {
        if (this.currentPage && this.pageEnterTime) {
            const duration = Math.floor((Date.now() - this.pageEnterTime) / 1000);
            const pageName = this.pageNameMap[this.currentPage] || this.currentPage;
            
            this.sendTrackingData({
                action: 'leave',
                pageName: pageName,
                duration: duration,
                leaveTime: new Date().toISOString()
            });
            
        }
        
        this.currentPage = null;
        this.pageEnterTime = null;
    }
    
    pauseTracking() {
        if (this.currentPage && this.isTracking) {
            this.isTracking = false;
            this.updateCurrentPageDuration();
        }
    }
    
    resumeTracking() {
        if (this.currentPage && !this.isTracking) {
            this.isTracking = true;
            this.pageEnterTime = Date.now(); // Recalculate start time
        }
    }
    
    updateCurrentPageDuration() {
        if (this.currentPage && this.pageEnterTime) {
            const duration = Math.floor((Date.now() - this.pageEnterTime) / 1000);
            const pageName = this.pageNameMap[this.currentPage] || this.currentPage;
            
            this.sendTrackingData({
                action: 'update',
                pageName: pageName,
                duration: duration
            });
        }
    }
    
    setUserInfo(userType, userId) {
        this.userType = userType;
        if (userType === 'member' && userId) {
            this.sessionId = `member_${userId}`;
            localStorage.setItem('pageTrackingSessionId', this.sessionId);
        }
    }
    
    sendTrackingData(data) {
        // 如果处于开发或测试环境，静默处理错误
        try {
            const trackingData = {
                sessionId: this.sessionId,
                userType: this.userType,
                pageName: data.pageName,
                action: data.action,
                duration: data.duration || 0,
                enterTime: data.enterTime,
                leaveTime: data.leaveTime,
                userAgent: navigator.userAgent,
                referrer: document.referrer
            };
            
            // 使用 sendBeacon 优先，失败时使用 fetch
            if (navigator.sendBeacon) {
                try {
                    const blob = new Blob([JSON.stringify(trackingData)], {
                        type: 'application/json'
                    });
                    navigator.sendBeacon('/api/tracking/page', blob);
                } catch (e) {
                    // 静默失败，不输出错误
                }
            } else {
                fetch('/api/tracking/page', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(trackingData),
                    keepalive: true
                }).catch(() => {
                    // 静默处理错误，避免控制台污染
                    // 可以选择将数据存储到 localStorage 以便后续重试
                    this.storeFailedTracking(trackingData);
                });
            }
        } catch (error) {
            // 静默处理所有错误
        }
    }
    
    // 存储失败的追踪数据，以便后续重试
    storeFailedTracking(data) {
        try {
            const failedData = JSON.parse(localStorage.getItem('failedTrackingData') || '[]');
            failedData.push({...data, timestamp: Date.now()});
            // 只保留最近100条
            if (failedData.length > 100) {
                failedData.shift();
            }
            localStorage.setItem('failedTrackingData', JSON.stringify(failedData));
        } catch (e) {
            // 静默处理存储错误
        }
    }
    
    // 重试发送失败的追踪数据
    retryFailedTracking() {
        try {
            const failedData = JSON.parse(localStorage.getItem('failedTrackingData') || '[]');
            if (failedData.length === 0) return;
            
            // 批量发送失败的数据
            fetch('/api/tracking/batch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(failedData)
            }).then(response => {
                if (response.ok) {
                    localStorage.removeItem('failedTrackingData');
                }
            }).catch(() => {
                // 静默处理重试失败
            });
        } catch (e) {
            // 静默处理错误
        }
    }
    
    resetSession() {
        localStorage.removeItem('pageTrackingSessionId');
        this.sessionId = this.generateSessionId();
        this.userType = 'guest';
    }
}

window.pageTracker = new PageTrackingManager();