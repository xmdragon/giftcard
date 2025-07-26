// 用户行为追踪管理器
class PageTrackingManager {
    constructor() {
        this.sessionId = this.generateSessionId();
        this.currentPage = null;
        this.pageEnterTime = null;
        this.userType = 'guest'; // 默认为游客
        this.isTracking = false;
        
        // 页面与标签页映射
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
    
    // 生成唯一会话ID
    generateSessionId() {
        const stored = localStorage.getItem('pageTrackingSessionId');
        if (stored) return stored;
        
        const sessionId = 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('pageTrackingSessionId', sessionId);
        return sessionId;
    }
    
    // 初始化追踪
    init() {
        this.isTracking = true;
        
        // 监听页面可见性变化
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseTracking();
            } else {
                this.resumeTracking();
            }
        });
        
        // 监听页面卸载
        window.addEventListener('beforeunload', () => {
            this.stopPageTracking();
        });
        
        // 监听页面关闭或刷新
        window.addEventListener('unload', () => {
            this.stopPageTracking();
        });
        
        // 定期发送追踪数据（防止数据丢失）
        setInterval(() => {
            if (this.currentPage && this.isTracking) {
                this.updateCurrentPageDuration();
            }
        }, 30000); // 每30秒更新一次
    }
    
    // 开始追踪页面
    startPageTracking(pageId) {
        // 停止当前页面追踪
        this.stopPageTracking();
        
        const pageName = this.pageNameMap[pageId] || pageId;
        this.currentPage = pageId;
        this.pageEnterTime = Date.now();
        
        // 发送页面进入事件
        this.sendTrackingData({
            action: 'enter',
            pageName: pageName,
            enterTime: new Date().toISOString()
        });
        
        console.log(`开始追踪页面: ${pageName}`);
    }
    
    // 停止当前页面追踪
    stopPageTracking() {
        if (this.currentPage && this.pageEnterTime) {
            const duration = Math.floor((Date.now() - this.pageEnterTime) / 1000);
            const pageName = this.pageNameMap[this.currentPage] || this.currentPage;
            
            // 发送页面离开事件
            this.sendTrackingData({
                action: 'leave',
                pageName: pageName,
                duration: duration,
                leaveTime: new Date().toISOString()
            });
            
            console.log(`停止追踪页面: ${pageName}, 停留时长: ${duration}秒`);
        }
        
        this.currentPage = null;
        this.pageEnterTime = null;
    }
    
    // 暂停追踪（页面隐藏时）
    pauseTracking() {
        if (this.currentPage && this.isTracking) {
            this.isTracking = false;
            this.updateCurrentPageDuration();
        }
    }
    
    // 恢复追踪（页面显示时）
    resumeTracking() {
        if (this.currentPage && !this.isTracking) {
            this.isTracking = true;
            this.pageEnterTime = Date.now(); // 重新计算开始时间
        }
    }
    
    // 更新当前页面持续时间
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
    
    // 设置用户类型和ID（当用户登录成功后调用）
    setUserInfo(userType, userId) {
        this.userType = userType;
        if (userType === 'member' && userId) {
            this.sessionId = `member_${userId}`;
            localStorage.setItem('pageTrackingSessionId', this.sessionId);
        }
    }
    
    // 发送追踪数据到服务器
    sendTrackingData(data) {
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
        
        // 使用 sendBeacon API 确保数据能够发送（即使在页面卸载时）
        if (navigator.sendBeacon) {
            const blob = new Blob([JSON.stringify(trackingData)], {
                type: 'application/json'
            });
            navigator.sendBeacon('/api/tracking/page', blob);
        } else {
            // 降级到普通 fetch（可能在页面卸载时丢失）
            fetch('/api/tracking/page', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(trackingData),
                keepalive: true
            }).catch(error => {
                console.warn('页面追踪数据发送失败:', error);
            });
        }
    }
    
    // 重置会话（用于新的访问会话）
    resetSession() {
        localStorage.removeItem('pageTrackingSessionId');
        this.sessionId = this.generateSessionId();
        this.userType = 'guest';
    }
}

// 全局追踪管理器实例
window.pageTracker = new PageTrackingManager();