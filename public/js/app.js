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
        this.memberEmail = localStorage.getItem('memberEmail');
        
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
                    
                    
                    // 显示会员信息
                    this.showMemberInfo();
                    
                    // 先加载礼品卡历史记录，然后显示页面
                    await this.loadGiftCardsHistory();
                    await this.loadCheckinsHistory();
                    
                    // 显示礼品卡页面，但需要显示最新的礼品卡（如果有的话）
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

    // 显示会员信息
    showMemberInfo() {
        const memberInfo = document.getElementById('memberInfo');
        const languageSelector = document.getElementById('languageSelector');
        const memberAccount = document.getElementById('memberAccount');
        const logoutLink = document.getElementById('logoutLink');
        
        if (memberInfo && this.memberEmail) {
            memberAccount.textContent = this.memberEmail;
            memberInfo.style.display = 'flex';
            // 确保语言选择器隐藏
            if (languageSelector) {
                languageSelector.style.display = 'none';
            }
            // 确保退出链接显示
            if (logoutLink) {
                logoutLink.style.display = 'inline';
            }
        }
    }

    // 隐藏会员信息
    hideMemberInfo() {
        const memberInfo = document.getElementById('memberInfo');
        const languageSelector = document.getElementById('languageSelector');
        
        if (memberInfo) {
            memberInfo.style.display = 'none';
        }
        // 语言选择器默认保持隐藏
        if (languageSelector) {
            languageSelector.style.display = 'none';
        }
    }

    // 退出登录
    logout() {
        // 清除所有本地存储
        localStorage.removeItem('memberToken');
        localStorage.removeItem('currentMemberId'); 
        localStorage.removeItem('memberEmail');
        localStorage.removeItem('currentLoginId');
        localStorage.removeItem('currentVerificationId');
        
        // 重置实例变量
        this.currentMemberId = null;
        this.currentLoginId = null;
        this.currentVerificationId = null;
        this.memberEmail = null;
        
        // 隐藏会员信息
        this.hideMemberInfo();
        
        // 跳转到欢迎页面
        this.showPage('welcomePage');
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
                statusDiv.innerHTML = `<div class="status-message success"><span data-i18n="login_approved"></span></div>`;
                // 重新翻译新添加的内容
                if (i18n) i18n.translatePage();
                setTimeout(() => {
                    this.showPage('verificationPage');
                }, 2000);
            } else {
                statusDiv.innerHTML = `<div class="status-message error"><span data-i18n="login_rejected"></span></div>`;
                // 重新翻译新添加的内容
                if (i18n) i18n.translatePage();
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
            
            // 更新页面追踪用户类型（登录成功）
            if (window.pageTracker && this.currentMemberId) {
                window.pageTracker.setUserInfo('member', this.currentMemberId);
            }
            
            // 显示会员信息
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
            // 重新翻译新添加的内容
            if (i18n) i18n.translatePage();
            
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
                this.memberEmail = email; // 保存用户邮箱
                
                // 保存到本地存储，以便在页面刷新时能够发送取消请求
                localStorage.setItem('currentLoginId', this.currentLoginId);
                localStorage.setItem('currentMemberId', this.currentMemberId);
                localStorage.setItem('memberEmail', this.memberEmail);
                
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
        // 开始追踪新页面
        if (window.pageTracker) {
            window.pageTracker.startPageTracking(pageId);
        }
        
        // 切换页面显示
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.classList.add('active');
        }
        
        // 重新翻译页面内容
        if (i18n) {
            i18n.translatePage();
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

    // 标签页切换方法
    switchTab(tabName) {
        // 更新标签按钮状态
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeTabBtn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
        if (activeTabBtn) {
            activeTabBtn.classList.add('active');
        }

        // 更新标签内容显示
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        const activeTabContent = document.getElementById(`${tabName}Tab`);
        if (activeTabContent) {
            activeTabContent.classList.add('active');
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
                giftCardCodeDiv.innerHTML = '<span data-i18n="no_gift_cards_available"></span>';
                // 重新翻译新添加的内容
                if (i18n) i18n.translatePage();
            }
            // 新增发放完毕提示
            if (giftCardDisplay) {
                const notice = document.createElement('div');
                notice.id = 'noGiftCardNotice';
                notice.className = 'status-message error';
                notice.style.marginTop = '24px';
                notice.innerHTML = '<span data-i18n="no_gift_cards_available"></span>';
                // 重新翻译新添加的内容
                if (i18n) i18n.translatePage();
                giftCardDisplay.parentNode.insertBefore(notice, giftCardDisplay.nextSibling);
            }
            // 即使没有新礼品卡，也加载历史记录
            this.loadGiftCardsHistory();
        }
        
        // 加载签到历史
        this.loadCheckinsHistory();
    }

    // 显示礼品卡页面并显示最新的礼品卡
    async showGiftCardPageWithLatest() {
        // 先显示页面
        this.showPage('giftCardPage');
        
        try {
            // 获取礼品卡历史来获取最新的礼品卡
            const response = await fetch(`/api/member/gift-cards/${this.currentMemberId}`);
            const giftCards = await response.json();
            
            const giftCardCodeDiv = document.getElementById('giftCardCode');
            const giftCardDisplay = giftCardCodeDiv && giftCardCodeDiv.closest('.gift-card-display');
            // 移除旧的发放完毕提示
            const oldNotice = document.getElementById('noGiftCardNotice');
            if (oldNotice) oldNotice.remove();
            
            if (giftCards && giftCards.length > 0) {
                // 显示最新的礼品卡
                const latestCard = giftCards[0]; // 假设数组是按时间倒序排列的
                if (giftCardCodeDiv) {
                    giftCardCodeDiv.textContent = latestCard.code;
                }
            } else {
                if (giftCardCodeDiv) {
                    giftCardCodeDiv.innerHTML = '<span data-i18n="no_gift_cards_available"></span>';
                }
                // 重新翻译
                if (i18n) i18n.translatePage();
            }
        } catch (error) {
            console.error('Failed to load gift cards:', error);
            const giftCardCodeDiv = document.getElementById('giftCardCode');
            if (giftCardCodeDiv) {
                giftCardCodeDiv.innerHTML = '<span data-i18n="no_gift_cards_available"></span>';
            }
            if (i18n) i18n.translatePage();
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
                eligibilityDiv.innerHTML = `
                    <div class="status-message success">
                        <span data-i18n="eligible_for_checkin"></span>
                    </div>
                `;
                checkinBtn.disabled = false;
                // 重新翻译新添加的内容
                if (i18n) i18n.translatePage();
            } else {
                eligibilityDiv.innerHTML = `
                    <div class="status-message error">
                        <span data-i18n="not_eligible_for_checkin"></span>
                        <br><span data-i18n="${data.reason}">${data.reason}</span>
                    </div>
                `;
                checkinBtn.disabled = true;
                // 重新翻译新添加的内容
                if (i18n) i18n.translatePage();
            }
        } catch (error) {
            const eligibilityDiv = document.getElementById('checkinEligibility');
            const checkinBtn = document.getElementById('performCheckin');
            if (eligibilityDiv) {
                eligibilityDiv.innerHTML = `
                    <div class="status-message error">
                        <span data-i18n="network_error"></span>
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
                let messageHtml = `<span data-i18n="checkin_successful"></span>`;
                if (data.giftCardCode) {
                    messageHtml += `<br><strong>${data.giftCardCode}</strong>`;
                }
                resultDiv.innerHTML = `<div class="status-message success">${messageHtml}</div>`;
                // 重新翻译新添加的内容
                if (i18n) i18n.translatePage();
                
                // 重新检查签到资格
                setTimeout(() => {
                    this.checkCheckinEligibility();
                }, 2000);
            } else {
                resultDiv.innerHTML = `<div class="status-message error"><span data-i18n="${data.error}">${data.error}</span></div>`;
            }
        } catch (error) {
            document.getElementById('checkinResult').innerHTML = 
                `<div class="status-message error"><span data-i18n="network_error"></span></div>`;
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
                listDiv.innerHTML = `<p><span data-i18n="no_gift_card_records"></span></p>`;
                // 重新翻译新添加的内容
                if (i18n) i18n.translatePage();
                return;
            }

            listDiv.innerHTML = giftCards.map(card => `
                <div class="record-item">
                    <div class="gift-code-display">${card.code}</div>
                    <p class="gift-card-date">${new Date(card.distributed_at).toLocaleDateString()}</p>
                </div>
            `).join('');
            // 重新翻译新添加的内容
            if (i18n) i18n.translatePage();
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
                listDiv.innerHTML = `<p><span data-i18n="no_checkin_records"></span></p>`;
                // 重新翻译新添加的内容
                if (i18n) i18n.translatePage();
                return;
            }

            listDiv.innerHTML = checkins.map(checkin => `
                <div class="record-item checkin-record">
                    <span class="checkin-date">${new Date(checkin.checkin_date).toLocaleDateString()}</span>
                    ${checkin.gift_card_code ? `<span class="checkin-reward"><span data-i18n="reward"></span>: <span class="gift-code">${checkin.gift_card_code}</span></span>` : `<span class="checkin-no-reward"><span data-i18n="no_reward"></span></span>`}
                </div>
            `).join('');
            // 重新翻译新添加的内容
            if (i18n) i18n.translatePage();
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
// 初始化应用 - 等待i18n就绪
function initApp() {
    if (window.i18n) {
        new GiftCardApp();
    } else {
        // 如果i18n还没准备好，延迟100ms后重试
        setTimeout(initApp, 100);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}