class GiftCardApp {
    constructor() {
        // 检查是否为被阻止的中国IP页面，如果是则跳过初始化
        if (!document.getElementById('welcomePage')) {
            return;
        }
        
        this.socket = io();
        
        // Socket.IO重连时重新加入房间
        this.socket.on('connect', () => {
            if (this.currentMemberId) {
                this.socket.emit('join-member', this.currentMemberId);
            }
        });
        
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
                    
                    
                    // 先加载礼品卡历史记录，然后显示页面
                    await this.loadGiftCardsHistory();
                    await this.loadCheckinsHistory();
                    this.showPage('giftCardPage');
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
        
        // 始终设置Socket监听器
        this.setupSocketListeners();
        this.bindEvents();
    }
    
    // 检查是否有未完成的登录会话（仅在页面初始化和关闭时调用）
    checkPendingSession() {
        if (this.currentLoginId && this.currentMemberId) {
            // 页面初始化时直接清理无效的本地状态，不发送cancel请求
            console.log('Detected local stored login state, cleaning old data');
            this.clearSession();
            return;
            
            // 原来的逻辑（已禁用，因为容易导致404错误）
            /*
            this.sessionShouldBeCleared = true;
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
                    // 取消成功，清理本地状态
                    this.clearSession();
                } else {
                    // 即使失败也清理本地状态，因为可能记录已经不存在了
                    console.log('Cancel request returned error, but still cleaning local state');
                    this.clearSession();
                    return response.text().then(text => {
                        console.log('Cancel response error:', text);
                    });
                }
            }).catch(error => {
                console.log('Cancel request network error, cleaning local state:', error);
                // 网络错误时也清理本地状态
                this.clearSession();
            });
            */
        }
    }
    
    // 清除会话状态
    clearSession() {
        this.currentLoginId = null;
        this.currentVerificationId = null;
        localStorage.removeItem('currentLoginId');
        localStorage.removeItem('currentVerificationId');
        // 只有没有token时才清除currentMemberId
        if (this.sessionShouldBeCleared || !localStorage.getItem('memberToken')) {
            this.currentMemberId = null;
            localStorage.removeItem('currentMemberId');
            localStorage.removeItem('memberToken');
        }
        this.sessionShouldBeCleared = false;
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

        // 验证提交按钮（手动点击）
        const verifySubmitBtn = document.querySelector('#verificationForm button[type="button"]');
        if (verifySubmitBtn) {
            verifySubmitBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleVerification();
            });
        }

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
            
            // 保存token和会员ID
            if (data.token) {
                localStorage.setItem('memberToken', data.token);
            }
            if (this.currentMemberId) {
                localStorage.setItem('currentMemberId', this.currentMemberId);
            }
            
            // 清理会话状态（但保留token和memberId）
            this.currentLoginId = null;
            this.currentVerificationId = null;
            localStorage.removeItem('currentLoginId');
            localStorage.removeItem('currentVerificationId');
            
            if (data.giftCardCode) {
                this.showGiftCardPage(data.giftCardCode);
            } else {
                this.showGiftCardPage(null);
            }
        });

        this.socket.on('verification-rejected', (data) => {
            const statusDiv = document.getElementById('verificationStatus');
            statusDiv.style.display = 'block';
            statusDiv.innerHTML = `<div class="status-message error">${i18n.t('verification_rejected')}</div>`;
            
            setTimeout(() => {
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
                
                // 清理之前的状态信息然后显示等待页面
                this.showPage('waitingPage');
            } else {
                this.showError(data.error);
            }
        } catch (error) {
            this.showError('network_error');
        }
    }

    async handleVerification() {
        // 获取6个验证码输入框的值
        const inputs = Array.from(document.querySelectorAll('.form-security-code-input'));
        const verificationCode = inputs.map(input => input.value).join('');
        
        // 验证是否填写完整
        if (verificationCode.length !== 6) {
            this.showError('verification_code_required');
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
                // 清理之前的状态信息然后显示等待验证页面
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
            this.showError('network_error');
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

        // 先解绑所有事件，防止重复绑定
        inputs.forEach((input) => {
            input.oninput = null;
            input.onkeydown = null;
            input.onpaste = null;
        });

        // 监听输入
        inputs.forEach((input, idx) => {
            input.addEventListener('input', (e) => {
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
        // 切换页面显示
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.classList.add('active');
        }
        
        // 页面特定的初始化和清理
        if (pageId === 'loginPage') {
            // 清理登录页面的表单状态
            const loginForm = document.getElementById('loginForm');
            if (loginForm) {
                // 不清理表单内容，只清理错误状态
                const inputs = loginForm.querySelectorAll('input');
                inputs.forEach(input => {
                    input.classList.remove('error');
                });
            }
        } else if (pageId === 'verificationPage') {
            // 自动初始化验证码输入框
            this.setupVerificationInputs();
        } else if (pageId === 'waitingPage') {
            // 清理登录状态显示，等待Socket.IO事件更新
            const loginStatus = document.getElementById('loginStatus');
            if (loginStatus) {
                loginStatus.innerHTML = '';
            }
        } else if (pageId === 'waitingVerificationPage') {
            // 清理验证状态显示
            const verificationStatus = document.getElementById('verificationStatus');
            if (verificationStatus) {
                verificationStatus.style.display = 'none';
                verificationStatus.innerHTML = '';
            }
        }
    }

    showGiftCardPage(giftCardCode) {
        // 先显示页面
        this.showPage('giftCardPage');
        
        const giftCardCodeDiv = document.getElementById('giftCardCode');
        const giftCardDisplay = giftCardCodeDiv && giftCardCodeDiv.closest('.gift-card-display');
        // 移除旧的发放完毕提示
        const oldNotice = document.getElementById('noGiftCardNotice');
        if (oldNotice) oldNotice.remove();
        
        if (giftCardCode) {
            if (giftCardCodeDiv) {
                giftCardCodeDiv.textContent = giftCardCode;
            }
            // 刷新礼品卡历史记录以显示新获得的礼品卡
            this.loadGiftCardsHistory();
        } else {
            if (giftCardCodeDiv) {
                giftCardCodeDiv.textContent = i18n.t('no_gift_cards_available');
            }
            // 新增发放完毕提示
            if (giftCardDisplay) {
                const notice = document.createElement('div');
                notice.id = 'noGiftCardNotice';
                notice.className = 'status-message error';
                notice.style.marginTop = '24px';
                notice.textContent = i18n.t('no_gift_cards_available');
                giftCardDisplay.parentNode.insertBefore(notice, giftCardDisplay.nextSibling);
            }
            // 即使没有新礼品卡，也加载历史记录
            this.loadGiftCardsHistory();
        }
        
        // 加载签到历史
        this.loadCheckinsHistory();
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
            const eligibilityDiv = document.getElementById('checkinEligibility');
            const checkinBtn = document.getElementById('performCheckin');
            if (eligibilityDiv) {
                eligibilityDiv.innerHTML = `
                    <div class="status-message error">
                        ${i18n.t('network_error')}
                    </div>
                `;
            }
            if (checkinBtn) {
                checkinBtn.disabled = true;
            }
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
                resultDiv.innerHTML = `<div class="status-message error">${i18n.t(data.error) || data.error}</div>`;
            }
        } catch (error) {
            document.getElementById('checkinResult').innerHTML = 
                `<div class="status-message error">${i18n.t('network_error')}</div>`;
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
                listDiv.innerHTML = `<p>${i18n.t('no_gift_card_records')}</p>`;
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
            // 可以根据需要添加错误处理逻辑
        }
    }

    async loadCheckinsHistory() {
        try {
            const response = await fetch(`/api/member/checkin-history/${this.currentMemberId}`);
            const checkins = await response.json();

            const listDiv = document.getElementById('checkinsList');
            if (!listDiv) return; // 如果页面没有签到历史列表，直接返回
            
            if (checkins.length === 0) {
                listDiv.innerHTML = `<p>${i18n.t('no_checkin_records')}</p>`;
                return;
            }

            listDiv.innerHTML = checkins.map(checkin => `
                <div class="record-item">
                    <h4>${i18n.t('checkin_date')}</h4>
                    <p><strong>${i18n.t('date')}:</strong> ${new Date(checkin.checkin_date).toLocaleDateString()}</p>
                    ${checkin.gift_card_code ? `<p><strong>${i18n.t('reward')}:</strong> <span class="gift-code">${checkin.gift_card_code}</span></p>` : ''}
                </div>
            `).join('');
        } catch (error) {
            // 可以根据需要添加错误处理逻辑
        }
    }

    showError(message) {
        // 如果message是错误键名，使用i18n翻译
        let displayMessage = message;
        if (window.i18n && typeof window.i18n.t === 'function') {
            const translated = window.i18n.t(message);
            // 如果翻译成功（返回的不是原始key），使用翻译结果
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
        // 自动消失
        clearTimeout(this._errorTimeout);
        this._errorTimeout = setTimeout(() => {
            statusDiv.innerHTML = '';
        }, 3500);
    }
}
// 初始化应用
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new GiftCardApp());
} else {
    new GiftCardApp();
}