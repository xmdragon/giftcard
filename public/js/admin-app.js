/**
 * Admin Application Core
 * 管理员应用程序核心，整合所有功能模块
 */

Object.assign(AdminApp.prototype, {
    init() {
        this.isLoggingOut = false;
        this.socket = null;
        this.token = localStorage.getItem('adminToken');
        this.currentAdmin = localStorage.getItem('adminInfo') ? JSON.parse(localStorage.getItem('adminInfo')) : null;

        // Map to store email-password pairs for validation
        this.emailPasswordMap = new Map();

        this.auth = new AdminAuth(this);
        this.socketManager = new AdminSocket(this);
        this.approvals = new AdminApprovals(this);

        // Audio notification will be initialized after user interaction
        // this.audioNotification.init();

        const token = localStorage.getItem('adminToken');
        if (token) {
            this.token = token;
            
            const adminInfo = localStorage.getItem('adminInfo');
            if (adminInfo) {
                try {
                    this.currentAdmin = JSON.parse(adminInfo);
                } catch (e) {
                    console.error('[init] 解析管理员信息错误:', e);
                }
            }
            
            this.validateTokenAndInit();
        } else {
            this.auth.showLoginPage();
        }
        
        this.bindEvents();
        
        this.auth.updateNavByPermission();

        this.renderNavMenu();
        
        this.initAllModules();

    },

    bindEvents() {
        
        // Admin login - with security check
        const loginForm = document.getElementById('adminLoginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.auth.handleAdminLogin();
            });
        } else {
            console.error('Login form element not found');
        }

        // Logout - with security check
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.auth.logout();
            });
        }

        // Change password button
        const changePasswordBtn = document.getElementById('changePasswordBtn');
        if (changePasswordBtn) {
            changePasswordBtn.addEventListener('click', () => {
                this.auth.showChangePasswordModal();
            });
        }

        // Modal close
        const closeBtn = document.querySelector('.close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.closeModal();
            });
        }

        window.addEventListener('click', (e) => {
            const modal = document.getElementById('modal');
            if (modal && e.target === modal) {
                this.closeModal();
            }
        });
        
        // Initialize audio on user interaction
        document.addEventListener('click', () => {
            if (this.audioNotification && !this.audioNotification.audio) {
                this.audioNotification.init();
            }
        }, { once: true });
        
        this.bindDynamicEvents();
    },
    
    initAllModules() {
        
        this.initModuleEvents();
        
        const currentSection = this.getCurrentActiveSection();
        if (currentSection) {
            this.initSectionModule(currentSection);
        }
    },
    
    initModuleEvents() {
        
        if (typeof this.initMembersEvents === 'function') {
            this.initMembersEvents();
        }
        
        if (typeof this.initApprovalsEvents === 'function') {
            this.initApprovalsEvents();
        }
        
        this.initGiftCardsEvents();
        
        if (typeof this.initCategoriesEvents === 'function') {
            this.initCategoriesEvents();
        }
        
        if (typeof this.initIPEvents === 'function') {
            this.initIPEvents();
        }
    },
    
    initGiftCardsEvents() {
        
        const addGiftCardsBtn = document.getElementById('addGiftCardsBtn');
        if (addGiftCardsBtn) {
            addGiftCardsBtn.addEventListener('click', () => {
                this.showAddGiftCardsModal();
            });
        }
        
        const filterGiftCardsBtn = document.getElementById('filterGiftCards');
        if (filterGiftCardsBtn) {
            filterGiftCardsBtn.addEventListener('click', () => {
                this.loadGiftCards(1);
            });
        }
    },
    
    getCurrentActiveSection() {
        const activeSection = document.querySelector('.admin-section.active');
        if (activeSection) {
            const id = activeSection.id;
            return id.replace('Section', '');
        }
        return null;
    },
    
    initSectionModule(sectionName) {
        
        switch(sectionName) {
            case 'members':
                if (typeof this.loadMembers === 'function') {
                    this.loadMembers();
                }
                break;
            case 'pending':
                if (typeof this.loadPendingRequests === 'function') {
                    this.loadPendingRequests();
                }
                break;
            case 'giftcards':
                if (typeof this.loadGiftCards === 'function') {
                    this.loadGiftCards();
                    this.populateCategorySelect('categoryFilter');
                }
                break;
            case 'categories':
                if (typeof this.loadCategories === 'function') {
                    this.loadCategories();
                }
                break;
            case 'ipmanagement':
                if (typeof this.loadIpBlacklist === 'function') {
                    this.loadIpBlacklist();
                }
                if (typeof this.initIpManagementEvents === 'function') {
                    this.initIpManagementEvents();
                }
                break;
            case 'tracking':
                if (typeof this.initTrackingSection === 'function') {
                    this.initTrackingSection();
                }
                break;
            case 'systemsettings':
                if (typeof this.initSystemSettingsSection === 'function') {
                    this.initSystemSettingsSection();
                }
                break;
            case 'adminmanage':
                if (typeof this.loadAdmins === 'function') {
                    this.loadAdmins();
                }
                if (typeof this.initAdminManagementEvents === 'function') {
                    this.initAdminManagementEvents();
                }
                break;
        }
    },
    
    bindDynamicEvents() {
        
        const refreshDashboardBtn = document.getElementById('refreshDashboard');
        if (refreshDashboardBtn) {
            refreshDashboardBtn.addEventListener('click', () => {
                this.loadDashboardData();
            });
        }

        // Tab buttons
        const tabButtons = document.querySelectorAll('.tab-btn');
        tabButtons.forEach((btn, index) => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });
        
        const activeSection = document.querySelector('.admin-section.active');
        if (activeSection) {
            const sectionId = activeSection.id;
            
            if (sectionId === 'membersSection' && typeof this.initMembersSection === 'function') {
                this.initMembersSection();
            }
        }
    },

    async validateTokenAndInit() {
        try {
            const response = await fetch('/api/admin/dashboard-data', {
                headers: {
                    'Authorization': 'Bearer ' + this.token
                }
            });
            
            if (response.ok) {
                this.socket = this.socketManager.init();
                
                this.auth.showDashboard();

                this.loadInitialData();
            } else if (response.status === 401) {
                this.auth.logout();
            } else {
                console.warn('验证token时发生错误，但仍尝试初始化:', response.status);
                this.socket = this.socketManager.init();
                this.auth.showDashboard();
                this.loadInitialData();
            }
        } catch (error) {
            console.error('验证token时发生网络错误:', error);
            this.socket = this.socketManager.init();
            this.auth.showDashboard();
        }
    },

    async loadInitialData() {
        if (!this.currentAdmin) return;
        try {
            await this.approvals.loadLoginRequests();
            await this.approvals.loadVerificationRequests();
            
            this.updatePendingCount();
            
        } catch (error) {
            console.error('加载初始数据错误:', error);
        }
    },

    async apiRequest(url, options = {}) {
        if (this.isLoggingOut) return null;
        
        this.recordActivity();
        
        const method = (options.method || 'GET').toUpperCase();
        const defaultHeaders = (method === 'POST' || method === 'PUT')
            ? { 'Content-Type': 'application/json' }
            : {};
        
        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    ...defaultHeaders,
                    ...(options.headers || {}),
                    'Authorization': 'Bearer ' + this.token
                }
            });
            
            if (response.status === 401) {
                if (!this.isLoggingOut) {
                    this.isLoggingOut = true;
                    alert('登录已过期，请重新登录');
                    this.auth.logout();
                }
                return null;
            }
            
            const newToken = response.headers.get('X-New-Token');
            if (newToken) {
                this.token = newToken;
                localStorage.setItem('adminToken', newToken);
            }
            
            return response;
        } catch (error) {
            if (!this.isLoggingOut) {
                console.error('API请求错误:', error);
            }
            return null;
        }
    },

    recordActivity() {
        const now = Date.now();
        this.lastActivity = now;
        
        if (!this.lastTokenRefresh || now - this.lastTokenRefresh > 30 * 60 * 1000) {
            this.refreshToken();
        }
    },

    async refreshToken() {
        if (this.isLoggingOut || !this.token) return;
        
        try {
            const response = await fetch('/api/auth/admin/refresh-token', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + this.token,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.token = data.token;
                localStorage.setItem('adminToken', data.token);
                this.lastTokenRefresh = Date.now();
            }
        } catch (error) {
            console.error('TOKEN刷新失败:', error);
        }
    },

    // Audio notification management
    audioNotification: {
        audio: null,
        isPlaying: false,
        
        init() {
            this.audio = new Audio('/snd/notice.mp3');
            this.audio.loop = true;
            this.audio.volume = 1.0;
        },
        
        play() {
            if (!this.audio) {
                this.init();
            }
            
            if (!this.isPlaying) {
                this.audio.play().then(() => {
                    this.isPlaying = true;
                }).catch(error => {
                    if (error.name === 'NotAllowedError') {
                        const notification = document.createElement('div');
                        notification.style.cssText = `
                            position: fixed;
                            top: 20px;
                            right: 20px;
                            background: #ff6b6b;
                            color: white;
                            padding: 15px;
                            border-radius: 5px;
                            z-index: 10000;
                            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                        `;
                        notification.textContent = '有新的审核请求，请点击页面任意位置播放通知音频';
                        document.body.appendChild(notification);
                        
                        setTimeout(() => {
                            if (notification.parentNode) {
                                notification.parentNode.removeChild(notification);
                            }
                        }, 5000);
                    }
                });
            }
        },
        
        stop() {
            if (this.audio && this.isPlaying) {
                this.audio.pause();
                this.audio.currentTime = 0;
                this.isPlaying = false;
            }
        }
    },

    // Update pending counts
    updatePendingCount() {
        const loginCount = document.querySelectorAll('#loginRequestsList .request-item').length;
        const verificationCount = document.querySelectorAll('#verificationRequestsList .request-item').length;
        const totalCount = loginCount + verificationCount;

        const navPendingCount = document.getElementById('navPendingCount');
        if (navPendingCount) {
            navPendingCount.textContent = totalCount;
        }
        
        const pendingCount = document.getElementById('pendingCount');
        if (pendingCount) {
            pendingCount.textContent = totalCount;
        }
        
        const loginRequestsCount = document.getElementById('loginRequestsCount');
        if (loginRequestsCount) {
            loginRequestsCount.textContent = loginCount;
        }
        
        const verificationRequestsCount = document.getElementById('verificationRequestsCount');
        if (verificationRequestsCount) {
            verificationRequestsCount.textContent = verificationCount;
        }
        
        const dashboardLoginRequests = document.getElementById('dashboardLoginRequests');
        if (dashboardLoginRequests) {
            dashboardLoginRequests.textContent = loginCount;
        }
        
        const dashboardVerificationRequests = document.getElementById('dashboardVerificationRequests');
        if (dashboardVerificationRequests) {
            dashboardVerificationRequests.textContent = verificationCount;
        }
        
        // Audio notification logic
        if (loginCount > 0 || verificationCount > 0) {
            this.audioNotification.play();
        } else {
            this.audioNotification.stop();
        }
    },

    // Switch between admin sections
    switchSection(section) {
        if (!section) return;
        
        if (!this.auth.hasPermission(section)) {
            const firstPermittedSection = this.auth.getFirstPermittedSection();
            if (firstPermittedSection && firstPermittedSection !== section) {
                section = firstPermittedSection;
            } else {
                console.error('无权访问任何页面，请确认权限配置');
                this.auth.logout();
                return;
            }
        }

        // Update button state
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeButton = document.querySelector(`.nav-btn[data-section="${section}"]`);
        if (activeButton) {
            activeButton.classList.add('active');
        }

        // Update section visibility
        document.querySelectorAll('.admin-section').forEach(section => {
            section.classList.remove('active');
        });
        
        const activeSection = document.getElementById(`${section}Section`);
        if (activeSection) {
            activeSection.classList.add('active');
        } else {
            console.error(`未找到对应区域: ${section}Section`);
        }
        
        if (section === 'dashboard') {
            this.loadDashboardData();
            if (!document.querySelector('.tab-content.active')) {
                this.switchTab('loginRequests');
            }
        }
        
        setTimeout(() => {
            this.bindDynamicEvents();
            this.initSectionModule(section);
        }, 100);
    },

    switchTab(tab) {
        // Update tab button state
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const tabBtn = document.querySelector(`[data-tab="${tab}"]`);
        if (tabBtn) tabBtn.classList.add('active');

        // Update tab content display
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        const tabContent = document.getElementById(`${tab}Tab`);
        if (tabContent) tabContent.classList.add('active');
        
        // Update notification count after switching page
        this.updatePendingCount();
    },

    showModal(title, content) {
        const modalBody = document.getElementById('modalBody');
        const modal = document.getElementById('modal');
        
        if (modalBody) modalBody.innerHTML = `<h3>${title}</h3>${content}`;
        if (modal) modal.style.display = 'block';
    },

    closeModal() {
        const modal = document.getElementById('modal');
        if (modal) modal.style.display = 'none';
    },

    async loadDashboardData() {
        if (!this.currentAdmin) return;
        try {
            const response = await this.apiRequest('/api/admin/dashboard-data');
            if (response && response.ok) {
                const data = await response.json();
                this.updateDashboard(data);
            } else if (response === null) {
                return;
            }
        } catch (error) {
            console.error('加载仪表盘数据错误:', error);
        }
    },
    
    updateDashboard(data) {
        const loginRequestsEl = document.getElementById('dashboardLoginRequests');
        if (loginRequestsEl) {
            loginRequestsEl.textContent = data.loginRequests || 0;
        }
        
        const verificationRequestsEl = document.getElementById('dashboardVerificationRequests');
        if (verificationRequestsEl) {
            verificationRequestsEl.textContent = data.verificationRequests || 0;
        }
        
        const membersCountEl = document.getElementById('dashboardMembersCount');
        if (membersCountEl) {
            membersCountEl.textContent = data.membersCount || 0;
        }
        
        const bannedIpsEl = document.getElementById('dashboardBannedIps');
        if (bannedIpsEl) {
            bannedIpsEl.textContent = data.bannedIpsCount || 0;
        }
        
        const totalAvailableCardsEl = document.getElementById('dashboardTotalAvailableCards');
        if (totalAvailableCardsEl) {
            totalAvailableCardsEl.textContent = `(总计: ${data.totalAvailableCards || 0})`;
        }
        
        const giftCardStatsTable = document.getElementById('dashboardGiftCardStats');
        if (giftCardStatsTable) {
            const tbody = giftCardStatsTable.querySelector('tbody');
            if (tbody && data.giftCardStats && Array.isArray(data.giftCardStats)) {
                if (data.giftCardStats.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">暂无可用礼品卡</td></tr>';
                } else {
                    tbody.innerHTML = data.giftCardStats.map(stat => `
                        <tr>
                            <td>${stat.category_name}</td>
                            <td><strong>${stat.available_count}</strong></td>
                            <td>
                                <button class="edit-btn" onclick="adminApp.viewCategoryGiftCards(${stat.category_id}, '${stat.category_name}')">查看</button>
                            </td>
                        </tr>
                    `).join('');
                }
            }
        }
    },



    formatDateTime(timestamp) {
        const date = new Date(timestamp);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}`;
    }
});

// Create global instance and initialize
window.adminApp = new AdminApp();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.adminApp.init());
} else {
    window.adminApp.init();
}