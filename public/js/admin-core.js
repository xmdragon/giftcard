/**
 * 管理后台核心功能
 * 包含基础功能、初始化、API请求、导航等
 */

class AdminApp {
    constructor() {
        this.socket = io();
        this.token = localStorage.getItem('adminToken');
        this.currentAdmin = localStorage.getItem('adminInfo') ? JSON.parse(localStorage.getItem('adminInfo')) : null;

        // 存储邮箱和密码的映射，用于验证请求
        this.emailPasswordMap = new Map();

        // 确保DOM完全加载后再初始化
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    init() {
        // 确保两个页面都处于隐藏状态
        document.getElementById('adminLoginPage').classList.remove('active');
        document.getElementById('adminDashboard').classList.remove('active');

        // 先绑定事件，再决定显示哪个页面
        this.bindEvents();
        this.setupSocketListeners();

        if (this.token) {
            this.showDashboard();
            this.loadInitialData();
        } else {
            this.showLoginPage();
        }
    }

    bindEvents() {
        // 管理员登录 - 添加安全检查
        const loginForm = document.getElementById('adminLoginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAdminLogin();
            });
        } else {
            console.error('未找到登录表单元素');
        }

        // 退出登录 - 添加安全检查
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.logout();
            });
        }

        // 导航按钮
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchSection(e.target.dataset.section);
            });
        });

        // 标签页切换
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // 各种按钮事件

        document.getElementById('addGiftCardsBtn').addEventListener('click', () => {
            this.showAddGiftCardsModal();
        });

        document.getElementById('addCategoryBtn').addEventListener('click', () => {
            this.showAddCategoryModal();
        });

        document.getElementById('filterGiftCards').addEventListener('click', () => {
            this.loadGiftCards();
        });

        // IP管理相关事件
        document.getElementById('banIpBtn').addEventListener('click', () => {
            this.showBanIpModal();
        });

        document.getElementById('refreshIpList').addEventListener('click', () => {
            this.loadIpBlacklist();
        });

        // 修改密码按钮
        const changePasswordBtn = document.getElementById('changePasswordBtn');
        if (changePasswordBtn) {
            changePasswordBtn.addEventListener('click', () => {
                this.showChangePasswordModal();
            });
        }

        // 管理员管理区按钮事件
        const addAdminBtn = document.getElementById('addAdminBtn');
        if (addAdminBtn) {
            addAdminBtn.addEventListener('click', () => this.showAddAdminModal());
        }
        const refreshAdminsBtn = document.getElementById('refreshAdmins');
        if (refreshAdminsBtn) {
            refreshAdminsBtn.addEventListener('click', () => this.loadAdmins());
        }


        // 模态框关闭
        document.querySelector('.close').addEventListener('click', () => {
            this.closeModal();
        });

        window.addEventListener('click', (e) => {
            if (e.target === document.getElementById('modal')) {
                this.closeModal();
            }
        });

        // 初始化会员管理事件（如果方法存在）
        if (typeof this.initMembersEvents === 'function') {
            this.initMembersEvents();
        }
    }

    setupSocketListeners() {
        // 新登录请求
        this.socket.on('new-login-request', (data) => {
            this.addLoginRequest(data);
            this.updatePendingCount();
        });

        // 新验证请求
        this.socket.on('new-verification-request', (data) => {
            this.addVerificationRequest(data);
            this.updatePendingCount();
        });
        
        // 更新验证请求
        this.socket.on('update-verification-request', (data) => {
            // 清空验证请求列表
            const container = document.getElementById('verificationRequestsList');
            container.innerHTML = '<p>正在刷新验证请求...</p>';
            // 重新加载所有验证请求
            setTimeout(() => {
                this.loadVerificationRequests();
            }, 100);
        });

        // 加入管理员房间
        this.socket.emit('join-admin');
    }

    async handleAdminLogin() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('adminPassword').value;

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
        // 清除认证数据
        this.token = null;
        this.currentAdmin = null;
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminInfo');
        
        // 断开 Socket.IO 连接
        if (this.socket) {
            this.socket.disconnect();
        }
        
        // 显示登录页
        this.showLoginPage();
        
        // 清空表单
        const loginForm = document.getElementById('adminLoginForm');
        if (loginForm) {
            loginForm.reset();
        }
        
        // 清空用户名和密码字段
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
            
            // 重新连接 Socket.IO（如果需要）
            if (this.socket && !this.socket.connected) {
                this.socket.connect();
            }
        } else {
            console.error('登录页面元素未找到!');
        }
    }

    showDashboard() {
        const loginPage = document.getElementById('adminLoginPage');
        const dashboardPage = document.getElementById('adminDashboard');

        if (loginPage && dashboardPage) {
            loginPage.classList.remove('active');
            dashboardPage.classList.add('active');
        } else {
            console.error('页面元素未找到!');
        }

        if (this.currentAdmin) {
            const usernameElement = document.getElementById('adminUsername');
            if (usernameElement) {
                usernameElement.textContent = this.currentAdmin.username;
            } else {
                console.error('用户名显示元素未找到!');
            }
        }

        // 显示/隐藏管理员管理入口
        const adminManageNav = document.getElementById('adminManageNav');
        if (adminManageNav) {
            if (this.currentAdmin && this.currentAdmin.role === 'super') {
                adminManageNav.style.display = 'inline-block';
            } else {
                adminManageNav.style.display = 'none';
            }
        }
    }

    async loadInitialData() {
        try {
            // 加载数据
            await Promise.all([
                this.loadLoginRequests(),
                this.loadVerificationRequests(),
                this.loadCategories()
            ]);
            
            // 计算登录请求和验证请求的数量
            const loginCount = document.querySelectorAll('#loginRequestsList .request-item').length;
            const verificationCount = document.querySelectorAll('#verificationRequestsList .request-item').length;
            const totalCount = loginCount + verificationCount;
            
            // 直接更新导航栏计数
            const navPendingCount = document.getElementById('navPendingCount');
            if (navPendingCount) {
                navPendingCount.textContent = totalCount;
            } else {
                console.error('导航栏计数元素未找到!');
            }
            
            // 更新其他计数
            this.updatePendingCount();
            
            // 再次延迟更新，确保DOM已经更新
            setTimeout(() => {
                this.updatePendingCount();
            }, 500);
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

        // 处理认证错误 (401) 和权限错误 (403)
        if (response.status === 401 || response.status === 403) {
            try {
                const errorData = await response.json();
                
                // 根据错误代码显示不同的提示信息
                let message = '登录已过期，请重新登录';
                if (errorData.code === 'TOKEN_EXPIRED') {
                    message = '登录已过期，请重新登录';
                } else if (errorData.code === 'INVALID_TOKEN') {
                    message = '无效的登录凭证，请重新登录';
                } else if (errorData.code === 'NO_TOKEN') {
                    message = '请先登录';
                } else if (errorData.code === 'INSUFFICIENT_PERMISSIONS') {
                    message = '权限不足，请重新登录';
                } else if (errorData.message) {
                    message = errorData.message;
                } else if (response.status === 403) {
                    message = '权限不足或登录已过期，请重新登录';
                }
                
                // 显示提示信息
                alert(message);
                
                // 清除认证数据并跳转到登录页
                this.logout();
                return null;
            } catch (parseError) {
                // 如果无法解析错误信息，使用默认处理
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

    updatePendingCount() {
        // 计算登录请求和验证请求的数量
        const loginItems = document.querySelectorAll('#loginRequestsList .request-item');
        const verificationItems = document.querySelectorAll('#verificationRequestsList .request-item');
        
        const loginCount = loginItems.length;
        const verificationCount = verificationItems.length;
        const totalCount = loginCount + verificationCount;

        // 更新总数量徽章
        const pendingCountBadge = document.getElementById('pendingCount');
        if (pendingCountBadge) {
            pendingCountBadge.textContent = totalCount;
            pendingCountBadge.style.display = totalCount > 0 ? 'flex' : 'none';
            
            // 从红色微章获取值，更新导航栏计数
            const navPendingCount = document.getElementById('navPendingCount');
            if (navPendingCount) {
                navPendingCount.textContent = pendingCountBadge.textContent;
            }
        }
        
        // 更新登录请求标签计数
        const loginCountSpan = document.getElementById('loginRequestsCount');
        if (loginCountSpan) {
            loginCountSpan.textContent = loginCount;
        }
        
        // 更新验证请求标签计数
        const verificationCountSpan = document.getElementById('verificationRequestsCount');
        if (verificationCountSpan) {
            verificationCountSpan.textContent = verificationCount;
        }
    }

    switchSection(section) {
        // 更新导航按钮状态
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const navBtn = document.querySelector(`[data-section="${section}"]`);
        if (navBtn) navBtn.classList.add('active');

        // 更新内容区域显示
        document.querySelectorAll('.admin-section').forEach(sec => {
            sec.classList.remove('active');
        });
        const sectionEl = document.getElementById(`${section}Section`);
        if (sectionEl) sectionEl.classList.add('active');

        // 根据需要加载数据
        switch (section) {
            case 'members':
                this.loadMembers();
                break;
            case 'giftcards':
                this.loadGiftCards();
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
        }
        // 切换页面后更新通知计数
        this.updatePendingCount();
    }

    switchTab(tab) {
        // 更新标签按钮状态
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');

        // 更新标签内容显示
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tab}Tab`).classList.add('active');
        
        // 切换标签页后更新通知计数
        this.updatePendingCount();
    }

    showModal(title, content) {
        document.getElementById('modalBody').innerHTML = `<h3>${title}</h3>${content}`;
        document.getElementById('modal').style.display = 'block';
    }

    closeModal() {
        document.getElementById('modal').style.display = 'none';
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
                    <small>密码长度至少6位</small>
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

        // 绑定表单提交事件
        document.getElementById('changePasswordForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleChangePassword();
        });
    }

    // 处理密码修改
    async handleChangePassword() {
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        // 前端验证
        if (!currentPassword || !newPassword || !confirmPassword) {
            alert('请填写所有字段');
            return;
        }

        if (newPassword.length < 6) {
            alert('新密码长度至少6位');
            return;
        }

        if (newPassword !== confirmPassword) {
            alert('两次输入的新密码不一致');
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
                this.logout(); // 修改密码后需要重新登录
            } else {
                const error = await response.json();
                alert(error.error || '密码修改失败');
            }
        } catch (error) {
            alert('网络错误，请稍后重试');
        }
    }



    // 加载管理员列表
    async loadAdmins() {
        const container = document.getElementById('adminList');
        if (!container) return;
        container.innerHTML = '加载中...';
        try {
            const response = await this.apiRequest('/api/admin/admins');
            if (response && response.ok) {
                const admins = await response.json();
                container.innerHTML = this.renderAdminList(admins);
            } else {
                container.innerHTML = '加载失败';
            }
        } catch (e) {
            container.innerHTML = '加载失败';
        }
    }

    // 渲染管理员列表
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
                        ${admin.role === 'admin' && admin.id !== currentId ? `<button onclick=\"adminApp.deleteAdmin(${admin.id})\">删除</button>` : '<span style=\"color:#aaa\">不可操作</span>'}
                    </td>
                </tr>
            `).join('')}
        </tbody></table>`;
    }

    // 显示添加管理员模态框
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
        document.getElementById('addAdminForm').onsubmit = async (e) => {
            e.preventDefault();
            const username = document.getElementById('addAdminUsername').value.trim();
            const password = document.getElementById('addAdminPassword').value;
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

    // 删除管理员
    async deleteAdmin(id) {
        if (!confirm('确定要删除该管理员吗？')) return;
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
}

// 创建全局实例
window.adminApp = new AdminApp();