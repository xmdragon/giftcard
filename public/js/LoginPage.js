class LoginPage {
    constructor(app) {
        this.app = app;
        this.elements = {};
        this.listeners = [];
        this.init();
    }

    init() {
        this.cacheDOMElements();
        this.bindEvents();
    }

    cacheDOMElements() {
        this.elements = {
            loginForm: document.getElementById('login-form'),
            giftIdInput: document.getElementById('gift-id'),
            passwordInput: document.getElementById('gift-password'),
            togglePassword: document.getElementById('toggle-password'),
            
            idError: document.getElementById('id-error'),
            
            loadingOverlay: document.getElementById('loading-overlay')
        };
    }

    bindEvents() {
        if (this.elements.togglePassword) {
            const toggleHandler = () => this.togglePasswordVisibility();
            this.elements.togglePassword.addEventListener('click', toggleHandler);
            this.listeners.push({element: this.elements.togglePassword, event: 'click', handler: toggleHandler});
        }

        if (this.elements.giftIdInput) {
            const validateHandler = () => this.validateGiftId();
            this.elements.giftIdInput.addEventListener('blur', validateHandler);
            this.listeners.push({element: this.elements.giftIdInput, event: 'blur', handler: validateHandler});
            
            const focusHandler = () => {
                this.elements.giftIdInput.classList.remove('error');
                this.elements.idError.style.display = 'none';
            };
            this.elements.giftIdInput.addEventListener('focus', focusHandler);
            this.listeners.push({element: this.elements.giftIdInput, event: 'focus', handler: focusHandler});
        }    }

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
        
        if (!this.validateGiftId()) {
            return;
        }
        
        if (!giftIdValue) {
            this.elements.giftIdInput.classList.add('error');
            this.elements.idError.textContent = window.i18n ? window.i18n.t('please_enter_id') : 'Please enter your ID';
            this.elements.idError.style.display = 'block';
            return;
        }
        
        if (passwordValue.length < 6) {
            alert(window.i18n ? window.i18n.t('enter_min_6_password') : 'Please enter at least 6 characters for password');
            return;
        }
        
        if (this.app && this.app.handleLogin) {
            this.app.handleLogin();
        }
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
        this.listeners.forEach(({element, event, handler}) => {
            element.removeEventListener(event, handler);
        });
        this.listeners = [];
        
        this.elements = {};
        
        this.app = null;
    }
}