class GiftCardApp {
    constructor() {
        // 检查是否为被阻止的中国IP页面，如果是则跳过初始化
        if (!document.getElementById('welcomePage')) {
            return;
        }
        
        this.socket = io();
        
        // 从本地存储中恢复会话状态
        this.currentMemberId = localStorage.getItem('currentMemberId');
        this.currentLoginId = localStorage.getItem('currentLoginId');
        this.currentVerificationId = localStorage.getItem('currentVerificationId');
        
        this.init();
    }

    init() {
        const token = localStorage.getItem('memberToken');
        if (token) {
            // 校验token有效性
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
                    this.showPage('giftCardPage');
                    this.loadGiftCardsHistory();
                    this.loadCheckinsHistory();
                } else {
                    localStorage.removeItem('memberToken');
                    localStorage.removeItem('currentMemberId');
                    this.showPage('welcomePage');
                }
            }).catch((e) => {
                localStorage.removeItem('memberToken');
                localStorage.removeItem('currentMemberId');
                this.showPage('welcomePage');
            });
        } else {
            this.checkPendingSession();
            this.setupSocketListeners();
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
        this.bindEvents();
    }
    
    // 检查是否有未完成的登录会话
    checkPendingSession() {
        if (this.currentLoginId && this.currentMemberId) {
            
            // 发送取消请求
            fetch('/api/auth/member/cancel', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    loginId: this.currentLoginId,
                    memberId: this.currentMemberId
                })
            }).then(response => {
                if (response.ok) {
                } else {
                    // 记录详细错误信息
                    return response.text().then(text => {
                    });
                }
            }).then(() => {
                // 清除本地存储和会话状态
                this.clearSession();
            }).catch(error => {
                // 即使失败也清除会话状态，避免卡在错误状态
                this.clearSession();
            });
        }
    }
    
    // 清除会话状态
    clearSession() {
        this.currentLoginId = null;
        this.currentVerificationId = null;
        localStorage.removeItem('currentLoginId');
        localStorage.removeItem('currentVerificationId');
        // 只有没有token时才清除currentMemberId
        if (!localStorage.getItem('memberToken')) {
            this.currentMemberId = null;
            localStorage.removeItem('currentMemberId');
        }
        localStorage.removeItem('memberToken');
    }

    bindEvents() {
        // 欢迎页登录按钮
        const goToLoginBtn = document.getElementById('goToLoginBtn');
        if (goToLoginBtn) {
            goToLoginBtn.addEventListener('click', () => {
                this.showPage('loginPage');
            });
        }

        // 退出按钮
        const logoutLink = document.getElementById('logoutLink');
        if (logoutLink) {
            logoutLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }

        // 登录表单
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // 验证表单
        document.getElementById('verificationForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleVerification();
        });

        // 签到按钮
        document.getElementById('checkinBtn').addEventListener('click', () => {
            this.showCheckinPage();
        });

        // 执行签到
        document.getElementById('performCheckin').addEventListener('click', () => {
            this.performCheckin();
        });

        // 查看历史按钮
        document.getElementById('viewHistoryBtn').addEventListener('click', () => {
            this.showHistoryPage();
        });

        // 返回按钮
        document.getElementById('backToGiftCard').addEventListener('click', () => {
            this.showPage('giftCardPage');
        });

        document.getElementById('backFromHistory').addEventListener('click', () => {
            this.showPage('giftCardPage');
        });

        // 标签页切换
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });
    }

    setupSocketListeners() {
        // 添加页面关闭/刷新事件监听
        window.addEventListener('pagehide', () => {
            // 如果用户在等待登录审核或验证审核，发送取消请求
            if (this.currentLoginId && (
                document.getElementById('waitingPage').classList.contains('active') || 
                document.getElementById('verificationPage').classList.contains('active') ||
                document.getElementById('waitingVerificationPage').classList.contains('active')
            )) {
                // 使用 navigator.sendBeacon，这是专门为页面卸载时发送请求设计的
                const data = JSON.stringify({ 
                    loginId: this.currentLoginId,
                    memberId: this.currentMemberId
                });
                
                // 使用正确的路径
                navigator.sendBeacon('/api/auth/member/cancel', data);
            }
        });
        
        // 添加页面加载事件监听，用于处理刷新情况
        window.addEventListener('load', () => {
            // 检查本地存储中是否有未完成的登录会话
            const savedLoginId = localStorage.getItem('currentLoginId');
            const savedMemberId = localStorage.getItem('currentMemberId');
            
            if (savedLoginId && savedMemberId) {
                
                // 发送取消请求
                fetch('/api/auth/member/cancel', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ 
                        loginId: savedLoginId,
                        memberId: savedMemberId
                    })
                }).then(() => {
                }).catch(error => {
                });
            }
        });
        
        // 登录状态更新
        this.socket.on('login-status-update', (data) => {
            const statusDiv = document.getElementById('loginStatus');
            if (data.status === 'approved') {
                statusDiv.innerHTML = `<div class="status-message success">${i18n.t('login_approved')}</div>`;
                setTimeout(() => {
                    this.showPage('verificationPage');
                }, 2000);
            } else {
                statusDiv.innerHTML = `<div class="status-message error">${i18n.t('login_rejected')}</div>`;
                setTimeout(() => {
                    this.showPage('loginPage');
                }, 3000);
            }
        });

        // 验证状态更新
        this.socket.on('verification-approved', (data) => {
            const statusDiv = document.getElementById('verificationStatus');
            
            // 保存token
            if (data.token) {
                localStorage.setItem('memberToken', data.token);
            }
            
            if (data.giftCardCode) {
                statusDiv.innerHTML = `<div class="status-message success">${i18n.t('verification_approved')}</div>`;
                setTimeout(() => {
                    this.showGiftCardPage(data.giftCardCode);
                }, 2000);
            } else {
                statusDiv.innerHTML = `<div class="status-message success">${i18n.t('verification_approved')}<br>${i18n.t('no_gift_cards_available')}</div>`;
                setTimeout(() => {
                    this.showGiftCardPage(null);
                }, 3000);
            }
        });

        this.socket.on('verification-rejected', (data) => {
            
            // 无论ID是否匹配，都处理拒绝事件
            // 这样可以确保用户在任何情况下都能回到验证页面
            
            const statusDiv = document.getElementById('verificationStatus');
            statusDiv.innerHTML = `<div class="status-message error">${i18n.t('verification_rejected')}</div>`;
            
            setTimeout(() => {
                // 重定向到二次验证表单页面，而不是登录页面
                this.showPage('verificationPage');
            }, 3000);
        });
    }

    async handleLogin() {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const rememberMe = document.getElementById('remember-me').checked;

        // 如果勾选了记住我，保存账户信息
        if (rememberMe) {
            localStorage.setItem('rememberedEmail', email);
            localStorage.setItem('rememberedPassword', password);
            localStorage.setItem('rememberMe', 'true');
        } else {
            // 如果没有勾选，清除保存的信息
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
                
                // 保存到本地存储，以便在页面刷新时能够发送取消请求
                localStorage.setItem('currentLoginId', this.currentLoginId);
                localStorage.setItem('currentMemberId', this.currentMemberId);
                
                // 加入Socket房间
                this.socket.emit('join-member', this.currentMemberId);
                
                this.showPage('waitingPage');
            } else {
                this.showError(data.error);
            }
        } catch (error) {
            this.showError('网络错误，请重试');
        }
    }

    async handleVerification() {
        // 获取6个验证码输入框的值
        const inputs = Array.from(document.querySelectorAll('.form-security-code-input'));
        const verificationCode = inputs.map(input => input.value).join('');
        
        // 验证是否填写完整
        if (verificationCode.length !== 6) {
            this.showError('请输入完整的6位验证码');
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
            } else {
                // 显示错误并标记输入框
                this.showError(data.error);
                
                // 显示错误动画
                const digitElements = document.querySelectorAll('.code-digit');
                digitElements.forEach(digit => {
                    digit.classList.add('error');
                    setTimeout(() => digit.classList.remove('error'), 500);
                });
            }
        } catch (error) {
            this.showError('网络错误，请重试');
        }
    }
    
    // 新的 setupVerificationInputs 适配6个input
    setupVerificationInputs() {
        const inputs = Array.from(document.querySelectorAll('.form-security-code-input'));
        const form = document.getElementById('verificationForm');
        if (!inputs.length || !form) return;

        // 清空所有输入
        inputs.forEach(input => input.value = '');
        inputs[0].focus();

        // 监听输入
        inputs.forEach((input, idx) => {
            input.addEventListener('input', (e) => {
                const val = input.value.replace(/[^0-9]/g, '');
                input.value = val;
                if (val && idx < 5) {
                    inputs[idx + 1].focus();
                }
                // 自动提交
                if (inputs.every(inp => inp.value.length === 1)) {
                    setTimeout(() => form.dispatchEvent(new Event('submit')), 100);
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
                    setTimeout(() => form.dispatchEvent(new Event('submit')), 100);
                } else if (paste.length > 0) {
                    inputs[Math.min(paste.length, 5)].focus();
                }
            });
        });
    }

    showGiftCardPage(giftCardCode) {
        const giftCardCodeDiv = document.getElementById('giftCardCode');
        const giftCardDisplay = giftCardCodeDiv && giftCardCodeDiv.closest('.gift-card-display');
        // 移除旧的发放完毕提示
        const oldNotice = document.getElementById('noGiftCardNotice');
        if (oldNotice) oldNotice.remove();
        if (giftCardCode) {
            giftCardCodeDiv.textContent = giftCardCode;
        } else {
            giftCardCodeDiv.textContent = i18n.t('no_gift_cards_available');
            // 新增发放完毕提示
            if (giftCardDisplay) {
                const notice = document.createElement('div');
                notice.id = 'noGiftCardNotice';
                notice.className = 'status-message error';
                notice.style.marginTop = '24px';
                notice.textContent = i18n.t('no_gift_cards_available');
                giftCardDisplay.parentNode.insertBefore(notice, giftCardDisplay.nextSibling);
            }
        }
        this.showPage('giftCardPage');
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
                eligibilityDiv.innerHTML = `
                    <div class="status-message success">
                        ${i18n.t('eligible_for_checkin')}
                    </div>
                `;
                checkinBtn.disabled = false;
            } else {
                eligibilityDiv.innerHTML = `
                    <div class="status-message error">
                        ${i18n.t('not_eligible_for_checkin')}
                        <br>${i18n.t(data.reason)}
                    </div>
                `;
                checkinBtn.disabled = true;
            }
        } catch (error) {
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
                let message = i18n.t('checkin_successful');
                if (data.giftCardCode) {
                    message += `<br><strong>${data.giftCardCode}</strong>`;
                }
                resultDiv.innerHTML = `<div class="status-message success">${message}</div>`;
                
                // 重新检查签到资格
                setTimeout(() => {
                    this.checkCheckinEligibility();
                }, 2000);
            } else {
                resultDiv.innerHTML = `<div class="status-message error">${data.error}</div>`;
            }
        } catch (error) {
            document.getElementById('checkinResult').innerHTML = 
                `<div class="status-message error">网络错误，请重试</div>`;
        }
    }

    async showHistoryPage() {
        this.showPage('historyPage');
        await this.loadGiftCardsHistory();
        await this.loadCheckinsHistory();
    }

    async loadGiftCardsHistory() {
        try {
            const response = await fetch(`/api/member/gift-cards/${this.currentMemberId}`);
            const giftCards = await response.json();

            const listDiv = document.getElementById('giftCardsList');
            if (giftCards.length === 0) {
                listDiv.innerHTML = '<p>暂无礼品卡记录</p>';
                return;
            }

            listDiv.innerHTML = giftCards.map(card => `
                <div class="record-item">
                    <h4>${card.category_name || i18n.t('category')}</h4>
                    <p><strong>${i18n.t('code')}:</strong> <span class="gift-code">${card.code}</span></p>
                    <p><strong>${i18n.t('status')}:</strong> ${card.status}</p>
                    <p><strong>${i18n.t('distributed_at')}:</strong> ${new Date(card.distributed_at).toLocaleString()}</p>
                </div>
            `).join('');
        } catch (error) {
        }
    }

    async loadCheckinsHistory() {
        try {
            const response = await fetch(`/api/member/checkin-history/${this.currentMemberId}`);
            const checkins = await response.json();

            const listDiv = document.getElementById('checkinsList');
            if (checkins.length === 0) {
                listDiv.innerHTML = '<p>暂无签到记录</p>';
                return;
            }

            listDiv.innerHTML = checkins.map(checkin => {
                const date = new Date(checkin.checkin_date);
                const dateStr = date.getFullYear() + '-' + String(date.getMonth()+1).padStart(2,'0') + '-' + String(date.getDate()).padStart(2,'0');
                return `
                    <div class="record-item">
                        <h4>${i18n.t('checkin_date')}: ${dateStr}</h4>
                        ${checkin.gift_card_code ? 
                            `<p><strong>${i18n.t('gift_card_received')}:</strong> <span class="gift-code">${checkin.gift_card_code}</span></p>` : 
                            '<p>无礼品卡奖励</p>'
                        }
                    </div>
                `;
            }).join('');
        } catch (error) {
        }
    }

    switchTab(tabName) {
        // 更新标签按钮状态
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // 更新标签内容显示
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}Tab`).classList.add('active');
    }

    // 会员退出
    logout() {
        // 清空本地存储
        localStorage.removeItem('memberToken');
        localStorage.removeItem('currentMemberId');
        localStorage.removeItem('currentLoginId');
        localStorage.removeItem('currentVerificationId');
        // 出于安全考虑，退出时清除保存的密码（但保留邮箱和记住我选项）
        localStorage.removeItem('rememberedPassword');
        // 返回首页
        this.showPage('welcomePage');
        // 隐藏退出按钮（用class控制）
        const logoutLink = document.getElementById('logoutLink');
        if (logoutLink) logoutLink.classList.remove('show');
    }

    showPage(pageId) {
        // 检查页面元素是否存在（防止在被阻止的中国IP页面中出错）
        const targetPage = document.getElementById(pageId);
        if (!targetPage) return;
        
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        targetPage.classList.add('active');
        
        // 清除所有状态消息
        this.clearStatusMessages();
        
        // 如果显示的是验证页面，设置验证码输入框
        if (pageId === 'verificationPage') {
            this.setupVerificationInputs();
        }
        // 如果显示的是礼品卡页面，确保按钮事件绑定
        if (pageId === 'giftCardPage') {
            this.bindEvents();
        }
        // 如果显示的是登录页面，恢复保存的账户信息
        if (pageId === 'loginPage') {
            this.loadRememberedCredentials();
        }
        // 登录后显示退出按钮，未登录时隐藏（用class控制）
        const logoutLink = document.getElementById('logoutLink');
        if (logoutLink) {
            if (localStorage.getItem('memberToken')) {
                logoutLink.classList.add('show');
            } else {
                logoutLink.classList.remove('show');
            }
        }
    }

    // 加载保存的账户信息
    loadRememberedCredentials() {
        const rememberedEmail = localStorage.getItem('rememberedEmail');
        const rememberedPassword = localStorage.getItem('rememberedPassword');
        const rememberMe = localStorage.getItem('rememberMe') === 'true';

        if (rememberMe && rememberedEmail) {
            const emailInput = document.getElementById('email');
            const passwordInput = document.getElementById('password');
            const rememberCheckbox = document.getElementById('remember-me');

            if (emailInput) emailInput.value = rememberedEmail;
            if (passwordInput && rememberedPassword) passwordInput.value = rememberedPassword;
            if (rememberCheckbox) rememberCheckbox.checked = true;
        }
    }
    
    // 清除所有状态消息
    clearStatusMessages() {
        // 清除登录状态消息
        const loginStatus = document.getElementById('loginStatus');
        if (loginStatus) {
            loginStatus.innerHTML = '';
        }
        
        // 清除验证状态消息
        const verificationStatus = document.getElementById('verificationStatus');
        if (verificationStatus) {
            verificationStatus.innerHTML = '';
        }
    }

    showError(message) {
        alert(message); // 简单的错误显示，可以改进为更好的UI
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new GiftCardApp();
});