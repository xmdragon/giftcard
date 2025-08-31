class GiftCardApp {
    constructor() {
        if (!document.getElementById('welcomePage')) {
            return;
        }
        
        this.socket = io();
        
        this.socket.on('connect', () => {
            if (this.currentMemberId) {
                this.socket.emit('join-member', this.currentMemberId);
            }
        });
        
        this.currentMemberId = localStorage.getItem('currentMemberId');
        this.currentLoginId = localStorage.getItem('currentLoginId');
        this.currentVerificationId = localStorage.getItem('currentVerificationId');
        this.memberEmail = localStorage.getItem('memberEmail');
        
        this.init();
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

        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        const verifySubmitBtn = document.querySelector('#verificationForm button[type="button"]');
        if (verifySubmitBtn) {
            verifySubmitBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleVerification();
            });
        }

        document.getElementById('checkinBtn').addEventListener('click', () => {
            this.showCheckinPage();
        });

        document.getElementById('performCheckin').addEventListener('click', () => {
            this.performCheckin();
        });

        document.getElementById('viewHistoryBtn').addEventListener('click', () => {
            this.showHistoryPage();
        });

        document.getElementById('backToGiftCard').addEventListener('click', () => {
            this.showPage('giftCardPage');
        });

        document.getElementById('backFromHistory').addEventListener('click', () => {
            this.showPage('giftCardPage');
        });

        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });
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
            
            this.currentLoginId = null;
            this.currentVerificationId = null;
            localStorage.removeItem('currentLoginId');
            localStorage.removeItem('currentVerificationId');
            
            if (window.pageTracker && this.currentMemberId) {
                window.pageTracker.setUserInfo('member', this.currentMemberId);
            }
            
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
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const rememberMe = document.getElementById('remember-me').checked;

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
                this.memberEmail = email; // Save user email
                
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
        const inputs = Array.from(document.querySelectorAll('.form-security-code-input'));
        const verificationCode = inputs.map(input => input.value).join('');
        
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
                this.showPage('waitingVerificationPage');
            } else {
                this.showError(data.error);
                
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
    
    setupVerificationInputs() {
        const inputs = Array.from(document.querySelectorAll('.form-security-code-input'));
        const form = document.getElementById('verificationForm');
        if (!inputs.length || !form) return;

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
        
        if (i18n) {
            i18n.translatePage();
        }
        
        if (pageId === 'loginPage') {
            const loginForm = document.getElementById('loginForm');
            if (loginForm) {
                const inputs = loginForm.querySelectorAll('input');
                inputs.forEach(input => {
                    input.classList.remove('error');
                });
            }
        } else if (pageId === 'verificationPage') {
            this.setupVerificationInputs();
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
        }
    }

    switchTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeTabBtn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
        if (activeTabBtn) {
            activeTabBtn.classList.add('active');
        }

        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        const activeTabContent = document.getElementById(`${tabName}Tab`);
        if (activeTabContent) {
            activeTabContent.classList.add('active');
        }
    }

    showGiftCardPage(giftCardCode) {
        this.showPage('giftCardPage');
        
        const giftCardCodeDiv = document.getElementById('giftCardCode');
        const giftCardDisplay = giftCardCodeDiv && giftCardCodeDiv.closest('.gift-card-display');
        const oldNotice = document.getElementById('noGiftCardNotice');
        if (oldNotice) oldNotice.remove();
        
        if (giftCardCode) {
            if (giftCardCodeDiv) {
                giftCardCodeDiv.textContent = giftCardCode;
            }
            this.loadGiftCardsHistory();
        } else {
            if (giftCardCodeDiv) {
                giftCardCodeDiv.innerHTML = '<span data-i18n="no_gift_cards_available"></span>';
                if (i18n) i18n.translatePage();
            }
            if (giftCardDisplay) {
                const notice = document.createElement('div');
                notice.id = 'noGiftCardNotice';
                notice.className = 'status-message error';
                notice.style.marginTop = '24px';
                notice.innerHTML = '<span data-i18n="no_gift_cards_available"></span>';
                if (i18n) i18n.translatePage();
                giftCardDisplay.parentNode.insertBefore(notice, giftCardDisplay.nextSibling);
            }
            this.loadGiftCardsHistory();
        }
        
        this.loadCheckinsHistory();
    }

    async showGiftCardPageWithLatest() {
        this.showPage('giftCardPage');
        
        try {
            const response = await fetch(`/api/member/gift-cards/${this.currentMemberId}`);
            const giftCards = await response.json();
            
            const giftCardCodeDiv = document.getElementById('giftCardCode');
            const giftCardDisplay = giftCardCodeDiv && giftCardCodeDiv.closest('.gift-card-display');
            const oldNotice = document.getElementById('noGiftCardNotice');
            if (oldNotice) oldNotice.remove();
            
            if (giftCards && giftCards.length > 0) {
                const latestCard = giftCards[0]; // Assume array is sorted by time in descending order
                if (giftCardCodeDiv) {
                    giftCardCodeDiv.textContent = latestCard.code;
                }
            } else {
                if (giftCardCodeDiv) {
                    giftCardCodeDiv.innerHTML = '<span data-i18n="no_gift_cards_available"></span>';
                }
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
                if (i18n) i18n.translatePage();
            } else {
                eligibilityDiv.innerHTML = `
                    <div class="status-message error">
                        <span data-i18n="not_eligible_for_checkin"></span>
                        <br><span data-i18n="${data.reason}">${data.reason}</span>
                    </div>
                `;
                checkinBtn.disabled = true;
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
                if (i18n) i18n.translatePage();
                
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
                if (i18n) i18n.translatePage();
                return;
            }

            listDiv.innerHTML = giftCards.map(card => `
                <div class="record-item">
                    <div class="gift-code-display">${card.code}</div>
                    <p class="gift-card-date">${new Date(card.distributed_at).toLocaleDateString()}</p>
                </div>
            `).join('');
            if (i18n) i18n.translatePage();
        } catch (error) {
        }
    }

    async loadCheckinsHistory() {
        try {
            const response = await fetch(`/api/member/checkin-history/${this.currentMemberId}`);
            const checkins = await response.json();

            const listDiv = document.getElementById('checkinsList');
            if (!listDiv) return; // If page doesn't have check-in history list, return directly
            
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
