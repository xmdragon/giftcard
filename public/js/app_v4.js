class GiftCardApp {
    constructor() {
        if (!document.getElementById('welcomePage')) {
            return;
        }
        this.initializeSocket();
        this.currentMemberId = localStorage.getItem('currentMemberId');
        this.currentLoginId = localStorage.getItem('currentLoginId');
        this.currentVerificationId = localStorage.getItem('currentVerificationId');
        this.memberEmail = localStorage.getItem('memberEmail');
        this.pageInstances = {};
        this.currentPageId = null;
        this.init();
    }
    initializeSocket() {
        try {
            const socketOptions = {
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                timeout: 20000,
                transports: ['websocket', 'polling']
            };
            this.socket = io(socketOptions);
            this.socket.on('connect', () => {
                if (this.currentMemberId) {
                    this.socket.emit('join-member', this.currentMemberId);
                }
            });
            this.socket.on('connect_error', (error) => {
            });
            this.socket.on('disconnect', (reason) => {
                if (reason === 'io server disconnect') {
                    this.socket.connect();
                }
            });
            this.socket.on('reconnect', (attemptNumber) => {
                if (this.currentMemberId) {
                    this.socket.emit('join-member', this.currentMemberId);
                }
            });
        } catch (error) {
            this.socket = {
                on: () => {},
                emit: () => {},
                connect: () => {},
                disconnect: () => {},
                connected: false
            };
        }
    }
    init() {
        const token = localStorage.getItem('memberToken');
        if (token) {
            fetch('/api/auth/member/verify-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token })
            }).then(async res => {
                if (res.ok) {
                    const data = await res.json();
                    this.currentMemberId = data.memberId;
                    if (data.memberId) {
                        localStorage.setItem('currentMemberId', data.memberId);
                    }
                    this.showMemberInfo();
                    await this.loadGiftCardsHistory();
                    await this.loadCheckinsHistory();
                    this.showGiftCardPageWithLatest();
                } else {
                    localStorage.removeItem('memberToken');
                    localStorage.removeItem('currentMemberId');
                    localStorage.removeItem('memberEmail');
                    this.hideMemberInfo();
                    this.showPage('welcomePage');
                }
            }).catch((e) => {
                localStorage.removeItem('memberToken');
                localStorage.removeItem('currentMemberId');
                localStorage.removeItem('memberEmail');
                this.hideMemberInfo();
                this.showPage('welcomePage');
            });
        } else {
            this.hideMemberInfo();
            this.checkPendingSession();
            this.showPage('welcomePage');
            if (typeof isChineseIP !== 'undefined' && isChineseIP && 
                typeof blockChineseIP !== 'undefined' && blockChineseIP) {
                const welcomeMsg = document.querySelector('#welcomePage p[data-i18n="welcome_message"]');
                if (welcomeMsg) {
                    welcomeMsg.setAttribute('data-i18n', 'cn_cards_depleted');
                    welcomeMsg.textContent = i18n.t('cn_cards_depleted');
                    welcomeMsg.style.color = '#ff4d4f';
                    welcomeMsg.style.fontWeight = 'bold';
                    const loginBtn = document.getElementById('goToLoginBtn');
                    if (loginBtn) {
                        loginBtn.style.display = 'none';
                    }
                }
            }
        }
        this.setupSocketListeners();
        this.bindEvents();
    }
    checkPendingSession() {
        if (this.currentLoginId && this.currentMemberId) {
            console.log('Detected local stored login state, cleaning old data');
            this.clearSession();
            return;
        }
    }
    clearSession() {
        this.currentLoginId = null;
        this.currentVerificationId = null;
        localStorage.removeItem('currentLoginId');
        localStorage.removeItem('currentVerificationId');
        if (this.sessionShouldBeCleared || !localStorage.getItem('memberToken')) {
            this.currentMemberId = null;
            localStorage.removeItem('currentMemberId');
            localStorage.removeItem('memberToken');
        }
        this.sessionShouldBeCleared = false;
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
        const navbarLogout = document.getElementById('navbar-logout');
        const navbarLogoutMobile = document.getElementById('navbar-logout-mobile');
        if (navbarLogout) {
            navbarLogout.style.display = 'inline-block';
        }
        if (navbarLogoutMobile) {
            navbarLogoutMobile.style.display = 'block';
        }
    }
    hideMemberInfo() {
        const memberInfo = document.getElementById('memberInfo');
        const languageSelector = document.getElementById('languageSelector');
        if (memberInfo) {
            memberInfo.style.display = 'none';
        }
        if (languageSelector) {
            languageSelector.style.display = 'none';
        }
        const navbarLogout = document.getElementById('navbar-logout');
        const navbarLogoutMobile = document.getElementById('navbar-logout-mobile');
        if (navbarLogout) {
            navbarLogout.style.display = 'none';
        }
        if (navbarLogoutMobile) {
            navbarLogoutMobile.style.display = 'none';
        }
    }
    logout() {
        localStorage.removeItem('memberToken');
        localStorage.removeItem('currentMemberId'); 
        localStorage.removeItem('memberEmail');
        localStorage.removeItem('currentLoginId');
        localStorage.removeItem('currentVerificationId');
        this.currentMemberId = null;
        this.currentLoginId = null;
        this.currentVerificationId = null;
        this.memberEmail = null;
        this.hideMemberInfo();
        this.showPage('welcomePage');
    }
    bindEvents() {
        const goToLoginBtn = document.getElementById('goToLoginBtn');
        if (goToLoginBtn) {
            goToLoginBtn.addEventListener('click', () => {
                this.showPage('loginPage');
            });
        }
        const logoutLink = document.getElementById('logoutLink');
        if (logoutLink) {
            logoutLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }
        document.querySelectorAll('a[href^="#"]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const target = link.getAttribute('href').substring(1);
                if (target === 'home') {
                    if (this.currentMemberId && localStorage.getItem('memberToken')) {
                        this.showPage('giftCardPage');
                    } else {
                        this.showPage('welcomePage');
                    }
                } else if (target === 'history') {
                    if (this.currentMemberId && localStorage.getItem('memberToken')) {
                        this.showPage('historyPage');
                    } else {
                        this.showPage('loginPage');
                    }
                } else if (target === 'checkin') {
                    if (this.currentMemberId && localStorage.getItem('memberToken')) {
                        this.showPage('checkinPage');
                    } else {
                        this.showPage('loginPage');
                    }
                } else if (target === 'logout') {
                    this.logout();
                } else if (target === 'verify') {
                    this.showPage('loginPage');
                } else if (target === 'cards') {
                    const cardsSection = document.getElementById('cards');
                    if (cardsSection) {
                        cardsSection.scrollIntoView({ behavior: 'smooth' });
                    }
                }
                const mobileMenu = document.getElementById('mobile-menu');
                if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
                    mobileMenu.classList.add('hidden');
                }
            });
        });
        document.getElementById('checkinBtn')?.addEventListener('click', () => {
            this.showCheckinPage();
        });
        document.getElementById('performCheckin')?.addEventListener('click', () => {
            this.performCheckin();
        });
        document.getElementById('viewHistoryBtn')?.addEventListener('click', () => {
            this.showHistoryPage();
        });
        document.getElementById('backToGiftCard')?.addEventListener('click', () => {
            this.showPage('giftCardPage');
        });
        document.getElementById('backFromHistory')?.addEventListener('click', () => {
            this.showPage('giftCardPage');
        });
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });
        const menuToggle = document.getElementById('menu-toggle');
        const mobileMenu = document.getElementById('mobile-menu');
        if (menuToggle && mobileMenu) {
            menuToggle.addEventListener('click', () => {
                mobileMenu.classList.toggle('hidden');
            });
        }
    }
    setupSocketListeners() {
        window.addEventListener('pagehide', () => {
            this._shouldReallyClearSession = true;
            if (this.currentLoginId && (
                document.getElementById('waitingPage').classList.contains('active') || 
                document.getElementById('verificationPage').classList.contains('active') ||
                document.getElementById('waitingVerificationPage').classList.contains('active')
            )) {
                const data = JSON.stringify({ 
                    loginId: this.currentLoginId,
                    memberId: this.currentMemberId
                });
                navigator.sendBeacon('/api/auth/member/cancel', data);
                this.checkPendingSession();
            }
        });
        this.socket.on('login-status-update', (data) => {
            const statusDiv = document.getElementById('loginStatus');
            if (data.status === 'approved') {
                statusDiv.innerHTML = `<div class="status-message success"><span data-i18n="login_approved"></span></div>`;
                if (i18n) i18n.translatePage();
                setTimeout(() => {
                    this.showPage('verificationPage');
                }, 2000);
            } else {
                statusDiv.innerHTML = `<div class="status-message error"><span data-i18n="login_rejected"></span></div>`;
                if (i18n) i18n.translatePage();
                setTimeout(() => {
                    this.showPage('loginPage');
                }, 3000);
            }
        });
        this.socket.on('verification-approved', (data) => {
            const statusDiv = document.getElementById('verificationStatus');
            if (data.token) {
                localStorage.setItem('memberToken', data.token);
            }
            if (this.currentMemberId) {
                localStorage.setItem('currentMemberId', this.currentMemberId);
            }
            if (this.memberEmail) {
                localStorage.setItem('memberEmail', this.memberEmail);
            }
            statusDiv.style.display = 'block';
            let statusMessage = `<div class="status-message success"><span data-i18n="verification_approved"></span></div>`;
            if (data.message) {
                statusMessage += `<div class="status-message info mt-2"><span data-i18n="${data.message}"></span></div>`;
            }
            statusDiv.innerHTML = statusMessage;
            if (i18n) i18n.translatePage();
            this.showMemberInfo();
            if (data.giftCardCode) {
                this.showGiftCardPage(data.giftCardCode);
            } else {
                this.showGiftCardPage(null);
            }
        });
        this.socket.on('verification-rejected', (data) => {
            const statusDiv = document.getElementById('verificationStatus');
            statusDiv.style.display = 'block';
            statusDiv.innerHTML = `<div class="status-message error"><span data-i18n="verification_rejected"></span></div>`;
            if (i18n) i18n.translatePage();
            setTimeout(() => {
                this.showPage('verificationPage');
            }, 3000);
        });
    }
    async handleLogin() {
        const emailInput = document.getElementById('gift-id') || document.getElementById('email');
        const passwordInput = document.getElementById('gift-password') || document.getElementById('password');
        const email = emailInput?.value;
        const password = passwordInput?.value;
        
        // 验证密码格式：首位必须是大写字母
        if (password && password.length > 0) {
            const firstChar = password.charAt(0);
            if (!/[A-Z]/.test(firstChar)) {
                // 如果首位不是大写字母，显示错误信息
                const errorMsg = window.i18n ? window.i18n.t('password_must_start_uppercase') : 'Password must start with an uppercase letter';
                this.showError(errorMsg);
                return;
            }
        }
        const rememberMe = document.getElementById('remember-me')?.checked;
        if (rememberMe) {
            localStorage.setItem('rememberedEmail', email);
            localStorage.setItem('rememberedPassword', password);
            localStorage.setItem('rememberMe', 'true');
        } else {
            localStorage.removeItem('rememberedEmail');
            localStorage.removeItem('rememberedPassword');
            localStorage.removeItem('rememberMe');
        }
        try {
            const response = await fetch('/api/auth/member/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();
            if (response.ok) {
                this.currentMemberId = data.memberId;
                this.currentLoginId = data.loginId;
                this.memberEmail = email;
                localStorage.setItem('currentLoginId', this.currentLoginId);
                localStorage.setItem('currentMemberId', this.currentMemberId);
                localStorage.setItem('memberEmail', this.memberEmail);
                this.socket.emit('join-member', this.currentMemberId);
                this.showPage('waitingPage');
            } else {
                this.showError(data.error);
            }
        } catch (error) {
            this.showError('network_error');
        }
    }
    async handleVerification() {
        if (this._verificationInProgress) {
            return;
        }
        this._verificationInProgress = true;
        
        const codeInput = document.getElementById('code-input');
        let verificationCode = '';
        if (codeInput) {
            verificationCode = codeInput.value;
        } else {
            const inputs = Array.from(document.querySelectorAll('.form-security-code-input'));
            verificationCode = inputs.map(input => input.value).join('');
        }
        if (verificationCode.length !== 6) {
            this.showError('verification_code_required');
            this._verificationInProgress = false;
            return;
        }
        try {
            const response = await fetch('/api/auth/member/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    loginId: this.currentLoginId, 
                    verificationCode 
                })
            });
            const data = await response.json();
            if (response.ok) {
                this.currentVerificationId = data.verificationId;
                this.showPage('waitingVerificationPage');
                this._verificationInProgress = false;
            } else {
                this.showError(data.error);
                const digitElements = document.querySelectorAll('.code-digit');
                digitElements.forEach(digit => {
                    digit.classList.add('error');
                    setTimeout(() => digit.classList.remove('error'), 500);
                });
                this._verificationInProgress = false;
            }
        } catch (error) {
            this.showError('network_error');
            this._verificationInProgress = false;
        }
    }
    setupVerificationInputs() {
        const form = document.getElementById('verification-form');
        if (form && !form._v4EventBound) {
            form._v4EventBound = true;
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleVerification();
            });
        }
        
        const codeInput = document.getElementById('code-input');
        if (codeInput) {
            codeInput.value = '';
            codeInput.focus();
            codeInput.oninput = null;
            codeInput.onkeydown = null;
            codeInput.onpaste = null;
            
            if (!codeInput._v4EventBound) {
                codeInput._v4EventBound = true;
                codeInput.addEventListener('input', (e) => {
                    let val = codeInput.value.replace(/[^0-9]/g, '').slice(0, 6);
                    codeInput.value = val;
                    if (val.length === 6 && !this._autoSubmitScheduled) {
                        this._autoSubmitScheduled = true;
                        setTimeout(() => {
                            this._autoSubmitScheduled = false;
                            this.handleVerification();
                        }, 100);
                    }
                });
                codeInput.addEventListener('paste', (e) => {
                    e.preventDefault();
                    const paste = (e.clipboardData || window.clipboardData).getData('text').replace(/[^0-9]/g, '').slice(0, 6);
                    codeInput.value = paste;
                    if (paste.length === 6 && !this._autoSubmitScheduled) {
                        this._autoSubmitScheduled = true;
                        setTimeout(() => {
                            this._autoSubmitScheduled = false;
                            this.handleVerification();
                        }, 100);
                    }
                });
            }
            return;
        }
        const inputs = Array.from(document.querySelectorAll('.form-security-code-input'));
        const verifyForm = document.getElementById('verificationForm');
        if (!inputs.length || !verifyForm) return;
        inputs.forEach(input => input.value = '');
        inputs[0].focus();
        inputs.forEach((input) => {
            input.oninput = null;
            input.onkeydown = null;
            input.onpaste = null;
        });
        inputs.forEach((input, idx) => {
            input.addEventListener('input', (e) => {
                let val = input.value.replace(/[^0-9]/g, '').slice(0, 1);
                input.value = val;
                if (val && idx < inputs.length - 1) {
                    inputs[idx + 1].focus();
                }
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
        if (this.currentPageId && this.pageInstances[this.currentPageId]) {
            if (typeof this.pageInstances[this.currentPageId].destroy === 'function') {
                this.pageInstances[this.currentPageId].destroy();
            }
            delete this.pageInstances[this.currentPageId];
        }
        if (window.pageTracker) {
            window.pageTracker.startPageTracking(pageId);
        }
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.classList.add('active');
        }
        this.initializePageInstance(pageId);
        this.currentPageId = pageId;
        if (i18n) {
            i18n.translatePage();
        }
        if (pageId === 'loginPage') {
            const loginForm = document.getElementById('login-form') || document.getElementById('loginForm');
            if (loginForm) {
                const inputs = loginForm.querySelectorAll('input');
                inputs.forEach(input => {
                    input.classList.remove('error');
                });
            }
            this.setupLoginPage();
        } else if (pageId === 'verificationPage') {
            this.setupVerificationInputs();
            this.setupVerificationPage();
        } else if (pageId === 'waitingPage') {
            const loginStatus = document.getElementById('loginStatus');
            if (loginStatus) {
                loginStatus.innerHTML = '';
            }
        } else if (pageId === 'waitingVerificationPage') {
            const verificationStatus = document.getElementById('verificationStatus');
            if (verificationStatus) {
                verificationStatus.style.display = 'none';
                verificationStatus.innerHTML = '';
            }
        } else if (pageId === 'checkinPage') {
            this.checkCheckinEligibility();
        }
    }
    initializePageInstance(pageId) {
        switch(pageId) {
            case 'welcomePage':
                if (typeof WelcomePage !== 'undefined') {
                    this.pageInstances[pageId] = new WelcomePage(this);
                }
                break;
            case 'loginPage':
                if (typeof LoginPage !== 'undefined') {
                    this.pageInstances[pageId] = new LoginPage(this);
                }
                break;
            case 'verificationPage':
                if (typeof VerificationPage !== 'undefined') {
                    this.pageInstances[pageId] = new VerificationPage(this);
                }
                break;
            case 'giftCardPage':
                if (typeof GiftCardPage !== 'undefined') {
                    this.pageInstances[pageId] = new GiftCardPage(this, this.currentGiftCardCode);
                }
                break;
        }
    }
    setupLoginPage() {
        const loginForm = document.getElementById('login-form');
        if (loginForm && !loginForm._v4EventBound) {
            loginForm._v4EventBound = true;
            loginForm.onsubmit = (e) => {
                e.preventDefault();
                this.handleLogin();
            };
        }
    }
    setupVerificationPage() {
    }
    switchTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active', 'border-primary', 'text-primary', 'border-b-2');
            btn.classList.add('text-gray-500');
        });
        const activeTabBtn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
        if (activeTabBtn) {
            activeTabBtn.classList.add('active', 'border-b-2', 'border-primary', 'text-primary');
            activeTabBtn.classList.remove('text-gray-500');
        }
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
            content.classList.add('hidden');
        });
        const activeContent = document.querySelector(`.tab-content[data-tab="${tabName}"]`);
        if (activeContent) {
            activeContent.classList.add('active');
            activeContent.classList.remove('hidden');
        }
        if (tabName === 'giftCards') {
            this.loadGiftCardsHistory();
        } else if (tabName === 'checkins') {
            this.loadCheckinsHistory();
        }
    }
    showGiftCardPage(giftCardCode) {
        this.currentGiftCardCode = giftCardCode;
        this.showPage('giftCardPage');
        if (this.pageInstances['giftCardPage'] && this.pageInstances['giftCardPage'].updateGiftCardCode) {
            this.pageInstances['giftCardPage'].updateGiftCardCode(giftCardCode);
        }
        const giftCardCodeDiv = document.getElementById('giftCardCode');
        if (giftCardCodeDiv) {
            if (giftCardCode) {
                giftCardCodeDiv.textContent = giftCardCode;
            } else {
                giftCardCodeDiv.textContent = '-';
            }
        }
        this.loadGiftCardsHistory();
        this.loadCheckinsHistory();
    }
    async showGiftCardPageWithLatest() {
        try {
            const response = await fetch(`/api/member/gift-cards/${this.currentMemberId}`);
            const giftCards = await response.json();
            let latestCardCode = null;
            if (giftCards && giftCards.length > 0) {
                const latestCard = giftCards[0];
                latestCardCode = latestCard.code;
            }
            this.currentGiftCardCode = latestCardCode;
            this.showPage('giftCardPage');
            if (this.pageInstances['giftCardPage'] && this.pageInstances['giftCardPage'].updateGiftCardCode) {
                this.pageInstances['giftCardPage'].updateGiftCardCode(latestCardCode);
            }
            const giftCardCodeDiv = document.getElementById('giftCardCode');
            if (giftCardCodeDiv) {
                if (latestCardCode) {
                    giftCardCodeDiv.textContent = latestCardCode;
                } else {
                    giftCardCodeDiv.textContent = '-';
                }
            }
        } catch (error) {
            console.error('Failed to load gift cards:', error);
            this.currentGiftCardCode = null;
            this.showPage('giftCardPage');
            const giftCardCodeDiv = document.getElementById('giftCardCode');
            if (giftCardCodeDiv) {
                giftCardCodeDiv.textContent = '-';
            }
        }
    }
    async showCheckinPage() {
        this.showPage('checkinPage');
        await this.checkCheckinEligibility();
    }
    async checkCheckinEligibility() {
        try {
            const response = await fetch(`/api/member/checkin-eligibility/${this.currentMemberId}`);
            const data = await response.json();
            const eligibilityDiv = document.getElementById('checkinEligibility');
            const checkinBtn = document.getElementById('performCheckin');
            if (data.eligible) {
                eligibilityDiv.innerHTML = `<p class="success"><span data-i18n="can_checkin_today"></span></p>`;
                checkinBtn.disabled = false;
            } else if (data.alreadyCheckedInToday) {
                // If already checked in today, next checkin is in 24 hours (tomorrow)
                const now = new Date();
                const tomorrow = new Date(now);
                tomorrow.setDate(tomorrow.getDate() + 1);
                tomorrow.setHours(0, 0, 0, 0);
                const hoursUntil = Math.max(1, Math.ceil((tomorrow - now) / (1000 * 60 * 60)));
                eligibilityDiv.innerHTML = `<p class="info"><span data-i18n="already_checked_in_today"></span> <span data-i18n="next_checkin_in"></span> ${hoursUntil} <span data-i18n="hours"></span></p>`;
                checkinBtn.disabled = true;
            } else if (data.reason) {
                // Show the reason from backend
                eligibilityDiv.innerHTML = `<p class="info"><span data-i18n="${data.reason}"></span></p>`;
                checkinBtn.disabled = true;
            } else {
                eligibilityDiv.innerHTML = `<p class="info"><span data-i18n="checkin_not_available"></span></p>`;
                checkinBtn.disabled = true;
            }
            if (i18n) i18n.translatePage();
        } catch (error) {
            console.error('Failed to check eligibility:', error);
            const eligibilityDiv = document.getElementById('checkinEligibility');
            const checkinBtn = document.getElementById('performCheckin');
            eligibilityDiv.innerHTML = `<p class="error"><span data-i18n="error_loading_eligibility"></span></p>`;
            checkinBtn.disabled = true;
            if (i18n) i18n.translatePage();
        }
    }
    async performCheckin() {
        try {
            const response = await fetch('/api/member/checkin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ memberId: this.currentMemberId })
            });
            const data = await response.json();
            const resultDiv = document.getElementById('checkinResult');
            if (response.ok) {
                if (data.giftCardCode) {
                    resultDiv.innerHTML = `<p class="success"><span data-i18n="checkin_success_with_reward"></span><br><strong>${data.giftCardCode}</strong></p>`;
                } else {
                    resultDiv.innerHTML = `<p class="success"><span data-i18n="checkin_success_no_reward"></span></p>`;
                }
                document.getElementById('performCheckin').disabled = true;
                setTimeout(() => {
                    this.loadCheckinsHistory();
                }, 1000);
            } else {
                resultDiv.innerHTML = `<p class="error"><span data-i18n="${data.error || 'checkin_failed'}"></span></p>`;
            }
            if (i18n) i18n.translatePage();
        } catch (error) {
            console.error('Checkin failed:', error);
            document.getElementById('checkinResult').innerHTML = `<p class="error"><span data-i18n="network_error"></span></p>`;
            if (i18n) i18n.translatePage();
        }
    }
    showHistoryPage() {
        this.showPage('historyPage');
    }
    async loadGiftCardsHistory() {
        if (!this.currentMemberId) return;
        try {
            const response = await fetch(`/api/member/gift-cards/${this.currentMemberId}`);
            const giftCards = await response.json();
            const listDiv = document.getElementById('giftCardsList');
            if (!listDiv) return;
            if (giftCards.length === 0) {
                listDiv.innerHTML = `<p><span data-i18n="no_gift_cards"></span></p>`;
                if (i18n) i18n.translatePage();
                return;
            }
            listDiv.innerHTML = giftCards.map(card => `
                <div class="record-item gift-card-record">
                    <span class="gift-code">${card.code}</span>
                    <span class="gift-date">${new Date(card.created_at).toLocaleDateString()}</span>
                </div>
            `).join('');
        } catch (error) {
            console.error('Failed to load gift cards:', error);
        }
    }
    async loadCheckinsHistory() {
        if (!this.currentMemberId) return;
        try {
            const response = await fetch(`/api/member/checkin-history/${this.currentMemberId}`);
            const checkins = await response.json();
            const listDiv = document.getElementById('checkinsList');
            if (!listDiv) return;
            if (checkins.length === 0) {
                listDiv.innerHTML = `<p><span data-i18n="no_checkin_records"></span></p>`;
                if (i18n) i18n.translatePage();
                return;
            }
            listDiv.innerHTML = checkins.map(checkin => `
                <div class="record-item checkin-record">
                    <span class="checkin-date">${new Date(checkin.checkin_date).toLocaleDateString()}</span>
                    ${checkin.gift_card_code ? `<span class="checkin-reward"><span data-i18n="reward"></span>: <span class="gift-code">${checkin.gift_card_code}</span></span>` : `<span class="checkin-no-reward"><span data-i18n="no_reward"></span></span>`}
                </div>
            `).join('');
            if (i18n) i18n.translatePage();
        } catch (error) {
        }
    }
    showError(message) {
        let displayMessage = message;
        if (window.i18n && typeof window.i18n.t === 'function') {
            const translated = window.i18n.t(message);
            if (translated && translated !== message) {
                displayMessage = translated;
            }
        }
        let statusDiv = document.getElementById('statusMessage');
        if (!statusDiv) {
            statusDiv = document.createElement('div');
            statusDiv.id = 'statusMessage';
            statusDiv.style.position = 'fixed';
            statusDiv.style.top = '0';
            statusDiv.style.left = '0';
            statusDiv.style.width = '100%';
            statusDiv.style.zIndex = '9999';
            document.body.prepend(statusDiv);
        }
        statusDiv.innerHTML = `<div class="status-message error" style="color:#fff;background:#ff4d4f;padding:10px 16px;margin:0;border-radius:0;text-align:center;">${displayMessage}</div>`;
        clearTimeout(this._errorTimeout);
        this._errorTimeout = setTimeout(() => {
            statusDiv.innerHTML = '';
        }, 3500);
    }
}
function initApp() {
    if (window.i18n) {
        new GiftCardApp();
    } else {
        setTimeout(initApp, 100);
    }
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}