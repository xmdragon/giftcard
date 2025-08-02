
AdminApp.prototype.loadAdmins = async function() {
    const container = document.getElementById('adminList');
    if (!container) return;
    container.innerHTML = 'Loading...';
    try {
        const response = await this.apiRequest('/api/admin/admins');
        if (response && response.ok) {
            const admins = await response.json();
            container.innerHTML = this.renderAdminList(admins);
        } else {
            container.innerHTML = 'Load failed';
        }
    } catch (e) {
        container.innerHTML = 'Load failed';
    }
};

AdminApp.prototype.renderAdminList = function(admins) {
    const currentId = this.currentAdmin ? this.currentAdmin.id : null;
    return `<table><thead><tr><th>ID</th><th>用户名</th><th>角色</th><th>创建时间</th><th>操作</th></tr></thead><tbody>
        ${admins.map(admin => `
            <tr>
                <td>${admin.id}</td>
                <td>${admin.username}</td>
                <td>${admin.role === 'super' ? '超级管理员' : '普通管理员'}</td>
                <td>${this.formatDateTime(admin.created_at)}</td>
                <td>
                    ${admin.role === 'admin' && admin.id !== currentId ? `<button onclick=\"adminApp.deleteAdmin(${admin.id})\">删除</button>` : '<span style=\"color:#aaa\">无法操作</span>'}
                </td>
            </tr>
        `).join('')}
    </tbody></table>`;
};

AdminApp.prototype.showAddAdminModal = function() {
    this.showModal('添加管理员', `
        <form id="addAdminForm">
            <div class="form-group">
                <label>用户名</label>
                <input type="text" id="addAdminUsername" required>
            </div>
            <div class="form-group">
                <label>密码</label>
                <input type="password" id="addAdminPassword" required minlength="6">
            </div>
            <button type="submit">添加</button>
        </form>
    `);
    const addAdminForm = document.getElementById('addAdminForm');
    if (addAdminForm) {
        addAdminForm.onsubmit = async (e) => {
            e.preventDefault();
            const usernameField = document.getElementById('addAdminUsername');
            const passwordField = document.getElementById('addAdminPassword');
            const now = new Date().toISOString();
            const username = usernameField.value.trim();
            const password = passwordField.value.trim();
            if (!username || !password) {
                alert('用户名和密码不能为空');
                return;
            }
            try {
                const response = await this.apiRequest('/api/admin/admins', {
                    method: 'POST',
                    body: JSON.stringify({ username: username, password: password })
                });
                if (response && response.ok) {
                    alert('添加成功');
                    this.closeModal();
                    this.loadAdmins();
                } else {
                    const data = await response.json();
                    alert(data.error || '添加失败');
                }
            } catch (e) {
                alert('添加失败');
            }
        };
    }
};

AdminApp.prototype.deleteAdmin = async function(id) {
    if (!confirm('确定要删除此管理员吗？')) return;
    try {
        const response = await this.apiRequest(`/api/admin/admins/${id}`, { method: 'DELETE' });
        if (response && response.ok) {
            alert('删除成功');
            this.loadAdmins();
        } else {
            const data = await response.json();
            alert(data.error || '删除失败');
        }
    } catch (e) {
        alert('删除失败');
    }
};

AdminApp.prototype.showPermissionModal = async function() {
    if (!this.currentAdmin || this.currentAdmin.role !== 'super') {
        alert('无权限访问该功能！');
        return;
    }
    const modal = document.getElementById('permissionModal');
    const body = document.getElementById('permissionModalBody');
    body.innerHTML = '加载中...';
    modal.style.display = 'block';
    try {
        const res = await fetch('/api/admin/admin-permissions', { headers: { Authorization: 'Bearer ' + this.token } });
        const admins = await res.json();
        if (!Array.isArray(admins)) throw new Error('数据异常');
        let html = '<div style="display:flex;gap:2em;align-items:flex-start;">';
        html += '<div style="min-width:180px;">';
        html += '<div style="font-weight:bold;font-size:1.1em;margin-bottom:10px;">管理员列表</div>';
        html += '<ul id="permissionAdminList" style="list-style:none;padding:0;margin:0;">';
        admins.forEach(a => {
            html += `<li data-id="${a.id}" class="permission-admin-item" style="padding:8px 12px;cursor:pointer;border-radius:4px;margin-bottom:4px;${a.role==='super'?'color:#aaa;':''}">${a.username} <span style='font-size:0.95em;color:#888;'>(${a.role==='super'?'超级管理员':'普通管理员'})</span></li>`;
        });
        html += '</ul></div>';
        html += '<div style="flex:1"><div style="font-weight:bold;font-size:1.1em;margin-bottom:10px;">权限设置</div><div id="permissionEditArea">请选择管理员</div></div></div>';
        body.innerHTML = html;
        
        const closePermissionModal = document.getElementById('closePermissionModal');
        if (closePermissionModal) {
            closePermissionModal.onclick = () => {
                const permissionModal = document.getElementById('permissionModal');
                if (permissionModal) {
                    permissionModal.style.display = 'none';
                }
            };
        }
        
        const permissionModal = document.getElementById('permissionModal');
        if (permissionModal) {
            permissionModal.onclick = (e) => {
                if (e.target === permissionModal) {
                    permissionModal.style.display = 'none';
                }
            };
        }
        
        const adminItems = document.querySelectorAll('.permission-admin-item');
        adminItems.forEach(item => {
            if(item.style.color) return;
            item.addEventListener('click', () => {
                adminItems.forEach(i => i.style.background='');
                item.style.background = '#e6f0fa';
                this.renderPermissionEdit(admins.find(a => a.id == item.getAttribute('data-id')));
            });
            item.addEventListener('mouseenter', () => {
                if(item.style.background!=='#e6f0fa') item.style.background='#f5f5f5';
            });
            item.addEventListener('mouseleave', () => {
                if(item.style.background!=='#e6f0fa') item.style.background='';
            });
        });
    } catch (e) {
        body.innerHTML = '加载失败';
    }
};

AdminApp.prototype.renderPermissionEdit = function(admin) {
    const area = document.getElementById('permissionEditArea');
    if (!admin) return area.innerHTML = '未找到管理员';
    const points = [
        { key: 'login-requests:view', label: '查看登录请求', group: '登录审核' },
        { key: 'login-requests:approve', label: '审核登录请求', group: '登录审核' },
        { key: 'verification-requests:view', label: '查看验证请求', group: '登录审核' },
        { key: 'verification-requests:approve', label: '审核验证请求', group: '登录审核' },
        { key: 'members:view', label: '查看会员', group: '会员管理' },
        { key: 'members:delete', label: '删除会员', group: '会员管理' },
        { key: 'gift-cards:view', label: '查看礼品卡', group: '礼品卡管理' },
        { key: 'gift-cards:add', label: '添加礼品卡', group: '礼品卡管理' },
        { key: 'categories:view', label: '查看分类', group: '分类管理' },
        { key: 'categories:add', label: '添加分类', group: '分类管理' },
        { key: 'categories:edit', label: '修改分类', group: '分类管理' },
        { key: 'categories:delete', label: '删除分类', group: '分类管理' },
        { key: 'ip-blacklist:view', label: '查看IP黑名单', group: 'IP管理' },
        { key: 'ip-blacklist:ban', label: '禁止IP', group: 'IP管理' },
        { key: 'ip-blacklist:unban', label: '解禁IP', group: 'IP管理' },
        { key: 'ip-history:view', label: '查看IP登录历史', group: 'IP管理' },
        { key: 'user-tracking:view', label: '查看用户行为', group: '用户追踪' },
        { key: 'user-tracking:export', label: '导出追踪数据', group: '用户追踪' },
        { key: 'user-tracking:stats', label: '查看追踪统计', group: '用户追踪' },
        { key: 'system-settings:view', label: '查看系统设置', group: '系统设置' },
        { key: 'system-settings:edit', label: '编辑系统设置', group: '系统设置' }
    ];
    let perms = {};
    try { perms = admin.permissions ? JSON.parse(admin.permissions) : {}; } catch(e){}
    const groupMap = {};
    points.forEach(p => {
        if (!groupMap[p.group]) groupMap[p.group] = [];
        groupMap[p.group].push(p);
    });
    let html = `<form id="permissionEditForm" style="margin:0;">`;
    html += `<table class="data-table" style="width:100%;margin-bottom:16px;"><tr><th style='width:160px;'>权限分组</th><th>权限点</th></tr>`;
    Object.keys(groupMap).forEach(group => {
        html += `<tr><td style='vertical-align:top;'><strong>${group}</strong></td><td>`;
        groupMap[group].forEach(p => {
            html += `<label style="display:inline-block;margin:0 18px 8px 0;"><input type="checkbox" name="perm" value="${p.key}" ${perms[p.key]?'checked':''}> ${p.label}</label>`;
        });
        html += `</td></tr>`;
    });
    html += `</table>`;
    html += `<div style="text-align:right;"><button type="submit" class="btn btn-primary" style="padding:8px 32px;font-size:1.1em;">保存权限</button></div></form>`;
    area.innerHTML = html;
    document.getElementById('permissionEditForm').onsubmit = async (e) => {
        e.preventDefault();
        const form = e.target;
        const id = admin.id;
        const newPerms = {};
        form.querySelectorAll('input[name=perm]:checked').forEach(cb => {
            newPerms[cb.value] = true;
        });
        try {
            const res = await fetch(`/api/admin/admin-permissions/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer ' + this.token
                },
                body: JSON.stringify({ permissions: newPerms })
            });
            const data = await res.json();
            if(res.ok) {
                alert('权限已保存');
                const permissionModal = document.getElementById('permissionModal');
                if (permissionModal) {
                    permissionModal.style.display = 'none';
                }
            } else {
                alert(data.error||'保存失败');
            }
        } catch (e) {
            alert('保存失败');
        }
    };
};

AdminApp.prototype.initAdminManagementEvents = function() {
    
    const addAdminBtn = document.getElementById('addAdminBtn');
    if (addAdminBtn) {
        addAdminBtn.replaceWith(addAdminBtn.cloneNode(true));
        const newAddAdminBtn = document.getElementById('addAdminBtn');
        
        newAddAdminBtn.addEventListener('click', () => {
            this.showAddAdminModal();
        });
    } else {
    }
    
    const permissionManageBtn = document.getElementById('permissionManageBtn');
    if (permissionManageBtn) {
        permissionManageBtn.replaceWith(permissionManageBtn.cloneNode(true));
        const newPermissionManageBtn = document.getElementById('permissionManageBtn');
        
        newPermissionManageBtn.addEventListener('click', () => {
            this.showPermissionModal();
        });
    } else {
    }
    
    const refreshAdminsBtn = document.getElementById('refreshAdmins');
    if (refreshAdminsBtn) {
        refreshAdminsBtn.replaceWith(refreshAdminsBtn.cloneNode(true));
        const newRefreshAdminsBtn = document.getElementById('refreshAdmins');
        
        newRefreshAdminsBtn.addEventListener('click', () => {
            this.loadAdmins();
        });
    } else {
    }
    
};

AdminApp.prototype.testAdminManagement = function() {
    
    this.switchSection('adminmanage');
    
    setTimeout(() => {
        const addAdminBtn = document.getElementById('addAdminBtn');
        const permissionManageBtn = document.getElementById('permissionManageBtn');
        const refreshAdmins = document.getElementById('refreshAdmins');
        
        
        if (typeof this.initAdminManagementEvents === 'function') {
            this.initAdminManagementEvents();
        }
    }, 1000);
}; 