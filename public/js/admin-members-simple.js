AdminApp.prototype.initMembersSection = function() {
    console.log('Simple initMembersSection called');
    
    if (this.currentAdmin && this.currentAdmin.role !== 'super' && !this.hasPermission('members')) {
        const container = document.getElementById('membersList');
        if (container) {
            container.innerHTML = '<div class="error">您没有权限查看会员数据</div>';
        }
        return;
    }
    
    this.bindMembersRefreshButton();
    
    this.loadMembersSimple();
};

AdminApp.prototype.bindMembersRefreshButton = function() {
    const refreshBtn = document.getElementById('refreshMembers');
    if (refreshBtn) {
        refreshBtn.replaceWith(refreshBtn.cloneNode(true));
        const newRefreshBtn = document.getElementById('refreshMembers');
        newRefreshBtn.addEventListener('click', () => {
            console.log('Members refresh button clicked');
            this.loadMembersSimple();
        });
        console.log('Members refresh button bound');
    } else {
        console.log('Members refresh button not found');
    }
};

AdminApp.prototype.loadMembersSimple = async function() {
    console.log('loadMembersSimple called');
    
    const membersList = document.getElementById('membersList');
    if (!membersList) {
        console.error('membersList container not found');
        return;
    }
    
    membersList.innerHTML = '<div>正在加载会员数据...</div>';
    
    try {
        const response = await fetch('/api/admin/members?page=1&limit=50', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('Members data received:', data);
            this.displayMembersSimple(data.members || data);
        } else {
            console.error('API request failed:', response.status);
            membersList.innerHTML = `<div class="error">加载失败: ${response.status}</div>`;
        }
    } catch (error) {
        console.error('Load members error:', error);
        membersList.innerHTML = `<div class="error">加载失败: ${error.message}</div>`;
    }
};

AdminApp.prototype.displayMembersSimple = function(members) {
    const membersList = document.getElementById('membersList');
    if (!membersList) {
        console.error('membersList container not found');
        return;
    }
    
    console.log('Displaying members:', members.length);
    
    if (!members || members.length === 0) {
        membersList.innerHTML = '<div class="no-data">暂无会员数据</div>';
        return;
    }
    
    let html = `
        <table class="admin-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>邮箱</th>
                    <th>注册时间</th>
                    <th>登录次数</th>
                    <th>签到次数</th>
                    <th>礼品卡数</th>
                    <th>最后登录IP</th>
                    <th>状态</th>
                    <th>操作</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    members.forEach(member => {
        const createdAt = new Date(member.created_at).toLocaleString('zh-CN');
        const status = member.status === 'active' ? '正常' : '禁用';
        
        html += `
            <tr>
                <td>${member.id}</td>
                <td>${member.email}</td>
                <td>${createdAt}</td>
                <td>${member.login_count || 0}</td>
                <td>${member.checkin_count || 0}</td>
                <td>${member.gift_cards_received || 0}</td>
                <td>${member.latest_ip || '-'}</td>
                <td><span class="status ${member.status}">${status}</span></td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="adminApp.deleteMember(${member.id})">删除</button>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    membersList.innerHTML = html;
    
    console.log('Members table rendered successfully');
};

AdminApp.prototype.deleteMember = async function(memberId) {
    if (!confirm('确定要删除这个会员吗？')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/members/${memberId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            alert('会员删除成功');
            this.loadMembersSimple(); // Reload list
        } else {
            alert('删除失败');
        }
    } catch (error) {
        console.error('Delete member error:', error);
        alert('删除失败: ' + error.message);
    }
};