/**
 * Admin Authentication Module
 * 管理员认证相关功能
 */

class AdminAuth {
    constructor(adminApp) {
        this.adminApp = adminApp;
    }

    // 处理管理员登录
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
                this.adminApp.token = data.token;
                this.adminApp.currentAdmin = data.admin;
                localStorage.setItem('adminToken', this.adminApp.token);
                localStorage.setItem('adminInfo', JSON.stringify(data.admin));
                window.location.reload(); // 登录成功后强制刷新页面
                return;
            } else {
                alert(data.error || '登录失败');
            }
        } catch (error) {
            alert('网络错误，请重试');
        }
    }

    // 登出
    logout() {
        // Clear authentication data
        this.adminApp.token = null;
        this.adminApp.currentAdmin = null;
        console.log('[logout] currentAdmin 被清空');
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminInfo');
        
        // Disconnect Socket.IO
        if (this.adminApp.socket) {
            this.adminApp.socket.disconnect();
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
            if (this.adminApp.socket && !this.adminApp.socket.connected) {
                this.adminApp.socket.connect();
            }
        } else {
            console.error('Login page elements not found!');
        }
    }

    // 显示仪表盘页面
    showDashboard() {
        if (!this.adminApp.currentAdmin) return;
        const loginPage = document.getElementById('adminLoginPage');
        const dashboardPage = document.getElementById('adminDashboard');

        if (loginPage && dashboardPage) {
            loginPage.classList.remove('active');
            dashboardPage.classList.add('active');
            
            // 重新绑定动态事件
            setTimeout(() => {
                this.adminApp.bindDynamicEvents();
            }, 100);
        } else {
            console.error('页面元素未找到！');
        }

        if (this.adminApp.currentAdmin) {
            // 显示管理员信息
            const adminName = document.getElementById('adminName');
            const adminRole = document.getElementById('adminRole');
            
            if (adminName) adminName.textContent = this.adminApp.currentAdmin.username;
            if (adminRole) adminRole.textContent = this.adminApp.currentAdmin.role === 'super' ? '超级管理员' : '普通管理员';
            
            // 根据角色显示或隐藏管理员管理入口
            const adminManageNav = document.getElementById('adminManageNav');
            if (adminManageNav) {
                adminManageNav.style.display = this.adminApp.currentAdmin.role === 'super' ? 'block' : 'none';
            }
        }
        
        // 默认显示仪表盘
        this.adminApp.switchSection('dashboard');
        
        // 加入管理员房间
        if (this.adminApp.socket && this.adminApp.currentAdmin) {
            this.adminApp.socket.emit('join-admin', {
                id: this.adminApp.currentAdmin.id,
                username: this.adminApp.currentAdmin.username,
                role: this.adminApp.currentAdmin.role
            });
        }
    }

    // 显示修改密码模态框
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

        this.adminApp.showModal('修改密码', content);

        // Bind form submission event
        const changePasswordForm = document.getElementById('changePasswordForm');
        if (changePasswordForm) {
            changePasswordForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleChangePassword();
            });
        }
    }

    // 处理密码修改
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
            const response = await this.adminApp.apiRequest('/api/auth/admin/change-password', {
                method: 'POST',
                body: JSON.stringify({
                    currentPassword,
                    newPassword
                })
            });

            if (response && response.ok) {
                const data = await response.json();
                alert('密码修改成功！请重新登录。');
                this.adminApp.closeModal();
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

    // 检查具体权限点
    hasPermissionPoint(permissionKey) {
        if (!this.adminApp.currentAdmin) return false;
        
        // 超级管理员拥有所有权限
        if (this.adminApp.currentAdmin.role === 'super') return true;
        
        // 普通管理员检查权限点
        try {
            const permissions = this.adminApp.currentAdmin.permissions ? JSON.parse(this.adminApp.currentAdmin.permissions) : {};
            return !!permissions[permissionKey];
        } catch (e) {
            console.error('解析权限数据错误:', e);
            return false;
        }
    }

    // 判断是否有权限访问某个区域
    hasPermission(section) {
        // dashboard和pending区域不需要单独的权限检查，所有人都可以访问
        if (['dashboard', 'pending'].includes(section)) {
            return true;
        }
        // 超级管理员有所有权限
        if (this.adminApp.currentAdmin && this.adminApp.currentAdmin.role === 'super') {
            return true;
        }
        // 其他区域的权限映射
        const sectionPermissionMap = {
            'members': 'members:view',
            'giftcards': 'gift-cards:view',
            'categories': 'categories:view',
            'ipmanagement': 'ip-blacklist:view',
            'tracking': 'user-tracking:view',
            'systemsettings': 'system-settings:view',
            'adminmanage': false // 只有超级管理员才能访问
        };
        const requiredPermission = sectionPermissionMap[section];
        if (requiredPermission === false) return false;
        if (requiredPermission) {
            return this.hasPermissionPoint(requiredPermission);
        }
        // 默认允许访问
        return true;
    }

    // 获取第一个有权限的区域
    getFirstPermittedSection() {
        const dashboard = this.hasPermission('dashboard');
        if (dashboard) {
            return 'dashboard';
        }
        const pending = this.hasPermission('pending');
        if (pending) {
            return 'pending';
        }
        const sections = ['members', 'giftcards', 'categories', 'ipmanagement', 'adminmanage'];
        for (const section of sections) {
            const permitted = this.hasPermission(section);
            if (permitted) {
                return section;
            }
        }
        return null;
    }

    // 更新导航栏权限
    updateNavByPermission() {
        // 如果用户未登录，不做任何操作
        if (!this.adminApp.currentAdmin) return;
        
        // 根据角色和权限隐藏/显示导航按钮
        if (this.adminApp.currentAdmin.role !== 'super') {
            // 非超级管理员隐藏管理员管理
            const adminManageBtn = document.getElementById('adminManageBtn');
            if (adminManageBtn) {
                adminManageBtn.parentElement.style.display = 'none';
            }
        } else {
            // 超级管理员显示管理员管理
            const adminManageBtn = document.getElementById('adminManageBtn');
            if (adminManageBtn) {
                adminManageBtn.parentElement.style.display = '';
            }
        }
        
        // 检查各个功能的权限
        const sections = ['login-requests', 'verification-requests', 'members', 'gift-cards', 'categories', 'ip-blacklist', 'user-tracking'];
        sections.forEach(section => {
            const hasAccess = this.hasPermission(section);
            const navBtn = document.querySelector(`[data-section="${section}"]`);
            if (navBtn && !hasAccess) {
                navBtn.parentElement.style.display = 'none';
            }
        });
    }
}

// Export for use in main admin app
window.AdminAuth = AdminAuth;