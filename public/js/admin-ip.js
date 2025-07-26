/**
 * IP管理模块
 * 包含IP黑名单加载、显示、禁止IP、解禁IP等功能
 */

// 扩展 AdminApp 类
(function() {
    // 加载IP黑名单
    AdminApp.prototype.loadIpBlacklist = async function() {
        try {
            const response = await this.apiRequest('/api/admin/ip-blacklist');
            if (response && response.ok) {
                const blacklist = await response.json();
                this.displayIpBlacklist(blacklist);
                this.updateIpStats(blacklist);
            }
        } catch (error) {
            console.error('加载IP黑名单错误:', error);
        }
    };

    // 显示IP黑名单
    AdminApp.prototype.displayIpBlacklist = function(blacklist) {
        const container = document.getElementById('ipBlacklistTable');

        if (blacklist.length === 0) {
            container.innerHTML = '<p>暂无被禁止的IP</p>';
            return;
        }

        container.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>IP地址</th>
                        <th>禁止原因</th>
                        <th>禁止时间</th>
                        <th>操作人</th>
                        <th>影响会员数</th>
                        <th>状态</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>
                    ${blacklist.map(item => `
                        <tr>
                            <td><code>${item.ip_address}</code></td>
                            <td>${item.reason || '无'}</td>
                            <td>${new Date(item.banned_at).toLocaleString()}</td>
                            <td>${item.banned_by_username || '未知'}</td>
                            <td>${item.affected_members}</td>
                            <td><span class="status-badge status-active">已禁止</span></td>
                            <td>
                                <button class="unban-btn" onclick="adminApp.unbanIp(${item.id})">解禁</button>
                                <button class="view-history-btn" onclick="adminApp.viewIpHistory('${item.ip_address}')">查看历史</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    };

    // 更新IP统计信息
    AdminApp.prototype.updateIpStats = function(blacklist) {
        const activeCount = blacklist.filter(item => item.status === 'active').length;
        document.getElementById('bannedIpCount').textContent = activeCount;
    };

    // 显示禁止IP的模态框
    AdminApp.prototype.showBanIpModal = function(prefilledIp = '') {
        const content = `
            <form id="banIpForm">
                <div class="form-group">
                    <label for="ipAddress">IP地址</label>
                    <input type="text" id="ipAddress" value="${prefilledIp}" placeholder="例如: 192.168.1.1" required>
                </div>
                <div class="form-group">
                    <label for="banReason">禁止原因</label>
                    <textarea id="banReason" placeholder="请输入禁止该IP的原因" rows="3"></textarea>
                </div>
                <div class="form-actions">
                    <button type="button" class="cancel-btn" onclick="adminApp.closeModal()">取消</button>
                    <button type="submit">禁止IP</button>
                </div>
            </form>
        `;

        this.showModal('禁止IP地址', content);

        document.getElementById('banIpForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleBanIp();
        });
    };

    // 处理禁止IP
    AdminApp.prototype.handleBanIp = async function() {
        const ipAddress = document.getElementById('ipAddress').value.trim();
        const reason = document.getElementById('banReason').value.trim();

        if (!ipAddress) {
            alert('请输入IP地址');
            return;
        }

        try {
            const response = await this.apiRequest('/api/admin/ban-ip', {
                method: 'POST',
                body: JSON.stringify({ ipAddress, reason })
            });

            if (response && response.ok) {
                alert('IP已成功禁止');
                this.closeModal();
                this.loadIpBlacklist();
            } else {
                const data = await response.json();
                alert(data.error || '禁止IP失败');
            }
        } catch (error) {
            console.error('禁止IP错误:', error);
            alert('禁止IP失败，请重试');
        }
    };

    // 解禁IP
    AdminApp.prototype.unbanIp = async function(id) {
        if (!confirm('确定要解禁此IP吗？')) {
            return;
        }

        try {
            const response = await this.apiRequest(`/api/admin/unban-ip/${id}`, {
                method: 'POST'
            });

            if (response && response.ok) {
                alert('IP已成功解禁');
                this.loadIpBlacklist();
            } else {
                const data = await response.json();
                alert(data.error || '解禁IP失败');
            }
        } catch (error) {
            console.error('解禁IP错误:', error);
            alert('解禁IP失败，请重试');
        }
    };

    // 查看IP历史
    AdminApp.prototype.viewIpHistory = async function(ip) {
        try {
            const response = await this.apiRequest(`/api/admin/ip-history/${ip}`);
            if (response && response.ok) {
                const history = await response.json();
                this.displayIpHistory(ip, history);
            }
        } catch (error) {
            console.error('获取IP历史错误:', error);
            alert('获取IP历史失败，请重试');
        }
    };

    // 显示IP历史
    AdminApp.prototype.displayIpHistory = function(ip, history) {
        let content = `
            <h4>IP: ${ip} 的登录历史</h4>
            ${history.length === 0 ? '<p>暂无登录记录</p>' : ''}
        `;

        if (history.length > 0) {
            content += `
                <table>
                    <thead>
                        <tr>
                            <th>会员邮箱</th>
                            <th>登录时间</th>
                            <th>状态</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${history.map(item => {
                            const statusText = {
                                'pending': '待审核',
                                'approved': '已通过',
                                'rejected': '已拒绝'
                            }[item.status] || item.status;
                            
                            return `
                            <tr>
                                <td>${item.email}</td>
                                <td>${new Date(item.login_time).toLocaleString()}</td>
                                <td><span class="status-badge status-${item.status}">${statusText}</span></td>
                            </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            `;
        }

        this.showModal(`IP历史 - ${ip}`, content);
    };

    // 初始化IP管理事件绑定
    AdminApp.prototype.initIpManagementEvents = function() {
        console.log('初始化IP管理事件绑定');
        
        // 禁止IP按钮
        const banIpBtn = document.getElementById('banIpBtn');
        if (banIpBtn) {
            // 移除旧的事件监听器，防止重复绑定
            banIpBtn.replaceWith(banIpBtn.cloneNode(true));
            const newBanIpBtn = document.getElementById('banIpBtn');
            
            newBanIpBtn.addEventListener('click', () => {
                console.log('禁止IP按钮被点击');
                this.showBanIpModal();
            });
        }
        
        // 刷新按钮
        const refreshIpBtn = document.getElementById('refreshIpList');
        if (refreshIpBtn) {
            // 移除旧的事件监听器，防止重复绑定
            refreshIpBtn.replaceWith(refreshIpBtn.cloneNode(true));
            const newRefreshIpBtn = document.getElementById('refreshIpList');
            
            newRefreshIpBtn.addEventListener('click', () => {
                console.log('刷新IP列表按钮被点击');
                this.loadIpBlacklist();
            });
        }
    };
})();