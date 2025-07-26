// 仪表盘相关方法
AdminApp.prototype.showDashboard = function() {
    if (!this.currentAdmin) return;
    const loginPage = document.getElementById('adminLoginPage');
    const dashboardPage = document.getElementById('adminDashboard');
    if (loginPage && dashboardPage) {
        loginPage.classList.remove('active');
        dashboardPage.classList.add('active');
    } else {
        console.error('页面元素未找到！');
    }
    if (this.currentAdmin) {
        const adminName = document.getElementById('adminName');
        const adminRole = document.getElementById('adminRole');
        if (adminName) adminName.textContent = this.currentAdmin.username;
        if (adminRole) adminRole.textContent = this.currentAdmin.role === 'super' ? '超级管理员' : '普通管理员';
        const adminManageNav = document.getElementById('adminManageNav');
        if (adminManageNav) {
            adminManageNav.style.display = this.currentAdmin.role === 'super' ? 'block' : 'none';
        }
    }
    this.switchSection('dashboard');
    if (this.socket && this.currentAdmin) {
        this.socket.emit('join-admin', {
            id: this.currentAdmin.id,
            username: this.currentAdmin.username,
            role: this.currentAdmin.role
        });
    }
};

AdminApp.prototype.loadDashboardData = async function() {
    if (!this.currentAdmin) return;
    try {
        const response = await this.apiRequest('/api/admin/dashboard-data');
        if (response && response.ok) {
            const data = await response.json();
            this.updateDashboard(data);
        }
    } catch (error) {
        console.error('加载仪表盘数据错误:', error);
    }
};

AdminApp.prototype.updateDashboard = function(data) {
    const loginRequestsEl = document.getElementById('dashboardLoginRequests');
    if (loginRequestsEl) {
        loginRequestsEl.textContent = data.loginRequests || 0;
    }
    const verificationRequestsEl = document.getElementById('dashboardVerificationRequests');
    if (verificationRequestsEl) {
        verificationRequestsEl.textContent = data.verificationRequests || 0;
    }
    const membersCountEl = document.getElementById('dashboardMembersCount');
    if (membersCountEl) {
        membersCountEl.textContent = data.membersCount || 0;
    }
    const bannedIpsEl = document.getElementById('dashboardBannedIps');
    if (bannedIpsEl) {
        bannedIpsEl.textContent = data.bannedIpsCount || 0;
    }
    const totalAvailableCardsEl = document.getElementById('dashboardTotalAvailableCards');
    if (totalAvailableCardsEl) {
        totalAvailableCardsEl.textContent = `(总计: ${data.totalAvailableCards || 0})`;
    }
    const giftCardStatsTable = document.getElementById('dashboardGiftCardStats');
    if (giftCardStatsTable) {
        const tbody = giftCardStatsTable.querySelector('tbody');
        if (tbody && data.giftCardStats && Array.isArray(data.giftCardStats)) {
            if (data.giftCardStats.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">暂无可用礼品卡</td></tr>';
            } else {
                tbody.innerHTML = data.giftCardStats.map(stat => `
                    <tr>
                        <td>${stat.category_name}</td>
                        <td><strong>${stat.available_count}</strong></td>
                        <td>
                            <button class="edit-btn" onclick="adminApp.viewCategoryGiftCards(${stat.category_id}, '${stat.category_name}')">查看</button>
                        </td>
                    </tr>
                `).join('');
            }
        }
    }
};

// 按分类查看礼品卡
AdminApp.prototype.viewCategoryGiftCards = function(categoryId, categoryName) {
    // 切换到礼品卡管理页面
    this.switchSection('giftcards');
    
    // 延迟执行以确保页面元素已加载
    setTimeout(() => {
        // 设置分类筛选器
        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) {
            categoryFilter.value = categoryId;
        }
        
        // 设置状态筛选为"未发放"
        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter) {
            statusFilter.value = 'available';
        }
        
        const emailFilter = document.getElementById('emailFilter');
        if (emailFilter) {
            emailFilter.value = '';
        }
        
        // 更新页面标题显示当前查看的分类
        const sectionHeader = document.querySelector('#giftcardsSection .section-header h2');
        if (sectionHeader) {
            sectionHeader.textContent = `礼品卡管理 - ${categoryName} (未发放)`;
        }
        
        // 加载该分类的礼品卡
        if (typeof this.loadGiftCards === 'function') {
            this.loadGiftCards(1);
        }
    }, 300);
};

// 重置礼品卡页面标题为默认
AdminApp.prototype.resetGiftCardsTitle = function() {
    const sectionHeader = document.querySelector('#giftcardsSection .section-header h2');
    if (sectionHeader && sectionHeader.textContent !== '礼品卡管理') {
        sectionHeader.textContent = '礼品卡管理';
    }
}; 