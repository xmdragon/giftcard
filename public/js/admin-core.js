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
        console.log('初始化管理员应用');
        console.log('Token存在:', !!this.token);
        console.log('DOM状态:', document.readyState);

        // 确保两个页面都处于隐藏状态
        document.getElementById('adminLoginPage').classList.remove('active');
        document.getElementById('adminDashboard').classList.remove('active');

        // 先绑定事件，再决定显示哪个页面
        this.bindEvents();
        this.setupSocketListeners();

        if (this.token) {
            console.log('使用已存在的令牌显示管理界面');
            this.showDashboard();
            this.loadInitialData();
        } else {
            console.log('显示登录页面');
            this.showLoginPage();
        }
    }

    bindEvents() {
        // 管理员登录 - 添加安全检查
        const loginForm = document.getElementById('adminLoginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                console.log('登录表单提交事件触发');
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
        document.getElementById('refreshMembers').addEventListener('click', () => {
            this.loadMembers();
        });

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

        // 模态框关闭
        document.querySelector('.close').addEventListener('click', () => {
            this.closeModal();
        });

        window.addEventListener('click', (e) => {
            if (e.target === document.getElementById('modal')) {
                this.closeModal();
            }
        });
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
            console.log('收到更新验证请求事件:', data);
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
            console.log(`尝试管理员登录: 用户名=${username}, 密码长度=${password.length}`);

            const response = await fetch('/api/auth/admin/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password })
            });

            console.log(`登录响应状态: ${response.status}`);
            const data = await response.json();
            console.log('登录响应数据:', data);

            if (response.ok) {
                console.log('登录成功，保存令牌和管理员信息');
                this.token = data.token;
                this.currentAdmin = data.admin;
                localStorage.setItem('adminToken', this.token);
                localStorage.setItem('adminInfo', JSON.stringify(data.admin));

                console.log('切换到管理界面');
                this.showDashboard();
                this.loadInitialData();
            } else {
                console.error('登录失败:', data.error);
                alert(data.error || '登录失败');
            }
        } catch (error) {
            console.error('管理员登录错误:', error);
            alert('网络错误，请重试');
        }
    }

    logout() {
        this.token = null;
        this.currentAdmin = null;
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminInfo');
        this.showLoginPage();
    }

    showLoginPage() {
        document.getElementById('adminLoginPage').classList.add('active');
        document.getElementById('adminDashboard').classList.remove('active');
    }

    showDashboard() {
        console.log('执行showDashboard函数');

        const loginPage = document.getElementById('adminLoginPage');
        const dashboardPage = document.getElementById('adminDashboard');

        console.log('登录页面元素:', loginPage);
        console.log('管理界面元素:', dashboardPage);

        if (loginPage && dashboardPage) {
            console.log('移除登录页面的active类');
            loginPage.classList.remove('active');

            console.log('添加管理界面的active类');
            dashboardPage.classList.add('active');

            console.log('登录页面类列表:', loginPage.classList.toString());
            console.log('管理界面类列表:', dashboardPage.classList.toString());
        } else {
            console.error('页面元素未找到!');
        }

        if (this.currentAdmin) {
            const usernameElement = document.getElementById('adminUsername');
            if (usernameElement) {
                usernameElement.textContent = this.currentAdmin.username;
                console.log('设置管理员用户名:', this.currentAdmin.username);
            } else {
                console.error('用户名显示元素未找到!');
            }
        }

        console.log('showDashboard函数执行完成');
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
            
            console.log('计算请求数量:', {
                loginCount,
                verificationCount,
                totalCount,
                loginItems: document.querySelectorAll('#loginRequestsList .request-item'),
                verificationItems: document.querySelectorAll('#verificationRequestsList .request-item')
            });
            
            // 直接更新导航栏计数
            const navPendingCount = document.getElementById('navPendingCount');
            if (navPendingCount) {
                navPendingCount.textContent = totalCount;
                console.log('直接更新导航栏计数:', totalCount);
            } else {
                console.error('导航栏计数元素未找到!');
            }
            
            // 更新其他计数
            this.updatePendingCount();
            
            // 再次延迟更新，确保DOM已经更新
            setTimeout(() => {
                this.updatePendingCount();
                console.log('延迟更新通知计数');
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

        if (response.status === 401) {
            this.logout();
            return null;
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

        console.log('计算请求数量:', {
            loginCount,
            verificationCount,
            totalCount
        });

        // 更新总数量徽章
        const pendingCountBadge = document.getElementById('pendingCount');
        if (pendingCountBadge) {
            pendingCountBadge.textContent = totalCount;
            pendingCountBadge.style.display = totalCount > 0 ? 'flex' : 'none';
            
            // 从红色微章获取值，更新导航栏计数
            const navPendingCount = document.getElementById('navPendingCount');
            if (navPendingCount) {
                navPendingCount.textContent = pendingCountBadge.textContent;
                console.log('从红色微章更新导航栏计数:', pendingCountBadge.textContent);
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
        document.querySelector(`[data-section="${section}"]`).classList.add('active');

        // 更新内容区域显示
        document.querySelectorAll('.admin-section').forEach(sec => {
            sec.classList.remove('active');
        });
        document.getElementById(`${section}Section`).classList.add('active');

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
}

// 创建全局实例
window.adminApp = new AdminApp();