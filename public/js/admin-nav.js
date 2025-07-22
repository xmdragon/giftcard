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
        this.addSystemSettingsMenuItem();
    }
    const sections = ['login-requests', 'verification-requests', 'members', 'gift-cards', 'categories', 'ip-blacklist'];
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
        { key: 'ipmanagement', label: 'IP管理', icon: 'fa-ban', permission: 'ip-blacklist' },
        { key: 'adminmanage', label: '管理员管理', icon: 'fa-user-shield', permission: null, superOnly: true }
    ];
    navItems.forEach(item => {
        if (item.superOnly && (!this.currentAdmin || this.currentAdmin.role !== 'super')) return;
        if (item.permission && !this.hasPermission(item.permission)) return;
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