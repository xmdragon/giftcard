/**
 * 会员管理模块
 * 包含会员列表加载、显示等功能
 */

// 扩展 AdminApp 类
(function() {
    // 加载会员列表
    AdminApp.prototype.loadMembers = async function() {
        try {
            const response = await this.apiRequest('/api/admin/members');
            if (response && response.ok) {
                const members = await response.json();
                this.displayMembers(members);
            }
        } catch (error) {
            console.error('加载会员列表错误:', error);
        }
    };

    // 显示会员列表
    AdminApp.prototype.displayMembers = function(members) {
        const container = document.getElementById('membersList');

        if (members.length === 0) {
            container.innerHTML = '<p>暂无会员数据</p>';
            return;
        }

        container.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>邮箱</th>
                        <th data-i18n="member_password">会员密码</th>
                        <th>注册时间</th>
                        <th>最后登录</th>
                        <th>最新IP</th>
                        <th>登录次数</th>
                        <th>签到次数</th>
                        <th>礼品卡数量</th>
                        <th>状态</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>
                    ${members.map(member => `
                        <tr>
                            <td>${member.id}</td>
                            <td>${member.email}</td>
                            <td><strong style="color: #0071e3; font-family: monospace;">${member.password || '未设置'}</strong></td>
                            <td>${new Date(member.created_at).toLocaleString()}</td>
                            <td>${member.last_login_time ? new Date(member.last_login_time).toLocaleString() : '未登录'}</td>
                            <td><code>${member.latest_ip || '无'}</code></td>
                            <td>${member.login_count}</td>
                            <td>${member.checkin_count}</td>
                            <td>${member.gift_cards_received}</td>
                            <td><span class="status-badge status-${member.status}">${member.status}</span></td>
                            <td>
                                ${member.latest_ip ? `<button class="ban-ip-btn" onclick="adminApp.showBanIpModal('${member.latest_ip}')">禁止IP</button>` : ''}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    };
})();