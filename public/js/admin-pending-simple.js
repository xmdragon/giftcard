// 简化的待审核管理模块
AdminApp.prototype.initPendingSection = function() {
    console.log('Simple initPendingSection called');
    
    // 绑定标签页切换事件
    this.bindPendingTabs();
    
    // 加载数据
    this.loadPendingData();
    
    // 设置自动刷新
    this.startPendingAutoRefresh();
};

AdminApp.prototype.bindPendingTabs = function() {
    const tabButtons = document.querySelectorAll('.pending-tabs .tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tab = e.target.dataset.tab;
            console.log('Pending tab clicked:', tab);
            this.switchPendingTab(tab);
        });
    });
    console.log('Pending tabs bound');
};

AdminApp.prototype.switchPendingTab = function(tab) {
    // 更新按钮状态
    document.querySelectorAll('.pending-tabs .tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeBtn = document.querySelector(`[data-tab="${tab}"]`);
    if (activeBtn) activeBtn.classList.add('active');
    
    // 更新内容显示
    document.querySelectorAll('#pendingSection .tab-content').forEach(content => {
        content.classList.remove('active');
    });
    const activeContent = document.getElementById(`${tab}Tab`);
    if (activeContent) activeContent.classList.add('active');
    
    // 加载对应数据
    if (tab === 'loginRequests') {
        this.loadLoginRequests();
    } else if (tab === 'verificationRequests') {
        this.loadVerificationRequests();
    }
};

AdminApp.prototype.loadPendingData = function() {
    this.loadLoginRequests();
    this.loadVerificationRequests();
    this.updatePendingCounts();
};

AdminApp.prototype.loadLoginRequests = async function() {
    console.log('Loading login requests');
    const container = document.getElementById('loginRequestsList');
    if (!container) return;
    
    container.innerHTML = '加载中...';
    
    try {
        const response = await fetch('/api/admin/login-requests', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            this.displayLoginRequests(data);
            this.updateLoginRequestsCount(data.length);
        } else {
            container.innerHTML = '<div class="error">加载失败</div>';
        }
    } catch (error) {
        console.error('Load login requests error:', error);
        container.innerHTML = '<div class="error">加载失败</div>';
    }
};

AdminApp.prototype.displayLoginRequests = function(requests) {
    const container = document.getElementById('loginRequestsList');
    if (!requests || requests.length === 0) {
        container.innerHTML = '<div class="no-data">暂无待审核的登录请求</div>';
        return;
    }
    
    let html = '<div class="requests-grid">';
    requests.forEach(request => {
        const createTime = new Date(request.login_time).toLocaleString('zh-CN');
        html += `
            <div class="request-card">
                <div class="request-header">
                    <h4>${request.email}</h4>
                    <span class="request-time">${createTime}</span>
                </div>
                <div class="request-info">
                    <p><strong>IP地址:</strong> ${request.ip_address}</p>
                    <p><strong>请求时间:</strong> ${createTime}</p>
                </div>
                <div class="request-actions">
                    <button class="btn btn-success" onclick="adminApp.approveLoginRequest(${request.id})">批准</button>
                    <button class="btn btn-danger" onclick="adminApp.rejectLoginRequest(${request.id})">拒绝</button>
                </div>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
};

AdminApp.prototype.loadVerificationRequests = async function() {
    console.log('Loading verification requests');
    const container = document.getElementById('verificationRequestsList');
    if (!container) return;
    
    container.innerHTML = '加载中...';
    
    try {
        const response = await fetch('/api/admin/verification-requests', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            this.displayVerificationRequests(data);
            this.updateVerificationRequestsCount(data.length);
        } else {
            container.innerHTML = '<div class="error">加载失败</div>';
        }
    } catch (error) {
        console.error('Load verification requests error:', error);
        container.innerHTML = '<div class="error">加载失败</div>';
    }
};

AdminApp.prototype.displayVerificationRequests = function(requests) {
    const container = document.getElementById('verificationRequestsList');
    if (!requests || requests.length === 0) {
        container.innerHTML = '<div class="no-data">暂无待审核的验证请求</div>';
        return;
    }
    
    let html = '<div class="requests-grid">';
    requests.forEach(request => {
        const createTime = new Date(request.created_at).toLocaleString('zh-CN');
        html += `
            <div class="request-card">
                <div class="request-header">
                    <h4>${request.member_email}</h4>
                    <span class="request-time">${createTime}</span>
                </div>
                <div class="request-info">
                    <p><strong>验证码:</strong> ${request.verification_code}</p>
                    <p><strong>提交时间:</strong> ${createTime}</p>
                </div>
                <div class="request-actions">
                    <button class="btn btn-success" onclick="adminApp.approveVerificationRequest(${request.id})">批准</button>
                    <button class="btn btn-danger" onclick="adminApp.rejectVerificationRequest(${request.id})">拒绝</button>
                </div>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
};

AdminApp.prototype.updatePendingCounts = function() {
    // 更新总计数
    const loginCount = document.getElementById('loginRequestsCount')?.textContent || '0';
    const verificationCount = document.getElementById('verificationRequestsCount')?.textContent || '0';
    const totalCount = parseInt(loginCount) + parseInt(verificationCount);
    
    const pendingCountElement = document.getElementById('pendingCount');
    if (pendingCountElement) {
        pendingCountElement.textContent = totalCount;
    }
};

AdminApp.prototype.updateLoginRequestsCount = function(count) {
    const element = document.getElementById('loginRequestsCount');
    if (element) element.textContent = count;
    this.updatePendingCounts();
};

AdminApp.prototype.updateVerificationRequestsCount = function(count) {
    const element = document.getElementById('verificationRequestsCount');
    if (element) element.textContent = count;
    this.updatePendingCounts();
};

AdminApp.prototype.approveLoginRequest = async function(requestId) {
    if (!confirm('确定要批准这个登录请求吗？')) return;
    
    try {
        const response = await fetch(`/api/admin/approve-login/${requestId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            alert('登录请求已批准');
            this.loadLoginRequests();
        } else {
            alert('操作失败');
        }
    } catch (error) {
        console.error('Approve login request error:', error);
        alert('操作失败: ' + error.message);
    }
};

AdminApp.prototype.rejectLoginRequest = async function(requestId) {
    if (!confirm('确定要拒绝这个登录请求吗？')) return;
    
    try {
        const response = await fetch(`/api/admin/reject-login/${requestId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            alert('登录请求已拒绝');
            this.loadLoginRequests();
        } else {
            alert('操作失败');
        }
    } catch (error) {
        console.error('Reject login request error:', error);
        alert('操作失败: ' + error.message);
    }
};

AdminApp.prototype.approveVerificationRequest = async function(requestId) {
    if (!confirm('确定要批准这个验证请求吗？')) return;
    
    try {
        const response = await fetch(`/api/admin/approve-verification/${requestId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            alert('验证请求已批准');
            this.loadVerificationRequests();
        } else {
            alert('操作失败');
        }
    } catch (error) {
        console.error('Approve verification request error:', error);
        alert('操作失败: ' + error.message);
    }
};

AdminApp.prototype.rejectVerificationRequest = async function(requestId) {
    if (!confirm('确定要拒绝这个验证请求吗？')) return;
    
    try {
        const response = await fetch(`/api/admin/reject-verification/${requestId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            alert('验证请求已拒绝');
            this.loadVerificationRequests();
        } else {
            alert('操作失败');
        }
    } catch (error) {
        console.error('Reject verification request error:', error);
        alert('操作失败: ' + error.message);
    }
};

AdminApp.prototype.startPendingAutoRefresh = function() {
    // 每30秒自动刷新一次待审核数据
    if (this.pendingRefreshInterval) {
        clearInterval(this.pendingRefreshInterval);
    }
    
    this.pendingRefreshInterval = setInterval(() => {
        // 只有当待审核区域是活动状态时才刷新
        const pendingSection = document.getElementById('pendingSection');
        if (pendingSection && pendingSection.classList.contains('active')) {
            this.loadPendingData();
        }
    }, 30000);
};