// 用户行为追踪管理模块

AdminApp.prototype.initTrackingSection = function() {
    // 检查权限（超级管理员跳过权限检查）
    if (this.currentAdmin && this.currentAdmin.role !== 'super' && !this.hasPermissionPoint('user-tracking:view')) {
        const container = document.getElementById('trackingList');
        if (container) {
            container.innerHTML = '<div class="error">您没有权限查看用户行为数据</div>';
        }
        return;
    }
    
    // 初始化追踪列表
    this.loadTrackingList();
    
    // 绑定事件监听器
    this.bindTrackingEvents();
    
    // 初始化标签页
    this.initTrackingTabs();
};

AdminApp.prototype.bindTrackingEvents = function() {
    // 刷新按钮
    const refreshBtn = document.getElementById('refreshTrackingBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            this.loadTrackingList();
        });
    }
    
    // 导出按钮
    const exportBtn = document.getElementById('exportTrackingBtn');
    if (exportBtn) {
        if (this.currentAdmin && (this.currentAdmin.role === 'super' || this.hasPermissionPoint('user-tracking:export'))) {
            exportBtn.addEventListener('click', () => {
                this.exportTrackingData();
            });
        } else {
            exportBtn.style.display = 'none';
        }
    }
    
    // 筛选按钮
    const applyFilterBtn = document.getElementById('applyTrackingFilter');
    if (applyFilterBtn) {
        applyFilterBtn.addEventListener('click', () => {
            this.loadTrackingList(1);
        });
    }
    
    // 重置筛选按钮
    const resetFilterBtn = document.getElementById('resetTrackingFilter');
    if (resetFilterBtn) {
        resetFilterBtn.addEventListener('click', () => {
            this.resetTrackingFilters();
        });
    }
    
    // 加载统计按钮
    const loadStatsBtn = document.getElementById('loadStatsBtn');
    if (loadStatsBtn) {
        loadStatsBtn.addEventListener('click', () => {
            this.loadTrackingStats();
        });
    }
};

AdminApp.prototype.initTrackingTabs = function() {
    const tabButtons = document.querySelectorAll('#trackingSection .tab-btn');
    const tabContents = document.querySelectorAll('#trackingSection .tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.dataset.tab;
            
            // 更新按钮状态
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // 更新内容显示
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === tabName + 'Tab') {
                    content.classList.add('active');
                }
            });
            
            // 根据标签页加载对应内容
            if (tabName === 'trackingStats') {
                if (this.currentAdmin && (this.currentAdmin.role === 'super' || this.hasPermissionPoint('user-tracking:stats'))) {
                    this.loadTrackingStats();
                } else {
                    const container = document.getElementById('trackingStats');
                    if (container) {
                        container.innerHTML = '<div class="error">您没有权限查看统计数据</div>';
                    }
                }
            }
        });
    });
};

AdminApp.prototype.loadTrackingList = function(page = 1) {
    const container = document.getElementById('trackingList');
    if (!container) return;
    
    container.innerHTML = '加载中...';
    
    // 获取筛选条件
    const filters = this.getTrackingFilters();
    
    const params = new URLSearchParams({
        page: page,
        limit: 20,
        ...filters
    });
    
    fetch(`/api/tracking/list?${params}`, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                this.renderTrackingList(data.data);
                this.renderTrackingPagination(data.pagination);
            } else {
                container.innerHTML = '<div class="error">加载失败: ' + data.error + '</div>';
            }
        })
        .catch(error => {
            console.error('加载追踪数据失败:', error);
            container.innerHTML = '<div class="error">加载失败，请重试</div>';
        });
};

AdminApp.prototype.getTrackingFilters = function() {
    const filters = {};
    
    const userType = document.getElementById('userTypeFilter')?.value;
    if (userType) filters.userType = userType;
    
    const pageName = document.getElementById('pageNameFilter')?.value;
    if (pageName) filters.pageName = pageName;
    
    const startDate = document.getElementById('startDateFilter')?.value;
    if (startDate) filters.startDate = startDate;
    
    const endDate = document.getElementById('endDateFilter')?.value;
    if (endDate) filters.endDate = endDate;
    
    return filters;
};

AdminApp.prototype.resetTrackingFilters = function() {
    document.getElementById('userTypeFilter').value = '';
    document.getElementById('pageNameFilter').value = '';
    document.getElementById('startDateFilter').value = '';
    document.getElementById('endDateFilter').value = '';
    
    this.loadTrackingList(1);
};

AdminApp.prototype.renderTrackingList = function(records) {
    const container = document.getElementById('trackingList');
    if (!container) return;
    
    if (!records || records.length === 0) {
        container.innerHTML = '<div class="no-data">暂无追踪数据</div>';
        return;
    }
    
    let html = `
        <table class="admin-table">
            <thead>
                <tr>
                    <th>会话ID/用户</th>
                    <th>用户类型</th>
                    <th>页面名称</th>
                    <th>停留时长</th>
                    <th>IP地址</th>
                    <th>进入时间</th>
                    <th>离开时间</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    records.forEach(record => {
        const displayId = record.user_type === 'member' 
            ? record.session_id.replace('member_', '会员ID: ')
            : record.session_id.replace('guest_', '游客');
            
        const enterTime = new Date(record.enter_time).toLocaleString('zh-CN');
        const leaveTime = record.leave_time 
            ? new Date(record.leave_time).toLocaleString('zh-CN')
            : '未离开';
            
        const duration = record.stay_duration > 0 
            ? this.formatDuration(record.stay_duration)
            : '0秒';
        
        html += `
            <tr>
                <td>${displayId}</td>
                <td>
                    <span class="user-type ${record.user_type}">
                        ${record.user_type === 'guest' ? '游客' : '会员'}
                    </span>
                </td>
                <td>${record.page_name}</td>
                <td>${duration}</td>
                <td>${record.ip_address || '-'}</td>
                <td>${enterTime}</td>
                <td>${leaveTime}</td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
};

AdminApp.prototype.renderTrackingPagination = function(pagination) {
    const container = document.getElementById('trackingPagination');
    if (!container) return;
    
    if (pagination.pages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let html = '<div class="pagination-info">第 ' + pagination.page + ' 页，共 ' + pagination.pages + ' 页</div>';
    html += '<div class="pagination-buttons">';
    
    // 上一页按钮
    if (pagination.page > 1) {
        html += `<button onclick="adminApp.loadTrackingList(${pagination.page - 1})">上一页</button>`;
    }
    
    // 页码按钮
    const startPage = Math.max(1, pagination.page - 2);
    const endPage = Math.min(pagination.pages, pagination.page + 2);
    
    for (let i = startPage; i <= endPage; i++) {
        const activeClass = i === pagination.page ? ' active' : '';
        html += `<button class="page-btn${activeClass}" onclick="adminApp.loadTrackingList(${i})">${i}</button>`;
    }
    
    // 下一页按钮
    if (pagination.page < pagination.pages) {
        html += `<button onclick="adminApp.loadTrackingList(${pagination.page + 1})">下一页</button>`;
    }
    
    html += '</div>';
    container.innerHTML = html;
};

AdminApp.prototype.loadTrackingStats = function() {
    const container = document.getElementById('trackingStats');
    if (!container) return;
    
    container.innerHTML = '加载中...';
    
    // 获取日期范围
    const startDate = document.getElementById('statsStartDate')?.value;
    const endDate = document.getElementById('statsEndDate')?.value;
    
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    fetch(`/api/tracking/statistics?${params}`, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                this.renderTrackingStats(data.data);
            } else {
                container.innerHTML = '<div class="error">加载失败: ' + data.error + '</div>';
            }
        })
        .catch(error => {
            console.error('加载统计数据失败:', error);
            container.innerHTML = '<div class="error">加载失败，请重试</div>';
        });
};

AdminApp.prototype.renderTrackingStats = function(stats) {
    const container = document.getElementById('trackingStats');
    if (!container) return;
    
    let html = '<div class="stats-grid">';
    
    // 基础统计
    html += `
        <div class="stats-section">
            <h3>基础统计</h3>
            <div class="stats-cards">
                <div class="stat-card">
                    <div class="stat-value">${stats.basic.total_visits || 0}</div>
                    <div class="stat-label">总访问量</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${stats.basic.unique_visitors || 0}</div>
                    <div class="stat-label">独立访客</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${stats.basic.guest_visitors || 0}</div>
                    <div class="stat-label">游客数</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${stats.basic.member_visitors || 0}</div>
                    <div class="stat-label">会员数</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${this.formatDuration(stats.basic.avg_duration || 0)}</div>
                    <div class="stat-label">平均停留时长</div>
                </div>
            </div>
        </div>
    `;
    
    // 页面统计
    if (stats.pages && stats.pages.length > 0) {
        html += `
            <div class="stats-section">
                <h3>页面访问统计</h3>
                <table class="stats-table">
                    <thead>
                        <tr>
                            <th>页面名称</th>
                            <th>访问次数</th>
                            <th>独立访客</th>
                            <th>平均停留时长</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        stats.pages.forEach(page => {
            html += `
                <tr>
                    <td>${page.page_name}</td>
                    <td>${page.visits}</td>
                    <td>${page.unique_visitors}</td>
                    <td>${this.formatDuration(page.avg_duration || 0)}</td>
                </tr>
            `;
        });
        
        html += '</tbody></table></div>';
    }
    
    // 用户类型统计
    if (stats.userTypes && stats.userTypes.length > 0) {
        html += `
            <div class="stats-section">
                <h3>用户类型统计</h3>
                <table class="stats-table">
                    <thead>
                        <tr>
                            <th>用户类型</th>
                            <th>访问次数</th>
                            <th>独立访客</th>
                            <th>平均停留时长</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        stats.userTypes.forEach(userType => {
            const typeName = userType.user_type === 'guest' ? '游客' : '会员';
            html += `
                <tr>
                    <td>${typeName}</td>
                    <td>${userType.visits}</td>
                    <td>${userType.unique_visitors}</td>
                    <td>${this.formatDuration(userType.avg_duration || 0)}</td>
                </tr>
            `;
        });
        
        html += '</tbody></table></div>';
    }
    
    // 时间趋势统计
    if (stats.timeStats && stats.timeStats.length > 0) {
        html += `
            <div class="stats-section">
                <h3>每日访问趋势</h3>
                <table class="stats-table">
                    <thead>
                        <tr>
                            <th>日期</th>
                            <th>访问次数</th>
                            <th>独立访客</th>
                            <th>平均停留时长</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        stats.timeStats.forEach(day => {
            const date = new Date(day.date).toLocaleDateString('zh-CN');
            html += `
                <tr>
                    <td>${date}</td>
                    <td>${day.visits}</td>
                    <td>${day.unique_visitors}</td>
                    <td>${this.formatDuration(day.avg_duration || 0)}</td>
                </tr>
            `;
        });
        
        html += '</tbody></table></div>';
    }
    
    html += '</div>';
    container.innerHTML = html;
};

AdminApp.prototype.exportTrackingData = function() {
    const filters = this.getTrackingFilters();
    const params = new URLSearchParams(filters);
    
    // 使用管理员API端点导出数据
    fetch(`/api/tracking/export?${params}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
    })
    .then(response => response.blob())
    .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `tracking_data_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    })
    .catch(error => {
        console.error('导出失败:', error);
        alert('导出失败，请重试');
    });
};

AdminApp.prototype.formatDuration = function(seconds) {
    if (!seconds || seconds < 1) return '0秒';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    let result = '';
    if (hours > 0) result += hours + '小时';
    if (minutes > 0) result += minutes + '分';
    if (secs > 0 || result === '') result += secs + '秒';
    
    return result;
};

// 追踪模块不再需要覆盖switchSection，使用统一的初始化系统