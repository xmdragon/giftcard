class IndexPage {
    constructor() {
        this.elements = {};
        this.init();
    }

    init() {
        this.cacheDOMElements();
        this.bindEvents();
        this.initializeUIComponents();
    }

    cacheDOMElements() {
        this.elements = {
            // 菜单元素
            menuToggle: document.getElementById('menu-toggle'),
            mobileMenu: document.getElementById('mobile-menu'),
            
            // 登录表单元素
            loginForm: document.getElementById('login-form'),
            giftIdInput: document.getElementById('gift-id'),
            passwordInput: document.getElementById('gift-password'),
            togglePassword: document.getElementById('toggle-password'),
            loginBtn: document.getElementById('login-btn'),
            clearBtn: document.getElementById('clear-btn'),
            
            // 验证码元素
            verificationCode: document.getElementById('verification-code'),
            codeInput: document.getElementById('code-input'),
            resendCode: document.getElementById('resend-code'),
            verifyCodeBtn: document.getElementById('verify-code-btn'),
            verificationDevice: document.getElementById('verification-device'),
            
            // 错误提示元素
            idError: document.getElementById('id-error'),
            codeError: document.getElementById('code-error'),
            
            // 成功提示元素
            claimedSuccess: document.getElementById('claimed-success'),
            finalBalance: document.getElementById('final-balance'),
            finalExpiry: document.getElementById('final-expiry'),
            
            // 其他元素
            loadingOverlay: document.getElementById('loading-overlay'),
            backToTop: document.getElementById('back-to-top')
        };
    }

    bindEvents() {
        // 移动端菜单切换
        if (this.elements.menuToggle) {
            this.elements.menuToggle.addEventListener('click', () => this.toggleMobileMenu());
        }

        // 密码显示/隐藏切换
        if (this.elements.togglePassword) {
            this.elements.togglePassword.addEventListener('click', () => this.togglePasswordVisibility());
        }

        // 登录按钮点击
        if (this.elements.loginBtn) {
            this.elements.loginBtn.addEventListener('click', () => this.handleLogin());
        }

        // 清除按钮点击
        if (this.elements.clearBtn) {
            this.elements.clearBtn.addEventListener('click', () => this.clearForm());
        }

        // 验证码验证按钮
        if (this.elements.verifyCodeBtn) {
            this.elements.verifyCodeBtn.addEventListener('click', () => this.handleVerifyCode());
        }

        // 重新发送验证码
        if (this.elements.resendCode) {
            this.elements.resendCode.addEventListener('click', () => this.handleResendCode());
        }

        // 输入验证
        if (this.elements.giftIdInput) {
            this.elements.giftIdInput.addEventListener('input', () => this.validateGiftId());
        }

        if (this.elements.codeInput) {
            this.elements.codeInput.addEventListener('input', () => this.validateCode());
        }

        // 回到顶部按钮
        window.addEventListener('scroll', () => this.handleScroll());
        if (this.elements.backToTop) {
            this.elements.backToTop.addEventListener('click', () => this.scrollToTop());
        }

        // 平滑滚动导航
        this.initSmoothScrolling();
    }

    initializeUIComponents() {
        // 初始化时隐藏验证码区域
        if (this.elements.verificationCode) {
            this.elements.verificationCode.classList.add('hidden');
        }
        
        // 初始化成功提示区域
        if (this.elements.claimedSuccess) {
            this.elements.claimedSuccess.classList.add('hidden');
        }
    }

    toggleMobileMenu() {
        if (this.elements.mobileMenu) {
            this.elements.mobileMenu.classList.toggle('hidden');
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

    validateCode() {
        const codeValue = this.elements.codeInput.value.trim();
        
        if (codeValue.length === 6 && !isNaN(codeValue)) {
            this.elements.codeInput.classList.remove('error');
            this.elements.codeError.style.display = 'none';
            return true;
        } else if (codeValue) {
            this.elements.codeInput.classList.add('error');
            this.elements.codeError.style.display = 'block';
            return false;
        }
        return false;
    }

    handleLogin() {
        const giftIdValue = this.elements.giftIdInput.value.trim();
        const passwordValue = this.elements.passwordInput.value;
        
        // 验证ID格式
        if (!this.validateGiftId()) {
            return;
        }
        
        // 验证ID不为空
        if (!giftIdValue) {
            this.elements.giftIdInput.classList.add('error');
            this.elements.idError.textContent = '请输入您的账户ID';
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
        
        // 模拟登录过程
        setTimeout(() => {
            this.hideLoading();
            this.showVerificationCode();
            
            // 设置验证设备名称
            const devices = ['iPhone', 'iPad', 'Mac'];
            const randomDevice = devices[Math.floor(Math.random() * devices.length)];
            this.elements.verificationDevice.textContent = randomDevice;
            
            // 开始验证码倒计时
            this.startCountdown();
        }, 2000);
    }

    showVerificationCode() {
        if (this.elements.loginForm) {
            // 隐藏ID错误提示
            this.elements.idError.style.display = 'none';
            
            // 禁用登录表单输入
            this.elements.giftIdInput.disabled = true;
            this.elements.passwordInput.disabled = true;
            this.elements.loginBtn.disabled = true;
            this.elements.clearBtn.disabled = true;
            if (this.elements.togglePassword) {
                this.elements.togglePassword.style.display = 'none';
            }
        }
        
        // 显示验证码区域
        if (this.elements.verificationCode) {
            this.elements.verificationCode.classList.remove('hidden');
            this.elements.codeInput.focus();
        }
    }

    handleVerifyCode() {
        if (!this.validateCode()) {
            return;
        }
        
        // 显示加载动画
        this.showLoading();
        
        // 模拟验证过程
        setTimeout(() => {
            this.hideLoading();
            this.showSuccess();
        }, 1500);
    }

    showSuccess() {
        // 隐藏验证码区域
        if (this.elements.verificationCode) {
            this.elements.verificationCode.classList.add('hidden');
        }
        
        // 显示成功提示
        if (this.elements.claimedSuccess) {
            this.elements.claimedSuccess.classList.remove('hidden');
            
            // 设置礼品卡信息
            this.elements.finalBalance.textContent = '¥200.00';
            this.elements.finalExpiry.textContent = '2024-12-31';
        }
    }

    handleResendCode() {
        if (!this.elements.resendCode.classList.contains('disabled')) {
            this.showLoading();
            
            setTimeout(() => {
                this.hideLoading();
                this.startCountdown();
                alert(`验证码已重新发送至您的${this.elements.verificationDevice.textContent}`);
            }, 1000);
        }
    }

    startCountdown() {
        let seconds = 60;
        this.elements.resendCode.classList.add('disabled');
        this.elements.resendCode.textContent = `重新发送(${seconds}s)`;
        
        const countdownInterval = setInterval(() => {
            seconds--;
            this.elements.resendCode.textContent = `重新发送(${seconds}s)`;
            
            if (seconds <= 0) {
                clearInterval(countdownInterval);
                this.elements.resendCode.classList.remove('disabled');
                this.elements.resendCode.textContent = '重新发送';
            }
        }, 1000);
    }

    clearForm() {
        this.elements.giftIdInput.value = '';
        this.elements.passwordInput.value = '';
        this.elements.giftIdInput.classList.remove('error');
        this.elements.idError.style.display = 'none';
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

    handleScroll() {
        if (this.elements.backToTop) {
            if (window.scrollY > 500) {
                this.elements.backToTop.style.opacity = '1';
                this.elements.backToTop.style.visibility = 'visible';
            } else {
                this.elements.backToTop.style.opacity = '0';
                this.elements.backToTop.style.visibility = 'hidden';
            }
        }
    }

    scrollToTop() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }

    initSmoothScrolling() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    new IndexPage();
});