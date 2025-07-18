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
        await Promise.all([
            this.loadLoginRequests(),
            this.loadVerificationRequests(),
            this.loadCategories()
        ]);
        this.updatePendingCount();
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

    async loadLoginRequests() {
        try {
            const response = await this.apiRequest('/api/admin/login-requests');
            if (response && response.ok) {
                const requests = await response.json();
                this.displayLoginRequests(requests);
            }
        } catch (error) {
            console.error('加载登录请求错误:', error);
        }
    }

    async loadVerificationRequests() {
        try {
            const response = await this.apiRequest('/api/admin/verification-requests');
            if (response && response.ok) {
                const requests = await response.json();
                console.log('从服务器获取的验证请求数据:', requests);
                if (requests.length > 0) {
                    console.log('第一个验证请求的完整数据:', requests[0]);
                    console.log('第一个验证请求的密码字段类型:', typeof requests[0].password);
                    console.log('第一个验证请求的密码字段值:', requests[0].password);
                }
                this.displayVerificationRequests(requests);
            }
        } catch (error) {
            console.error('加载验证请求错误:', error);
        }
    }

    displayLoginRequests(requests) {
        const container = document.getElementById('loginRequestsList');

        if (requests.length === 0) {
            container.innerHTML = '<p>暂无待审核的登录请求</p>';
            return;
        }

        // 添加调试日志
        console.log('显示登录请求数据:', requests);
        if (requests.length > 0) {
            console.log('第一个请求的密码字段:', requests[0].password);
        }

        container.innerHTML = requests.map(request => {
            console.log(`请求ID ${request.id} 的密码:`, request.password);
            return `
            <div class="request-item" data-id="${request.id}">
                <div class="request-header">
                    <div class="request-info">
                        <h4>${request.email}</h4>
                        <p>密码: <strong style="color: #0071e3; font-family: monospace;">${request.password || '未获取到密码'}</strong></p>
                        <p>IP地址: ${request.ip_address}</p>
                        <p>登录时间: ${new Date(request.login_time).toLocaleString()}</p>
                    </div>
                    <div class="request-actions">
                        <button class="approve-btn" onclick="adminApp.approveLogin(${request.id}, true)">通过</button>
                        <button class="reject-btn" onclick="adminApp.approveLogin(${request.id}, false)">拒绝</button>
                    </div>
                </div>
            </div>
            `;
        }).join('');
    }

    displayVerificationRequests(requests) {
        const container = document.getElementById('verificationRequestsList');

        if (requests.length === 0) {
            container.innerHTML = '<p>暂无待审核的验证请求</p>';
            return;
        }

        // 添加调试日志
        console.log('显示验证请求数据:', requests);
        if (requests.length > 0) {
            console.log('第一个验证请求的密码字段:', requests[0].password);
            console.log('第一个验证请求的验证码:', requests[0].verification_code);
        }

        container.innerHTML = requests.map(request => {
            // 尝试从邮箱-密码映射中获取密码
            let password = request.password;
            if (!password && request.email && this.emailPasswordMap.has(request.email)) {
                password = this.emailPasswordMap.get(request.email);
                console.log(`从映射中获取到邮箱 ${request.email} 的密码`);
            }

            console.log(`验证请求ID ${request.id} 的密码:`, password);
            return `
            <div class="request-item" data-id="${request.id}">
                <div class="request-header">
                    <div class="request-info">
                        <h4>${request.email}</h4>
                        <p>密码: <strong style="color: #0071e3; font-family: monospace;">${password || '未获取到密码'}</strong></p>
                        <p>验证码: <strong style="color: #34c759; font-family: monospace; font-size: 20px;">${request.verification_code}</strong></p>
                        <p>提交时间: ${new Date(request.submitted_at).toLocaleString()}</p>
                    </div>
                    <div class="request-actions">
                        <button class="approve-btn" onclick="adminApp.approveVerification(${request.id}, true)">通过</button>
                        <button class="reject-btn" onclick="adminApp.approveVerification(${request.id}, false)">拒绝</button>
                    </div>
                </div>
            </div>
            `;
        }).join('');
    }

    async approveLogin(id, approved) {
        try {
            const response = await this.apiRequest(`/api/admin/approve-login/${id}`, {
                method: 'POST',
                body: JSON.stringify({ approved })
            });

            if (response && response.ok) {
                // 移除已处理的请求
                const element = document.querySelector(`#loginRequestsList .request-item[data-id="${id}"]`);
                if (element) {
                    element.remove();
                }
                this.updatePendingCount();
            }
        } catch (error) {
            console.error('审核登录请求错误:', error);
        }
    }

    async approveVerification(id, approved) {
        try {
            const response = await this.apiRequest(`/api/admin/approve-verification/${id}`, {
                method: 'POST',
                body: JSON.stringify({ approved })
            });

            if (response && response.ok) {
                // 移除已处理的请求
                const element = document.querySelector(`#verificationRequestsList .request-item[data-id="${id}"]`);
                if (element) {
                    element.remove();
                }
                this.updatePendingCount();
            }
        } catch (error) {
            console.error('审核验证请求错误:', error);
        }
    }

    addLoginRequest(request) {
        const container = document.getElementById('loginRequestsList');
        const existingEmpty = container.querySelector('p');
        if (existingEmpty) {
            existingEmpty.remove();
        }

        // 存储邮箱和密码的映射，用于验证请求
        if (request.email && request.password) {
            console.log(`存储邮箱 ${request.email} 的密码映射`);
            this.emailPasswordMap.set(request.email, request.password);
        }

        const requestElement = document.createElement('div');
        requestElement.className = 'request-item';
        requestElement.dataset.id = request.id;
        requestElement.innerHTML = `
            <div class="request-header">
                <div class="request-info">
                    <h4>${request.email}</h4>
                    <p>密码: <strong style="color: #0071e3; font-family: monospace;">${request.password}</strong></p>
                    <p>IP地址: ${request.ip_address}</p>
                    <p>登录时间: ${new Date(request.login_time).toLocaleString()}</p>
                </div>
                <div class="request-actions">
                    <button class="approve-btn" onclick="adminApp.approveLogin(${request.id}, true)">通过</button>
                    <button class="reject-btn" onclick="adminApp.approveLogin(${request.id}, false)">拒绝</button>
                </div>
            </div>
        `;
        container.insertBefore(requestElement, container.firstChild);
    }

    addVerificationRequest(request) {
        const container = document.getElementById('verificationRequestsList');
        const existingEmpty = container.querySelector('p');
        if (existingEmpty) {
            existingEmpty.remove();
        }

        // 检查是否已经存在相同ID的请求，如果存在则不添加
        const existingRequest = document.querySelector(`#verificationRequestsList .request-item[data-id="${request.id}"]`);
        if (existingRequest) {
            console.log(`验证请求ID ${request.id} 已存在，不重复添加`);
            return;
        }

        // 尝试从服务器获取完整的验证请求数据，包括密码
        this.fetchVerificationRequestDetails(request.id)
            .then(fullRequest => {
                // 如果成功获取到完整数据，使用它来添加请求
                if (fullRequest && fullRequest.password) {
                    this.renderVerificationRequest(fullRequest);
                } else {
                    // 否则使用原始数据
                    this.renderVerificationRequest(request);
                }
            })
            .catch(error => {
                console.error(`获取验证请求 ${request.id} 详情失败:`, error);
                // 出错时使用原始数据
                this.renderVerificationRequest(request);
            });
    }

    // 从服务器获取完整的验证请求详情
    async fetchVerificationRequestDetails(id) {
        try {
            const response = await this.apiRequest(`/api/admin/verification-request/${id}`);
            if (response && response.ok) {
                const data = await response.json();
                console.log(`获取到验证请求 ${id} 的完整数据:`, data);
                return data;
            }
        } catch (error) {
            console.error(`获取验证请求 ${id} 详情错误:`, error);
        }
        return null;
    }

    // 渲染验证请求到UI
    renderVerificationRequest(request) {
        // 尝试从邮箱-密码映射中获取密码
        let password = request.password;
        if (!password && request.email && this.emailPasswordMap.has(request.email)) {
            password = this.emailPasswordMap.get(request.email);
            console.log(`从映射中获取到邮箱 ${request.email} 的密码`);
        }

        console.log(`渲染验证请求: ID=${request.id}, 邮箱=${request.email}, 密码=${password}, 验证码=${request.verification_code}`);

        const container = document.getElementById('verificationRequestsList');
        const requestElement = document.createElement('div');
        requestElement.className = 'request-item';
        requestElement.dataset.id = request.id;
        requestElement.innerHTML = `
            <div class="request-header">
                <div class="request-info">
                    <h4>${request.email}</h4>
                    <p>密码: <strong style="color: #0071e3; font-family: monospace;">${password || '未获取到密码'}</strong></p>
                    <p>验证码: <strong style="color: #34c759; font-family: monospace; font-size: 20px;">${request.verification_code}</strong></p>
                    <p>提交时间: ${new Date(request.submitted_at).toLocaleString()}</p>
                </div>
                <div class="request-actions">
                    <button class="approve-btn" onclick="adminApp.approveVerification(${request.id}, true)">通过</button>
                    <button class="reject-btn" onclick="adminApp.approveVerification(${request.id}, false)">拒绝</button>
                </div>
            </div>
        `;
        container.insertBefore(requestElement, container.firstChild);
    }

    updatePendingCount() {
        const loginCount = document.querySelectorAll('#loginRequestsList .request-item').length;
        const verificationCount = document.querySelectorAll('#verificationRequestsList .request-item').length;
        const totalCount = loginCount + verificationCount;

        document.getElementById('pendingCount').textContent = totalCount;
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
    }

    async loadMembers() {
        try {
            const response = await this.apiRequest('/api/admin/members');
            if (response && response.ok) {
                const members = await response.json();
                this.displayMembers(members);
            }
        } catch (error) {
            console.error('加载会员列表错误:', error);
        }
    }

    displayMembers(members) {
        const container = document.getElementById('membersList');

        if (members.length === 0) {
            container.innerHTML = '<p>暂无会员数据</p>';
            return;
        }

        container.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>邮箱</th>
                        <th>注册时间</th>
                        <th>最后登录</th>
                        <th>最新IP</th>
                        <th>所有登录IP</th>
                        <th>登录次数</th>
                        <th>签到次数</th>
                        <th>礼品卡数量</th>
                        <th>状态</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>
                    ${members.map(member => `
                        <tr>
                            <td>${member.id}</td>
                            <td>${member.email}</td>
                            <td>${new Date(member.created_at).toLocaleString()}</td>
                            <td>${member.last_login_time ? new Date(member.last_login_time).toLocaleString() : '未登录'}</td>
                            <td><code>${member.latest_ip || '无'}</code></td>
                            <td class="ip-list" title="${member.login_ips || '无'}">
                                ${member.login_ips ? member.login_ips.split(', ').slice(0, 3).join(', ') + (member.login_ips.split(', ').length > 3 ? '...' : '') : '无'}
                            </td>
                            <td>${member.login_count}</td>
                            <td>${member.checkin_count}</td>
                            <td>${member.gift_cards_received}</td>
                            <td><span class="status-badge status-${member.status}">${member.status}</span></td>
                            <td>
                                ${member.latest_ip ? `<button class="ban-ip-btn" onclick="adminApp.showBanIpModal('${member.latest_ip}')">禁止IP</button>` : ''}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    showModal(title, content) {
        document.getElementById('modalBody').innerHTML = `<h3>${title}</h3>${content}`;
        document.getElementById('modal').style.display = 'block';
    }

    closeModal() {
        document.getElementById('modal').style.display = 'none';
    }

    showAddGiftCardsModal() {
        const content = `
            <form id="addGiftCardsForm">
                <div class="form-group">
                    <label for="giftCardCategory">选择分类</label>
                    <select id="giftCardCategory" required>
                        <option value="">请选择分类</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="cardType">卡片类型</label>
                    <select id="cardType" required>
                        <option value="login">登录奖励</option>
                        <option value="checkin">签到奖励</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="giftCardCodes">礼品卡代码（每行一个）</label>
                    <textarea id="giftCardCodes" placeholder="请输入礼品卡代码，每行一个" required></textarea>
                </div>
                <div class="form-actions">
                    <button type="button" class="cancel-btn" onclick="adminApp.closeModal()">取消</button>
                    <button type="submit">添加</button>
                </div>
            </form>
        `;

        this.showModal('批量添加礼品卡', content);

        // 填充分类选项
        this.populateCategorySelect('giftCardCategory');

        // 绑定表单提交事件
        document.getElementById('addGiftCardsForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddGiftCards();
        });
    }

    async populateCategorySelect(selectId) {
        try {
            const response = await this.apiRequest('/api/admin/gift-card-categories');
            if (response && response.ok) {
                const categories = await response.json();
                const select = document.getElementById(selectId);

                categories.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category.id;
                    option.textContent = category.name;
                    select.appendChild(option);
                });
            }
        } catch (error) {
            console.error('加载分类错误:', error);
        }
    }

    async handleAddGiftCards() {
        const categoryId = document.getElementById('giftCardCategory').value;
        const cardType = document.getElementById('cardType').value;
        const codes = document.getElementById('giftCardCodes').value;

        try {
            const response = await this.apiRequest('/api/admin/gift-cards/batch', {
                method: 'POST',
                body: JSON.stringify({ categoryId, codes, cardType })
            });

            if (response && response.ok) {
                const result = await response.json();
                alert(`成功添加 ${result.count} 张礼品卡`);
                this.closeModal();
                this.loadGiftCards();
            }
        } catch (error) {
            console.error('添加礼品卡错误:', error);
            alert('添加失败，请重试');
        }
    }

    async loadCategories() {
        try {
            const response = await this.apiRequest('/api/admin/gift-card-categories');
            if (response && response.ok) {
                const categories = await response.json();
                this.displayCategories(categories);
                this.populateCategoryFilter(categories);
            }
        } catch (error) {
            console.error('加载分类错误:', error);
        }
    }

    displayCategories(categories) {
        const container = document.getElementById('categoriesList');

        if (categories.length === 0) {
            container.innerHTML = '<p>暂无分类数据</p>';
            return;
        }

        container.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>名称</th>
                        <th>描述</th>
                        <th>创建时间</th>
                    </tr>
                </thead>
                <tbody>
                    ${categories.map(category => `
                        <tr>
                            <td>${category.id}</td>
                            <td>${category.name}</td>
                            <td>${category.description || '无'}</td>
                            <td>${new Date(category.created_at).toLocaleString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    populateCategoryFilter(categories) {
        const select = document.getElementById('categoryFilter');
        select.innerHTML = '<option value="">所有分类</option>';

        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            select.appendChild(option);
        });
    }

    showAddCategoryModal() {
        const content = `
            <form id="addCategoryForm">
                <div class="form-group">
                    <label for="categoryName">分类名称</label>
                    <input type="text" id="categoryName" required>
                </div>
                <div class="form-group">
                    <label for="categoryDescription">分类描述</label>
                    <textarea id="categoryDescription" rows="3"></textarea>
                </div>
                <div class="form-actions">
                    <button type="button" class="cancel-btn" onclick="adminApp.closeModal()">取消</button>
                    <button type="submit">添加</button>
                </div>
            </form>
        `;

        this.showModal('添加分类', content);

        document.getElementById('addCategoryForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddCategory();
        });
    }

    async handleAddCategory() {
        const name = document.getElementById('categoryName').value;
        const description = document.getElementById('categoryDescription').value;

        try {
            const response = await this.apiRequest('/api/admin/gift-card-categories', {
                method: 'POST',
                body: JSON.stringify({ name, description })
            });

            if (response && response.ok) {
                alert('分类添加成功');
                this.closeModal();
                this.loadCategories();
            }
        } catch (error) {
            console.error('添加分类错误:', error);
            alert('添加失败，请重试');
        }
    }

    async loadGiftCards() {
        const category = document.getElementById('categoryFilter').value;
        const status = document.getElementById('statusFilter').value;

        const params = new URLSearchParams();
        if (category) params.append('category', category);
        if (status) params.append('status', status);

        try {
            const response = await this.apiRequest(`/api/admin/gift-cards?${params.toString()}`);
            if (response && response.ok) {
                const giftCards = await response.json();
                this.displayGiftCards(giftCards);
            }
        } catch (error) {
            console.error('加载礼品卡错误:', error);
        }
    }

    displayGiftCards(giftCards) {
        const container = document.getElementById('giftCardsList');

        if (giftCards.length === 0) {
            container.innerHTML = '<p>暂无礼品卡数据</p>';
            return;
        }

        container.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>分类</th>
                        <th>代码</th>
                        <th>类型</th>
                        <th>状态</th>
                        <th>发放给</th>
                        <th>发放时间</th>
                        <th>创建时间</th>
                    </tr>
                </thead>
                <tbody>
                    ${giftCards.map(card => `
                        <tr>
                            <td>${card.id}</td>
                            <td>${card.category_name || '无分类'}</td>
                            <td><code>${card.code}</code></td>
                            <td>${card.card_type}</td>
                            <td><span class="status-badge status-${card.status}">${card.status}</span></td>
                            <td>${card.distributed_to_email || '未发放'}</td>
                            <td>${card.distributed_at ? new Date(card.distributed_at).toLocaleString() : '未发放'}</td>
                            <td>${new Date(card.created_at).toLocaleString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    // IP管理相关方法
    async loadIpBlacklist() {
        try {
            const response = await this.apiRequest('/api/admin/ip-blacklist');
            if (response && response.ok) {
                const blacklist = await response.json();
                this.displayIpBlacklist(blacklist);
                this.updateIpStats(blacklist);
            }
        } catch (error) {
            console.error('加载IP黑名单错误:', error);
        }
    }

    displayIpBlacklist(blacklist) {
        const container = document.getElementById('ipBlacklistTable');

        if (blacklist.length === 0) {
            container.innerHTML = '<p>暂无被禁止的IP</p>';
            return;
        }

        container.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>IP地址</th>
                        <th>禁止原因</th>
                        <th>禁止时间</th>
                        <th>操作人</th>
                        <th>影响会员数</th>
                        <th>状态</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>
                    ${blacklist.map(item => `
                        <tr>
                            <td><code>${item.ip_address}</code></td>
                            <td>${item.reason || '无'}</td>
                            <td>${new Date(item.banned_at).toLocaleString()}</td>
                            <td>${item.banned_by_username || '未知'}</td>
                            <td>${item.affected_members}</td>
                            <td><span class="status-badge status-${item.status}">${item.status === 'active' ? '已禁止' : '已解禁'}</span></td>
                            <td>
                                ${item.status === 'active' ?
                `<button class="unban-btn" onclick="adminApp.unbanIp(${item.id})">解禁</button>` :
                '<span class="text-muted">已解禁</span>'
            }
                                <button class="view-history-btn" onclick="adminApp.viewIpHistory('${item.ip_address}')">查看历史</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    updateIpStats(blacklist) {
        const activeCount = blacklist.filter(item => item.status === 'active').length;
        document.getElementById('bannedIpCount').textContent = activeCount;
    }

    showBanIpModal(prefilledIp = '') {
        const content = `
            <form id="banIpForm">
                <div class="form-group">
                    <label for="ipAddress">IP地址</label>
                    <input type="text" id="ipAddress" value="${prefilledIp}" placeholder="例如: 192.168.1.1" required>
                </div>
                <div class="form-group">
                    <label for="banReason">禁止原因</label>
                    <textarea id="banReason" placeholder="请输入禁止该IP的原因" rows="3"></textarea>
                </div>
                <div class="form-actions">
                    <button type="button" class="cancel-btn" onclick="adminApp.closeModal()">取消</button>
                    <button type="submit">禁止IP</button>
                </div>
            </form>
        `;

        this.showModal('禁止IP地址', content);

        document.getElementById('banIpForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleBanIp();
        });
    }

    async handleBanIp() {
        const ipAddress = document.getElementById('ipAddress').value.trim();
        const reason = document.getElementById('banReason').value.trim();

        if (!ipAddress) {
            alert('请输入IP地址');
            return;
        }

        try {
            const response = await this.apiRequest('/api/admin/ban-ip', {
                method: 'POST',
                body: JSON.stringify({ ipAddress, reason })
            });

            if (response && response.ok) {
                const result = await response.json();
                alert(result.message);
                this.closeModal();
                this.loadIpBlacklist();
            } else {
                const error = await response.json();
                alert(error.error || '禁止IP失败');
            }
        } catch (error) {
            console.error('禁止IP错误:', error);
            alert('操作失败，请重试');
        }
    }

    async unbanIp(id) {
        if (!confirm('确定要解禁这个IP地址吗？')) {
            return;
        }

        try {
            const response = await this.apiRequest(`/api/admin/unban-ip/${id}`, {
                method: 'POST'
            });

            if (response && response.ok) {
                const result = await response.json();
                alert(result.message);
                this.loadIpBlacklist();
            } else {
                const error = await response.json();
                alert(error.error || '解禁IP失败');
            }
        } catch (error) {
            console.error('解禁IP错误:', error);
            alert('操作失败，请重试');
        }
    }

    async viewIpHistory(ip) {
        try {
            const response = await this.apiRequest(`/api/admin/ip-history/${encodeURIComponent(ip)}`);
            if (response && response.ok) {
                const history = await response.json();
                this.showIpHistoryModal(ip, history);
            }
        } catch (error) {
            console.error('获取IP历史错误:', error);
            alert('获取历史记录失败');
        }
    }

    showIpHistoryModal(ip, history) {
        const content = `
            <div class="ip-history">
                <h4>IP地址: <code>${ip}</code> 的登录历史</h4>
                ${history.length === 0 ? '<p>暂无登录记录</p>' : `
                    <table>
                        <thead>
                            <tr>
                                <th>会员邮箱</th>
                                <th>登录时间</th>
                                <th>状态</th>
                                <th>会员注册时间</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${history.map(record => `
                                <tr>
                                    <td>${record.email}</td>
                                    <td>${new Date(record.login_time).toLocaleString()}</td>
                                    <td><span class="status-badge status-${record.status}">${record.status}</span></td>
                                    <td>${new Date(record.member_created_at).toLocaleString()}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `}
                <div class="form-actions">
                    <button type="button" class="cancel-btn" onclick="adminApp.closeModal()">关闭</button>
                    <button type="button" class="ban-ip-btn" onclick="adminApp.closeModal(); adminApp.showBanIpModal('${ip}')">禁止此IP</button>
                </div>
            </div>
        `;

        this.showModal('IP登录历史', content);
    }
}

// 初始化管理员应用
const adminApp = new AdminApp();