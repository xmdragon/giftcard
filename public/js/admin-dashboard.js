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
                            <button class="edit-btn" onclick="adminApp.switchSection('giftcards')">查看</button>
                        </td>
                    </tr>
                `).join('');
            }
        }
    }
}; 