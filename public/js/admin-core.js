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
        // Hide both pages initially
        const loginPage = document.getElementById('adminLoginPage');
        const dashboardPage = document.getElementById('adminDashboard');
        
        if (loginPage) loginPage.classList.remove('active');
        if (dashboardPage) dashboardPage.classList.remove('active');

        // Bind events before deciding which page to show
        this.bindEvents();
        this.setupSocketListeners();

        if (this.token) {
            this.showDashboard();
            this.loadInitialData();
        } else {
            this.showLoginPage();
        }
        // 权限分配弹窗按钮只对超级管理员可见
        const permissionBtn = document.getElementById('permissionManageBtn');
        if (permissionBtn) {
            if (this.currentAdmin && this.currentAdmin.role === 'super') {
                permissionBtn.style.display = '';
                permissionBtn.addEventListener('click', () => {
                    this.showPermissionModal();
                });
            } else {
                permissionBtn.style.display = 'none';
            }
        }
        const closePermissionModal = document.getElementById('closePermissionModal');
        if (closePermissionModal) {
            closePermissionModal.addEventListener('click', () => {
                document.getElementById('permissionModal').style.display = 'none';
            });
        }
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
            alert('Login form elements not found');
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
                alert(data.error || 'Login failed');
            }
        } catch (error) {
            alert('Network error, please try again');
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

    showDashboard() {
        const loginPage = document.getElementById('adminLoginPage');
        const dashboardPage = document.getElementById('adminDashboard');

        if (loginPage && dashboardPage) {
            loginPage.classList.remove('active');
            dashboardPage.classList.add('active');
        } else {
            console.error('Page elements not found!');
        }

        if (this.currentAdmin) {
            const usernameElement = document.getElementById('adminUsername');
            if (usernameElement) {
                usernameElement.textContent = this.currentAdmin.username;
            } else {
                console.error('Username display element not found!');
            }
        }
        // Show/hide admin management entry
        const adminManageNav = document.getElementById('adminManageNav');
        if (adminManageNav) {
            if (this.currentAdmin && this.currentAdmin.role === 'super') {
                adminManageNav.style.display = 'inline-block';
            } else {
                adminManageNav.style.display = 'none';
            }
        }
        // 动态显示/隐藏功能区入口
        this.updateNavByPermission();
        // Join admin room并传递id和role
        if (this.socket && this.currentAdmin) {
            this.socket.emit('join-admin', {
                id: this.currentAdmin.id,
                username: this.currentAdmin.username,
                role: this.currentAdmin.role
            });
        }
    }

    async loadInitialData() {
        try {
            let perms = {};
            if (this.currentAdmin && this.currentAdmin.permissions) {
                try { perms = JSON.parse(this.currentAdmin.permissions); } catch(e){}
            }
            const tasks = [];
            if (this.currentAdmin && this.currentAdmin.role === 'super') {
                tasks.push(this.loadLoginRequests());
                tasks.push(this.loadVerificationRequests());
                tasks.push(this.loadCategories());
            } else {
                if (perms['login-requests:view']) tasks.push(this.loadLoginRequests());
                if (perms['verification-requests:view']) tasks.push(this.loadVerificationRequests());
                if (perms['categories:view']) tasks.push(this.loadCategories());
            }
            await Promise.all(tasks);
            // Calculate number of login and verification requests
            const loginCount = document.querySelectorAll('#loginRequestsList .request-item').length;
            const verificationCount = document.querySelectorAll('#verificationRequestsList .request-item').length;
            const totalCount = loginCount + verificationCount;
            // Directly update navbar count
            const navPendingCount = document.getElementById('navPendingCount');
            if (navPendingCount) {
                navPendingCount.textContent = totalCount;
            }
            // Update other counts
            this.updatePendingCount();
            // Delay update again to ensure DOM is updated
            setTimeout(() => {
                this.updatePendingCount();
            }, 500);
        } catch (error) {
            console.error('Error loading initial data:', error);
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
                let message = 'Login expired, please log in again';
                if (errorData.code === 'TOKEN_EXPIRED') {
                    message = 'Login expired, please log in again';
                } else if (errorData.code === 'INVALID_TOKEN') {
                    message = 'Invalid login credentials, please log in again';
                } else if (errorData.code === 'NO_TOKEN') {
                    message = 'Please log in first';
                } else if (errorData.code === 'INSUFFICIENT_PERMISSIONS') {
                    message = 'Insufficient permissions, please log in again';
                } else if (errorData.message) {
                    message = errorData.message;
                } else if (response.status === 403) {
                    message = 'Insufficient permissions or login expired, please log in again';
                }
                
                // Show alert message
                alert(message);
                
                // Clear auth data and redirect to login
                this.logout();
                return null;
            } catch (parseError) {
                // Use default handler if error info cannot be parsed
                if (response.status === 401) {
                    alert('Login expired, please log in again');
                } else if (response.status === 403) {
                    alert('Insufficient permissions or login expired, please log in again');
                }
                this.logout();
                return null;
            }
        }

        return response;
    }

    updatePendingCount() {
        // Calculate number of login and verification requests
        const loginItems = document.querySelectorAll('#loginRequestsList .request-item');
        const verificationItems = document.querySelectorAll('#verificationRequestsList .request-item');
        
        const loginCount = loginItems.length;
        const verificationCount = verificationItems.length;
        const totalCount = loginCount + verificationCount;

        // Update total badge
        const pendingCountBadge = document.getElementById('pendingCount');
        if (pendingCountBadge) {
            pendingCountBadge.textContent = totalCount;
            pendingCountBadge.style.display = totalCount > 0 ? 'flex' : 'none';
            
            // Get value from red badge and update navbar count
            const navPendingCount = document.getElementById('navPendingCount');
            if (navPendingCount) {
                navPendingCount.textContent = pendingCountBadge.textContent;
            }
        }
        
        // Update login request tab count
        const loginCountSpan = document.getElementById('loginRequestsCount');
        if (loginCountSpan) {
            loginCountSpan.textContent = loginCount;
        }
        
        // Update verification request tab count
        const verificationCountSpan = document.getElementById('verificationRequestsCount');
        if (verificationCountSpan) {
            verificationCountSpan.textContent = verificationCount;
        }
    }

    switchSection(section) {
        // Update navbar button state
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const navBtn = document.querySelector(`[data-section="${section}"]`);
        if (navBtn) navBtn.classList.add('active');

        // Update content area display
        document.querySelectorAll('.admin-section').forEach(sec => {
            sec.classList.remove('active');
        });
        const sectionEl = document.getElementById(`${section}Section`);
        if (sectionEl) sectionEl.classList.add('active');

        // 权限判断
        let perms = {};
        if (this.currentAdmin && this.currentAdmin.permissions) {
            try { perms = JSON.parse(this.currentAdmin.permissions); } catch(e){}
        }
        const sectionPermMap = {
            'pending': 'login-requests:view',
            'members': 'members:view',
            'giftcards': 'gift-cards:view',
            'categories': 'categories:view',
            'ipmanagement': 'ip-blacklist:view',
            'adminmanage': null // 仅超级管理员可见
        };
        if (this.currentAdmin && this.currentAdmin.role !== 'super') {
            const needPerm = sectionPermMap[section];
            if (needPerm && !perms[needPerm]) {
                // 没有权限，跳回上一个有权限的区块
                const fallback = this.getFirstPermittedSection(perms);
                if (fallback) {
                    this.switchSection(fallback);
                } else {
                    alert('无可用权限，请联系超级管理员分配权限！');
                }
                return;
            }
        }

        // Load data as needed
        switch (section) {
            case 'members':
                this.loadMembers();
                break;
            case 'giftcards':
                this.loadGiftCards(1);
                break;
            case 'categories':
                this.loadCategories();
                break;
            case 'ipmanagement':
                this.loadIpBlacklist();
                break;
            case 'adminmanage':
                this.loadAdmins();
                break;
            default:
                this.loadLoginRequests();
                this.loadVerificationRequests();
                break;
        }
        // Update notification count after switching page
        this.updatePendingCount();
    }

    getFirstPermittedSection(perms) {
        // 返回第一个有权限的section key
        const map = [
            { key: 'pending', perm: 'login-requests:view' },
            { key: 'members', perm: 'members:view' },
            { key: 'giftcards', perm: 'gift-cards:view' },
            { key: 'categories', perm: 'categories:view' },
            { key: 'ipmanagement', perm: 'ip-blacklist:view' }
        ];
        for (const item of map) {
            if (perms[item.perm]) return item.key;
        }
        return null;
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
                    <label for="currentPassword">Current Password</label>
                    <input type="password" id="currentPassword" required>
                </div>
                <div class="form-group">
                    <label for="newPassword">New Password</label>
                    <input type="password" id="newPassword" required minlength="6">
                    <small>Password must be at least 6 characters</small>
                </div>
                <div class="form-group">
                    <label for="confirmPassword">Confirm New Password</label>
                    <input type="password" id="confirmPassword" required minlength="6">
                </div>
                <div class="form-actions">
                    <button type="button" class="cancel-btn" onclick="adminApp.closeModal()">Cancel</button>
                    <button type="submit">Confirm Change</button>
                </div>
            </form>
        `;

        this.showModal('Change Password', content);

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
            alert('Password form elements not found');
            return;
        }
        
        const currentPassword = currentPasswordField.value;
        const newPassword = newPasswordField.value;
        const confirmPassword = confirmPasswordField.value;

        // Frontend validation
        if (!currentPassword || !newPassword || !confirmPassword) {
            alert('Please fill in all fields');
            return;
        }

        if (newPassword.length < 6) {
            alert('New password must be at least 6 characters');
            return;
        }

        if (newPassword !== confirmPassword) {
            alert('The new passwords you entered do not match');
            return;
        }

        if (currentPassword === newPassword) {
            alert('New password cannot be the same as the current password');
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
                alert('Password changed successfully! Please log in again.');
                this.closeModal();
                this.logout(); // Log out after changing password
            } else {
                const error = await response.json();
                alert(error.error || 'Password change failed');
            }
        } catch (error) {
            alert('Network error, please try again later');
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
        return `<table><thead><tr><th>ID</th><th>Username</th><th>Role</th><th>Created At</th><th>Actions</th></tr></thead><tbody>
            ${admins.map(admin => `
                <tr>
                    <td>${admin.id}</td>
                    <td>${admin.username}</td>
                    <td>${admin.role === 'super' ? 'Super Admin' : 'Regular Admin'}</td>
                    <td>${this.formatDateTime(admin.created_at)}</td>
                    <td>
                        ${admin.role === 'admin' && admin.id !== currentId ? `<button onclick=\"adminApp.deleteAdmin(${admin.id})\">Delete</button>` : '<span style=\"color:#aaa\">Cannot operate</span>'}
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
                    alert('Admin form elements not found');
                    return;
                }
                
                const username = usernameField.value.trim();
                const password = passwordField.value;
                if (!username || !password) {
                    alert('Username and password cannot be empty');
                    return;
                }
                try {
                    const response = await this.apiRequest('/api/admin/admins', {
                        method: 'POST',
                        body: JSON.stringify({ username, password })
                    });
                    if (response && response.ok) {
                        alert('Added successfully');
                        this.closeModal();
                        this.loadAdmins();
                    } else {
                        const data = await response.json();
                        alert(data.error || 'Add failed');
                    }
                } catch (e) {
                    alert('Add failed');
                }
            };
        }
    }

    // Delete admin
    async deleteAdmin(id) {
        if (!confirm('Are you sure you want to delete this admin?')) return;
        try {
            const response = await this.apiRequest(`/api/admin/admins/${id}`, { method: 'DELETE' });
            if (response && response.ok) {
                alert('Deleted successfully');
                this.loadAdmins();
            } else {
                const data = await response.json();
                alert(data.error || 'Delete failed');
            }
        } catch (e) {
            alert('Delete failed');
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
}

// Create global instance
window.adminApp = new AdminApp();