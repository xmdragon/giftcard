/**
 * GiftCard V2 应用主要JavaScript文件
 * 整合现有API和WebSocket系统
 */

class GiftCardV2App {
    constructor() {
        // 初始化Socket.IO连接
        this.socket = io();
        
        // 应用状态
        this.currentMemberId = localStorage.getItem('v2_currentMemberId');
        this.currentLoginId = localStorage.getItem('v2_currentLoginId');
        this.currentVerificationId = localStorage.getItem('v2_currentVerificationId');
        this.memberEmail = localStorage.getItem('v2_memberEmail');
        this.memberToken = localStorage.getItem('v2_memberToken');
        
        // 当前页面路径
        this.currentPath = window.location.pathname;
        
        // 初始化应用
        this.init();
    }

    init() {
        console.log('[V2App] Initializing...');
        
        // 初始化Socket连接
        this.setupSocketListeners();
        
        // 根据当前页面初始化功能
        this.initCurrentPage();
        
        // 绑定通用事件
        this.bindCommonEvents();
        
        // 初始化国际化
        this.initI18n();
        
        console.log('[V2App] Initialized successfully');
    }

    /**
     * 设置Socket监听器
     */
    setupSocketListeners() {
        this.socket.on('connect', () => {
            console.log('[V2App] Socket connected');
            if (this.currentMemberId) {
                this.socket.emit('join-member', this.currentMemberId);
            }
        });

        this.socket.on('disconnect', () => {
            console.log('[V2App] Socket disconnected');
        });

        // 登录审核结果
        this.socket.on('login-approved', (data) => {
            if (data.loginId == this.currentLoginId) {
                console.log('[V2App] Login approved');
                this.handleLoginApproved(data);
            }
        });

        this.socket.on('login-rejected', (data) => {
            if (data.loginId == this.currentLoginId) {
                console.log('[V2App] Login rejected');
                this.handleLoginRejected(data);
            }
        });

        // 验证审核结果
        this.socket.on('verification-approved', (data) => {
            if (data.verificationId == this.currentVerificationId) {
                console.log('[V2App] Verification approved');
                this.handleVerificationApproved(data);
            }
        });

        this.socket.on('verification-rejected', (data) => {
            if (data.verificationId == this.currentVerificationId) {
                console.log('[V2App] Verification rejected');
                this.handleVerificationRejected(data);
            }
        });
    }

    /**
     * 根据当前页面初始化对应功能
     */
    initCurrentPage() {
        if (this.currentPath.includes('/v2/')) {
            const page = this.currentPath.split('/v2/')[1] || 'index';
            
            switch(page) {
                case '':
                case 'index':
                    this.initLoginPage();
                    break;
                case 'waiting':
                    this.initWaitingPage();
                    break;
                case 'verification':
                    this.initVerificationPage();
                    break;
                case 'waiting-verification':
                    this.initWaitingVerificationPage();
                    break;
                case 'success':
                    this.initSuccessPage();
                    break;
                case 'checkin':
                    this.initCheckinPage();
                    break;
            }
        }
    }

    /**
     * 初始化登录页面
     */
    initLoginPage() {
        console.log('[V2App] Initializing login page');
        
        // 检查是否已登录
        if (this.memberToken) {
            this.verifyToken().then(valid => {
                if (valid) {
                    window.location.href = '/v2/success';
                    return;
                }
            });
        }

        // 绑定登录表单事件
        const loginForm = document.getElementById('login-form');
        const passwordInput = document.getElementById('giftcard-password');
        const togglePassword = document.getElementById('toggle-password');
        const loadingOverlay = document.getElementById('loading-overlay');

        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        // 密码显示/隐藏切换
        if (togglePassword && passwordInput) {
            togglePassword.addEventListener('click', () => {
                const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                passwordInput.setAttribute('type', type);
                
                togglePassword.classList.toggle('fa-eye');
                togglePassword.classList.toggle('fa-eye-slash');
            });
        }

        // 实时验证邮箱格式
        const emailInput = document.getElementById('giftcard-id');
        const idError = document.getElementById('id-error');
        
        if (emailInput && idError) {
            emailInput.addEventListener('input', () => {
                this.validateEmail();
            });
        }
    }

    /**
     * 初始化等待审核页面
     */
    initWaitingPage() {
        console.log('[V2App] Initializing waiting page');
        
        // 检查是否有待审核的登录请求
        if (!this.currentLoginId || !this.currentMemberId) {
            window.location.href = '/v2';
            return;
        }

        // 显示用户信息
        this.displayUserInfo();
        
        // 绑定取消按钮
        const cancelBtn = document.getElementById('cancel-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.handleCancelRequest();
            });
        }

        // 绑定返回按钮
        const backBtn = document.getElementById('back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                window.location.href = '/v2';
            });
        }
    }

    /**
     * 初始化验证码页面
     */
    initVerificationPage() {
        console.log('[V2App] Initializing verification page');
        
        // 检查登录状态
        if (!this.currentLoginId || !this.currentMemberId) {
            window.location.href = '/v2';
            return;
        }

        // 绑定验证码表单
        const verificationForm = document.getElementById('verification-form');
        const codeInput = document.getElementById('code-input');
        const codeError = document.getElementById('code-error');
        const resendCode = document.getElementById('resend-code');
        const loadingOverlay = document.getElementById('loading-overlay');

        if (verificationForm) {
            verificationForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleVerification();
            });
        }

        // 验证码输入验证
        if (codeInput) {
            codeInput.addEventListener('input', () => {
                this.validateVerificationCode();
                
                // 自动提交6位验证码
                if (codeInput.value.length === 6) {
                    setTimeout(() => {
                        this.handleVerification();
                    }, 500);
                }
            });
        }

        // 重新发送验证码
        if (resendCode) {
            this.startCountdown();
            resendCode.addEventListener('click', () => {
                if (!resendCode.classList.contains('disabled')) {
                    this.resendVerificationCode();
                }
            });
        }

        // 返回按钮
        const backBtn = document.getElementById('back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                window.location.href = '/v2/waiting';
            });
        }
    }

    /**
     * 初始化等待验证审核页面
     */
    initWaitingVerificationPage() {
        console.log('[V2App] Initializing waiting verification page');
        
        if (!this.currentVerificationId || !this.currentMemberId) {
            window.location.href = '/v2';
            return;
        }

        // 显示验证码
        this.displayVerificationInfo();
        
        // 绑定返回验证页面按钮
        const backToVerification = document.getElementById('back-to-verification');
        if (backToVerification) {
            backToVerification.addEventListener('click', () => {
                window.location.href = '/v2/verification';
            });
        }

        // 返回按钮
        const backBtn = document.getElementById('back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                window.location.href = '/v2/verification';
            });
        }
    }

    /**
     * 初始化成功页面
     */
    initSuccessPage() {
        console.log('[V2App] Initializing success page');
        
        // 验证token
        if (!this.memberToken) {
            window.location.href = '/v2';
            return;
        }

        this.verifyToken().then(valid => {
            if (!valid) {
                window.location.href = '/v2';
                return;
            }
            
            // 加载用户数据
            this.loadMemberData();
        });

        // 绑定按钮事件
        this.bindSuccessPageEvents();
    }

    /**
     * 初始化签到页面
     */
    initCheckinPage() {
        console.log('[V2App] Initializing checkin page');
        
        if (!this.memberToken) {
            window.location.href = '/v2';
            return;
        }

        this.verifyToken().then(valid => {
            if (!valid) {
                window.location.href = '/v2';
                return;
            }
            
            // 加载签到数据
            this.loadCheckinData();
        });

        // 绑定签到按钮
        const checkinButton = document.getElementById('checkin-button');
        if (checkinButton) {
            checkinButton.addEventListener('click', () => {
                this.handleCheckin();
            });
        }

        // 返回按钮
        const backBtn = document.getElementById('back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                window.location.href = '/v2/success';
            });
        }
    }

    /**
     * 绑定通用事件
     */
    bindCommonEvents() {
        // 语言选择器
        const languageSelect = document.getElementById('languageSelect');
        if (languageSelect) {
            languageSelect.addEventListener('change', (e) => {
                this.changeLanguage(e.target.value);
            });
            
            // 设置当前语言
            languageSelect.value = recommendLang || 'zh';
        }
    }

    /**
     * 处理登录
     */
    async handleLogin() {
        const emailInput = document.getElementById('giftcard-id');
        const passwordInput = document.getElementById('giftcard-password');
        const loadingOverlay = document.getElementById('loading-overlay');

        if (!emailInput || !passwordInput) return;

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        // 验证输入
        if (!this.validateEmail() || !password) {
            return;
        }

        // 显示加载动画
        if (loadingOverlay) {
            loadingOverlay.classList.add('active');
        }

        try {
            const response = await fetch('/api/auth/member/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                // 保存登录信息
                this.currentLoginId = data.loginId;
                this.currentMemberId = data.memberId;
                this.memberEmail = email;
                
                localStorage.setItem('v2_currentLoginId', data.loginId);
                localStorage.setItem('v2_currentMemberId', data.memberId);
                localStorage.setItem('v2_memberEmail', email);

                // 跳转到等待页面
                window.location.href = '/v2/waiting';
            } else {
                // 处理错误
                this.showError(data.error || '登录失败');
            }
        } catch (error) {
            console.error('[V2App] Login error:', error);
            this.showError('网络错误，请重试');
        } finally {
            if (loadingOverlay) {
                loadingOverlay.classList.remove('active');
            }
        }
    }

    /**
     * 处理验证码提交
     */
    async handleVerification() {
        const codeInput = document.getElementById('code-input');
        const loadingOverlay = document.getElementById('loading-overlay');

        if (!codeInput || !this.validateVerificationCode()) {
            return;
        }

        const verificationCode = codeInput.value.trim();

        if (loadingOverlay) {
            loadingOverlay.classList.add('active');
        }

        try {
            const response = await fetch('/api/auth/member/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    loginId: this.currentLoginId,
                    verificationCode
                })
            });

            const data = await response.json();

            if (response.ok) {
                // 保存验证ID
                this.currentVerificationId = data.verificationId;
                localStorage.setItem('v2_currentVerificationId', data.verificationId);
                localStorage.setItem('v2_verificationCode', verificationCode);

                // 跳转到等待验证审核页面
                window.location.href = '/v2/waiting-verification';
            } else {
                this.showError(data.error || '验证失败');
            }
        } catch (error) {
            console.error('[V2App] Verification error:', error);
            this.showError('网络错误，请重试');
        } finally {
            if (loadingOverlay) {
                loadingOverlay.classList.remove('active');
            }
        }
    }

    /**
     * 处理签到
     */
    async handleCheckin() {
        if (!this.currentMemberId) return;

        const checkinButton = document.getElementById('checkin-button');
        
        if (checkinButton) {
            checkinButton.disabled = true;
            checkinButton.innerHTML = '<i class="fa fa-spinner fa-spin mr-2"></i>签到中...';
        }

        try {
            const response = await fetch('/api/member/checkin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    memberId: this.currentMemberId
                })
            });

            const data = await response.json();

            if (response.ok) {
                // 显示签到成功动画
                this.showCheckinSuccess(data);
                
                // 重新加载签到数据
                setTimeout(() => {
                    this.loadCheckinData();
                }, 2000);
            } else {
                this.showError(data.error || '签到失败');
            }
        } catch (error) {
            console.error('[V2App] Checkin error:', error);
            this.showError('签到失败，请重试');
        } finally {
            if (checkinButton) {
                checkinButton.disabled = false;
                checkinButton.innerHTML = '<i class="fa fa-calendar-check-o mr-2"></i>每日签到';
            }
        }
    }

    /**
     * Socket事件处理 - 登录审核通过
     */
    handleLoginApproved(data) {
        if (this.currentPath.includes('waiting') && !this.currentPath.includes('verification')) {
            // 跳转到验证码页面
            window.location.href = '/v2/verification';
        }
    }

    /**
     * Socket事件处理 - 登录审核拒绝
     */
    handleLoginRejected(data) {
        this.clearSession();
        this.showError('登录请求被拒绝');
        setTimeout(() => {
            window.location.href = '/v2';
        }, 2000);
    }

    /**
     * Socket事件处理 - 验证审核通过
     */
    handleVerificationApproved(data) {
        // 保存token
        this.memberToken = data.token;
        localStorage.setItem('v2_memberToken', data.token);
        
        // 清理临时数据
        localStorage.removeItem('v2_currentLoginId');
        localStorage.removeItem('v2_currentVerificationId');
        localStorage.removeItem('v2_verificationCode');
        
        // 跳转到成功页面
        window.location.href = '/v2/success';
    }

    /**
     * Socket事件处理 - 验证审核拒绝
     */
    handleVerificationRejected(data) {
        this.showError('验证码审核被拒绝，请重新输入');
        setTimeout(() => {
            window.location.href = '/v2/verification';
        }, 2000);
    }

    /**
     * 验证邮箱格式
     */
    validateEmail() {
        const emailInput = document.getElementById('giftcard-id');
        const idError = document.getElementById('id-error');
        
        if (!emailInput || !idError) return true;

        const email = emailInput.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (email && !emailRegex.test(email)) {
            emailInput.classList.add('error');
            idError.style.display = 'block';
            return false;
        } else {
            emailInput.classList.remove('error');
            idError.style.display = 'none';
            return true;
        }
    }

    /**
     * 验证验证码格式
     */
    validateVerificationCode() {
        const codeInput = document.getElementById('code-input');
        const codeError = document.getElementById('code-error');
        
        if (!codeInput || !codeError) return true;

        const code = codeInput.value.trim();
        
        if (code.length !== 6 || isNaN(code)) {
            codeInput.classList.add('error');
            codeError.style.display = 'block';
            return false;
        } else {
            codeInput.classList.remove('error');
            codeError.style.display = 'none';
            return true;
        }
    }

    /**
     * 开始验证码倒计时
     */
    startCountdown() {
        const resendCode = document.getElementById('resend-code');
        if (!resendCode) return;

        let seconds = 60;
        resendCode.classList.add('disabled');
        resendCode.textContent = `重新发送(${seconds}s)`;
        
        const countdownInterval = setInterval(() => {
            seconds--;
            resendCode.textContent = `重新发送(${seconds}s)`;
            
            if (seconds <= 0) {
                clearInterval(countdownInterval);
                resendCode.classList.remove('disabled');
                resendCode.textContent = '重新发送';
            }
        }, 1000);
    }

    /**
     * 显示用户信息
     */
    displayUserInfo() {
        const userAccount = document.getElementById('user-account');
        const submitTime = document.getElementById('submit-time');
        
        if (userAccount && this.memberEmail) {
            userAccount.textContent = this.memberEmail;
        }
        
        if (submitTime) {
            submitTime.textContent = new Date().toLocaleString();
        }
    }

    /**
     * 显示验证信息
     */
    displayVerificationInfo() {
        const userAccount = document.getElementById('user-account');
        const verificationCodeValue = document.getElementById('verification-code-value');
        const verificationSubmitTime = document.getElementById('verification-submit-time');
        
        if (userAccount && this.memberEmail) {
            userAccount.textContent = this.memberEmail;
        }
        
        const storedCode = localStorage.getItem('v2_verificationCode');
        if (verificationCodeValue && storedCode) {
            verificationCodeValue.textContent = storedCode;
        }
        
        if (verificationSubmitTime) {
            verificationSubmitTime.textContent = new Date().toLocaleString();
        }
    }

    /**
     * 验证token有效性
     */
    async verifyToken() {
        if (!this.memberToken) return false;

        try {
            const response = await fetch('/api/auth/member/verify-token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ token: this.memberToken })
            });

            if (response.ok) {
                const data = await response.json();
                this.currentMemberId = data.memberId;
                localStorage.setItem('v2_currentMemberId', data.memberId);
                return true;
            } else {
                this.clearSession();
                return false;
            }
        } catch (error) {
            console.error('[V2App] Token verification error:', error);
            this.clearSession();
            return false;
        }
    }

    /**
     * 加载会员数据
     */
    async loadMemberData() {
        if (!this.currentMemberId) return;

        try {
            // 加载礼品卡历史
            const giftCardsResponse = await fetch(`/api/member/gift-cards/${this.currentMemberId}`);
            if (giftCardsResponse.ok) {
                const giftCards = await giftCardsResponse.json();
                this.displayGiftCards(giftCards);
            }

            // 显示用户信息
            if (this.memberEmail) {
                const giftcardIdDisplay = document.getElementById('giftcard-id-display');
                if (giftcardIdDisplay) {
                    giftcardIdDisplay.textContent = this.maskEmail(this.memberEmail);
                }
            }

            // 显示添加时间
            const addedTime = document.getElementById('added-time');
            if (addedTime) {
                addedTime.textContent = new Date().toLocaleString();
            }

        } catch (error) {
            console.error('[V2App] Load member data error:', error);
        }
    }

    /**
     * 加载签到数据
     */
    async loadCheckinData() {
        if (!this.currentMemberId) return;

        try {
            // 检查签到资格
            const eligibilityResponse = await fetch(`/api/member/checkin-eligibility/${this.currentMemberId}`);
            if (eligibilityResponse.ok) {
                const eligibility = await eligibilityResponse.json();
                this.updateCheckinUI(eligibility);
            }

            // 加载签到历史
            const historyResponse = await fetch(`/api/member/checkin-history/${this.currentMemberId}`);
            if (historyResponse.ok) {
                const history = await historyResponse.json();
                this.displayCheckinHistory(history);
            }

        } catch (error) {
            console.error('[V2App] Load checkin data error:', error);
        }
    }

    /**
     * 更新签到UI
     */
    updateCheckinUI(eligibility) {
        const checkinButton = document.getElementById('checkin-button');
        const checkinText = document.getElementById('checkin-text');
        const remainingDays = document.getElementById('remaining-days');
        
        if (remainingDays) {
            remainingDays.textContent = eligibility.daysRemaining || 0;
        }

        if (checkinButton && checkinText) {
            if (eligibility.eligible && !eligibility.alreadyCheckedInToday) {
                checkinButton.disabled = false;
                checkinText.textContent = '立即签到';
                checkinButton.classList.add('checkin-btn');
            } else if (eligibility.alreadyCheckedInToday) {
                checkinButton.disabled = true;
                checkinText.textContent = '今日已签到';
                checkinButton.classList.remove('checkin-btn');
            } else {
                checkinButton.disabled = true;
                checkinText.textContent = eligibility.reason || '暂无签到资格';
                checkinButton.classList.remove('checkin-btn');
            }
        }
    }

    /**
     * 显示礼品卡
     */
    displayGiftCards(giftCards) {
        if (!giftCards || giftCards.length === 0) return;

        // 显示最新的礼品卡
        const latestCard = giftCards[0];
        
        const cardCodeDisplay = document.getElementById('gift-card-code-display');
        const cardCodeValue = document.getElementById('card-code-value');
        const cardAmountDisplay = document.getElementById('card-amount-display');
        const cardCategoryDisplay = document.getElementById('card-category-display');

        if (cardCodeDisplay) {
            cardCodeDisplay.style.display = 'block';
        }

        if (cardCodeValue) {
            cardCodeValue.textContent = latestCard.code || 'N/A';
        }

        if (cardAmountDisplay) {
            cardAmountDisplay.textContent = `¥${latestCard.amount || '0.00'}`;
        }

        if (cardCategoryDisplay) {
            cardCategoryDisplay.textContent = latestCard.category_name || '通用礼品卡';
        }
    }

    /**
     * 绑定成功页面事件
     */
    bindSuccessPageEvents() {
        // 每日签到按钮
        const dailyCheckinBtn = document.getElementById('daily-checkin-btn');
        if (dailyCheckinBtn) {
            dailyCheckinBtn.addEventListener('click', () => {
                window.location.href = '/v2/checkin';
            });
        }

        // 查看历史按钮
        const viewHistoryBtn = document.getElementById('view-history-btn');
        if (viewHistoryBtn) {
            viewHistoryBtn.addEventListener('click', () => {
                // 这里可以实现历史页面或弹窗
                alert('历史记录功能开发中');
            });
        }

        // 退出登录按钮
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.handleLogout();
            });
        }

        // 返回按钮
        const backBtn = document.getElementById('back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                window.history.back();
            });
        }
    }

    /**
     * 处理退出登录
     */
    handleLogout() {
        this.clearSession();
        window.location.href = '/v2';
    }

    /**
     * 取消请求
     */
    async handleCancelRequest() {
        if (!this.currentLoginId || !this.currentMemberId) return;

        try {
            const response = await fetch('/api/auth/member/cancel', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    loginId: this.currentLoginId,
                    memberId: this.currentMemberId
                })
            });

            // 无论成功还是失败都清除会话
            this.clearSession();
            window.location.href = '/v2';

        } catch (error) {
            console.error('[V2App] Cancel request error:', error);
            this.clearSession();
            window.location.href = '/v2';
        }
    }

    /**
     * 清除会话数据
     */
    clearSession() {
        this.currentMemberId = null;
        this.currentLoginId = null;
        this.currentVerificationId = null;
        this.memberEmail = null;
        this.memberToken = null;
        
        localStorage.removeItem('v2_currentMemberId');
        localStorage.removeItem('v2_currentLoginId');
        localStorage.removeItem('v2_currentVerificationId');
        localStorage.removeItem('v2_memberEmail');
        localStorage.removeItem('v2_memberToken');
        localStorage.removeItem('v2_verificationCode');
    }

    /**
     * 显示错误信息
     */
    showError(message) {
        // 可以使用更好的UI组件，这里简单用alert
        alert(message);
    }

    /**
     * 隐藏邮箱部分字符
     */
    maskEmail(email) {
        const [localPart, domain] = email.split('@');
        if (localPart.length > 3) {
            return localPart.substring(0, 3) + '***@' + domain;
        }
        return localPart + '***@' + domain;
    }

    /**
     * 显示签到成功动画
     */
    showCheckinSuccess(data) {
        // 简单的成功提示
        const message = data.hasGiftCard ? 
            `签到成功！获得礼品卡：${data.giftCardCode}` : 
            '签到成功！今日暂无礼品卡奖励';
        
        alert(message);
    }

    /**
     * 显示签到历史
     */
    displayCheckinHistory(history) {
        const historyContainer = document.getElementById('checkin-history');
        if (!historyContainer) return;

        if (!history || history.length === 0) {
            historyContainer.innerHTML = `
                <div class="text-center text-gray-500 py-8">
                    <i class="fa fa-history text-3xl mb-2"></i>
                    <p>暂无签到记录</p>
                </div>
            `;
            return;
        }

        const historyHTML = history.map(record => `
            <div class="history-item">
                <div class="flex items-center">
                    <i class="fa fa-calendar-check-o text-green-600 mr-3"></i>
                    <div>
                        <div class="font-medium">${record.checkin_date}</div>
                        <div class="text-sm text-gray-500">
                            ${record.gift_card_code ? `获得: ${record.gift_card_code}` : '无奖励'}
                        </div>
                    </div>
                </div>
                <div class="text-sm text-green-600">
                    <i class="fa fa-check-circle"></i>
                </div>
            </div>
        `).join('');

        historyContainer.innerHTML = historyHTML;
    }

    /**
     * 初始化国际化
     */
    initI18n() {
        // 这里可以集成现有的i18n系统
        // 或者实现简单的翻译功能
    }

    /**
     * 切换语言
     */
    changeLanguage(lang) {
        // 这里可以实现语言切换
        console.log('[V2App] Change language to:', lang);
    }
}

// 当页面加载完成时初始化应用
document.addEventListener('DOMContentLoaded', () => {
    // 确保在全局变量加载后再初始化
    setTimeout(() => {
        if (typeof io !== 'undefined') {
            window.giftCardV2App = new GiftCardV2App();
        } else {
            console.error('[V2App] Socket.IO not loaded');
        }
    }, 100);
});