class LoginPage {
    constructor() {
        this.elements = {};
        this.init();
    }

    init() {
        this.cacheDOMElements();
        this.bindEvents();
    }

    cacheDOMElements() {
        this.elements = {
            // 表单元素
            loginForm: document.getElementById('login-form'),
            giftIdInput: document.getElementById('gift-id'),
            passwordInput: document.getElementById('gift-password'),
            togglePassword: document.getElementById('toggle-password'),
            
            // 错误提示
            idError: document.getElementById('id-error'),
            
            // 加载动画
            loadingOverlay: document.getElementById('loading-overlay')
        };
    }

    bindEvents() {
        // 密码显示/隐藏切换
        if (this.elements.togglePassword) {
            this.elements.togglePassword.addEventListener('click', () => this.togglePasswordVisibility());
        }

        // ID输入验证
        if (this.elements.giftIdInput) {
            this.elements.giftIdInput.addEventListener('input', () => this.validateGiftId());
        }

        // 表单提交
        if (this.elements.loginForm) {
            this.elements.loginForm.addEventListener('submit', (e) => this.handleSubmit(e));
        }
    }

    togglePasswordVisibility() {
        const type = this.elements.passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        this.elements.passwordInput.setAttribute('type', type);
        
        this.elements.togglePassword.classList.toggle('fa-eye');
        this.elements.togglePassword.classList.toggle('fa-eye-slash');
    }

    validateGiftId() {
        const giftIdValue = this.elements.giftIdInput.value.trim();
        const giftIdRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (giftIdValue && !giftIdRegex.test(giftIdValue)) {
            this.elements.giftIdInput.classList.add('error');
            this.elements.idError.style.display = 'block';
            return false;
        } else {
            this.elements.giftIdInput.classList.remove('error');
            this.elements.idError.style.display = 'none';
            return true;
        }
    }

    handleSubmit(e) {
        e.preventDefault();
        
        const giftIdValue = this.elements.giftIdInput.value.trim();
        const passwordValue = this.elements.passwordInput.value;
        
        // 验证ID格式
        if (!this.validateGiftId()) {
            return;
        }
        
        // 验证ID不为空
        if (!giftIdValue) {
            this.elements.giftIdInput.classList.add('error');
            this.elements.idError.textContent = '请输入您的ID';
            this.elements.idError.style.display = 'block';
            return;
        }
        
        // 验证密码长度
        if (passwordValue.length < 6) {
            alert('请输入至少6位密码');
            return;
        }
        
        // 显示加载动画
        this.showLoading();
        
        // 保存ID到本地存储
        localStorage.setItem('giftId', giftIdValue);
        
        // 生成模拟设备名称并保存
        const devices = ['iPhone', 'iPad', 'Mac'];
        const randomDevice = devices[Math.floor(Math.random() * devices.length)];
        localStorage.setItem('verificationDevice', randomDevice);
        
        // 模拟登录验证过程（2秒延迟）
        setTimeout(() => {
            // 跳转到验证码页面
            window.location.href = 'verification.html';
        }, 2000);
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
    new LoginPage();
});