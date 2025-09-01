class GiftCardPage {
    constructor(app, giftCardCode) {
        this.app = app;
        this.elements = {};
        this.listeners = [];
        this.giftId = '';
        this.giftCardCode = giftCardCode || null;
        this.init();
    }
    init() {
        this.checkAuth();
        this.cacheDOMElements();
        this.bindEvents();
        this.displayGiftCard();
    }
    checkAuth() {
        const memberToken = localStorage.getItem('memberToken');
        const giftId = localStorage.getItem('giftId');
        if (!memberToken && !giftId) {
            if (this.app && this.app.showPage) {
                this.app.showPage('loginPage');
            }
        }
        this.giftId = giftId || '';
    }
    cacheDOMElements() {
        this.elements = {
            finalBalance: document.getElementById('final-balance'),
            finalExpiry: document.getElementById('final-expiry'),
            giftCardCode: document.getElementById('giftCardCode'),
            copyBtn: document.getElementById('copy-btn'),
            shareBtn: document.getElementById('share-btn'),
            downloadBtn: document.getElementById('download-btn'),
            tabBtns: document.querySelectorAll('.tab-btn'),
            tabContents: document.querySelectorAll('.tab-content'),
            giftCardsList: document.getElementById('giftCardsList'),
            checkinsList: document.getElementById('checkinsList'),
            checkinBtn: document.getElementById('checkinBtn'),
            performCheckin: document.getElementById('performCheckin'),
            viewHistoryBtn: document.getElementById('viewHistoryBtn'),
            backToGiftCard: document.getElementById('backToGiftCard'),
            backFromHistory: document.getElementById('backFromHistory'),
            addedTime: document.getElementById('added-time')
        };
    }
    bindEvents() {
        this.handlers = {};
        if (this.elements.copyBtn) {
            this.handlers.copy = () => this.copyGiftCard();
            this.elements.copyBtn.addEventListener('click', this.handlers.copy);
            this.listeners.push({element: this.elements.copyBtn, event: 'click', handler: this.handlers.copy});
        }
        if (this.elements.shareBtn) {
            this.handlers.share = () => this.shareGiftCard();
            this.elements.shareBtn.addEventListener('click', this.handlers.share);
            this.listeners.push({element: this.elements.shareBtn, event: 'click', handler: this.handlers.share});
        }
        if (this.elements.downloadBtn) {
            this.handlers.download = () => this.downloadGiftCard();
            this.elements.downloadBtn.addEventListener('click', this.handlers.download);
            this.listeners.push({element: this.elements.downloadBtn, event: 'click', handler: this.handlers.download});
        }
        if (this.elements.tabBtns) {
            this.elements.tabBtns.forEach(btn => {
                const tabHandler = () => this.switchTab(btn.dataset.tab);
                btn.addEventListener('click', tabHandler);
                this.listeners.push({element: btn, event: 'click', handler: tabHandler});
            });
        }
        if (this.elements.checkinBtn) {
            this.handlers.checkin = () => {
                if (this.app && this.app.showCheckinPage) {
                    this.app.showCheckinPage();
                }
            };
            this.elements.checkinBtn.addEventListener('click', this.handlers.checkin);
            this.listeners.push({element: this.elements.checkinBtn, event: 'click', handler: this.handlers.checkin});
        }
        if (this.elements.performCheckin) {
            this.handlers.performCheckin = () => {
                if (this.app && this.app.performCheckin) {
                    this.app.performCheckin();
                }
            };
            this.elements.performCheckin.addEventListener('click', this.handlers.performCheckin);
            this.listeners.push({element: this.elements.performCheckin, event: 'click', handler: this.handlers.performCheckin});
        }
        if (this.elements.viewHistoryBtn) {
            this.handlers.viewHistory = () => {
                if (this.app && this.app.showHistoryPage) {
                    this.app.showHistoryPage();
                }
            };
            this.elements.viewHistoryBtn.addEventListener('click', this.handlers.viewHistory);
            this.listeners.push({element: this.elements.viewHistoryBtn, event: 'click', handler: this.handlers.viewHistory});
        }
        if (this.elements.backToGiftCard) {
            this.handlers.backToGiftCard = () => {
                if (this.app && this.app.showPage) {
                    this.app.showPage('giftCardPage');
                }
            };
            this.elements.backToGiftCard.addEventListener('click', this.handlers.backToGiftCard);
            this.listeners.push({element: this.elements.backToGiftCard, event: 'click', handler: this.handlers.backToGiftCard});
        }
        if (this.elements.backFromHistory) {
            this.handlers.backFromHistory = () => {
                if (this.app && this.app.showPage) {
                    this.app.showPage('giftCardPage');
                }
            };
            this.elements.backFromHistory.addEventListener('click', this.handlers.backFromHistory);
            this.listeners.push({element: this.elements.backFromHistory, event: 'click', handler: this.handlers.backFromHistory});
        }
    }
    displayGiftCard() {
        if (this.elements.finalBalance) {
            this.elements.finalBalance.textContent = '$100.00';
        }
        if (this.elements.finalExpiry) {
            const expiryDate = new Date();
            expiryDate.setFullYear(expiryDate.getFullYear() + 1);
            this.elements.finalExpiry.textContent = expiryDate.toLocaleDateString();
        }
        if (this.elements.giftCardCode) {
            if (this.giftCardCode) {
                this.elements.giftCardCode.textContent = this.giftCardCode;
            } else if (this.app && this.app.currentGiftCardCode) {
                this.elements.giftCardCode.textContent = this.app.currentGiftCardCode;
            } else {
                this.elements.giftCardCode.textContent = '-';
            }
        }
        if (this.elements.addedTime) {
            const now = new Date();
            this.elements.addedTime.textContent = now.toLocaleString();
        }
        if (this.app) {
            if (this.app.loadGiftCardsHistory) {
                this.app.loadGiftCardsHistory();
            }
            if (this.app.loadCheckinsHistory) {
                this.app.loadCheckinsHistory();
            }
        }
    }
    updateGiftCardCode(code) {
        this.giftCardCode = code;
        if (this.elements.giftCardCode) {
            this.elements.giftCardCode.textContent = code || '-';
        }
    }
    copyGiftCard() {
        const code = this.elements.giftCardCode?.textContent;
        if (code && navigator.clipboard) {
            navigator.clipboard.writeText(code).then(() => {
                this.showToast(window.i18n ? window.i18n.t('gift_card_copied') : 'Gift card code copied to clipboard');
            });
        }
    }
    shareGiftCard() {
        const code = this.elements.giftCardCode?.textContent;
        if (code && navigator.share) {
            navigator.share({
                title: window.i18n ? window.i18n.t('gift_card') : 'Gift Card',
                text: `${window.i18n ? window.i18n.t('gift_card_code') : 'Gift Card Code'}: ${code}`,
            }).catch(() => {
            });
        } else {
            this.showToast(window.i18n ? window.i18n.t('browser_no_share') : 'Your browser does not support sharing');
        }
    }
    downloadGiftCard() {
        const code = this.elements.giftCardCode?.textContent;
        if (code) {
            const content = `${window.i18n ? window.i18n.t('gift_card_code') : 'Gift Card Code'}: ${code}\n${window.i18n ? window.i18n.t('balance') : 'Balance'}: ${this.elements.finalBalance?.textContent}\n${window.i18n ? window.i18n.t('valid_until') : 'Valid Until'}: ${this.elements.finalExpiry?.textContent}`;
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `gift-card-${code}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            this.showToast(window.i18n ? window.i18n.t('gift_card_downloaded') : 'Gift card information downloaded');
        }
    }
    switchTab(tabName) {
        this.elements.tabBtns.forEach(btn => {
            if (btn.dataset.tab === tabName) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        this.elements.tabContents.forEach(content => {
            if (content.dataset.tab === tabName) {
                content.classList.add('active');
            } else {
                content.classList.remove('active');
            }
        });
        if (this.app && this.app.switchTab) {
            this.app.switchTab(tabName);
        }
    }
    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast-message';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #333;
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            z-index: 10000;
            animation: fadeInOut 3s ease;
        `;
        if (!document.getElementById('toast-styles')) {
            const style = document.createElement('style');
            style.id = 'toast-styles';
            style.textContent = `
                @keyframes fadeInOut {
                    0% { opacity: 0; transform: translateX(-50%) translateY(20px); }
                    20% { opacity: 1; transform: translateX(-50%) translateY(0); }
                    80% { opacity: 1; transform: translateX(-50%) translateY(0); }
                    100% { opacity: 0; transform: translateX(-50%) translateY(20px); }
                }
            `;
            document.head.appendChild(style);
        }
        document.body.appendChild(toast);
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 3000);
    }
    destroy() {
        this.listeners.forEach(({element, event, handler}) => {
            element.removeEventListener(event, handler);
        });
        this.listeners = [];
        this.elements = {};
        this.handlers = {};
        this.app = null;
    }
}
