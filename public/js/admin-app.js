/**
 * Admin Application Core
 * 管理员应用程序核心，整合所有功能模块
 */

// 扩展现有的AdminApp类
Object.assign(AdminApp.prototype, {
    // 初始化方法
    init() {
        this.isLoggingOut = false;
        this.socket = null;
        this.token = localStorage.getItem('adminToken');
        this.currentAdmin = localStorage.getItem('adminInfo') ? JSON.parse(localStorage.getItem('adminInfo')) : null;

        // Map to store email-password pairs for validation
        this.emailPasswordMap = new Map();

        // 初始化各个功能模块
        this.auth = new AdminAuth(this);
        this.socketManager = new AdminSocket(this);
        this.approvals = new AdminApprovals(this);

        // 检查本地存储的身份验证令牌
        const token = localStorage.getItem('adminToken');
        if (token) {
            this.token = token;
            
            // 尝试从本地存储获取管理员信息
            const adminInfo = localStorage.getItem('adminInfo');
            if (adminInfo) {
                try {
                    this.currentAdmin = JSON.parse(adminInfo);
                } catch (e) {
                    console.error('[init] 解析管理员信息错误:', e);
                }
            } else {
                console.log('[init] localStorage adminInfo 为空');
            }
            
            // 验证token有效性
            this.validateTokenAndInit();
        } else {
            this.auth.showLoginPage();
        }
        
        // 绑定事件处理程序
        this.bindEvents();
        
        // 初始化权限管理
        this.auth.updateNavByPermission();

        // 渲染导航栏
        this.renderNavMenu();
        
        // 初始化所有模块
        this.initAllModules();

    },

    bindEvents() {
        console.log('bindEvents called');
        
        // Admin login - with security check
        const loginForm = document.getElementById('adminLoginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                console.log('Login form submitted');
                this.auth.handleAdminLogin();
            });
        } else {
            console.error('Login form element not found');
        }

        // Logout - with security check
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                console.log('Logout button clicked');
                this.auth.logout();
            });
        } else {
            console.log('Logout button not found');
        }

        // Change password button
        const changePasswordBtn = document.getElementById('changePasswordBtn');
        if (changePasswordBtn) {
            changePasswordBtn.addEventListener('click', () => {
                console.log('Change password button clicked');
                this.auth.showChangePasswordModal();
            });
        } else {
            console.log('Change password button not found');
        }

        // Modal close
        const closeBtn = document.querySelector('.close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                console.log('Modal close button clicked');
                this.closeModal();
            });
        } else {
            console.log('Modal close button not found');
        }

        window.addEventListener('click', (e) => {
            const modal = document.getElementById('modal');
            if (modal && e.target === modal) {
                this.closeModal();
            }
        });
        
        // 延迟绑定动态生成的元素
        this.bindDynamicEvents();
    },
    
    // 初始化所有模块
    initAllModules() {
        console.log('initAllModules called');
        
        // 初始化各个功能模块的事件绑定
        this.initModuleEvents();
        
        // 根据当前页面初始化相应模块
        const currentSection = this.getCurrentActiveSection();
        if (currentSection) {
            this.initSectionModule(currentSection);
        }
    },
    
    initModuleEvents() {
        console.log('initModuleEvents called');
        
        // 初始化会员管理模块事件
        if (typeof this.initMembersEvents === 'function') {
            this.initMembersEvents();
        }
        
        // 初始化待审核模块事件
        if (typeof this.initApprovalsEvents === 'function') {
            this.initApprovalsEvents();
        }
        
        // 初始化礼品卡管理事件
        this.initGiftCardsEvents();
        
        // 初始化分类管理事件
        if (typeof this.initCategoriesEvents === 'function') {
            this.initCategoriesEvents();
        }
        
        // 初始化IP管理事件
        if (typeof this.initIPEvents === 'function') {
            this.initIPEvents();
        }
    },
    
    // 初始化礼品卡管理事件
    initGiftCardsEvents() {
        console.log('initGiftCardsEvents called');
        
        // 批量添加按钮
        const addGiftCardsBtn = document.getElementById('addGiftCardsBtn');
        if (addGiftCardsBtn) {
            addGiftCardsBtn.addEventListener('click', () => {
                console.log('Add gift cards button clicked');
                this.showAddGiftCardsModal();
            });
        }
        
        // 筛选按钮
        const filterGiftCardsBtn = document.getElementById('filterGiftCards');
        if (filterGiftCardsBtn) {
            filterGiftCardsBtn.addEventListener('click', () => {
                console.log('Filter gift cards button clicked');
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
        console.log('initSectionModule called for:', sectionName);
        
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
                    // 加载分类下拉框
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
        console.log('bindDynamicEvents called');
        
        // 仪表盘刷新按钮
        const refreshDashboardBtn = document.getElementById('refreshDashboard');
        if (refreshDashboardBtn) {
            refreshDashboardBtn.addEventListener('click', () => {
                console.log('Dashboard refresh button clicked');
                this.loadDashboardData();
            });
            console.log('Dashboard refresh button bound');
        } else {
            console.log('Dashboard refresh button not found');
        }

        // Tab buttons
        const tabButtons = document.querySelectorAll('.tab-btn');
        console.log('Found tab buttons:', tabButtons.length);
        tabButtons.forEach((btn, index) => {
            btn.addEventListener('click', (e) => {
                console.log('Tab button clicked:', e.target.dataset.tab);
                this.switchTab(e.target.dataset.tab);
            });
        });
        
        // 检查当前激活的区域，确保相关模块被初始化
        const activeSection = document.querySelector('.admin-section.active');
        if (activeSection) {
            const sectionId = activeSection.id;
            console.log('Active section:', sectionId);
            
            if (sectionId === 'membersSection' && typeof this.initMembersSection === 'function') {
                console.log('Force initializing members section');
                this.initMembersSection();
            }
        }
    },

    // 验证token有效性并初始化
    async validateTokenAndInit() {
        try {
            // 尝试发起一个简单的API请求来验证token
            const response = await fetch('/api/admin/dashboard-data', {
                headers: {
                    'Authorization': 'Bearer ' + this.token
                }
            });
            
            if (response.ok) {
                // Token有效，继续初始化
                // 初始化Socket.IO
                this.socket = this.socketManager.init();
                
                // 显示仪表盘
                this.auth.showDashboard();

                // 加载初始数据
                this.loadInitialData();
            } else if (response.status === 401) {
                // Token无效或过期，清除并显示登录页面
                console.log('Token已过期，清除本地存储');
                this.auth.logout();
            } else {
                // 其他错误，仍然尝试显示仪表盘
                console.warn('验证token时发生错误，但仍尝试初始化:', response.status);
                this.socket = this.socketManager.init();
                this.auth.showDashboard();
                this.loadInitialData();
            }
        } catch (error) {
            console.error('验证token时发生网络错误:', error);
            // 网络错误时仍尝试显示仪表盘，让用户手动重试
            this.socket = this.socketManager.init();
            this.auth.showDashboard();
        }
    },

    // 加载初始数据
    async loadInitialData() {
        if (!this.currentAdmin) return;
        try {
            // 加载待审核请求
            await this.approvals.loadLoginRequests();
            await this.approvals.loadVerificationRequests();
            
            // 更新待审核请求数量
            this.updatePendingCount();
            
        } catch (error) {
            console.error('加载初始数据错误:', error);
        }
    },

    async apiRequest(url, options = {}) {
        if (this.isLoggingOut) return null;
        // 默认加上 Content-Type: application/json
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
                    console.log('[apiRequest] 401后 currentAdmin:', this.currentAdmin);
                }
                return null;
            }
            return response;
        } catch (error) {
            if (!this.isLoggingOut) {
                console.error('API请求错误:', error);
            }
            return null;
        }
    },

    // Update pending counts
    updatePendingCount() {
        const loginCount = document.querySelectorAll('#loginRequestsList .request-item').length;
        const verificationCount = document.querySelectorAll('#verificationRequestsList .request-item').length;
        const totalCount = loginCount + verificationCount;

        // 更新导航栏中的数字
        const navPendingCount = document.getElementById('navPendingCount');
        if (navPendingCount) {
            navPendingCount.textContent = totalCount;
        }
        
        // 更新各个计数器
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
        
        // 同时更新仪表盘上的数字
        const dashboardLoginRequests = document.getElementById('dashboardLoginRequests');
        if (dashboardLoginRequests) {
            dashboardLoginRequests.textContent = loginCount;
        }
        
        const dashboardVerificationRequests = document.getElementById('dashboardVerificationRequests');
        if (dashboardVerificationRequests) {
            dashboardVerificationRequests.textContent = verificationCount;
        }
    },

    // Switch between admin sections
    switchSection(section) {
        // 检查参数是否为空
        if (!section) return;
        
        // 验证权限
        if (!this.auth.hasPermission(section)) {
            // 权限不足时重定向到有权限的第一个页面
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
        
        // 处理特定区域的子标签页
        if (section === 'dashboard') {
            this.loadDashboardData();
            // 确保我们至少有一个活动的标签页
            if (!document.querySelector('.tab-content.active')) {
                this.switchTab('loginRequests');
            }
        }
        
        // 重新绑定动态事件和初始化模块
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

    // 加载仪表盘数据
    async loadDashboardData() {
        if (!this.currentAdmin) return;
        try {
            const response = await this.apiRequest('/api/admin/dashboard-data');
            if (response && response.ok) {
                const data = await response.json();
                this.updateDashboard(data);
            } else if (response === null) {
                // API请求失败，可能是认证问题，已在apiRequest中处理
                return;
            }
        } catch (error) {
            console.error('加载仪表盘数据错误:', error);
        }
    },
    
    // 更新仪表盘数据
    updateDashboard(data) {
        // 更新待审核登录请求数
        const loginRequestsEl = document.getElementById('dashboardLoginRequests');
        if (loginRequestsEl) {
            loginRequestsEl.textContent = data.loginRequests || 0;
        }
        
        // 更新待审核验证请求数
        const verificationRequestsEl = document.getElementById('dashboardVerificationRequests');
        if (verificationRequestsEl) {
            verificationRequestsEl.textContent = data.verificationRequests || 0;
        }
        
        // 更新会员总数
        const membersCountEl = document.getElementById('dashboardMembersCount');
        if (membersCountEl) {
            membersCountEl.textContent = data.membersCount || 0;
        }
        
        // 更新禁止IP数
        const bannedIpsEl = document.getElementById('dashboardBannedIps');
        if (bannedIpsEl) {
            bannedIpsEl.textContent = data.bannedIpsCount || 0;
        }
        
        // 更新未发放礼品卡总数
        const totalAvailableCardsEl = document.getElementById('dashboardTotalAvailableCards');
        if (totalAvailableCardsEl) {
            totalAvailableCardsEl.textContent = `(总计: ${data.totalAvailableCards || 0})`;
        }
        
        // 更新礼品卡分类统计
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



    // 格式化日期时间
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

// 等待DOM加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.adminApp.init());
} else {
    window.adminApp.init();
}