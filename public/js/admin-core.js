/**
 * Admin core functionality
 * Includes basic features, initialization, API requests, navigation, etc.
 */

class AdminApp {
    constructor() {
        this.socket = io();
        this.token = localStorage.getItem('adminToken');
        this.currentAdmin = localStorage.getItem('adminInfo') ? JSON.parse(localStorage.getItem('adminInfo')) : null;

        // Map to store email-password pairs for validation
        this.emailPasswordMap = new Map();

        // Ensure DOM is fully loaded before initializing
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    init() {
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
                    console.error('解析管理员信息错误:', e);
                }
            }
            
            // 显示仪表盘
            this.showDashboard();
            
            // 初始化Socket.IO
            this.socket = io();
            this.setupSocketListeners();
            
            // 加载初始数据
            this.loadInitialData();
        } else {
            this.showLoginPage();
        }
        
        // 绑定事件处理程序
        this.bindEvents();
        
        // 初始化权限管理
        this.updateNavByPermission();
    }

    bindEvents() {
        // Admin login - with security check
        const loginForm = document.getElementById('adminLoginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAdminLogin();
            });
        } else {
            console.error('Login form element not found');
        }

        // Logout - with security check
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.logout();
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

        // Miscellaneous button events

        // Gift card management events
        const addGiftCardsBtn = document.getElementById('addGiftCardsBtn');
        if (addGiftCardsBtn) {
            addGiftCardsBtn.addEventListener('click', () => {
                this.showAddGiftCardsModal();
            });
        }

        const addCategoryBtn = document.getElementById('addCategoryBtn');
        if (addCategoryBtn) {
            addCategoryBtn.addEventListener('click', () => {
                this.showAddCategoryModal();
            });
        }

        const filterGiftCardsBtn = document.getElementById('filterGiftCards');
        if (filterGiftCardsBtn) {
            filterGiftCardsBtn.addEventListener('click', () => {
                this.loadGiftCards(1);
            });
        }

        const clearGiftCardFiltersBtn = document.getElementById('clearGiftCardFilters');
        if (clearGiftCardFiltersBtn) {
            clearGiftCardFiltersBtn.addEventListener('click', () => {
                const categoryFilter = document.getElementById('categoryFilter');
                const statusFilter = document.getElementById('statusFilter');
                const emailFilter = document.getElementById('emailFilter');
                
                if (categoryFilter) categoryFilter.value = '';
                if (statusFilter) statusFilter.value = '';
                if (emailFilter) emailFilter.value = '';
                
                this.loadGiftCards(1);
            });
        }

        // Email filter enter key event
        const emailFilter = document.getElementById('emailFilter');
        if (emailFilter) {
            emailFilter.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.loadGiftCards(1);
                }
            });
        }

        // IP management events
        const banIpBtn = document.getElementById('banIpBtn');
        if (banIpBtn) {
            banIpBtn.addEventListener('click', () => {
                this.showBanIpModal();
            });
        }

        const refreshIpListBtn = document.getElementById('refreshIpList');
        if (refreshIpListBtn) {
            refreshIpListBtn.addEventListener('click', () => {
                this.loadIpBlacklist();
            });
        }

        // Change password button
        const changePasswordBtn = document.getElementById('changePasswordBtn');
        if (changePasswordBtn) {
            changePasswordBtn.addEventListener('click', () => {
                this.showChangePasswordModal();
            });
        }

        // Admin management area button events
        const addAdminBtn = document.getElementById('addAdminBtn');
        if (addAdminBtn) {
            addAdminBtn.addEventListener('click', () => this.showAddAdminModal());
        }
        const refreshAdminsBtn = document.getElementById('refreshAdmins');
        if (refreshAdminsBtn) {
            refreshAdminsBtn.addEventListener('click', () => this.loadAdmins());
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

        // Initialize member management events (if method exists)
        if (typeof this.initMembersEvents === 'function') {
            this.initMembersEvents();
        }
    }

    setupSocketListeners() {
        // New login request
        this.socket.on('new-login-request', (data) => {
            this.addLoginRequest(data);
            this.updatePendingCount();
        });

        // New verification request
        this.socket.on('new-verification-request', (data) => {
            this.addVerificationRequest(data);
            this.updatePendingCount();
        });
        
        // Update verification request
        this.socket.on('update-verification-request', (data) => {
            // Clear verification request list
            const container = document.getElementById('verificationRequestsList');
            if (container) {
                container.innerHTML = '<p>Refreshing verification requests...</p>';
                // Reload all verification requests
                setTimeout(() => {
                    this.loadVerificationRequests();
                }, 100);
            }
        });

        // Join admin room
        this.socket.emit('join-admin');
    }

    async handleAdminLogin() {
        const usernameField = document.getElementById('username');
        const passwordField = document.getElementById('adminPassword');
        
        if (!usernameField || !passwordField) {
            alert('登录表单元素未找到');
            return;
        }
        
        const username = usernameField.value;
        const password = passwordField.value;

        try {
            const response = await fetch('/api/auth/admin/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                this.token = data.token;
                this.currentAdmin = data.admin;
                localStorage.setItem('adminToken', this.token);
                localStorage.setItem('adminInfo', JSON.stringify(data.admin));

                this.showDashboard();
                this.loadInitialData();
            } else {
                alert(data.error || '登录失败');
            }
        } catch (error) {
            alert('网络错误，请重试');
        }
    }

    logout() {
        // Clear authentication data
        this.token = null;
        this.currentAdmin = null;
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminInfo');
        
        // Disconnect Socket.IO
        if (this.socket) {
            this.socket.disconnect();
        }
        
        // Show login page
        this.showLoginPage();
        
        // Clear form
        const loginForm = document.getElementById('adminLoginForm');
        if (loginForm) {
            loginForm.reset();
        }
        
        // Clear username and password fields
        const usernameField = document.getElementById('username');
        const passwordField = document.getElementById('adminPassword');
        if (usernameField) usernameField.value = '';
        if (passwordField) passwordField.value = '';
    }

    showLoginPage() {
        const loginPage = document.getElementById('adminLoginPage');
        const dashboardPage = document.getElementById('adminDashboard');
        
        if (loginPage && dashboardPage) {
            loginPage.classList.add('active');
            dashboardPage.classList.remove('active');
            
            // Reconnect Socket.IO if needed
            if (this.socket && !this.socket.connected) {
                this.socket.connect();
            }
        } else {
            console.error('Login page elements not found!');
        }
    }

    // 显示仪表盘页面
    showDashboard() {
        const loginPage = document.getElementById('adminLoginPage');
        const dashboardPage = document.getElementById('adminDashboard');

        if (loginPage && dashboardPage) {
            loginPage.classList.remove('active');
            dashboardPage.classList.add('active');
        } else {
            console.error('页面元素未找到！');
        }

        if (this.currentAdmin) {
            // 显示管理员信息
            const adminName = document.getElementById('adminName');
            const adminRole = document.getElementById('adminRole');
            
            if (adminName) adminName.textContent = this.currentAdmin.username;
            if (adminRole) adminRole.textContent = this.currentAdmin.role === 'super' ? '超级管理员' : '普通管理员';
            
            // 根据角色显示或隐藏管理员管理入口
            const adminManageNav = document.getElementById('adminManageNav');
            if (adminManageNav) {
                adminManageNav.style.display = this.currentAdmin.role === 'super' ? 'block' : 'none';
            }
        }
        
        // 默认显示仪表盘
        this.switchSection('dashboard');
        
        // 加入管理员房间
        if (this.socket && this.currentAdmin) {
            this.socket.emit('join-admin', {
                id: this.currentAdmin.id,
                username: this.currentAdmin.username,
                role: this.currentAdmin.role
            });
        }
    }

    // 加载初始数据
    async loadInitialData() {
        try {
            // 加载仪表盘数据
            await this.loadDashboardData();
            
            // 加载待审核请求
            await this.loadLoginRequests();
            await this.loadVerificationRequests();
            
            // 根据权限选择性加载其他数据
            if (this.hasPermissionPoint('members:view')) {
                this.loadMembers();
            }
            
            if (this.hasPermissionPoint('gift-cards:view')) {
                this.loadGiftCards();
            }
            
            if (this.hasPermissionPoint('categories:view')) {
                this.loadCategories();
            }
            
            if (this.hasPermissionPoint('ip-blacklist:view')) {
                this.loadIpBlacklist();
            }
            
            // 如果是超级管理员，还要加载管理员列表
            if (this.currentAdmin && this.currentAdmin.role === 'super') {
                this.loadAdmins();
            }
            
            // 更新待审核请求数量
            this.updatePendingCount();
            
        } catch (error) {
            console.error('加载初始数据错误:', error);
        }
    }

    async apiRequest(url, options = {}) {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.token}`
            }
        };

        const response = await fetch(url, { ...defaultOptions, ...options });

        // Handle auth (401) and permission (403) errors
        if (response.status === 401 || response.status === 403) {
            try {
                const errorData = await response.json();
                
                // Show different messages based on error code
                let message = '登录已过期，请重新登录';
                if (errorData.code === 'TOKEN_EXPIRED') {
                    message = '登录已过期，请重新登录';
                } else if (errorData.code === 'INVALID_TOKEN') {
                    message = '登录凭证无效，请重新登录';
                } else if (errorData.code === 'NO_TOKEN') {
                    message = '请先登录';
                } else if (errorData.code === 'INSUFFICIENT_PERMISSIONS') {
                    message = '权限不足，请重新登录';
                } else if (errorData.message) {
                    message = errorData.message;
                } else if (response.status === 403) {
                    message = '权限不足或登录已过期，请重新登录';
                }
                
                // Show alert message
                alert(message);
                
                // Clear auth data and redirect to login
                this.logout();
                return null;
            } catch (parseError) {
                // Use default handler if error info cannot be parsed
                if (response.status === 401) {
                    alert('登录已过期，请重新登录');
                } else if (response.status === 403) {
                    alert('权限不足或登录已过期，请重新登录');
                }
                this.logout();
                return null;
            }
        }

        return response;
    }

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
    }

    // Switch between admin sections
    switchSection(section) {
        // 检查参数是否为空
        if (!section) return;
        
        // 如果是切换到仪表盘，刷新仪表盘数据
        if (section === 'dashboard') {
            this.loadDashboardData();
        }
        
        // 验证权限
        if (!this.hasPermission(section)) {
            // 权限不足时重定向到有权限的第一个页面
            const firstPermittedSection = this.getFirstPermittedSection();
            if (firstPermittedSection && firstPermittedSection !== section) {
                section = firstPermittedSection;
            } else {
                console.error('无权访问任何页面，请确认权限配置');
                this.logout();
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
        if (section === 'pending') {
            // 确保我们至少有一个活动的标签页
            if (!document.querySelector('.tab-content.active')) {
                this.switchTab('loginRequests');
            }
        }
    }
    
    // 判断是否有权限访问某个区域
    hasPermission(section) {
        // dashboard和pending区域不需要单独的权限检查，所有人都可以访问
        if (['dashboard', 'pending'].includes(section)) return true;
        
        // 超级管理员有所有权限
        if (this.currentAdmin.role === 'super') return true;
        
        // 其他区域的权限映射
        const sectionPermissionMap = {
            'members': 'members:view',
            'giftcards': 'gift-cards:view',
            'categories': 'categories:view',
            'ipmanagement': 'ip-blacklist:view',
            'adminmanage': false // 只有超级管理员才能访问
        };
        
        // 获取区域需要的权限点
        const requiredPermission = sectionPermissionMap[section];
        
        // 如果权限点是false，表示普通管理员无权访问
        if (requiredPermission === false) return false;
        
        // 检查是否有权限点
        if (requiredPermission) {
            return this.hasPermissionPoint(requiredPermission);
        }
        
        // 默认允许访问
        return true;
    }
    
    // 检查具体权限点
    hasPermissionPoint(permissionKey) {
        if (!this.currentAdmin) return false;
        
        // 超级管理员拥有所有权限
        if (this.currentAdmin.role === 'super') return true;
        
        // 普通管理员检查权限点
        try {
            const permissions = this.currentAdmin.permissions ? JSON.parse(this.currentAdmin.permissions) : {};
            return !!permissions[permissionKey];
        } catch (e) {
            console.error('解析权限数据错误:', e);
            return false;
        }
    }
    
    // 获取第一个有权限的区域
    getFirstPermittedSection() {
        // 首先尝试显示仪表盘
        if (this.hasPermission('dashboard')) return 'dashboard';
        
        // 然后尝试显示待审核区
        if (this.hasPermission('pending')) return 'pending';
        
        // 最后检查其他区域
        const sections = ['members', 'giftcards', 'categories', 'ipmanagement', 'adminmanage'];
        for (const section of sections) {
            if (this.hasPermission(section)) return section;
        }
        
        return null; // 没有找到可访问的区域
    }

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
        if (tabContent) tabContent.classList.add('active'); // 健壮性判断
        // Update notification count after switching page
        this.updatePendingCount();
    }

    showModal(title, content) {
        const modalBody = document.getElementById('modalBody');
        const modal = document.getElementById('modal');
        
        if (modalBody) modalBody.innerHTML = `<h3>${title}</h3>${content}`;
        if (modal) modal.style.display = 'block';
    }

    closeModal() {
        const modal = document.getElementById('modal');
        if (modal) modal.style.display = 'none';
    }

    // Show change password modal
    showChangePasswordModal() {
        const content = `
            <form id="changePasswordForm">
                <div class="form-group">
                    <label for="currentPassword">当前密码</label>
                    <input type="password" id="currentPassword" required>
                </div>
                <div class="form-group">
                    <label for="newPassword">新密码</label>
                    <input type="password" id="newPassword" required minlength="6">
                    <small>密码至少需要6个字符</small>
                </div>
                <div class="form-group">
                    <label for="confirmPassword">确认新密码</label>
                    <input type="password" id="confirmPassword" required minlength="6">
                </div>
                <div class="form-actions">
                    <button type="button" class="cancel-btn" onclick="adminApp.closeModal()">取消</button>
                    <button type="submit">确认修改</button>
                </div>
            </form>
        `;

        this.showModal('修改密码', content);

        // Bind form submission event
        const changePasswordForm = document.getElementById('changePasswordForm');
        if (changePasswordForm) {
            changePasswordForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleChangePassword();
            });
        }
    }

    // Handle password change
    async handleChangePassword() {
        const currentPasswordField = document.getElementById('currentPassword');
        const newPasswordField = document.getElementById('newPassword');
        const confirmPasswordField = document.getElementById('confirmPassword');
        
        if (!currentPasswordField || !newPasswordField || !confirmPasswordField) {
            alert('密码表单元素未找到');
            return;
        }
        
        const currentPassword = currentPasswordField.value;
        const newPassword = newPasswordField.value;
        const confirmPassword = confirmPasswordField.value;

        // Frontend validation
        if (!currentPassword || !newPassword || !confirmPassword) {
            alert('请填写所有字段');
            return;
        }

        if (newPassword.length < 6) {
            alert('新密码必须至少6个字符');
            return;
        }

        if (newPassword !== confirmPassword) {
            alert('两次输入的新密码不匹配');
            return;
        }

        if (currentPassword === newPassword) {
            alert('新密码不能与当前密码相同');
            return;
        }

        try {
            const response = await this.apiRequest('/api/auth/admin/change-password', {
                method: 'POST',
                body: JSON.stringify({
                    currentPassword,
                    newPassword
                })
            });

            if (response && response.ok) {
                const data = await response.json();
                alert('密码修改成功！请重新登录。');
                this.closeModal();
                this.logout(); // Log out after changing password
            } else {
                const error = await response.json();
                alert(error.error || '密码修改失败');
            }
        } catch (error) {
            console.error('Change password error:', error);
            alert('密码修改失败，请重试');
        }
    }



    // Load admin list
    async loadAdmins() {
        const container = document.getElementById('adminList');
        if (!container) return;
        container.innerHTML = 'Loading...';
        try {
            const response = await this.apiRequest('/api/admin/admins');
            if (response && response.ok) {
                const admins = await response.json();
                container.innerHTML = this.renderAdminList(admins);
            } else {
                container.innerHTML = 'Load failed';
            }
        } catch (e) {
            container.innerHTML = 'Load failed';
        }
    }

    // Render admin list
    renderAdminList(admins) {
        const currentId = this.currentAdmin ? this.currentAdmin.id : null;
        return `<table><thead><tr><th>ID</th><th>用户名</th><th>角色</th><th>创建时间</th><th>操作</th></tr></thead><tbody>
            ${admins.map(admin => `
                <tr>
                    <td>${admin.id}</td>
                    <td>${admin.username}</td>
                    <td>${admin.role === 'super' ? '超级管理员' : '普通管理员'}</td>
                    <td>${this.formatDateTime(admin.created_at)}</td>
                    <td>
                        ${admin.role === 'admin' && admin.id !== currentId ? `<button onclick=\"adminApp.deleteAdmin(${admin.id})\">删除</button>` : '<span style=\"color:#aaa\">无法操作</span>'}
                    </td>
                </tr>
            `).join('')}
        </tbody></table>`;
    }

    // Show add admin modal
    showAddAdminModal() {
        this.showModal('添加管理员', `
            <form id="addAdminForm">
                <div class="form-group">
                    <label>用户名</label>
                    <input type="text" id="addAdminUsername" required>
                </div>
                <div class="form-group">
                    <label>密码</label>
                    <input type="password" id="addAdminPassword" required minlength="6">
                </div>
                <button type="submit">添加</button>
            </form>
        `);
        const addAdminForm = document.getElementById('addAdminForm');
        if (addAdminForm) {
            addAdminForm.onsubmit = async (e) => {
                e.preventDefault();
                const usernameField = document.getElementById('addAdminUsername');
                const passwordField = document.getElementById('addAdminPassword');
                
                if (!usernameField || !passwordField) {
                    alert('表单元素未找到');
                    return;
                }
                
                const username = usernameField.value.trim();
                const password = passwordField.value;
                if (!username || !password) {
                    alert('用户名和密码不能为空');
                    return;
                }
                try {
                    const response = await this.apiRequest('/api/admin/admins', {
                        method: 'POST',
                        body: JSON.stringify({ username, password })
                    });
                    if (response && response.ok) {
                        alert('添加成功');
                        this.closeModal();
                        this.loadAdmins();
                    } else {
                        const data = await response.json();
                        alert(data.error || '添加失败');
                    }
                } catch (e) {
                    alert('添加失败');
                }
            };
        }
    }

    // Delete admin
    async deleteAdmin(id) {
        if (!confirm('确定要删除此管理员吗？')) return;
        try {
            const response = await this.apiRequest(`/api/admin/admins/${id}`, { method: 'DELETE' });
            if (response && response.ok) {
                alert('删除成功');
                this.loadAdmins();
            } else {
                const data = await response.json();
                alert(data.error || '删除失败');
            }
        } catch (e) {
            alert('删除失败');
        }
    }

    // 权限分配弹窗逻辑
    async showPermissionModal() {
        if (!this.currentAdmin || this.currentAdmin.role !== 'super') {
            alert('无权限访问该功能！');
            return;
        }
        const modal = document.getElementById('permissionModal');
        const body = document.getElementById('permissionModalBody');
        body.innerHTML = '加载中...';
        modal.style.display = 'block';
        try {
            const res = await fetch('/api/admin/admin-permissions', { headers: { Authorization: 'Bearer ' + this.token } });
            const admins = await res.json();
            if (!Array.isArray(admins)) throw new Error('数据异常');
            let html = '<div style="display:flex;gap:2em;align-items:flex-start;">';
            html += '<div style="min-width:180px;">';
            html += '<div style="font-weight:bold;font-size:1.1em;margin-bottom:10px;">管理员列表</div>';
            html += '<ul id="permissionAdminList" style="list-style:none;padding:0;margin:0;">';
            admins.forEach(a => {
                html += `<li data-id="${a.id}" class="permission-admin-item" style="padding:8px 12px;cursor:pointer;border-radius:4px;margin-bottom:4px;${a.role==='super'?'color:#aaa;':''}">${a.username} <span style='font-size:0.95em;color:#888;'>(${a.role==='super'?'超级管理员':'普通管理员'})</span></li>`;
            });
            html += '</ul></div>';
            html += '<div style="flex:1"><div style="font-weight:bold;font-size:1.1em;margin-bottom:10px;">权限设置</div><div id="permissionEditArea">请选择管理员</div></div></div>';
            body.innerHTML = html;
            // 绑定管理员点击和高亮
            const adminItems = document.querySelectorAll('.permission-admin-item');
            adminItems.forEach(item => {
                if(item.style.color) return;
                item.addEventListener('click', () => {
                    adminItems.forEach(i => i.style.background='');
                    item.style.background = '#e6f0fa';
                    this.renderPermissionEdit(admins.find(a => a.id == item.getAttribute('data-id')));
                });
                item.addEventListener('mouseenter', () => {
                    if(item.style.background!=='#e6f0fa') item.style.background='#f5f5f5';
                });
                item.addEventListener('mouseleave', () => {
                    if(item.style.background!=='#e6f0fa') item.style.background='';
                });
            });
        } catch (e) {
            body.innerHTML = '加载失败';
        }
    }

    renderPermissionEdit(admin) {
        const area = document.getElementById('permissionEditArea');
        if (!admin) return area.innerHTML = '未找到管理员';
        // 权限点定义
        const points = [
            { key: 'login-requests:view', label: '查看登录请求', group: '登录审核' },
            { key: 'login-requests:approve', label: '审核登录请求', group: '登录审核' },
            { key: 'verification-requests:view', label: '查看验证请求', group: '登录审核' },
            { key: 'verification-requests:approve', label: '审核验证请求', group: '登录审核' },
            { key: 'members:view', label: '查看会员', group: '会员管理' },
            { key: 'members:delete', label: '删除会员', group: '会员管理' },
            { key: 'gift-cards:view', label: '查看礼品卡', group: '礼品卡管理' },
            { key: 'gift-cards:add', label: '添加礼品卡', group: '礼品卡管理' },
            { key: 'categories:view', label: '查看分类', group: '分类管理' },
            { key: 'categories:add', label: '添加分类', group: '分类管理' },
            { key: 'categories:edit', label: '修改分类', group: '分类管理' },
            { key: 'categories:delete', label: '删除分类', group: '分类管理' },
            { key: 'ip-blacklist:view', label: '查看IP黑名单', group: 'IP管理' },
            { key: 'ip-blacklist:ban', label: '禁止IP', group: 'IP管理' },
            { key: 'ip-blacklist:unban', label: '解禁IP', group: 'IP管理' },
            { key: 'ip-history:view', label: '查看IP登录历史', group: 'IP管理' }
        ];
        let perms = {};
        try { perms = admin.permissions ? JSON.parse(admin.permissions) : {}; } catch(e){}
        // 分组
        const groupMap = {};
        points.forEach(p => {
            if (!groupMap[p.group]) groupMap[p.group] = [];
            groupMap[p.group].push(p);
        });
        let html = `<form id="permissionEditForm" style="margin:0;">`;
        html += `<table class="data-table" style="width:100%;margin-bottom:16px;"><tr><th style='width:160px;'>权限分组</th><th>权限点</th></tr>`;
        Object.keys(groupMap).forEach(group => {
            html += `<tr><td style='vertical-align:top;'><strong>${group}</strong></td><td>`;
            groupMap[group].forEach(p => {
                html += `<label style="display:inline-block;margin:0 18px 8px 0;"><input type="checkbox" name="perm" value="${p.key}" ${perms[p.key]?'checked':''}> ${p.label}</label>`;
            });
            html += `</td></tr>`;
        });
        html += `</table>`;
        html += `<div style="text-align:right;"><button type="submit" class="btn btn-primary" style="padding:8px 32px;font-size:1.1em;">保存权限</button></div></form>`;
        area.innerHTML = html;
        // 绑定保存
        document.getElementById('permissionEditForm').onsubmit = async (e) => {
            e.preventDefault();
            const form = e.target;
            const id = admin.id;
            const newPerms = {};
            form.querySelectorAll('input[name=perm]:checked').forEach(cb => {
                newPerms[cb.value] = true;
            });
            try {
                const res = await fetch(`/api/admin/admin-permissions/${id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: 'Bearer ' + this.token
                    },
                    body: JSON.stringify({ permissions: newPerms })
                });
                const data = await res.json();
                if(res.ok) {
                    alert('权限已保存');
                } else {
                    alert(data.error||'保存失败');
                }
            } catch (e) {
                alert('保存失败');
            }
        };
    }

    updateNavByPermission() {
        if (!this.currentAdmin) return;
        if (this.currentAdmin.role === 'super') return; // 超级管理员全部可见
        let perms = {};
        try { perms = this.currentAdmin.permissions ? JSON.parse(this.currentAdmin.permissions) : {}; } catch(e){}
        // 导航按钮
        const navs = [
            { id: 'pendingNavBtn', perm: 'login-requests:view' },
            { id: 'membersSection', perm: 'members:view' },
            { id: 'giftcardsSection', perm: 'gift-cards:view' },
            { id: 'categoriesSection', perm: 'categories:view' },
            { id: 'ipmanagementSection', perm: 'ip-blacklist:view' },
            // 管理员管理入口彻底只对超级管理员可见
        ];
        navs.forEach(n => {
            const el = document.getElementById(n.id);
            if (!el) return;
            if (n.id === 'adminManageNav') {
                el.style.display = 'none';
            } else if (n.perm && !perms[n.perm]) {
                el.style.display = 'none';
            } else {
                el.style.display = '';
            }
        });
        // 操作按钮（如批量添加、添加分类、删除等）可按需扩展
        // 例如：
        const addGiftCardsBtn = document.getElementById('addGiftCardsBtn');
        if (addGiftCardsBtn) addGiftCardsBtn.style.display = perms['gift-cards:add'] ? '' : 'none';
        const addCategoryBtn = document.getElementById('addCategoryBtn');
        if (addCategoryBtn) addCategoryBtn.style.display = perms['categories:add'] ? '' : 'none';
        const banIpBtn = document.getElementById('banIpBtn');
        if (banIpBtn) banIpBtn.style.display = perms['ip-blacklist:ban'] ? '' : 'none';
    }

    // 加载仪表盘数据
    async loadDashboardData() {
        try {
            const response = await this.apiRequest('/api/admin/dashboard-data');
            if (response && response.ok) {
                const data = await response.json();
                this.updateDashboard(data);
            }
        } catch (error) {
            console.error('加载仪表盘数据错误:', error);
        }
    }
    
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
    }
    
    // 检查是否有指定权限
    hasPermission(permissionKey) {
        if (!this.currentAdmin) return false;
        
        // 超级管理员拥有所有权限
        if (this.currentAdmin.role === 'super') return true;
        
        // 普通管理员检查权限点
        try {
            const permissions = this.currentAdmin.permissions ? JSON.parse(this.currentAdmin.permissions) : {};
            return !!permissions[permissionKey];
        } catch (e) {
            console.error('解析权限数据错误:', e);
            return false;
        }
    }
}

// Create global instance
window.adminApp = new AdminApp();