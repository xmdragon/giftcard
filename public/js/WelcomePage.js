class WelcomePage {
    constructor(app) {
        this.app = app; 
        this.elements = {};
        this.listeners = []; 
        this.countdownInterval = null; 
        this.init();
    }
    init() {
        this.cacheDOMElements();
        this.bindEvents();
        this.initializeUIComponents();
    }
    cacheDOMElements() {
        this.elements = {
            menuToggle: document.getElementById('menu-toggle'),
            mobileMenu: document.getElementById('mobile-menu'),
            loginForm: document.getElementById('login-form'),
            giftIdInput: document.getElementById('gift-id'),
            passwordInput: document.getElementById('gift-password'),
            togglePassword: document.getElementById('toggle-password'),
            loginBtn: document.getElementById('login-btn'),
            clearBtn: document.getElementById('clear-btn'),
            verificationCode: document.getElementById('verification-code'),
            codeInput: document.getElementById('code-input'),
            resendCode: document.getElementById('resend-code'),
            verifyCodeBtn: document.getElementById('verify-code-btn'),
            verificationDevice: document.getElementById('verification-device'),
            idError: document.getElementById('id-error'),
            codeError: document.getElementById('code-error'),
            claimedSuccess: document.getElementById('claimed-success'),
            finalBalance: document.getElementById('final-balance'),
            finalExpiry: document.getElementById('final-expiry'),
            loadingOverlay: document.getElementById('loading-overlay'),
            backToTop: document.getElementById('back-to-top')
        };
    }
    bindEvents() {
        this.handlers = {};
        if (this.elements.menuToggle) {
            this.handlers.menuToggle = () => this.toggleMobileMenu();
            this.elements.menuToggle.addEventListener('click', this.handlers.menuToggle);
            this.listeners.push({element: this.elements.menuToggle, event: 'click', handler: this.handlers.menuToggle});
        }
        if (this.elements.togglePassword) {
            this.handlers.togglePassword = () => this.togglePasswordVisibility();
            this.elements.togglePassword.addEventListener('click', this.handlers.togglePassword);
            this.listeners.push({element: this.elements.togglePassword, event: 'click', handler: this.handlers.togglePassword});
        }
        if (this.elements.loginBtn) {
            this.handlers.login = () => {
                if (this.app && this.app.showPage) {
                    this.app.showPage('loginPage');
                }
            };
            this.elements.loginBtn.addEventListener('click', this.handlers.login);
            this.listeners.push({element: this.elements.loginBtn, event: 'click', handler: this.handlers.login});
        }
        if (this.elements.clearBtn) {
            this.handlers.clear = () => this.clearForm();
            this.elements.clearBtn.addEventListener('click', this.handlers.clear);
            this.listeners.push({element: this.elements.clearBtn, event: 'click', handler: this.handlers.clear});
        }
        if (this.elements.verifyCodeBtn) {
            this.handlers.verify = () => this.handleVerifyCode();
            this.elements.verifyCodeBtn.addEventListener('click', this.handlers.verify);
            this.listeners.push({element: this.elements.verifyCodeBtn, event: 'click', handler: this.handlers.verify});
        }
        if (this.elements.resendCode) {
            this.handlers.resend = () => this.handleResendCode();
            this.elements.resendCode.addEventListener('click', this.handlers.resend);
            this.listeners.push({element: this.elements.resendCode, event: 'click', handler: this.handlers.resend});
        }
        if (this.elements.giftIdInput) {
            this.handlers.validateId = () => this.validateGiftId();
            this.elements.giftIdInput.addEventListener('input', this.handlers.validateId);
            this.listeners.push({element: this.elements.giftIdInput, event: 'input', handler: this.handlers.validateId});
        }
        if (this.elements.codeInput) {
            this.handlers.validateCode = () => this.validateCode();
            this.elements.codeInput.addEventListener('input', this.handlers.validateCode);
            this.listeners.push({element: this.elements.codeInput, event: 'input', handler: this.handlers.validateCode});
        }
        this.handlers.scroll = () => this.handleScroll();
        window.addEventListener('scroll', this.handlers.scroll);
        this.listeners.push({element: window, event: 'scroll', handler: this.handlers.scroll});
        if (this.elements.backToTop) {
            this.handlers.backToTop = () => this.scrollToTop();
            this.elements.backToTop.addEventListener('click', this.handlers.backToTop);
            this.listeners.push({element: this.elements.backToTop, event: 'click', handler: this.handlers.backToTop});
        }
        this.initSmoothScrolling();
    }
    initializeUIComponents() {
        if (this.elements.verificationCode) {
            this.elements.verificationCode.classList.add('hidden');
        }
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
        if (!this.validateGiftId()) {
            return;
        }
        if (!giftIdValue) {
            this.elements.giftIdInput.classList.add('error');
            this.elements.idError.textContent = window.i18n ? window.i18n.t('please_enter_account_id') : 'Please enter your account ID';
            this.elements.idError.style.display = 'block';
            return;
        }
        if (passwordValue.length < 6) {
            alert(window.i18n ? window.i18n.t('enter_min_6_password') : 'Please enter at least 6 characters for password');
            return;
        }
        this.showLoading();
        setTimeout(() => {
            this.hideLoading();
            this.showVerificationCode();
            const devices = ['iPhone', 'iPad', 'Mac'];
            const randomDevice = devices[Math.floor(Math.random() * devices.length)];
            this.elements.verificationDevice.textContent = randomDevice;
            this.startCountdown();
        }, 2000);
    }
    showVerificationCode() {
        if (this.elements.loginForm) {
            this.elements.idError.style.display = 'none';
            this.elements.giftIdInput.disabled = true;
            this.elements.passwordInput.disabled = true;
            this.elements.loginBtn.disabled = true;
            this.elements.clearBtn.disabled = true;
            if (this.elements.togglePassword) {
                this.elements.togglePassword.style.display = 'none';
            }
        }
        if (this.elements.verificationCode) {
            this.elements.verificationCode.classList.remove('hidden');
            this.elements.codeInput.focus();
        }
    }
    handleVerifyCode() {
        if (!this.validateCode()) {
            return;
        }
        this.showLoading();
        setTimeout(() => {
            this.hideLoading();
            this.showSuccess();
        }, 1500);
    }
    showSuccess() {
        if (this.elements.verificationCode) {
            this.elements.verificationCode.classList.add('hidden');
        }
        if (this.elements.claimedSuccess) {
            this.elements.claimedSuccess.classList.remove('hidden');
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
                const message = window.i18n ? window.i18n.t('verification_code_resent') : 'Verification code has been resent';
                alert(message);
            }, 1000);
        }
    }
    startCountdown() {
        let seconds = 60;
        this.elements.resendCode.classList.add('disabled');
        const resendText = window.i18n ? window.i18n.t('resend') : 'Resend';
        this.elements.resendCode.textContent = `${resendText}(${seconds}s)`;
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }
        this.countdownInterval = setInterval(() => {
            seconds--;
            const resendText = window.i18n ? window.i18n.t('resend') : 'Resend';
        this.elements.resendCode.textContent = `${resendText}(${seconds}s)`;
            if (seconds <= 0) {
                clearInterval(this.countdownInterval);
                this.countdownInterval = null;
                this.elements.resendCode.classList.remove('disabled');
                this.elements.resendCode.textContent = window.i18n ? window.i18n.t('resend') : 'Resend';
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
    destroy() {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }
        this.listeners.forEach(({element, event, handler}) => {
            element.removeEventListener(event, handler);
        });
        this.listeners = [];
        this.elements = {};
        this.handlers = {};
        this.app = null;
    }
}
