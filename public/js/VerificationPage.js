class VerificationPage {
    constructor() {
        this.elements = {};
        this.countdownInterval = null;
        this.init();
    }

    init() {
        this.checkAuth();
        this.cacheDOMElements();
        this.bindEvents();
        this.displayDeviceInfo();
        this.startCountdown();
    }

    checkAuth() {
        // 验证是否有登录信息，没有则返回登录页
        const giftId = localStorage.getItem('giftId');
        const verificationDevice = localStorage.getItem('verificationDevice');
        
        if (!giftId || !verificationDevice) {
            window.location.href = 'index.html';
        }
    }

    cacheDOMElements() {
        this.elements = {
            // 表单元素
            verificationForm: document.getElementById('verification-form'),
            codeInput: document.getElementById('code-input'),
            
            // 显示元素
            deviceName: document.getElementById('device-name'),
            verificationMessage: document.getElementById('verification-message'),
            
            // 错误提示
            codeError: document.getElementById('code-error'),
            
            // 按钮
            resendCode: document.getElementById('resend-code'),
            backBtn: document.getElementById('back-btn'),
            
            // 加载动画
            loadingOverlay: document.getElementById('loading-overlay')
        };
    }

    bindEvents() {
        // 验证码输入验证
        if (this.elements.codeInput) {
            this.elements.codeInput.addEventListener('input', () => this.handleCodeInput());
        }

        // 表单提交
        if (this.elements.verificationForm) {
            this.elements.verificationForm.addEventListener('submit', (e) => this.handleSubmit(e));
        }

        // 重新发送验证码
        if (this.elements.resendCode) {
            this.elements.resendCode.addEventListener('click', () => this.handleResendCode());
        }

        // 返回按钮
        if (this.elements.backBtn) {
            this.elements.backBtn.addEventListener('click', () => this.handleBack());
        }
    }

    displayDeviceInfo() {
        const verificationDevice = localStorage.getItem('verificationDevice');
        if (this.elements.deviceName && verificationDevice) {
            this.elements.deviceName.textContent = verificationDevice;
        }
    }

    handleCodeInput() {
        const codeValue = this.elements.codeInput.value.trim();
        
        // 实时验证
        if (this.validateCode()) {
            // 自动填充6位后提交
            if (codeValue.length === 6) {
                this.elements.verificationForm.dispatchEvent(new Event('submit'));
            }
        }
    }

    validateCode() {
        const codeValue = this.elements.codeInput.value.trim();
        
        if (codeValue.length !== 6 || isNaN(codeValue)) {
            if (codeValue.length > 0) {
                this.elements.codeInput.classList.add('error');
                this.elements.codeError.style.display = 'block';
            }
            return false;
        } else {
            this.elements.codeInput.classList.remove('error');
            this.elements.codeError.style.display = 'none';
            return true;
        }
    }

    handleSubmit(e) {
        e.preventDefault();
        
        // 验证验证码
        if (!this.validateCode()) {
            return;
        }
        
        // 显示加载动画
        this.showLoading();
        
        // 模拟验证过程
        setTimeout(() => {
            // 跳转到成功页面
            window.location.href = 'success.html';
        }, 1500);
    }

    handleResendCode() {
        if (!this.elements.resendCode.classList.contains('disabled')) {
            // 显示加载动画
            this.showLoading();
            
            const verificationDevice = localStorage.getItem('verificationDevice');
            
            // 模拟发送验证码过程
            setTimeout(() => {
                this.hideLoading();
                this.startCountdown();
                alert(`验证码已重新发送至您的${verificationDevice}`);
            }, 1000);
        }
    }

    startCountdown() {
        // 清除之前的倒计时
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }
        
        let seconds = 60;
        this.elements.resendCode.classList.add('disabled');
        this.elements.resendCode.textContent = `重新发送(${seconds}s)`;
        
        this.countdownInterval = setInterval(() => {
            seconds--;
            this.elements.resendCode.textContent = `重新发送(${seconds}s)`;
            
            if (seconds <= 0) {
                clearInterval(this.countdownInterval);
                this.elements.resendCode.classList.remove('disabled');
                this.elements.resendCode.textContent = '重新发送';
            }
        }, 1000);
    }

    handleBack() {
        // 清理本地存储
        localStorage.removeItem('giftId');
        localStorage.removeItem('verificationDevice');
        
        // 返回首页
        window.location.href = 'index.html';
    }

    showLoading() {
        if (this.elements.loadingOverlay) {
            this.elements.loadingOverlay.classList.add('active');
        }
    }

    hideLoading() {
        if (this.elements.loadingOverlay) {
            this.elements.loadingOverlay.classList.remove('active');
        }
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    new VerificationPage();
});