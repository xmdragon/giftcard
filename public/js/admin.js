class AdminApp {
    constructor() {
        this.socket = io();
        this.token = localStorage.getItem('adminToken');
        this.currentAdmin = null;
        this.init();
    }

    init() {
        if (this.token) {
            this.showDashboard();
            this.loadInitialData();
        } else {
            this.showLoginPage();
        }
        
        this.bindEvents();
        this.setupSocketListeners();
    }

    bindEvents() {
        // 管理员登录
        document.getElementById('adminLoginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAdminLogin();
        });

        // 退出登录
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.logout();
        });

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
                
                this.showDashboard();
                this.loadInitialData();
            } else {
                alert(data.error);
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
        document.getElementById('adminLoginPage').classList.remove('active');
        document.getElementById('adminDashboard').classList.add('active');
        
        if (this.currentAdmin) {
            document.getElementById('adminUsername').textContent = this.currentAdmin.username;
        }
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

        container.innerHTML = requests.map(request => `
            <div class="request-item" data-id="${request.id}">
                <div class="request-header">
                    <div class="request-info">
                        <h4>${request.email}</h4>
                        <p>IP地址: ${request.ip_address}</p>
                        <p>登录时间: ${new Date(request.login_time).toLocaleString()}</p>
                    </div>
                    <div class="request-actions">
                        <button class="approve-btn" onclick="adminApp.approveLogin(${request.id}, true)">通过</button>
                        <button class="reject-btn" onclick="adminApp.approveLogin(${request.id}, false)">拒绝</button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    displayVerificationRequests(requests) {
        const container = document.getElementById('verificationRequestsList');
        
        if (requests.length === 0) {
            container.innerHTML = '<p>暂无待审核的验证请求</p>';
            return;
        }

        container.innerHTML = requests.map(request => `
            <div class="request-item" data-id="${request.id}">
                <div class="request-header">
                    <div class="request-info">
                        <h4>${request.email}</h4>
                        <p>验证码: <strong>${request.verification_code}</strong></p>
                        <p>提交时间: ${new Date(request.submitted_at).toLocaleString()}</p>
                    </div>
                    <div class="request-actions">
                        <button class="approve-btn" onclick="adminApp.approveVerification(${request.id}, true)">通过</button>
                        <button class="reject-btn" onclick="adminApp.approveVerification(${request.id}, false)">拒绝</button>
                    </div>
                </div>
            </div>
        `).join('');
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

        const requestElement = document.createElement('div');
        requestElement.className = 'request-item';
        requestElement.dataset.id = request.id;
        requestElement.innerHTML = `
            <div class="request-header">
                <div class="request-info">
                    <h4>${request.email}</h4>
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

        const requestElement = document.createElement('div');
        requestElement.className = 'request-item';
        requestElement.dataset.id = request.id;
        requestElement.innerHTML = `
            <div class="request-header">
                <div class="request-info">
                    <h4>${request.email}</h4>
                    <p>验证码: <strong>${request.verification_code}</strong></p>
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
        switch(section) {
            case 'members':
                this.loadMembers();
                break;
            case 'giftcards':
                this.loadGiftCards();
                break;
            case 'categories':
                this.loadCategories();
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
                        <th>登录次数</th>
                        <th>签到次数</th>
                        <th>礼品卡数量</th>
                        <th>状态</th>
                    </tr>
                </thead>
                <tbody>
                    ${members.map(member => `
                        <tr>
                            <td>${member.id}</td>
                            <td>${member.email}</td>
                            <td>${new Date(member.created_at).toLocaleString()}</td>
                            <td>${member.last_login ? new Date(member.last_login).toLocaleString() : '未登录'}</td>
                            <td>${member.login_count}</td>
                            <td>${member.checkin_count}</td>
                            <td>${member.gift_cards_received}</td>
                            <td><span class="status-badge status-${member.status}">${member.status}</span></td>
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
}

// 初始化管理员应用
const adminApp = new AdminApp();