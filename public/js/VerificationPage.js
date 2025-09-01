class VerificationPage {
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
        this.initializeUI();
    }
    checkAuth() {
        const loginId = localStorage.getItem('currentLoginId');
        const giftId = localStorage.getItem('giftId');
        if (!loginId && !giftId) {
            if (this.app && this.app.showPage) {
                this.app.showPage('loginPage');
            }
        }
    }
    cacheDOMElements() {
        this.elements = {
            verificationForm: document.getElementById('verification-form'),
            codeDigits: document.querySelectorAll('.code-digit'),
            verificationDevice: document.getElementById('verification-device'),
            resendCode: document.getElementById('resend-code'),
            submitBtn: document.querySelector('#verification-form button[type="submit"]'),
            loadingOverlay: document.getElementById('loading-overlay')
        };
    }
    bindEvents() {
        this.handlers = {};
        if (this.elements.codeDigits) {
            this.elements.codeDigits.forEach((input, index) => {
                const inputHandler = (e) => this.handleCodeInput(e, index);
                input.addEventListener('input', inputHandler);
                this.listeners.push({element: input, event: 'input', handler: inputHandler});
                const keydownHandler = (e) => this.handleKeyDown(e, index);
                input.addEventListener('keydown', keydownHandler);
                this.listeners.push({element: input, event: 'keydown', handler: keydownHandler});
                const pasteHandler = (e) => this.handlePaste(e);
                input.addEventListener('paste', pasteHandler);
                this.listeners.push({element: input, event: 'paste', handler: pasteHandler});
            });
        }
        if (this.elements.verificationForm) {
            this.handlers.submit = (e) => {
                e.preventDefault();
                this.handleSubmit();
            };
            this.elements.verificationForm.addEventListener('submit', this.handlers.submit);
            this.listeners.push({element: this.elements.verificationForm, event: 'submit', handler: this.handlers.submit});
        }
        if (this.elements.submitBtn) {
            this.handlers.submitBtn = (e) => {
                e.preventDefault();
                this.handleSubmit();
            };
            this.elements.submitBtn.addEventListener('click', this.handlers.submitBtn);
            this.listeners.push({element: this.elements.submitBtn, event: 'click', handler: this.handlers.submitBtn});
        }
        if (this.elements.resendCode) {
            this.handlers.resend = () => this.handleResendCode();
            this.elements.resendCode.addEventListener('click', this.handlers.resend);
            this.listeners.push({element: this.elements.resendCode, event: 'click', handler: this.handlers.resend});
        }
    }
    initializeUI() {
        const device = localStorage.getItem('verificationDevice') || 'iPhone';
        if (this.elements.verificationDevice) {
            this.elements.verificationDevice.textContent = device;
        }
        if (this.elements.codeDigits) {
            this.elements.codeDigits.forEach(input => {
                input.value = '';
            });
            this.elements.codeDigits[0]?.focus();
        }
        this.startCountdown();
    }
    handleCodeInput(e, index) {
        const input = e.target;
        const value = input.value;
        if (!/^\d*$/.test(value)) {
            input.value = value.replace(/\D/g, '');
            return;
        }
        if (value.length > 1) {
            input.value = value.slice(0, 1);
        }
        if (value && index < this.elements.codeDigits.length - 1) {
            this.elements.codeDigits[index + 1].focus();
        }
        this.checkAutoSubmit();
    }
    handleKeyDown(e, index) {
        if (e.key === 'Backspace' && !e.target.value && index > 0) {
            this.elements.codeDigits[index - 1].focus();
        }
    }
    handlePaste(e) {
        e.preventDefault();
        const pastedData = (e.clipboardData || window.clipboardData).getData('text');
        const digits = pastedData.replace(/\D/g, '').slice(0, 6);
        digits.split('').forEach((digit, index) => {
            if (this.elements.codeDigits[index]) {
                this.elements.codeDigits[index].value = digit;
            }
        });
        if (digits.length === 6) {
            this.elements.codeDigits[5].focus();
        } else if (digits.length > 0) {
            this.elements.codeDigits[Math.min(digits.length, 5)].focus();
        }
        this.checkAutoSubmit();
    }
    checkAutoSubmit() {
        const allFilled = Array.from(this.elements.codeDigits).every(input => input.value);
        if (allFilled) {
            setTimeout(() => {
                this.handleSubmit();
            }, 100);
        }
    }
    handleSubmit() {
        const code = Array.from(this.elements.codeDigits).map(input => input.value).join('');
        if (code.length !== 6) {
            return;
        }
        if (this.app && this.app.handleVerification) {
            this.app.handleVerification();
        } else {
            this.showLoading();
            setTimeout(() => {
                this.hideLoading();
                if (this.app && this.app.showPage) {
                    this.app.showPage('giftCardPage');
                }
            }, 2000);
        }
    }
    handleResendCode() {
        if (this.elements.resendCode.classList.contains('disabled')) {
            return;
        }
        this.showLoading();
        setTimeout(() => {
            this.hideLoading();
            this.startCountdown();
            if (this.elements.codeDigits) {
                this.elements.codeDigits.forEach(input => {
                    input.value = '';
                });
                this.elements.codeDigits[0]?.focus();
            }
            alert(window.i18n ? window.i18n.t('verification_code_resent') : 'Verification code has been resent');
        }, 1000);
    }
    startCountdown() {
        let seconds = 60;
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }
        if (this.elements.resendCode) {
            this.elements.resendCode.classList.add('disabled');
            const resendText = window.i18n ? window.i18n.t('resend') : 'Resend';
            this.elements.resendCode.textContent = `${resendText}(${seconds}s)`;
        }
        this.countdownInterval = setInterval(() => {
            seconds--;
            if (this.elements.resendCode) {
                const resendText = window.i18n ? window.i18n.t('resend') : 'Resend';
            this.elements.resendCode.textContent = `${resendText}(${seconds}s)`;
            }
            if (seconds <= 0) {
                clearInterval(this.countdownInterval);
                this.countdownInterval = null;
                if (this.elements.resendCode) {
                    this.elements.resendCode.classList.remove('disabled');
                    this.elements.resendCode.textContent = window.i18n ? window.i18n.t('resend') : 'Resend';
                }
            }
        }, 1000);
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
