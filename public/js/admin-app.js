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
            
            // 初始化Socket.IO
            this.socket = this.socketManager.init();
            
            // 显示仪表盘
            this.auth.showDashboard();

            // 加载初始数据
            this.loadInitialData();
        } else {
            this.auth.showLoginPage();
        }
        
        // 绑定事件处理程序
        this.bindEvents();
        
        // 初始化权限管理
        this.auth.updateNavByPermission();

        // 渲染导航栏
        this.renderNavMenu();

        // 添加系统设置菜单项（如果是超级管理员）
        if (this.currentAdmin && this.currentAdmin.role === 'super') {
            this.addSystemSettingsMenuItem();
        }
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

        // Navigation buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchSection(e.target.dataset.section);
            });
        });
        
        // 仪表盘刷新按钮
        const refreshDashboardBtn = document.getElementById('refreshDashboard');
        if (refreshDashboardBtn) {
            refreshDashboardBtn.addEventListener('click', () => {
                this.loadDashboardData();
            });
        }

        // Tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

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
        if (this.isLoggingOut) return;
        // 默认加上 Content-Type: application/json
        const method = (options.method || 'GET').toUpperCase();
        const defaultHeaders = (method === 'POST' || method === 'PUT')
            ? { 'Content-Type': 'application/json' }
            : {};
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
            throw new Error('登录已过期');
        }
        return response;
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
                                <button class="edit-btn" onclick="adminApp.switchSection('giftcards')">查看</button>
                            </td>
                        </tr>
                    `).join('');
                }
            }
        }
    },

    // 添加系统设置菜单项
    addSystemSettingsMenuItem() {
        const nav = document.querySelector('nav ul');
        if (!nav) {
            console.error('导航菜单未找到');
            return;
        }
        // 防止重复添加
        if (nav.querySelector('#systemSettingsBtn')) return;
        // 创建菜单项
        const settingsItem = document.createElement('li');
        settingsItem.innerHTML = '<button id="systemSettingsBtn" class="nav-button"><i class="fas fa-cog"></i> 系统设置</button>';
        nav.appendChild(settingsItem);
        
        // 添加点击事件
        const systemSettingsBtn = document.getElementById('systemSettingsBtn');
        if (systemSettingsBtn) {
            systemSettingsBtn.addEventListener('click', () => {
                this.showSystemSettings();
            });
        }
    },

    // 显示系统设置页面（将使用现有的admin-system-settings.js模块）
    showSystemSettings() {
        let settingsSection = document.getElementById('systemSettingsSection');
        if (!settingsSection) {
            const main = document.querySelector('main');
            settingsSection = document.createElement('section');
            settingsSection.id = 'systemSettingsSection';
            settingsSection.className = 'admin-section';
            main.appendChild(settingsSection);
        }
        this.switchSection('systemSettings');
    },

    renderNavMenu() {
        const navList = document.getElementById('adminNavList');
        if (!navList) return;
        navList.innerHTML = '';
        const navItems = [
            { key: 'dashboard', label: '仪表盘', icon: 'fa-tachometer-alt', permission: null },
            { key: 'pending', label: '待审核', icon: 'fa-tasks', permission: 'login-requests' },
            { key: 'members', label: '会员管理', icon: 'fa-users', permission: 'members' },
            { key: 'giftcards', label: '礼品卡管理', icon: 'fa-gift', permission: 'gift-cards' },
            { key: 'categories', label: '分类管理', icon: 'fa-list', permission: 'categories' },
            { key: 'ipmanagement', label: 'IP管理', icon: 'fa-ban', permission: 'ip-blacklist' },
            { key: 'adminmanage', label: '管理员管理', icon: 'fa-user-shield', permission: null, superOnly: true }
        ];
        navItems.forEach(item => {
            if (item.superOnly && (!this.currentAdmin || this.currentAdmin.role !== 'super')) return;
            if (item.permission && !this.auth.hasPermission(item.permission)) return;
            const li = document.createElement('li');
            li.innerHTML = `<button class="nav-btn" data-section="${item.key}" id="${item.key}NavBtn"><i class="fas ${item.icon}"></i> ${item.label}</button>`;
            navList.appendChild(li);
        });
        // 绑定点击事件
        navList.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchSection(e.target.dataset.section);
            });
        });
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