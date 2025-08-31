class SuccessPage {
    constructor() {
        this.elements = {};
        this.giftId = '';
        this.init();
    }

    init() {
        this.checkAuth();
        this.cacheDOMElements();
        this.bindEvents();
        this.displayGiftCardInfo();
        this.initPageAnimation();
    }

    checkAuth() {
        // 验证是否有登录信息，没有则返回登录页
        this.giftId = localStorage.getItem('giftId');
        
        if (!this.giftId) {
            window.location.href = 'index.html';
        }
    }

    cacheDOMElements() {
        this.elements = {
            // 显示元素
            giftIdDisplay: document.getElementById('gift-id-display'),
            addedTime: document.getElementById('added-time'),
            
            // 按钮
            backBtn: document.getElementById('back-btn'),
            
            // 礼品卡元素
            giftCard: document.querySelector('.gift-card')
        };
    }

    bindEvents() {
        // 返回按钮
        if (this.elements.backBtn) {
            this.elements.backBtn.addEventListener('click', () => this.handleBack());
        }
    }

    displayGiftCardInfo() {
        // 显示隐藏部分字符的ID
        if (this.elements.giftIdDisplay) {
            this.elements.giftIdDisplay.textContent = this.maskGiftId(this.giftId);
        }
        
        // 显示当前时间作为添加时间
        if (this.elements.addedTime) {
            this.elements.addedTime.textContent = this.formatDate(new Date());
        }
    }

    maskGiftId(id) {
        if (!id || !id.includes('@')) {
            return id;
        }
        
        const [localPart, domain] = id.split('@');
        if (localPart.length > 3) {
            return localPart.substring(0, 3) + '***@' + domain;
        }
        return localPart + '***@' + domain;
    }

    formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        
        return `${year}-${month}-${day} ${hours}:${minutes}`;
    }

    handleBack() {
        // 可以选择清理本地存储或保留
        // localStorage.removeItem('giftId');
        // localStorage.removeItem('verificationDevice');
        
        // 返回上一页或首页
        if (document.referrer) {
            window.history.back();
        } else {
            window.location.href = 'index.html';
        }
    }

    initPageAnimation() {
        // 页面加载动画
        if (this.elements.giftCard) {
            this.elements.giftCard.style.opacity = '0';
            this.elements.giftCard.style.transform = 'translateY(20px)';
            this.elements.giftCard.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            
            setTimeout(() => {
                this.elements.giftCard.style.opacity = '1';
                this.elements.giftCard.style.transform = 'translateY(0)';
            }, 300);
        }
        
        // 添加成功动画效果
        this.showSuccessAnimation();
    }

    showSuccessAnimation() {
        // 创建成功动画元素
        const successIcon = document.querySelector('.fa-check');
        if (successIcon) {
            // 添加脉冲动画
            successIcon.style.animation = 'pulse 0.5s ease';
            
            // 动画结束后移除
            setTimeout(() => {
                successIcon.style.animation = '';
            }, 500);
        }
    }
}

// 添加CSS动画
const style = document.createElement('style');
style.textContent = `
    @keyframes pulse {
        0% {
            transform: scale(1);
        }
        50% {
            transform: scale(1.2);
        }
        100% {
            transform: scale(1);
        }
    }
`;
document.head.appendChild(style);

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    new SuccessPage();
});