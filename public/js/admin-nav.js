// 导航栏权限控制与渲染

AdminApp.prototype.updateNavByPermission = function() {
    if (!this.currentAdmin) return;
    if (this.currentAdmin.role !== 'super') {
        const adminManageBtn = document.getElementById('adminManageBtn');
        if (adminManageBtn) {
            adminManageBtn.parentElement.style.display = 'none';
        }
    } else {
        const adminManageBtn = document.getElementById('adminManageBtn');
        if (adminManageBtn) {
            adminManageBtn.parentElement.style.display = '';
        }
    }
    const sections = ['login-requests', 'verification-requests', 'members', 'gift-cards', 'categories', 'ip-blacklist', 'user-tracking'];
    sections.forEach(section => {
        const hasAccess = this.hasPermission(section);
        const navBtn = document.querySelector(`[data-section="${section}"]`);
        if (navBtn && !hasAccess) {
            navBtn.parentElement.style.display = 'none';
        }
    });
};

AdminApp.prototype.renderNavMenu = function() {
    const navList = document.getElementById('adminNavList');
    if (!navList) return;
    navList.innerHTML = '';
    const navItems = [
        { key: 'dashboard', label: '仪表盘', icon: 'fa-tachometer-alt', permission: null },
        { key: 'pending', label: '待审核', icon: 'fa-tasks', permission: 'login-requests' },
        { key: 'members', label: '会员管理', icon: 'fa-users', permission: 'members' },
        { key: 'giftcards', label: '礼品卡管理', icon: 'fa-gift', permission: 'gift-cards' },
        { key: 'categories', label: '分类管理', icon: 'fa-list', permission: 'categories' },
        { key: 'tracking', label: '用户行为', icon: 'fa-chart-line', permission: 'user-tracking' },
        { key: 'ipmanagement', label: 'IP管理', icon: 'fa-ban', permission: 'ip-blacklist' },
        { key: 'systemsettings', label: '系统设置', icon: 'fa-cog', permission: 'system-settings', superOnly: true },
        { key: 'adminmanage', label: '管理员管理', icon: 'fa-user-shield', permission: null, superOnly: true }
    ];
    navItems.forEach(item => {
        if (item.superOnly && (!this.currentAdmin || this.currentAdmin.role !== 'super')) return;
        // 对于系统设置和用户追踪使用权限点检查，其他使用原有的权限检查
        if (item.permission) {
            if (item.key === 'systemsettings') {
                if (!this.hasPermissionPoint(item.permission + ':view')) return;
            } else if (item.key === 'tracking') {
                // 超级管理员直接通过，普通管理员检查权限点
                if (this.currentAdmin && this.currentAdmin.role === 'super') {
                    // 超级管理员直接通过
                } else if (!this.hasPermissionPoint(item.permission + ':view')) {
                    return;
                }
            } else {
                if (!this.hasPermission(item.permission)) return;
            }
        }
        const li = document.createElement('li');
        li.innerHTML = `<button class="nav-btn" data-section="${item.key}" id="${item.key}NavBtn"><i class="fas ${item.icon}"></i> ${item.label}</button>`;
        navList.appendChild(li);
    });
    navList.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            this.switchSection(e.target.dataset.section);
        });
    });
}; 